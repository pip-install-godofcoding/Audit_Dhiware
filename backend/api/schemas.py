"""
Pydantic v2 schemas — exact JSON shapes matching backend_contracts.md and frontend expectations.
All camelCase field names match what the React frontend sends/receives.
"""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# ═══════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str  # "admin" | "auditor" | "user"

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    token: str
    user: UserResponse


# ═══════════════════════════════════════════════════════════════════════════
# DOCUMENTS
# ═══════════════════════════════════════════════════════════════════════════

class DocumentResponse(BaseModel):
    id: str
    filename: str
    fileType: str
    size: str
    uploadedAt: str
    maskingStatus: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_doc(cls, doc) -> DocumentResponse:
        return cls(
            id=str(doc.id),
            filename=doc.filename,
            fileType=doc.file_type,
            size=doc.size_human or "Unknown",
            uploadedAt=doc.uploaded_at.strftime("%Y-%m-%d") if doc.uploaded_at else "",
            maskingStatus=doc.masking_status.value if doc.masking_status else "pending",
        )


class DocumentUploadResponse(DocumentResponse):
    pass


# ═══════════════════════════════════════════════════════════════════════════
# AUDITS
# ═══════════════════════════════════════════════════════════════════════════

class AuditOptions(BaseModel):
    adversarialDebate: bool = True
    confidenceDecay: bool = True
    confidenceThreshold: float = 0.75
    controlDomains: dict[str, bool] = {}


class RunAuditRequest(BaseModel):
    documentIds: list[str]
    frameworks: list[str]
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


# ═══════════════════════════════════════════════════════════════════════════
# FINDINGS
# ═══════════════════════════════════════════════════════════════════════════

class EvidenceChunk(BaseModel):
    id: str
    sourceDoc: str
    section: str
    page: int
    text: str


class DebatePoint(BaseModel):
    side: str  # "prosecutor" | "defender"
    points: list[str]


class JudgeVerdict(BaseModel):
    confidence: float
    verdict: str
    decisiveEvidence: str


class FindingResponse(BaseModel):
    id: str
    controlId: str
    controlName: str
    severity: str
    status: str
    reviewStatus: str
    confidence: float
    frameworks: list[str]
    evidenceChunks: list[EvidenceChunk]
    prosecutorArgs: list[str]
    defenderArgs: list[str]
    judgeVerdict: JudgeVerdict | None
    remediation: str
    source: str
    auditorComment: str | None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_finding(cls, f) -> FindingResponse:
        """Build FindingResponse from ORM Finding, unpacking evidence_context_json."""
        ctx = f.evidence_context_json or {}
        rag_citations = ctx.get("ragCitations", [])
        debate = ctx.get("debateTranscript", "")

        evidence_chunks = [
            EvidenceChunk(
                id=str(i),
                sourceDoc=c.get("sourceDoc", "Unknown"),
                section=c.get("section", ""),
                page=c.get("page", 0),
                text=c.get("text", ""),
            )
            for i, c in enumerate(rag_citations)
        ]

        # Parse debate transcript into prosecutor/defender args
        prosecutor_args = ctx.get("prosecutorArgs", [])
        defender_args = ctx.get("defenderArgs", [])

        judge = None
        judge_data = ctx.get("judgeVerdict")
        if judge_data:
            judge = JudgeVerdict(
                confidence=judge_data.get("confidence", f.confidence),
                verdict=judge_data.get("verdict", f.ai_status.value),
                decisiveEvidence=judge_data.get("decisiveEvidence", ""),
            )

        return cls(
            id=str(f.id),
            controlId=f.control_id,
            controlName=f.control_name,
            severity=f.ai_severity.value,
            status=f.ai_status.value,
            reviewStatus=f.review_status.value,
            confidence=f.confidence,
            frameworks=f.frameworks or [],
            evidenceChunks=evidence_chunks,
            prosecutorArgs=prosecutor_args,
            defenderArgs=defender_args,
            judgeVerdict=judge,
            remediation=f.remediation or "",
            source=f.source or "",
            auditorComment=f.auditor_comment,
        )


class UpdateFindingRequest(BaseModel):
    reviewStatus: str
    severity: str | None = None
    comment: str | None = None


class UpdateFindingResponse(BaseModel):
    findingId: str
    reviewStatus: str
    severity: str | None = None
    comment: str | None = None
    updatedAt: str


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN
# ═══════════════════════════════════════════════════════════════════════════

class UserListItem(BaseModel):
    id: str
    name: str
    email: str
    role: str
    isActive: bool
    lastActive: str | None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_user(cls, u) -> UserListItem:
        return cls(
            id=str(u.id),
            name=u.name,
            email=u.email,
            role=u.role.value,
            isActive=u.is_active,
            lastActive=u.last_active.isoformat() if u.last_active else None,
        )


class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class SystemHealthResponse(BaseModel):
    services: dict[str, str]  # service_name -> "healthy"|"degraded"|"down"
    ragLatencyMs: float
    llmTokenUsage: int
    activeAuditJobs: int
