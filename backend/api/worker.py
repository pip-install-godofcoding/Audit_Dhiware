"""
Celery worker — bridges sync Celery with the async audit pipeline.

Tasks:
  - run_audit: dispatches the async audit pipeline
  - ingest_document: kept as fallback (primary ingestion is via ingest-service)
"""
import asyncio
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


@celery_app.task(name="run_audit", bind=True, max_retries=2)
def run_audit_task(self, audit_id: str, config: dict):
    """
    Celery task that dispatches the full async audit pipeline.
    The actual logic lives in tasks/audit_task.py.
    """
    from tasks.audit_task import run_audit_pipeline
    try:
        _run_async(run_audit_pipeline(audit_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
