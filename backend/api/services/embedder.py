"""
Embedding service — wraps sentence-transformers BGE-M3 for query embedding.
Singleton pattern to avoid reloading the model on each call.
"""
import structlog
from config import settings

log = structlog.get_logger()

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        log.info("loading_embedding_model", model=settings.embedding_model)
        _model = SentenceTransformer(settings.embedding_model)
    return _model


class EmbeddingService:
    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string. Returns a 1024-dim normalized vector."""
        model = _get_model()
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of strings. Returns list of 1024-dim normalized vectors."""
        if not texts:
            return []
        model = _get_model()
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return embeddings.tolist()


embedding_service = EmbeddingService()
