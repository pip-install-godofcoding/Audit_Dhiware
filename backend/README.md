# Compliance Intelligence Platform — Backend API

## Quick Start

### Prerequisites
- Docker Desktop installed and running

### 1. Clone and set up env
```bash
cp backend/api/.env.example backend/api/.env
# Edit .env and set OPENAI_API_KEY if you want LLM-powered analysis
```

### 2. Start all services
```bash
docker compose up --build
```

This starts:
| Service | URL |
|---------|-----|
| FastAPI API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| OPA | http://localhost:8181 |

### 3. Seed credentials (pre-loaded)
| Email | Password | Role |
|-------|----------|------|
| admin@dhiware.com | admin123 | admin |
| auditor@dhiware.com | admin123 | auditor |

---

## Project Structure

```
backend/
├── init.sql                  # PostgreSQL schema + seed data
├── policies/                 # OPA compliance policy files
└── api/
    ├── main.py               # FastAPI app entry point
    ├── config.py             # Settings (env vars)
    ├── database.py           # Async SQLAlchemy engine
    ├── models.py             # ORM models
    ├── schemas.py            # Pydantic request/response schemas
    ├── auth.py               # JWT + RBAC helpers
    ├── worker.py             # Celery tasks (ingest + audit)
    ├── requirements.txt
    ├── Dockerfile
    └── routers/
        ├── auth_router.py        # POST /api/v1/auth/login
        ├── documents_router.py   # GET/POST /api/v1/documents
        ├── audits_router.py      # POST /run, GET /status, GET /findings
        ├── findings_router.py    # PATCH /api/v1/findings/:id
        └── admin_router.py       # GET/POST /users, GET /system/health
```

## API Endpoints

All endpoints match `backend_contracts.md` exactly.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | Public | Login, get JWT |
| GET | `/api/v1/documents` | Any role | List all documents |
| POST | `/api/v1/documents/upload` | Any role | Upload document |
| POST | `/api/v1/audits/run` | auditor/admin | Start audit |
| GET | `/api/v1/audits/:id/status` | Any role | Poll audit status |
| GET | `/api/v1/audits/:id/findings` | Any role | Get findings |
| PATCH | `/api/v1/findings/:id` | auditor/admin | Update finding |
| GET | `/api/v1/users` | admin | List users |
| POST | `/api/v1/users` | admin | Invite user |
| GET | `/api/v1/system/health` | admin | System metrics |
