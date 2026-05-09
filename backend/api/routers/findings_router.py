"""
Router: PATCH /api/v1/findings/:findingId
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime

from database import get_db
from models import User, Finding, ReviewStatus, FindingSeverity
from schemas import UpdateFindingRequest, UpdateFindingResponse
from auth import require_role

router = APIRouter(prefix="/api/v1/findings", tags=["findings"])


@router.patch("/{finding_id}", response_model=UpdateFindingResponse)
async def update_finding(
    finding_id: str,
    body: UpdateFindingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("auditor", "admin")),
):
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    updates = {
        "review_status": ReviewStatus(body.reviewStatus),
        "reviewed_at": datetime.utcnow(),
        "reviewed_by": current_user.id,
    }
    if body.severity:
        updates["auditor_severity"] = FindingSeverity(body.severity)
    if body.comment:
        updates["auditor_comment"] = body.comment

    await db.execute(update(Finding).where(Finding.id == finding_id).values(**updates))
    await db.commit()

    return UpdateFindingResponse(
        findingId=finding_id,
        reviewStatus=body.reviewStatus,
        severity=body.severity,
        comment=body.comment,
        updatedAt=datetime.utcnow().isoformat(),
    )
