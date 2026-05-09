from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str

    # Redis
    redis_url: str

    # MinIO / Object Store
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str = "compliance-docs"

    # OPA
    opa_url: str = "http://opa:8181"

    # JWT Auth
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # Celery
    celery_broker_url: str

    # LLM / Embeddings
    openai_api_key: str = ""
    embedding_model: str = "BAAI/bge-m3"

    # Ingest microservice
    ingest_service_url: str = "http://ingest:8001"

    # Chunking
    max_chunk_size: int = 500
    chunk_overlap: int = 50

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
