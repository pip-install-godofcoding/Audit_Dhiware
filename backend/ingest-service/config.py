from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://compliance:compliance_secret@postgres:5432/compliance_db"
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_bucket: str = "compliance-docs"
    embedding_model: str = "BAAI/bge-m3"
    max_chunk_size: int = 500
    chunk_overlap: int = 50

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
