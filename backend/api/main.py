"""
FastAPI application entry point.
All routes from backend_contracts.md are wired here.
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers.auth_router import router as auth_router
from routers.documents_router import router as documents_router
from routers.audits_router import router as audits_router
from routers.findings_router import router as findings_router
from routers.admin_router import router as admin_router

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
    allow_origins=["http://localhost:5173", "http://localhost:5174", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ───────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(audits_router)
app.include_router(findings_router)
app.include_router(admin_router)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "compliance-api"}
