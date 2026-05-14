"""Re-embed all document chunks with the current embedding model."""
import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal
from services.embedder import embedding_service

async def reembed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT id, chunk_text FROM document_chunks"))
        rows = result.fetchall()
        print(f"Found {len(rows)} chunks to re-embed")
        
        for row in rows:
            emb = embedding_service.embed_query(row.chunk_text)
            emb_str = "[" + ",".join(str(x) for x in emb) + "]"
            # Use string interpolation for the vector value since SQLAlchemy
            # conflicts with the ::vector cast syntax
            stmt = text(
                f"UPDATE document_chunks SET embedding = '{emb_str}'::vector "
                f"WHERE id = '{row.id}'"
            )
            await db.execute(stmt)
            print(f"  ✓ Embedded chunk {row.id}")
        
        await db.commit()
        print(f"Done! Re-embedded {len(rows)} chunks.")

asyncio.run(reembed())
