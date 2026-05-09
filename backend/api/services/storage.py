"""
MinIO storage service — handles file upload/download to S3-compatible object store.
"""
import io
import uuid
import structlog
from minio import Minio
from config import settings

log = structlog.get_logger()


class StorageService:
    def __init__(self):
        self._client = None

    @property
    def client(self) -> Minio:
        if self._client is None:
            self._client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=False,
            )
            # Ensure bucket exists
            if not self._client.bucket_exists(settings.minio_bucket):
                self._client.make_bucket(settings.minio_bucket)
                log.info("created_minio_bucket", bucket=settings.minio_bucket)
        return self._client

    def upload_file(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Upload file to MinIO and return the S3 key."""
        s3_key = f"raw/{uuid.uuid4()}/{filename}"
        self.client.put_object(
            settings.minio_bucket,
            s3_key,
            io.BytesIO(file_bytes),
            length=len(file_bytes),
            content_type=content_type,
        )
        log.info("file_uploaded", s3_key=s3_key, size=len(file_bytes))
        return s3_key

    def download_file(self, s3_key: str) -> bytes:
        """Download file from MinIO and return raw bytes."""
        response = self.client.get_object(settings.minio_bucket, s3_key)
        data = response.read()
        response.close()
        return data


storage_service = StorageService()
