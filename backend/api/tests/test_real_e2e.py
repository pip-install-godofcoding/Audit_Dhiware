"""
REAL End-to-End Integration Tests — Compliance Intelligence Platform

These tests hit REAL endpoints with REAL services:
  - Real FastAPI server (http://localhost:8000)
  - Real PostgreSQL database
  - Real Ollama LLM
  - Real MinIO object storage
  - Real Celery worker

Prerequisites:
  1. docker compose up -d
  2. Wait for all services to be healthy
  3. Run: python -m pytest tests/test_real_e2e.py -v -s

NO MOCKS. Every test validates actual system behavior.
"""
import os
import sys
import time
import json
import pytest
import requests

# ── Configuration ───────────────────────────────────────────────────────

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")
AUDITOR_EMAIL = "auditor@dhiware.com"
AUDITOR_PASSWORD = "admin123"

# Path to real test documents
TEST_DOCS_DIR = os.path.join(os.path.dirname(__file__), "test_documents")


# ═══════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def auth_token():
    """Login and get a real JWT token from the API."""
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": AUDITOR_EMAIL,
        "password": AUDITOR_PASSWORD,
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in login response"
    assert "user" in data, "No user in login response"
    assert data["user"]["role"] in ("auditor", "admin"), "User is not an auditor"
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    """Build Authorization headers for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="session")
def uploaded_doc_ids(auth_headers):
    """Upload all test documents and return their IDs."""
    doc_ids = []
    for filename in os.listdir(TEST_DOCS_DIR):
        filepath = os.path.join(TEST_DOCS_DIR, filename)
        if not os.path.isfile(filepath):
            continue

        with open(filepath, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/documents/upload",
                headers=auth_headers,
                files={"file": (filename, f, "text/plain")},
            )
        assert resp.status_code == 201, f"Upload failed for {filename}: {resp.text}"
        doc = resp.json()
        assert "id" in doc, f"No ID returned for {filename}"
        doc_ids.append(doc["id"])
        print(f"  ✅ Uploaded: {filename} → {doc['id']}")

    assert len(doc_ids) >= 1, "No documents were uploaded"
    return doc_ids


# ═══════════════════════════════════════════════════════════════════════
# 1. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════

class TestHealthCheck:
    """Verify all services are running before we start."""

    def test_api_health(self):
        resp = requests.get("http://localhost:8000/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_ollama_health(self):
        resp = requests.get("http://localhost:11434/api/tags")
        assert resp.status_code == 200
        models = resp.json().get("models", [])
        model_names = [m["name"] for m in models]
        print(f"  Available models: {model_names}")
        assert len(models) > 0, "No models loaded in Ollama"


# ═══════════════════════════════════════════════════════════════════════
# 2. AUTHENTICATION TESTS
# ═══════════════════════════════════════════════════════════════════════

class TestAuthentication:
    """Test real login/auth flow."""

    def test_valid_login(self):
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": AUDITOR_EMAIL,
            "password": AUDITOR_PASSWORD,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == AUDITOR_EMAIL

    def test_invalid_password(self):
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": AUDITOR_EMAIL,
            "password": "wrongpassword",
        })
        assert resp.status_code in (401, 400)

    def test_invalid_email(self):
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "nonexistent@dhiware.com",
            "password": "admin123",
        })
        assert resp.status_code in (401, 400)

    def test_protected_route_without_token(self):
        resp = requests.get(f"{BASE_URL}/documents")
        assert resp.status_code in (401, 403)

    def test_protected_route_with_invalid_token(self):
        resp = requests.get(
            f"{BASE_URL}/documents",
            headers={"Authorization": "Bearer invalid.jwt.token"},
        )
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════════════
# 3. DOCUMENT UPLOAD TESTS
# ═══════════════════════════════════════════════════════════════════════

class TestDocumentUpload:
    """Test real document upload to MinIO + DB."""

    def test_upload_txt_document(self, auth_headers):
        filepath = os.path.join(TEST_DOCS_DIR, "access_control_policy.txt")
        with open(filepath, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/documents/upload",
                headers=auth_headers,
                files={"file": ("access_control_policy.txt", f, "text/plain")},
            )
        assert resp.status_code == 201
        doc = resp.json()
        assert doc["filename"] == "access_control_policy.txt"
        assert doc["fileType"] == "txt"
        assert "id" in doc

    def test_upload_unsupported_type(self, auth_headers):
        resp = requests.post(
            f"{BASE_URL}/documents/upload",
            headers=auth_headers,
            files={"file": ("malware.exe", b"evil content", "application/octet-stream")},
        )
        assert resp.status_code == 400

    def test_list_documents(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/documents", headers=auth_headers)
        assert resp.status_code == 200
        docs = resp.json()
        assert isinstance(docs, list)
        assert len(docs) >= 1, "No documents found after upload"
        # Verify structure
        for doc in docs:
            assert "id" in doc
            assert "filename" in doc
            assert "fileType" in doc


# ═══════════════════════════════════════════════════════════════════════
# 4. AUDIT PIPELINE TESTS (THE BIG ONE)
# ═══════════════════════════════════════════════════════════════════════

class TestAuditPipeline:
    """
    Test the complete audit pipeline:
    Upload docs → Trigger audit → Poll progress → Verify findings
    """

    @pytest.fixture(scope="class")
    def audit_id(self, auth_headers, uploaded_doc_ids):
        """Trigger a real audit and return the audit ID."""
        resp = requests.post(
            f"{BASE_URL}/audits/run",
            headers=auth_headers,
            json={
                "documentIds": uploaded_doc_ids,
                "frameworks": ["iso27001"],
                "options": {
                    "adversarialDebate": True,
                    "confidenceDecay": True,
                    "confidenceThreshold": 0.75,
                    "controlDomains": {},
                },
            },
        )
        assert resp.status_code == 200, f"Audit trigger failed: {resp.text}"
        data = resp.json()
        assert "auditId" in data
        print(f"\n  🚀 Audit started: {data['auditId']}")
        return data["auditId"]

    def test_audit_triggers_successfully(self, audit_id):
        """Verify audit was created."""
        assert audit_id is not None
        assert len(audit_id) > 0

    def test_audit_progress_polling(self, auth_headers, audit_id):
        """Poll until the audit completes (or timeout)."""
        max_wait = 300  # 5 minutes max
        poll_interval = 5
        elapsed = 0

        while elapsed < max_wait:
            resp = requests.get(
                f"{BASE_URL}/audits/{audit_id}/status",
                headers=auth_headers,
            )
            assert resp.status_code == 200
            status = resp.json()

            print(f"  ⏳ [{elapsed}s] {status.get('status', '?')} — "
                  f"{status.get('progress', 0)}% — "
                  f"{status.get('currentControl', '...')}")

            if status.get("status") == "complete":
                print(f"  ✅ Audit complete! {status.get('findingsCount', 0)} findings generated.")
                return

            if status.get("status") == "failed":
                pytest.fail(f"Audit failed: {status}")

            time.sleep(poll_interval)
            elapsed += poll_interval

        pytest.fail(f"Audit did not complete within {max_wait}s")

    def test_findings_exist_after_audit(self, auth_headers, audit_id):
        """Verify findings were created in the database."""
        # Wait a bit for audit to complete
        time.sleep(10)

        resp = requests.get(
            f"{BASE_URL}/audits/{audit_id}/findings",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        findings = resp.json()
        assert isinstance(findings, list)
        print(f"  📋 {len(findings)} findings retrieved")

        # Validate finding structure
        for f in findings:
            assert "id" in f, "Finding missing 'id'"
            assert "controlId" in f, "Finding missing 'controlId'"
            assert "controlName" in f, "Finding missing 'controlName'"
            assert "severity" in f, "Finding missing 'severity'"
            assert f["severity"] in ("high", "medium", "low"), f"Invalid severity: {f['severity']}"
            assert "status" in f, "Finding missing 'status'"
            assert f["status"] in ("gap", "partial", "stale", "covered"), f"Invalid status: {f['status']}"
            assert "reviewStatus" in f, "Finding missing 'reviewStatus'"
            assert "confidence" in f, "Finding missing 'confidence'"
            assert 0.0 <= f["confidence"] <= 1.0, f"Confidence out of range: {f['confidence']}"
            assert "remediation" in f, "Finding missing 'remediation'"
            print(f"    {f['controlId']} | {f['severity']:6s} | {f['status']:7s} | "
                  f"conf={f['confidence']:.2f} | {f['controlName'][:50]}")


# ═══════════════════════════════════════════════════════════════════════
# 5. FINDINGS REVIEW TESTS
# ═══════════════════════════════════════════════════════════════════════

class TestFindingsReview:
    """Test auditor accept/reject/modify flow against real DB."""

    @pytest.fixture(scope="class")
    def finding_id(self, auth_headers):
        """Get the first finding from the most recent audit."""
        # Get audits
        resp = requests.get(f"{BASE_URL}/audits", headers=auth_headers)
        if resp.status_code != 200 or not resp.json():
            pytest.skip("No audits available for review testing")

        audit_id = resp.json()[0]["id"]

        # Get findings
        resp = requests.get(
            f"{BASE_URL}/audits/{audit_id}/findings",
            headers=auth_headers,
        )
        findings = resp.json()
        if not findings:
            pytest.skip("No findings available")

        return findings[0]["id"]

    def test_accept_finding(self, auth_headers, finding_id):
        """Accept a finding and verify it persists."""
        resp = requests.patch(
            f"{BASE_URL}/findings/{finding_id}",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"reviewStatus": "accepted"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["reviewStatus"] == "accepted"
        print(f"  ✅ Finding {finding_id[:8]}... accepted")

    def test_reject_finding_with_comment(self, auth_headers, finding_id):
        """Reject a finding with auditor comment."""
        resp = requests.patch(
            f"{BASE_URL}/findings/{finding_id}",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "reviewStatus": "rejected",
                "comment": "Evidence is outdated — policy was revised in Q1 2025",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["reviewStatus"] == "rejected"
        assert data.get("auditorComment") is not None
        print(f"  ❌ Finding {finding_id[:8]}... rejected with comment")

    def test_modify_finding_severity(self, auth_headers, finding_id):
        """Modify a finding's severity."""
        resp = requests.patch(
            f"{BASE_URL}/findings/{finding_id}",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "reviewStatus": "modified",
                "severity": "high",
                "comment": "Escalated — critical for SOC 2 audit",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["reviewStatus"] == "modified"
        print(f"  ✏️ Finding {finding_id[:8]}... modified to high severity")

    def test_undo_review(self, auth_headers, finding_id):
        """Reset finding back to pending."""
        resp = requests.patch(
            f"{BASE_URL}/findings/{finding_id}",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"reviewStatus": "pending"},
        )
        assert resp.status_code == 200
        assert resp.json()["reviewStatus"] == "pending"
        print(f"  ↩️ Finding {finding_id[:8]}... reset to pending")


