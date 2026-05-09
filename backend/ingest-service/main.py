"""
Ingest Microservice — handles the full document ingestion pipeline:
  POST /ingest          → called by API gateway after file upload
  GET  /health          → liveness check

Pipeline: Download from MinIO → Parse → PII mask → Chunk → Embed → Store to pgvector
"""
import uuid
import io
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import structlog
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from minio import Minio

from config import settings
from parser import parse_document
from pii_masker import mask_pii
from embedder import chunk_text, embed_chunks

log = structlog.get_logger()

app = FastAPI(
    title="Compliance Ingest Service",
    description="Document ingestion pipeline: parse → PII mask → chunk → embed → pgvector",
    version="1.0.0",
)

# ── Database (sync — this is a background worker service) ──────────────────
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)

# ── MinIO client ───────────────────────────────────────────────────────────
def get_minio():
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )


# ── Request schema ─────────────────────────────────────────────────────────
class IngestRequest(BaseModel):
    document_id: str
    s3_key: str
    file_type: str


class IngestResponse(BaseModel):
    document_id: str
    status: str
    chunks_created: int
    pii_entities_masked: int


# ── Background pipeline ───────────────────────────────────────────────────
def _run_pipeline(document_id: str, s3_key: str, file_type: str):
    """Full ingestion pipeline — runs in background."""
    db = SessionLocal()
    try:
        log.info("pipeline_start", document_id=document_id, file_type=file_type)

        # 1. Download from MinIO
        client = get_minio()
        response = client.get_object(settings.minio_bucket, s3_key)
        raw_bytes = response.read()
        response.close()
        log.info("downloaded_from_minio", s3_key=s3_key, size_bytes=len(raw_bytes))

        # 2. Parse document → plain text
        parsed_text = parse_document(raw_bytes, file_type)
        log.info("parsed_document", chars=len(parsed_text))

        # 3. PII masking (Presidio + India regex)
        masked_text, pii_count = mask_pii(parsed_text)
        log.info("pii_masking_done", entities_found=pii_count)

        # 4. Chunk text
        chunks = chunk_text(masked_text)
        log.info("chunking_done", total_chunks=len(chunks))

        # 5. Embed chunks with BGE-M3
        embeddings = embed_chunks(chunks)
        log.info("embedding_done", total_embeddings=len(embeddings))

        # 6. Store chunks + embeddings in document_chunks table
        for idx, (chunk_txt, embedding) in enumerate(zip(chunks, embeddings)):
            db.execute(
                text("""
                    INSERT INTO document_chunks (id, document_id, chunk_index, chunk_text, embedding)
                    VALUES (:id, :doc_id, :idx, :txt, CAST(:emb AS vector))
                """),
                {
                    "id": str(uuid.uuid4()),
                    "doc_id": document_id,
                    "idx": idx,
                    "txt": chunk_txt,
                    "emb": str(embedding),
                },
            )

        # 7. Update document status → 'masked'
        db.execute(
            text("""
                UPDATE documents
                SET masking_status = 'masked',
                    pii_entities_removed = :pii_count,
                    vector_chunks = :chunk_count
                WHERE id = CAST(:doc_id AS uuid)
            """),
            {"pii_count": pii_count, "chunk_count": len(chunks), "doc_id": document_id},
        )
        db.commit()
        log.info("pipeline_complete", document_id=document_id, chunks=len(chunks), pii=pii_count)

    except Exception as e:
        db.rollback()
        log.error("pipeline_failed", document_id=document_id, error=str(e))
        # Mark document as failed
        try:
            db.execute(
                text("UPDATE documents SET masking_status = 'failed' WHERE id = CAST(:doc_id AS uuid)"),
                {"doc_id": document_id},
            )
            db.commit()
        except Exception:
            pass
        raise
    finally:
        db.close()


# ── Endpoints ──────────────────────────────────────────────────────────────
@app.post("/ingest", response_model=IngestResponse)
async def ingest_document(body: IngestRequest, background_tasks: BackgroundTasks):
    """
    Called by the API gateway after a document is uploaded to MinIO.
    Kicks off the full pipeline in the background and returns immediately.
    """
    log.info("ingest_request_received", document_id=body.document_id)

    # Update status to 'processing'
    db = SessionLocal()
    try:
        db.execute(
            text("UPDATE documents SET masking_status = 'processing' WHERE id = CAST(:doc_id AS uuid)"),
            {"doc_id": body.document_id},
        )
        db.commit()
    finally:
        db.close()

    # Run pipeline in background
    background_tasks.add_task(_run_pipeline, body.document_id, body.s3_key, body.file_type)

    return IngestResponse(
        document_id=body.document_id,
        status="processing",
        chunks_created=0,
        pii_entities_masked=0,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ingest-service"}