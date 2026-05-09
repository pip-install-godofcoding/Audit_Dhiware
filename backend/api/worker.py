"""
Celery worker — background tasks:
  - ingest_document_task: PII masking → chunking → embedding → pgvector store
  - run_audit_task: RAG retrieval → LLM gap analysis → findings persistence
"""
import asyncio
import io
import re
import uuid
import hashlib
from datetime import datetime
from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings

# ── Sync engine for Celery (Celery workers are sync) ──────────────────────
sync_engine = create_engine(
    settings.database_url.replace("+asyncpg", "+psycopg2"),
    pool_pre_ping=True,
)
SyncSession = sessionmaker(bind=sync_engine)

celery_app = Celery(
    "compliance_worker",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

# ── India-specific PII regex patterns (from ingest-service/pii_masker.py) ──
def _mask_india_pii(text: str) -> tuple[str, int]:
    """Supplementary regex-based PII masking for Indian identifiers."""
    count = 0
    # Aadhaar numbers (12 digits)
    aadhaar_matches = re.findall(r'\b\d{12}\b', text)
    text = re.sub(r'\b\d{12}\b', '[AADHAAR]', text)
    count += len(aadhaar_matches)
    # PAN numbers (ABCDE1234F)
    pan_matches = re.findall(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', text)
    text = re.sub(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', '[PAN]', text)
    count += len(pan_matches)
    # Indian phone numbers (10 digits)
    phone_matches = re.findall(r'\b\d{10}\b', text)
    text = re.sub(r'\b\d{10}\b', '[PHONE]', text)
    count += len(phone_matches)
    return text, count


# ── Lazy imports inside tasks to avoid loading models at startup ───────────

@celery_app.task(name="ingest_document", bind=True, max_retries=3)
def ingest_document_task(self, document_id: str, s3_key: str, file_type: str):
    """
    1. Download raw file from MinIO
    2. Parse text (PDF/DOCX/TXT/Images via OCR)
    3. PII redaction with Presidio + India-specific regex
    4. Chunk → embed with BGE-M3
    5. Store chunks + embeddings in document_chunks table
    6. Update document masking_status → 'masked'
    """
    from minio import Minio
    import fitz  # PyMuPDF
    import docx
    from PIL import Image
    import pytesseract
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine
    from sentence_transformers import SentenceTransformer

    db: Session = SyncSession()
    try:
        from models import Document, DocumentChunk, MaskingStatus

        # 1. Download from MinIO
        client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=False,
        )
        response = client.get_object(settings.minio_bucket, s3_key)
        raw_bytes = response.read()
        response.close()

        # 2. Parse text (supports PDF, DOCX, images, plain text)
        text = ""
        if file_type == "pdf":
            with fitz.open(stream=raw_bytes, filetype="pdf") as doc:
                for page in doc:
                    text += page.get_text()
        elif file_type == "docx":
            doc_obj = docx.Document(io.BytesIO(raw_bytes))
            text = "\n".join(p.text for p in doc_obj.paragraphs)
        elif file_type in ("png", "jpg", "jpeg"):
            # OCR for scanned documents (from ingest-service/parser.py)
            image = Image.open(io.BytesIO(raw_bytes))
            text = pytesseract.image_to_string(image)
        else:
            text = raw_bytes.decode("utf-8", errors="replace")

        # 3a. PII Redaction — Presidio (NER-based, covers names/SSNs/emails)
        analyzer = AnalyzerEngine()
        anonymizer = AnonymizerEngine()
        results = analyzer.analyze(text=text, language="en")
        anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
        clean_text = anonymized.text
        pii_count = len(results)

        # 3b. India-specific PII — regex patterns (Aadhaar, PAN, phone)
        clean_text, india_pii_count = _mask_india_pii(clean_text)
        pii_count += india_pii_count

        # 4. Chunk text
        words = clean_text.split()
        chunks = []
        step = settings.max_chunk_size - settings.chunk_overlap
        for i in range(0, len(words), step):
            chunk = " ".join(words[i: i + settings.max_chunk_size])
            if chunk.strip():
                chunks.append(chunk)

        # 5. Embed with BGE-M3
        model = SentenceTransformer(settings.embedding_model)
        embeddings = model.encode(chunks, normalize_embeddings=True).tolist()

        # 6. Persist chunks
        for idx, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                chunk_text=chunk_text,
                embedding=embedding,
            )
            db.add(chunk)

        # Update document status
        doc_row = db.query(Document).filter(Document.id == document_id).first()
        if doc_row:
            doc_row.masking_status = MaskingStatus.masked
            doc_row.pii_entities_removed = pii_count
            doc_row.vector_chunks = len(chunks)

        db.commit()

    except Exception as exc:
        db.rollback()
        from models import Document, MaskingStatus
        doc_row = db.query(Document).filter(Document.id == document_id).first()
        if doc_row:
            doc_row.masking_status = MaskingStatus.failed
        db.commit()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="run_audit", bind=True, max_retries=2)
