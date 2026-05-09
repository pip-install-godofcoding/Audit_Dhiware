# Backend Setup Guide

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React Frontend (Vite :5173)                                 │
│  └─ src/api/client.ts → Axios → localhost:8000               │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│  FastAPI Gateway (:8000)                                     │
│  ├─ /api/v1/auth/login                                       │
│  ├─ /api/v1/documents      → Ingest Service (:8001)          │
│  ├─ /api/v1/audits/run     → Celery Worker → Audit Pipeline  │
│  ├─ /api/v1/findings       → PostgreSQL                      │
│  ├─ /api/v1/users          → PostgreSQL                      │
│  ├─ /api/v1/copilot/chat   → Ollama (local LLM)              │
│  └─ /api/v1/system/health  → All services                    │
└──────────────────────────────┬───────────────────────────────┘
                               │
        ┌──────────┬───────────┼───────────┬──────────┐
        ▼          ▼           ▼           ▼          ▼
   PostgreSQL    Redis      MinIO      Ollama       OPA
   (pgvector)   (cache)   (storage)  (Mistral)   (Rego)
     :5432       :6379     :9000      :11434      :8181
```

## Prerequisites

- Docker + Docker Compose
- ~8 GB RAM (for Ollama LLM models)
- GPU recommended but not required (Ollama runs on CPU too)

## Quick Start

```bash
# Clone and enter repo
git clone https://github.com/pip-install-godofcoding/Audit_Dhiware
cd Audit_Dhiware

# Start all services (first run pulls Mistral + Llama 3.1 models)
docker compose up --build

# Frontend (separate terminal)
npm install && npm run dev
```

> **First startup takes 5-10 minutes** as Ollama downloads Mistral (~4GB) and Llama 3.1 (~4.5GB).
> Subsequent starts are instant.

## Services

| Service        | URL                          | Purpose                              |
|----------------|------------------------------|--------------------------------------|
| React Frontend | http://localhost:5173         | Compliance Dashboard UI              |
| FastAPI        | http://localhost:8000         | Main REST API                        |
| Swagger Docs   | http://localhost:8000/docs    | Interactive API documentation        |
| Ingest Service | http://localhost:8001         | Document parsing + PII + embedding   |
| MinIO Console  | http://localhost:9001         | File storage admin panel             |
| Ollama         | http://localhost:11434        | Local LLM inference                  |
| OPA            | http://localhost:8181         | Policy engine (Rego rules)           |
| Redis          | localhost:6379                | Cache + Celery job queue             |
| PostgreSQL     | localhost:5432                | Primary database (pgvector)          |

## Default Credentials

| Role    | Email                  | Password  |
|---------|------------------------|-----------|
| Admin   | admin@dhiware.com      | admin123  |
| Auditor | auditor@dhiware.com    | admin123  |

## LLM Configuration

The platform uses **fully local LLM inference** via Ollama — **no API keys required**.

| Model       | Role                           | Size   |
|-------------|--------------------------------|--------|
| Mistral 7B  | Classifier, Prosecutor, Defender, Copilot | ~4 GB  |
| Llama 3.1 8B| Judge (adversarial debate verdict) | ~4.5 GB|

To use different models, update `docker-compose.yml`:
```yaml
LLM_MODEL: mistral        # change to any Ollama model
LLM_JUDGE_MODEL: llama3.1  # heavier model for final verdicts
```

## API Endpoints

### Public
| Method | Path               | Description          |
|--------|--------------------|----------------------|
| GET    | /health            | Liveness check       |
| POST   | /api/v1/auth/login | JWT authentication   |

### Authenticated (Bearer JWT)
| Method | Path                              | Required Role      |
|--------|-----------------------------------|--------------------|
| GET    | /api/v1/documents                 | any                |
| POST   | /api/v1/documents/upload          | any                |
| POST   | /api/v1/audits/run                | auditor, admin     |
| GET    | /api/v1/audits/:id/status         | any                |
| GET    | /api/v1/audits/:id/findings       | any                |
| PATCH  | /api/v1/findings/:id              | auditor, admin     |
| GET    | /api/v1/users                     | admin              |
| POST   | /api/v1/users                     | admin              |
| GET    | /api/v1/system/health             | admin              |
| POST   | /api/v1/copilot/chat              | any                |

## Audit Pipeline

```
POST /audits/run
  → Celery task dispatched
    → For each control (ISO 27001 / SOC2 / NIST):
      1. RAG retrieval (pgvector cosine + confidence decay)
      2. LLM classification (Mistral — gap/partial/covered/stale)
      3. Adversarial debate if partial/low confidence:
         ├─ Prosecutor (Mistral) — argues NOT met
         ├─ Defender (Mistral) — argues IS met
         └─ Judge (Llama 3.1) — delivers verdict
      4. Persist finding + event → PostgreSQL
      5. Publish progress → Redis (polled by frontend)
```

## OPA Policy Rules

Rego policies in `backend/policies/iso27001/`:

| Policy        | Control | Rule                                         |
|---------------|---------|----------------------------------------------|
| a9_2_5.rego   | A.9.2.5 | Access rights reviewed ≤90 days by manager   |
| a10_1_1.rego  | A.10.1.1| Encryption at rest + key management present  |
| a12_6_1.rego  | A.12.6.1| Vulnerability scan within 30 days            |

## Project Structure

```
├── docker-compose.yml                 # All 8 services
├── src/                               # React frontend
│   ├── api/client.ts                  # Real API client (replaces mock.ts)
│   ├── components/                    # UI components
│   └── types/                         # TypeScript interfaces
├── backend/
│   ├── init.sql                       # PostgreSQL schema + seed data
│   ├── api/                           # FastAPI gateway
│   │   ├── main.py                    # App entry + CORS
│   │   ├── config.py                  # Environment settings
│   │   ├── database.py                # Async SQLAlchemy engine
│   │   ├── models.py                  # ORM models (pgvector)
│   │   ├── schemas.py                 # Pydantic v2 schemas
│   │   ├── auth.py                    # JWT + bcrypt + RBAC
│   │   ├── worker.py                  # Celery task definitions
│   │   ├── routers/                   # API route handlers
│   │   ├── services/                  # Business logic
│   │   │   ├── controls.py            # Framework control definitions
│   │   │   ├── rag_service.py         # pgvector retrieval + decay
│   │   │   ├── llm_service.py         # Local LLM (Ollama)
│   │   │   ├── embedder.py            # BGE-M3 embedding service
│   │   │   └── storage.py             # MinIO file storage
│   │   └── tasks/
│   │       └── audit_task.py          # Full audit pipeline
│   ├── ingest-service/                # Document ingestion microservice
│   └── policies/                      # OPA Rego rules
│       ├── compliance.rego
│       └── iso27001/
```
