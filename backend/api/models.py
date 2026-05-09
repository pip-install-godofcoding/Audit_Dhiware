import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, BigInteger, Integer, Float,
    TIMESTAMP, ForeignKey, ARRAY, Enum as PgEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from database import Base
import enum


# ── Enums ──────────────────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    user = "user"
    auditor = "auditor"
    admin = "admin"


class MaskingStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    masked = "masked"
    failed = "failed"


class AuditStatus(str, enum.Enum):
    running = "running"
    complete = "complete"
    failed = "failed"


class FindingSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class FindingStatus(str, enum.Enum):
    gap = "gap"
    partial = "partial"
    covered = "covered"
    stale = "stale"


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    modified = "modified"


# ── ORM Models ─────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    role = Column(PgEnum(UserRole, name="user_role"), nullable=False, default=UserRole.user)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    last_active = Column(TIMESTAMP(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(Text, nullable=False)
    file_type = Column(Text, nullable=False)
    size_bytes = Column(BigInteger, nullable=True)
    size_human = Column(Text, nullable=True)
    s3_key = Column(Text, nullable=True)
    masking_status = Column(PgEnum(MaskingStatus, name="masking_status"), default=MaskingStatus.pending)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    pii_entities_removed = Column(Integer, default=0)
    vector_chunks = Column(Integer, default=0)


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"))
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(1024), nullable=True)
    section_ref = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    decay_lambda = Column(Float, default=0.08)


class Audit(Base):
    __tablename__ = "audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(PgEnum(AuditStatus, name="audit_status"), default=AuditStatus.running)
    config_json = Column(JSONB, nullable=False)
    run_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    started_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    total_controls = Column(Integer, default=0)
    completed_controls = Column(Integer, default=0)
    estimated_duration = Column(Integer, nullable=True)
    estimated_cost = Column(Float, nullable=True)


class Finding(Base):
    __tablename__ = "findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id", ondelete="CASCADE"))
    control_id = Column(Text, nullable=False)
    control_name = Column(Text, nullable=False)
    ai_severity = Column(PgEnum(FindingSeverity, name="finding_severity"), nullable=False)
    ai_status = Column(PgEnum(FindingStatus, name="finding_status"), nullable=False)
    review_status = Column(PgEnum(ReviewStatus, name="review_status"), default=ReviewStatus.pending)
    confidence = Column(Float, nullable=False)
    frameworks = Column(ARRAY(Text), default=[])
    source = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)
    auditor_comment = Column(Text, nullable=True)
    auditor_severity = Column(PgEnum(FindingSeverity, name="finding_severity"), nullable=True)
    evidence_context_json = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    reviewed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audit_id = Column(UUID(as_uuid=True), ForeignKey("audits.id"), nullable=True)
    event_type = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=False)
    prev_event_hash = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