# ═══════════════════════════════════════════════════════════════════════
# 6. REPORT ENDPOINT TESTS
# ═══════════════════════════════════════════════════════════════════════

class TestReportGeneration:
    """Test report data endpoint."""

    def test_report_endpoint_returns_data(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/audits", headers=auth_headers)
        if resp.status_code != 200 or not resp.json():
            pytest.skip("No audits for report testing")

        audit_id = resp.json()[0]["id"]
        resp = requests.get(
            f"{BASE_URL}/audits/{audit_id}/report",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "findings" in data or isinstance(data, list)
        print(f"  📄 Report data retrieved for audit {audit_id[:8]}...")


# ═══════════════════════════════════════════════════════════════════════
# 7. COPILOT CHAT TESTS
# ═══════════════════════════════════════════════════════════════════════

class TestCopilotChat:
    """Test the LLM-powered copilot chatbot."""

    def test_basic_chat(self, auth_headers):
        """Send a real message to the copilot and verify LLM responds."""
        resp = requests.post(
            f"{BASE_URL}/copilot/chat",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "messages": [
                    {"role": "user", "content": "What is ISO 27001 A.9.1.1?"}
                ],
                "context": "compliance-audit",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "response" in data
        assert len(data["response"]) > 20, "Response too short — LLM may not be responding"
        print(f"  🤖 Copilot response ({len(data['response'])} chars): {data['response'][:100]}...")

    def test_chat_with_context(self, auth_headers):
        """Multi-turn conversation with context."""
        resp = requests.post(
            f"{BASE_URL}/copilot/chat",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "messages": [
                    {"role": "user", "content": "What controls cover access management?"},
                    {"role": "assistant", "content": "ISO 27001 A.9 covers access control."},
                    {"role": "user", "content": "What specific sub-controls should I check?"},
                ],
                "context": "compliance-audit",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["response"]) > 10


# ═══════════════════════════════════════════════════════════════════════
# 8. LLM ACCURACY TESTS
# ═══════════════════════════════════════════════════════════════════════

class TestLLMAccuracy:
    """
    Test that the LLM produces reasonable classifications.
    These tests call the Ollama API directly to verify output quality.
    """

    def test_llm_produces_valid_json(self):
        """Verify LLM can produce structured JSON output."""
        resp = requests.post(
            "http://localhost:11434/v1/chat/completions",
            json={
                "model": "mistral",  # or "gemma3" depending on config
                "messages": [
                    {"role": "user", "content": (
                        "Evaluate this evidence for access control:\n"
                        "Evidence: MFA is enforced for all remote access using Okta Verify.\n"
                        "Respond ONLY with JSON: {\"status\": \"covered\" or \"gap\", \"confidence\": 0.0-1.0}"
                    )}
                ],
                "temperature": 0.1,
                "format": "json",
            },
        )
        assert resp.status_code == 200
        content = resp.json()["choices"][0]["message"]["content"]

        # Parse the JSON
        import re
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        assert json_match, f"LLM did not produce JSON: {content}"
        result = json.loads(json_match.group(0))
        assert "status" in result
        assert result["status"] in ("covered", "partial", "gap", "stale")
        assert "confidence" in result
        assert 0.0 <= float(result["confidence"]) <= 1.0
        print(f"  🎯 LLM classification: {result['status']} (conf={result['confidence']})")
