"""
POST /api/v1/audits/run          → start audit pipeline
GET  /api/v1/audits/:auditId/status → poll progress from Redis
GET  /api/v1/audits/:auditId/findings → get findings for audit
"""
import json
import uuid
from datetime import datetime
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Audit, Finding, AuditStatus
from auth import get_current_user, require_role
from schemas import RunAuditRequest, RunAuditResponse, AuditStatusResponse, FindingResponse
from worker import run_audit
from config import settings

router = APIRouter()


@router.post("/run", response_model=RunAuditResponse, status_code=202)
async def run_audit_endpoint(
    body: RunAuditRequest,
    current_user: User = Depends(require_role("auditor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    from services.controls import get_controls_for_frameworks

    controls = get_controls_for_frameworks(body.frameworks)
    estimated_duration = len(controls) * len(body.documentIds) * 3
    estimated_cost = len(body.frameworks) * 12.0

    audit = Audit(
        id=uuid.uuid4(),
        status=AuditStatus.running,
        config_json=body.model_dump(),
        run_by=current_user.id,
        total_controls=len(controls),
        estimated_duration=estimated_duration,
        estimated_cost=estimated_cost,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)

    # Fire Celery task
    run_audit.delay(str(audit.id))

    return RunAuditResponse(
        auditId=str(audit.id),
        status="running",
        estimatedDuration=estimated_duration,
        estimatedCost=estimated_cost,
    )


@router.get("/{audit_id}/status", response_model=AuditStatusResponse)
async def get_audit_status(
    audit_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Returns real-time audit progress.
    Reads from Redis (updated by the pipeline every ~2s).
    Falls back to 404 if no data yet.
    """
    try:
        redis_client = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        raw = await redis_client.get(f"audit:{audit_id}:status")
        await redis_client.aclose()

        if raw:
            data = json.loads(raw)
            return AuditStatusResponse(**data)
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Audit not found or not started")


@router.get("/{audit_id}/findings", response_model=list[FindingResponse])
async def get_audit_findings(
    audit_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all findings for a specific audit, ordered by severity then confidence."""
    result = await db.execute(
        select(Finding)
        .where(Finding.audit_id == audit_id)
        .order_by(Finding.ai_severity.desc(), Finding.confidence.desc())
    )
    findings = result.scalars().all()
    return [FindingResponse.from_orm_finding(f) for f in findings]
