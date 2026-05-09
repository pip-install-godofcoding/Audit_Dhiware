-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('user', 'auditor', 'admin');
CREATE TYPE masking_status AS ENUM ('pending', 'processing', 'masked', 'failed');
CREATE TYPE audit_status AS ENUM ('running', 'complete', 'failed');
CREATE TYPE finding_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE finding_status AS ENUM ('gap', 'partial', 'covered', 'stale');
CREATE TYPE review_status AS ENUM ('pending', 'accepted', 'rejected', 'modified');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_bytes BIGINT,
    size_human TEXT,
    s3_key TEXT,
    masking_status masking_status NOT NULL DEFAULT 'pending',
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    pii_entities_removed INTEGER DEFAULT 0,
    vector_chunks INTEGER DEFAULT 0
);

-- Document chunks with vector embeddings
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1024),
    section_ref TEXT,
    page_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    decay_lambda FLOAT DEFAULT 0.08
);
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Audits table
CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status audit_status NOT NULL DEFAULT 'running',
    config_json JSONB NOT NULL,
    run_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_controls INTEGER DEFAULT 0,
    completed_controls INTEGER DEFAULT 0,
    estimated_duration INTEGER,
    estimated_cost FLOAT
);

-- Findings table
CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
    control_id TEXT NOT NULL,
    control_name TEXT NOT NULL,
    ai_severity finding_severity NOT NULL,
    ai_status finding_status NOT NULL,
    review_status review_status NOT NULL DEFAULT 'pending',
    confidence FLOAT NOT NULL,
    frameworks TEXT[] DEFAULT '{}',
    source TEXT,
    remediation TEXT,
    auditor_comment TEXT,
    auditor_severity finding_severity,
    evidence_context_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id)
);

-- Immutable audit event log
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES audits(id),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    prev_event_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role)
VALUES (
    'admin@dhiware.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewohMHjADNxqSKGu',
    'Admin User',
    'admin'
);

-- Seed: auditor user (password: admin123)
INSERT INTO users (email, password_hash, name, role)
VALUES (
    'auditor@dhiware.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewohMHjADNxqSKGu',
    'Madhura Hegde',
    'auditor'
);
