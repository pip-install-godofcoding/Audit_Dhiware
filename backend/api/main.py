"""
FastAPI application entry point.
All routes from backend_contracts.md are wired here.
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import auth, documents, audits, findings, admin, copilot, copilot_ws

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Compliance Intelligence Platform API starting up")
    yield
    log.info("Shutting down")


app = FastAPI(
    title="Compliance Intelligence Platform API",
    description="Backend for Audit_Dhiware — implements all contracts in backend_contracts.md",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow the React dev server ─────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ───────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(audits.router, prefix="/api/v1/audits", tags=["audits"])
app.include_router(findings.router, prefix="/api/v1", tags=["findings"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])
app.include_router(copilot.router, prefix="/api/v1/copilot", tags=["copilot"])
app.include_router(copilot_ws.router, prefix="/api/v1/copilot", tags=["copilot-ws"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "compliance-api"}
