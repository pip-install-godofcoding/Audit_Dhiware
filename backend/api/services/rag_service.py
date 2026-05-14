"""
RAG Service — Hybrid retrieval from pgvector with confidence decay.
Queries document chunks by cosine similarity, applies temporal decay
to penalize stale evidence, and returns ranked results.
"""
import math
import structlog
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from services.embedder import embedding_service

log = structlog.get_logger()


class RAGService:
    """Retrieval-Augmented Generation service for compliance evidence lookup."""

    async def retrieve_chunks(
        self,
        db: AsyncSession,
        query: str,
        document_ids: list[str],
        top_k: int = 6,
        use_decay: bool = True,
    ) -> list[dict]:
        """
        Retrieve the most relevant document chunks for a given query.

        1. Embed the query with BGE-M3
        2. Cosine similarity search against pgvector
        3. Apply exponential decay based on evidence age
        4. Return top-k ranked results

        Args:
            db: Async database session
            query: Natural language query (typically a control description)
            document_ids: List of document UUIDs to search within
            top_k: Number of results to return
            use_decay: Whether to apply temporal confidence decay

        Returns:
            List of chunk dicts with id, chunk_text, section_ref, page_number,
            filename, and score.
        """
        if not document_ids:
            return []

        # 1. Embed the query
        query_embedding = embedding_service.embed_query(query)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        # 2. Build parameterized SQL for pgvector cosine similarity
        doc_ids_str = ",".join(f"'{did}'" for did in document_ids)

        sql = text(f"""
            SELECT
                dc.id,
                dc.chunk_text,
                dc.section_ref,
                dc.page_number,
                dc.decay_lambda,
                dc.created_at,
                d.filename,
                1 - (dc.embedding <=> '{embedding_str}'::vector) AS cosine_score
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.document_id IN ({doc_ids_str})
            ORDER BY dc.embedding <=> '{embedding_str}'::vector
            LIMIT :fetch_limit
        """)

        result = await db.execute(sql, {"fetch_limit": top_k * 2})
        rows = result.fetchall()

        # 3. Score with optional decay
        chunks = []
        for row in rows:
            score = float(row.cosine_score)

            if use_decay and row.created_at:
                # Ensure both are offset-naive for safe subtraction
                created_at_naive = row.created_at.replace(tzinfo=None)
                months_old = (datetime.utcnow() - created_at_naive).days / 30.0
                decay_lambda = row.decay_lambda if row.decay_lambda else 0.08
                decay = math.exp(-decay_lambda * months_old)
                score = score * decay

            chunks.append({
                "id": str(row.id),
                "chunk_text": row.chunk_text,
                "section_ref": row.section_ref or "",
                "page_number": row.page_number or 0,
                "filename": row.filename,
                "score": round(score, 4),
            })

        # 4. Re-rank by decayed score and return top_k
        chunks.sort(key=lambda x: x["score"], reverse=True)

        log.info(
            "rag_retrieval_complete",
            query_preview=query[:80],
            candidates=len(rows),
            returned=min(top_k, len(chunks)),
        )

        return chunks[:top_k]


rag_service = RAGService()
