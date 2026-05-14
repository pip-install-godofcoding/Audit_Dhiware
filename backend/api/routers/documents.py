"""
GET  /api/v1/documents       → list documents for current user
POST /api/v1/documents/upload → upload file, trigger async ingest via Celery
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Document, MaskingStatus
from auth import get_current_user
from schemas import DocumentResponse
from services.storage import storage_service
from worker import process_document

router = APIRouter()

ALLOWED_TYPES = {"pdf", "docx", "txt"}


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / 1024 ** 2:.1f} MB"


def doc_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=str(doc.id),
        filename=doc.filename,
        fileType=doc.filename.split(".")[-1].lower(),
        size=doc.size_human or "Unknown",
        uploadedAt=doc.uploaded_at.isoformat() if doc.uploaded_at else datetime.utcnow().isoformat(),
        maskingStatus=doc.masking_status.value,
    )


@router.get("", response_model=list[DocumentResponse])
async def get_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Document).order_by(Document.uploaded_at.desc())
    
    # If standard user, restrict to their own documents
    if current_user.role == "user":
        query = query.where(Document.uploaded_by == current_user.id)
        
    result = await db.execute(query)
    docs = result.scalars().all()
    return [doc_to_response(d) for d in docs]


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type .{ext} not supported. Use: {ALLOWED_TYPES}",
        )

    file_bytes = await file.read()
    size_bytes = len(file_bytes)

    # Upload to MinIO
    s3_key = storage_service.upload_file(
        file_bytes, file.filename, file.content_type or "application/octet-stream"
    )

    # Persist document record
    doc = Document(
        id=uuid.uuid4(),
        filename=file.filename,
        file_type=ext,
        size_bytes=size_bytes,
        size_human=format_size(size_bytes),
        s3_key=s3_key,
        masking_status=MaskingStatus.processing,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Fire async Celery task → ingest service
    process_document.delay(str(doc.id))

    return doc_to_response(doc)
