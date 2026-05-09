"""
Routers:
  GET  /api/v1/documents
  POST /api/v1/documents/upload
"""
import uuid
import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from database import get_db
from models import User, Document, MaskingStatus
from schemas import DocumentOut, UploadResponse
from auth import get_current_user
from worker import ingest_document_task
from config import settings
from minio import Minio

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "docx", "txt", "png", "jpg", "jpeg"}


def get_minio():
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).order_by(Document.uploaded_at.desc())
    )
    docs = result.scalars().all()
    return [DocumentOut.from_orm_doc(d) for d in docs]


@router.post("/upload", response_model=UploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '.{ext}' not supported.")

    content = await file.read()
    size_bytes = len(content)
    size_human = f"{round(size_bytes / 1024, 1)} KB" if size_bytes < 1_048_576 else f"{round(size_bytes / 1_048_576, 1)} MB"

    s3_key = f"raw/{uuid.uuid4()}/{file.filename}"

    # Upload to MinIO
    try:
        client = get_minio()
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)
        client.put_object(
            settings.minio_bucket,
            s3_key,
            io.BytesIO(content),
            length=size_bytes,
            content_type=file.content_type or "application/octet-stream",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")

    # Persist document record
    doc = Document(
        filename=file.filename,
        file_type=ext,
        size_bytes=size_bytes,
        size_human=size_human,
        s3_key=s3_key,
        masking_status=MaskingStatus.processing,
        uploaded_by=current_user.id,
        uploaded_at=datetime.utcnow(),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Kick off background ingest (PII masking + embedding)
    ingest_document_task.delay(str(doc.id), s3_key, ext)

    return UploadResponse(
        id=doc.id,
        filename=doc.filename,
        maskingStatus=doc.masking_status.value,
        uploadedAt=doc.uploaded_at.strftime("%Y-%m-%d"),
    )
