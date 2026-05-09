from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, UUID4
from models import UserRole, MaskingStatus, AuditStatus, FindingSeverity, FindingStatus, ReviewStatus


# ── Auth ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: UUID4
    name: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    token: str
    user: UserOut


# ── Documents ──────────────────────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: UUID4
    filename: str
    fileType: str
    size: Optional[str] = None
    uploadedAt: str
    maskingStatus: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_doc(cls, doc) -> "DocumentOut":
        return cls(
            id=doc.id,
            filename=doc.filename,
            fileType=doc.file_type,
            size=doc.size_human or "Unknown",
            uploadedAt=doc.uploaded_at.strftime("%Y-%m-%d") if doc.uploaded_at else "",
            maskingStatus=doc.masking_status.value if doc.masking_status else "pending",
        )


class UploadResponse(BaseModel):
    id: UUID4
    filename: str
    maskingStatus: str
    uploadedAt: str


# ── Audits ─────────────────────────────────────────────────────────────────
class AuditOptions(BaseModel):
    adversarialDebate: bool = False
    confidenceDecay: bool = False
    confidenceThreshold: float = 0.75
    controlDomains: Dict[str, bool] = {}


class RunAuditRequest(BaseModel):
    documentIds: List[str]
    frameworks: List[str]
    options: AuditOptions


class RunAuditResponse(BaseModel):
    auditId: str
    status: str
    estimatedDuration: int
    estimatedCost: float


class AuditStatusResponse(BaseModel):
    auditId: str
    status: str
    progress: int
    totalControls: int
    completedControls: int
    currentControl: str
    findingsCount: int


# ── Findings ───────────────────────────────────────────────────────────────
class EvidenceContext(BaseModel):
    ragCitations: List[Dict[str, Any]] = []
    debateTranscript: Optional[str] = None


class FindingOut(BaseModel):
    id: UUID4
    auditId: UUID4
    controlId: str
    controlName: str
    severity: str
    status: str
    reviewStatus: str
    confidence: float
    frameworks: List[str] = []
    source: Optional[str] = None
    remediation: Optional[str] = None
    auditorComment: Optional[str] = None
    evidenceContext: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class UpdateFindingRequest(BaseModel):
    reviewStatus: ReviewStatus
    severity: Optional[FindingSeverity] = None
    comment: Optional[str] = None


class UpdateFindingResponse(BaseModel):
    findingId: str
    reviewStatus: str
    severity: Optional[str] = None
    comment: Optional[str] = None
    updatedAt: str


# ── Admin / Users ──────────────────────────────────────────────────────────
class AdminUserOut(BaseModel):
    id: UUID4
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: Optional[datetime] = None
    last_active: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InviteUserRequest(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    password: str


# ── System Health ──────────────────────────────────────────────────────────
class SystemHealthResponse(BaseModel):
    ragLatencyMs: float
    llmTokensUsed: int
    activeAuditJobs: int
    totalDocuments: int
    totalFindings: int
    dbStatus: str
    redisStatus: str
