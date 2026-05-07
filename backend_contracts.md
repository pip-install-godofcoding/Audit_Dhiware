# Backend & Database Integration Requirements
*Compliance Intelligence Platform*

This document outlines the exact API contracts, REST endpoints, and Database schema requirements needed by the Backend team to support the frontend (Auth, User, Auditor, and Admin flows).

## 1. Authentication & Authorization

The frontend relies on role-based access control (RBAC). A user's role dictates their default routing and layout permissions.

### `POST /api/v1/auth/login`
Authenticates a user and returns a JWT along with role metadata.
**Request:**
```json
{
  "email": "user@company.com",
  "password": "securePassword123"
}
```
**Response:** `200 OK`
```json
{
  "token": "eyJh...",
  "user": {
    "id": "uuid-123",
    "name": "Jane Doe",
    "email": "user@company.com",
    "role": "admin" // ENUM: "admin" | "auditor" | "user"
  }
}
```

## 2. Document & Evidence Management (User Persona)

Users upload evidence. The backend must trigger asynchronous PII masking and vectorization pipelines.

### `GET /api/v1/documents`
Retrieves the corpus of uploaded evidence.
**Response:** `200 OK`
```json
[
  {
    "id": "doc-1",
    "filename": "vendor_contract_2026.pdf",
    "fileType": "pdf", // ENUM: "pdf" | "docx" | "txt"
    "size": "1.2 MB",
    "uploadedAt": "2026-05-12T10:00:00Z",
    "maskingStatus": "masked" // ENUM: "pending" | "processing" | "masked" | "failed"
  }
]
```

### `POST /api/v1/documents/upload`
Accepts a `multipart/form-data` file upload.
**Response:** `201 Created`
*(Returns the newly created Document object with `maskingStatus: "processing"`).*

## 3. Auditing Engine (Auditor Persona)

The core intelligent pipeline. The frontend relies heavily on polling or WebSockets to stream the real-time evaluation feed.

### `POST /api/v1/audits/run`
Initiates the AI evaluation pipeline.
**Request:**
```json
{
  "documentIds": ["doc-1", "doc-2"],
  "frameworks": ["iso27001"],
  "options": {
    "adversarialDebate": true,
    "confidenceDecay": true,
    "confidenceThreshold": 0.75,
    "controlDomains": { "accessControl": true, "cryptography": true }
  }
}
```
**Response:** `202 Accepted`
```json
{
  "auditId": "audit-456",
  "status": "running",
  "estimatedDuration": 120, // seconds
  "estimatedCost": 24.50 // USD
}
```

### `GET /api/v1/audits/:auditId/status`
Polled by the frontend Progress screen every ~2 seconds.
**Response:** `200 OK`
```json
{
  "auditId": "audit-456",
  "status": "running", // ENUM: "running" | "complete" | "failed"
  "progress": 67, // integer 0-100
  "totalControls": 114,
  "completedControls": 76,
  "currentControl": "Evaluating ISO A.9.2.5...",
  "findingsCount": 12
}
```

## 4. Findings & Remediation (Auditor Persona)

### `GET /api/v1/audits/:auditId/findings`
Retrieves the detailed results of an audit for the Findings Review pane.
*(Must return `Finding` objects matching the `Finding` interface in `src/types/index.ts`)*.

### `PATCH /api/v1/findings/:findingId`
Updates the status of a finding when an auditor accepts, rejects, or modifies the AI's verdict.
**Request:**
```json
{
  "reviewStatus": "modified", // ENUM: "pending" | "accepted" | "rejected" | "modified"
  "severity": "high", // ENUM: "high" | "medium" | "low"
  "comment": "Overriding AI because compensating control exists."
}
```

## 5. System Administration (Admin Persona)

The new branch introduces Admin capabilities requiring standard CRUD endpoints.
*   **`GET /api/v1/users`**: List all registered users and their RBAC roles.
*   **`POST /api/v1/users`**: Invite a new user/assign role.
*   **`GET /api/v1/system/health`**: Returns engine metrics (RAG latency, LLM token usage, Active audit jobs) for the System Health Dashboard.

---

## 💾 Database Schema Needs (PostgreSQL / Relational)

To support the above contracts efficiently, the backend DB schema should minimally include:

### `Users` Table
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `password_hash` (String)
- `role` (Enum: USER, AUDITOR, ADMIN)

### `Documents` Table
- `id` (UUID, Primary Key)
- `filename` (String)
- `s3_key` (String) - Reference to raw file storage
- `vector_index_id` (String) - Reference to Vector DB (e.g., Pinecone/Milvus)
- `masking_status` (Enum: PENDING, PROCESSING, MASKED, FAILED)
- `uploaded_by` (UUID, Foreign Key -> Users.id)

### `Audits` Table
- `id` (UUID, Primary Key)
- `status` (Enum: RUNNING, COMPLETE, FAILED)
- `config_json` (JSONB) - Stores the `AuditConfig` options
- `run_by` (UUID, Foreign Key -> Users.id)

### `Findings` Table
- `id` (UUID, Primary Key)
- `audit_id` (UUID, Foreign Key -> Audits.id)
- `control_id` (String)
- `ai_severity` (Enum: LOW, MEDIUM, HIGH)
- `ai_status` (Enum: GAP, PARTIAL, COVERED, STALE)
- `review_status` (Enum: PENDING, ACCEPTED, REJECTED, MODIFIED)
- `auditor_comment` (Text)
- `evidence_context_json` (JSONB) - Stores the RAG citations and Adversarial Debate transcripts.

> [!IMPORTANT]
> Because findings store complex nested data (RAG evidence snippets, Debate transcripts), leveraging a `JSONB` column for `evidence_context_json` is highly recommended over highly-normalized relational tables for performance during retrieval.
