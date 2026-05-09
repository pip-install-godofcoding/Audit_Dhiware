"""
PATCH /api/v1/findings/:findingId → auditor update (accept/reject/modify)
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Finding, ReviewStatus, FindingSeverity, Event
from auth import require_role
from schemas import FindingResponse, UpdateFindingRequest

router = APIRouter()


def finding_to_response(f: Finding) -> FindingResponse:
    """Convert ORM Finding to API response, unpacking evidence_context_json."""
    ctx = f.evidence_context_json or {}
    return FindingResponse(
        id=str(f.id),
        controlId=f.control_id,
        controlName=f.control_name,
        severity=f.ai_severity.value,
        status=f.ai_status.value,
        reviewStatus=f.review_status.value,
        confidence=f.confidence,
        frameworks=f.frameworks or [],
        evidenceChunks=ctx.get("ragCitations", []),
        prosecutorArgs=ctx.get("prosecutorArgs", []),
        defenderArgs=ctx.get("defenderArgs", []),
        judgeVerdict=ctx.get("judgeVerdict"),
        remediation=f.remediation or "",
        source=f.source or "",
        auditorComment=f.auditor_comment,
    )


@router.patch("/findings/{finding_id}", response_model=FindingResponse)
async def update_finding(
    finding_id: str,
    body: UpdateFindingRequest,
    current_user: User = Depends(require_role("auditor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    # Apply auditor updates
    finding.review_status = ReviewStatus(body.reviewStatus)
    finding.reviewed_at = datetime.utcnow()
    finding.reviewed_by = current_user.id

    if body.comment:
        finding.auditor_comment = body.comment
    if body.severity:
        finding.auditor_severity = FindingSeverity(body.severity)

    # Store immutable event for audit trail
    event = Event(
        id=uuid.uuid4(),
        audit_id=finding.audit_id,
        event_type="AuditorReviewed",
        payload={
            "finding_id": finding_id,
            "action": body.reviewStatus,
            "reviewer": str(current_user.id),
            "comment": body.comment,
            "severity_override": body.severity,
        },
    )
    db.add(event)
    await db.commit()
    await db.refresh(finding)

    return finding_to_response(finding)
