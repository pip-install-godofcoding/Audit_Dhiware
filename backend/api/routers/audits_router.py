"""
Routers:
  POST /api/v1/audits/run
  GET  /api/v1/audits/:auditId/status
  GET  /api/v1/audits/:auditId/findings
"""
import json
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from database import get_db
from models import User, Audit, Finding, AuditStatus
from schemas import RunAuditRequest, RunAuditResponse, AuditStatusResponse, FindingResponse
from auth import get_current_user, require_role
from worker import run_audit_task
from config import settings

router = APIRouter(prefix="/api/v1/audits", tags=["audits"])

CONTROLS_PER_FRAMEWORK = {
    "iso27001": 12,
    "soc2": 5,
    "nist": 6,
    "pci_dss": 78,
    "gdpr": 46,
}
COST_PER_FRAMEWORK = 12.0


@router.post("/run", response_model=RunAuditResponse, status_code=202)
async def run_audit(
    body: RunAuditRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("auditor", "admin")),
):
    total_controls = sum(CONTROLS_PER_FRAMEWORK.get(f, 50) for f in body.frameworks)
    estimated_duration = total_controls * len(body.documentIds) * 2
    estimated_cost = len(body.frameworks) * COST_PER_FRAMEWORK

    audit = Audit(
        status=AuditStatus.running,
        config_json=body.model_dump(),
        run_by=current_user.id,
        started_at=datetime.utcnow(),
        total_controls=total_controls,
        completed_controls=0,
        estimated_duration=estimated_duration,
        estimated_cost=estimated_cost,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)

    # Dispatch background Celery task
    run_audit_task.delay(str(audit.id), body.model_dump())

    return RunAuditResponse(
        auditId=str(audit.id),
        status=audit.status.value,
        estimatedDuration=estimated_duration,
        estimatedCost=estimated_cost,
    )


@router.get("/{audit_id}/status", response_model=AuditStatusResponse)
async def get_audit_status(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns real-time audit progress.
    First checks Redis (updated by the pipeline every ~2s),
    falls back to PostgreSQL if Redis data is unavailable.
    """
    # Try Redis first for real-time progress
    try:
        redis_client = aioredis.from_url(settings.redis_url, socket_connect_timeout=1)
        cached = await redis_client.get(f"audit:{audit_id}:status")
        await redis_client.aclose()

        if cached:
            data = json.loads(cached)
            return AuditStatusResponse(**data)
    except Exception:
        pass  # Fall through to DB

    # Fallback: read from PostgreSQL
    result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = result.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    findings_count = (
        await db.execute(select(func.count()).where(Finding.audit_id == audit_id))
    ).scalar() or 0

    progress = 0
    if audit.total_controls > 0:
        progress = int((audit.completed_controls / audit.total_controls) * 100)

    frameworks = audit.config_json.get("frameworks", [])
    current_control = (
        f"Evaluating {frameworks[0].upper() if frameworks else 'controls'}..."
        if audit.status == AuditStatus.running
        else "Audit complete."
    )

    return AuditStatusResponse(
        auditId=str(audit.id),
        status=audit.status.value,
        progress=progress,
        totalControls=audit.total_controls,
        completedControls=audit.completed_controls,
        currentControl=current_control,
        findingsCount=findings_count,
    )


@router.get("/{audit_id}/findings", response_model=list[FindingResponse])
async def get_findings(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Finding)
        .where(Finding.audit_id == audit_id)
        .order_by(Finding.created_at.desc())
    )
    findings = result.scalars().all()
    return [FindingResponse.from_orm_finding(f) for f in findings]
