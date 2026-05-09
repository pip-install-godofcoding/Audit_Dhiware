"""
Chunker + Embedder — splits text into overlapping chunks and generates BGE-M3 embeddings.
"""
import structlog
from sentence_transformers import SentenceTransformer
from config import settings

log = structlog.get_logger()

_model = None


def _get_model():
    global _model
    if _model is None:
        log.info("loading_embedding_model", model=settings.embedding_model)
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    if not words:
        return []

    chunks = []
    step = max(1, settings.max_chunk_size - settings.chunk_overlap)
    for i in range(0, len(words), step):
        chunk = " ".join(words[i: i + settings.max_chunk_size])
        if chunk.strip():
            chunks.append(chunk)

    log.info("chunking_complete", total_chunks=len(chunks), total_words=len(words))
    return chunks


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """Generate normalized BGE-M3 embeddings for each chunk."""
    if not chunks:
        return []
    model = _get_model()
    embeddings = model.encode(chunks, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()