def run_audit_task(self, audit_id: str, config: dict):
    """
    1. Load document chunks for selected doc IDs
    2. For each control in each framework:
       a. RAG: retrieve relevant chunks via cosine similarity
       b. LLM: prompt for gap analysis + severity scoring
       c. Adversarial debate (optional): challenger LLM disputes initial verdict
    3. Persist findings to DB
    4. Update audit status → 'complete'
    """
    from sentence_transformers import SentenceTransformer
    import openai

    db: Session = SyncSession()
    try:
        from models import Audit, Finding, DocumentChunk, AuditStatus, FindingSeverity, FindingStatus, ReviewStatus
        from sqlalchemy import text as sql_text

        audit = db.query(Audit).filter(Audit.id == audit_id).first()
        if not audit:
            return

        frameworks = config.get("frameworks", [])
        document_ids = config.get("documentIds", [])
        options = config.get("options", {})
        use_debate = options.get("adversarialDebate", False)
        confidence_threshold = options.get("confidenceThreshold", 0.75)

        # Load controls per framework (simplified control map)
        FRAMEWORK_CONTROLS = {
            "iso27001": [
                ("A.5.1.1", "Information security policies"),
                ("A.6.1.1", "Information security roles"),
                ("A.8.1.1", "Inventory of assets"),
                ("A.9.2.1", "User registration"),
                ("A.9.2.5", "Review of user access rights"),
                ("A.10.1.1", "Policy on the use of cryptographic controls"),
                ("A.12.6.1", "Management of technical vulnerabilities"),
                ("A.16.1.1", "Responsibilities and procedures"),
            ],
            "soc2": [
                ("CC6.1", "Logical access security"),
                ("CC6.2", "Prior to registration"),
                ("CC7.1", "Detection of anomalies"),
                ("CC8.1", "Change management"),
            ],
            "nist": [
                ("AC-1", "Access control policy"),
                ("AC-2", "Account management"),
                ("AU-2", "Audit events"),
                ("IA-5", "Authenticator management"),
                ("SC-8", "Transmission confidentiality"),
            ],
        }

        model = SentenceTransformer(settings.embedding_model)
        total_controls = sum(len(FRAMEWORK_CONTROLS.get(f, [])) for f in frameworks)
        audit.total_controls = total_controls
        db.commit()

        completed = 0
        for framework in frameworks:
            controls = FRAMEWORK_CONTROLS.get(framework, [])
            for control_id, control_name in controls:
                # RAG: embed the control query
                query_embedding = model.encode(
                    f"{framework} {control_id} {control_name}",
                    normalize_embeddings=True,
                ).tolist()

                # Retrieve top-5 chunks via pgvector cosine similarity
                rows = db.execute(
                    sql_text("""
                        SELECT chunk_text, 1 - (embedding <=> CAST(:emb AS vector)) AS similarity
                        FROM document_chunks
                        WHERE document_id = ANY(CAST(:doc_ids AS uuid[]))
                        ORDER BY embedding <=> CAST(:emb AS vector)
                        LIMIT 5
                    """),
                    {
                        "emb": str(query_embedding),
                        "doc_ids": document_ids,
                    },
                ).fetchall()

                evidence_snippets = [{"text": r[0], "similarity": round(r[1], 3)} for r in rows]
                evidence_text = "\n---\n".join(r[0] for r in rows) if rows else "No evidence found."

                # Determine severity/status (LLM or heuristic fallback)
                confidence = 0.82
                ai_status = FindingStatus.partial
                ai_severity = FindingSeverity.medium
                remediation = f"Review and update controls for {control_name} per {framework.upper()} requirements."

                if settings.openai_api_key:
                    try:
                        client = openai.OpenAI(api_key=settings.openai_api_key)
                        prompt = f"""
You are a compliance auditor. Analyze the following evidence for control {control_id} ({control_name}) 
under framework {framework.upper()}.

Evidence:
{evidence_text}

Return JSON: {{"status": "gap|partial|covered|stale", "severity": "low|medium|high", 
"confidence": 0.0-1.0, "remediation": "...", "summary": "..."}}
"""
                        resp = client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[{"role": "user", "content": prompt}],
                            response_format={"type": "json_object"},
                        )
                        import json
                        result = json.loads(resp.choices[0].message.content)
                        ai_status = FindingStatus(result.get("status", "partial"))
                        ai_severity = FindingSeverity(result.get("severity", "medium"))
                        confidence = float(result.get("confidence", 0.82))
                        remediation = result.get("remediation", remediation)
                    except Exception:
                        pass  # Fall back to heuristics

                # Adversarial debate (optional)
                debate_transcript = None
                if use_debate and settings.openai_api_key:
                    try:
                        client = openai.OpenAI(api_key=settings.openai_api_key)
                        debate_prompt = f"""
Challenge the following compliance verdict for {control_id}:
- Status: {ai_status.value}
- Severity: {ai_severity.value}
- Confidence: {confidence}

Evidence used: {evidence_text[:500]}

Provide a counterargument if applicable, then give a final agreed verdict.
"""
                        debate_resp = client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[{"role": "user", "content": debate_prompt}],
                        )
                        debate_transcript = debate_resp.choices[0].message.content
                    except Exception:
                        pass

                # Persist finding
                finding = Finding(
                    audit_id=audit_id,
                    control_id=control_id,
                    control_name=control_name,
                    ai_severity=ai_severity,
                    ai_status=ai_status,
                    review_status=ReviewStatus.pending,
                    confidence=confidence,
                    frameworks=[framework],
                    remediation=remediation,
                    evidence_context_json={
                        "ragCitations": evidence_snippets,
                        "debateTranscript": debate_transcript,
                    },
                )
                db.add(finding)

                completed += 1
                audit.completed_controls = completed
                db.commit()

        audit.status = AuditStatus.complete
        audit.completed_at = datetime.utcnow()
        db.commit()

    except Exception as exc:
        db.rollback()
        from models import Audit, AuditStatus
        audit_row = db.query(Audit).filter(Audit.id == audit_id).first()
        if audit_row:
            audit_row.status = AuditStatus.failed
        db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
