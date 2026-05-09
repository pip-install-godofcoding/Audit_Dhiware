"""
Audit Pipeline Task — the core async audit orchestrator.

Pipeline:
  1. Load controls for selected frameworks
  2. Filter by selected control domains
  3. For each control:
     a. RAG retrieval (pgvector cosine + confidence decay)
     b. LLM classification (GPT-4o)
     c. Adversarial debate for partial/low-confidence findings
     d. Persist findings + events to PostgreSQL
     e. Publish progress to Redis (polled by frontend every ~2s)
  4. Mark audit as complete

Called by the Celery worker via worker.py.
"""
import uuid
import json
import asyncio
import structlog
import redis.asyncio as aioredis
from sqlalchemy import select

from database import AsyncSessionLocal
from models import (
    Audit, Finding, Event,
    AuditStatus, FindingSeverity, FindingStatus, ReviewStatus,
)
from services.controls import get_controls_for_frameworks
from services.rag_service import rag_service
from services.llm_service import llm_service
from config import settings

log = structlog.get_logger()


def severity_from_status(status: str, confidence: float) -> str:
    """Derive severity from the AI-determined status and confidence level."""
    if status == "gap":
        return "high" if confidence > 0.8 else "medium"
    elif status == "stale":
        return "low"
    elif status == "partial":
        return "medium"
    return "low"


async def _publish_progress(
    redis_client,
    audit_id: str,
    status: str,
    progress: int,
    total: int,
    completed: int,
    current_control: str,
    findings_count: int,
):
    """Publish audit progress to Redis for frontend polling."""
    await redis_client.set(
        f"audit:{audit_id}:status",
        json.dumps({
            "auditId": audit_id,
            "status": status,
            "progress": progress,
            "totalControls": total,
            "completedControls": completed,
            "currentControl": current_control,
            "findingsCount": findings_count,
        }),
        ex=3600,  # TTL 1 hour
    )


