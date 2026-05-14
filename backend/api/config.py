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

    # Ingest microservice
    ingest_service_url: str = "http://ingest:8001"

    # Local LLM (Ollama / vLLM — OpenAI-compatible API)
    # Single model for all roles: fast, low-memory, no swapping
    llm_base_url: str = "http://ollama:11434/v1"
    llm_model: str = "llama3.1"           # Classifier + Prosecutor + Defender
    llm_judge_model: str = "llama3.1"     # Judge (same model for speed)

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"

    # Chunking
    max_chunk_size: int = 500
    chunk_overlap: int = 50

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
