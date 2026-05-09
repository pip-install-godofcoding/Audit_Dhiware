"""
Celery worker — bridges sync Celery with async pipelines.

Tasks:
  - process_document: dispatches document ingestion to ingest-service
  - run_audit: dispatches the async audit pipeline
"""
import asyncio
import httpx
from celery import Celery
from config import settings

celery_app = Celery(
    "compliance_worker",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)


def _run_async(coro):
    """Run an async coroutine from sync Celery task context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@celery_app.task(name="process_document", bind=True, max_retries=3)
def process_document(self, document_id: str):
    """
    Dispatch document ingestion to the ingest microservice.
    The ingest service handles: parse → PII mask → chunk → embed → pgvector.
    """
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker

    sync_engine = create_engine(
        settings.database_url.replace("+asyncpg", "+psycopg2"),
        pool_pre_ping=True,
    )
    Session = sessionmaker(bind=sync_engine)
    db = Session()

    try:
        row = db.execute(
            text("SELECT s3_key, file_type FROM documents WHERE id = CAST(:doc_id AS uuid)"),
            {"doc_id": document_id},
        ).fetchone()

        if not row:
            return

        # Call ingest service
        import requests
        resp = requests.post(
            f"{settings.ingest_service_url}/ingest",
            json={
                "document_id": document_id,
                "s3_key": row.s3_key,
                "file_type": row.file_type,
            },
            timeout=10,
        )
        resp.raise_for_status()

    except Exception as exc:
        db.close()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="run_audit", bind=True, max_retries=2)
def run_audit(self, audit_id: str):
    """
    Celery task that dispatches the full async audit pipeline.
    The actual logic lives in tasks/audit_task.py.
    """
    from tasks.audit_task import run_audit_pipeline
    try:
        _run_async(run_audit_pipeline(audit_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