async def run_audit_pipeline(audit_id: str):
    """
    Execute the full audit pipeline asynchronously.
    This is the entry point called by the Celery worker.
    """
    redis_client = aioredis.from_url(settings.redis_url)

    async with AsyncSessionLocal() as db:
        try:
            # ── Load audit config ──────────────────────────────────────────
            result = await db.execute(select(Audit).where(Audit.id == audit_id))
            audit = result.scalar_one_or_none()
            if not audit:
                log.error("audit_not_found", audit_id=audit_id)
                return

            config = audit.config_json
            document_ids = config["documentIds"]
            frameworks = config["frameworks"]
            options = config.get("options", {})

            log.info(
                "audit_pipeline_starting",
                audit_id=audit_id,
                frameworks=frameworks,
                documents=len(document_ids),
            )

            # ── Load and filter controls ───────────────────────────────────
            controls = get_controls_for_frameworks(frameworks)

            # Filter by selected domains if specified
            selected_domains = [
                k for k, v in options.get("controlDomains", {}).items() if v
            ]
            if selected_domains:
                controls = [c for c in controls if c["domain"] in selected_domains]

            audit.total_controls = len(controls)
            await db.commit()

            # ── Publish initial progress ───────────────────────────────────
            await _publish_progress(
                redis_client, audit_id, "running", 0, len(controls), 0,
                f"Initialising — loading {len(controls)} controls...", 0,
            )

            findings_count = 0

            # ── Evaluate each control ──────────────────────────────────────
            for i, control in enumerate(controls):
                try:
                    # Update progress: evaluating
                    await _publish_progress(
                        redis_client, audit_id, "running",
                        int((i / len(controls)) * 100),
                        len(controls), i,
                        f"Evaluating {control['id']} — {control['name']}...",
                        findings_count,
                    )

                    # ── Step 1: RAG Retrieval ──────────────────────────────
                    chunks = await rag_service.retrieve_chunks(
                        db,
                        query=control["description"],
                        document_ids=document_ids,
                        top_k=5,
                        use_decay=options.get("confidenceDecay", True),
                    )

                    # ── Step 2: LLM Classification ────────────────────────
                    if not chunks:
                        classification = {
                            "status": "gap",
                            "confidence": 0.95,
                            "source": "No evidence found",
                            "remediation": (
                                f"No documents address {control['name']}. "
                                f"Upload relevant evidence."
                            ),
                        }
                        debate_result = None
                    else:
                        classification = await llm_service.classify_control(
                            control, chunks
                        )
                        debate_result = None

                        # ── Step 3: Adversarial Debate (conditional) ──────
                        threshold = options.get("confidenceThreshold", 0.75)
                        should_debate = (
                            options.get("adversarialDebate", True)
                            and (
                                classification["status"] == "partial"
                                or float(classification.get("confidence", 1)) < threshold
                            )
                        )

                        if should_debate:
                            # Update progress: debating
                            await _publish_progress(
                                redis_client, audit_id, "running",
                                int((i / len(controls)) * 100),
                                len(controls), i,
                                f"\u2694 Adversarial debate: {control['id']}...",
                                findings_count,
                            )

                            debate_result = await llm_service.run_adversarial_debate(
                                control, chunks
                            )

                            # Judge verdict overrides initial classification
                            if debate_result and debate_result.get("judgeVerdict"):
                                verdict = debate_result["judgeVerdict"]
                                classification["status"] = verdict["verdict"]
                                classification["confidence"] = verdict["confidence"]

                    # ── Step 4: Build evidence context JSONB ──────────────
                    evidence_context = {
                        "ragCitations": [
                            {
                                "id": str(uuid.uuid4()),
                                "sourceDoc": c["filename"],
                                "section": c["section_ref"],
                                "page": c["page_number"],
                                "text": c["chunk_text"][:500],
                            }
                            for c in chunks
                        ],
                        "prosecutorArgs": (
                            debate_result["prosecutorArgs"] if debate_result else []
                        ),
                        "defenderArgs": (
                            debate_result["defenderArgs"] if debate_result else []
                        ),
                        "judgeVerdict": (
                            debate_result["judgeVerdict"] if debate_result else None
                        ),
                    }

                    # ── Step 5: Persist finding (non-covered only) ────────
                    if classification["status"] != "covered":
                        severity = severity_from_status(
                            classification["status"],
                            float(classification.get("confidence", 0.5)),
                        )

                        finding = Finding(
                            id=uuid.uuid4(),
                            audit_id=audit.id,
                            control_id=control["id"],
                            control_name=control["name"],
                            ai_severity=FindingSeverity(severity),
                            ai_status=FindingStatus(classification["status"]),
                            review_status=ReviewStatus.pending,
                            confidence=float(classification.get("confidence", 0.5)),
                            frameworks=[
                                f"{control['framework'].upper()} {control['id']}"
                            ],
                            source=classification.get("source", ""),
                            remediation=classification.get("remediation", ""),
                            evidence_context_json=evidence_context,
                        )
                        db.add(finding)
                        await db.commit()
                        findings_count += 1

                        # Store immutable event
                        event = Event(
                            id=uuid.uuid4(),
                            audit_id=audit.id,
                            event_type="FindingCreated",
                            payload={
                                "finding_id": str(finding.id),
                                "control_id": control["id"],
                                "status": classification["status"],
                                "severity": severity,
                                "confidence": classification.get("confidence"),
                            },
                        )
                        db.add(event)
                        await db.commit()

                    # Update completed count on audit
                    audit.completed_controls = i + 1
                    await db.commit()

                except Exception as e:
                    log.error(
                        "control_evaluation_failed",
                        control_id=control["id"],
                        error=str(e),
                    )
                    continue

            # ── Complete the audit ─────────────────────────────────────────
            audit.status = AuditStatus.complete
            audit.completed_controls = len(controls)
            await db.commit()

            await _publish_progress(
                redis_client, audit_id, "complete", 100,
                len(controls), len(controls),
                "Audit complete.", findings_count,
            )

            log.info(
                "audit_pipeline_complete",
                audit_id=audit_id,
                total_controls=len(controls),
                findings=findings_count,
            )

        except Exception as e:
            log.error("audit_pipeline_fatal", audit_id=audit_id, error=str(e))

            # Mark audit as failed
            try:
                audit.status = AuditStatus.failed
                await db.commit()
            except Exception:
                pass

            await _publish_progress(
                redis_client, audit_id, "failed", 0, 0, 0,
                f"Audit failed: {str(e)[:100]}", 0,
            )

        finally:
            await redis_client.aclose()
