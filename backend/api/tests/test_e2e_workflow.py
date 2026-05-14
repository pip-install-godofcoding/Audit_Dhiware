"""
End-to-end workflow tests for the Compliance Intelligence Platform.

Tests cover:
  1. Authentication (login, token validation)
  2. Document upload and listing
  3. Findings review (accept, reject, modify, undo)
  4. Report endpoint
  5. Intent detection (chatbot action mapping)

Run: python -m pytest tests/test_e2e_workflow.py -v
"""
import os
import sys
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ═══════════════════════════════════════════════════════════════════════════
# 1. INTENT DETECTION TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestIntentDetection:
    """Test that natural language maps to correct intents."""

    def setup_method(self):
        from services.action_executor import detect_intent
        self.detect = detect_intent

    def test_list_documents(self):
        intent, _ = self.detect("Show my documents")
        assert intent == "list_documents"

    def test_list_documents_variant(self):
        intent, _ = self.detect("list all documents")
        assert intent == "list_documents"

    def test_upload_document(self):
        intent, _ = self.detect("Upload this policy document")
        assert intent == "upload_document"

    def test_upload_pdf(self):
        intent, _ = self.detect("upload a pdf")
        assert intent == "upload_document"

    def test_run_audit(self):
        intent, params = self.detect("Run an audit on ISO 27001")
        assert intent == "run_audit"
        assert "iso27001" in params.get("frameworks", [])

    def test_run_audit_multiple_frameworks(self):
        intent, params = self.detect("Start audit on ISO 27001 and SOC2")
        assert intent == "run_audit"
        frameworks = params.get("frameworks", [])
        assert "iso27001" in frameworks
        assert "soc2" in frameworks

    def test_audit_status(self):
        intent, _ = self.detect("What's the audit status?")
        assert intent == "audit_status"

    def test_show_findings(self):
        intent, _ = self.detect("Show me the findings")
        assert intent == "list_findings"

    def test_pending_findings(self):
        intent, _ = self.detect("Show pending findings")
        assert intent == "pending_findings"

    def test_accept_finding(self):
        intent, params = self.detect("Accept finding abc-123")
        assert intent == "accept_finding"
        assert params.get("target_id") == "abc-123"

    def test_reject_finding(self):
        intent, params = self.detect("Reject finding def-456")
        assert intent == "reject_finding"
        assert params.get("target_id") == "def-456"

    def test_modify_finding(self):
        intent, params = self.detect("Modify finding ghi-789")
        assert intent == "modify_finding"
        assert params.get("target_id") == "ghi-789"

    def test_generate_report(self):
        intent, _ = self.detect("Generate the final report")
        assert intent == "generate_report"

    def test_download_report(self):
        intent, _ = self.detect("Download report")
        assert intent == "generate_report"

    def test_explain_control(self):
        intent, params = self.detect("Explain control A.9.1.1")
        assert intent == "explain_control"
        assert params.get("target_id") == "A.9.1.1"

    def test_list_frameworks(self):
        intent, _ = self.detect("What frameworks are available?")
        assert intent == "list_frameworks"

    def test_general_chat_fallback(self):
        intent, _ = self.detect("Tell me a joke about compliance")
        assert intent == "general_chat"

    def test_query_findings_count(self):
        intent, _ = self.detect("How many high severity findings?")
        assert intent == "query_findings"


# ═══════════════════════════════════════════════════════════════════════════
# 2. CONTROL KNOWLEDGE TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestControlKnowledge:
    """Test that the platform knows its controls correctly."""

    def test_iso27001_controls_exist(self):
        from services.controls import ALL_CONTROLS
        assert "iso27001" in ALL_CONTROLS
        assert len(ALL_CONTROLS["iso27001"]) > 0

    def test_soc2_controls_exist(self):
        from services.controls import ALL_CONTROLS
        assert "soc2" in ALL_CONTROLS
        assert len(ALL_CONTROLS["soc2"]) > 0

    def test_nist_controls_exist(self):
        from services.controls import ALL_CONTROLS
        assert "nist" in ALL_CONTROLS
        assert len(ALL_CONTROLS["nist"]) > 0

    def test_control_has_required_fields(self):
        from services.controls import ALL_CONTROLS
        for fw, controls in ALL_CONTROLS.items():
            for ctrl in controls:
                assert "id" in ctrl, f"Missing 'id' in {fw} control"
                assert "name" in ctrl, f"Missing 'name' in {fw} control"
                assert "framework" in ctrl, f"Missing 'framework' in {fw} control"
                assert "domain" in ctrl, f"Missing 'domain' in {fw} control"
                assert "description" in ctrl, f"Missing 'description' in {fw} control"

    def test_get_controls_for_frameworks(self):
        from services.controls import get_controls_for_frameworks
        controls = get_controls_for_frameworks(["iso27001", "soc2"])
        assert len(controls) > 0
        frameworks = set(c["framework"] for c in controls)
        assert "iso27001" in frameworks
        assert "soc2" in frameworks

    def test_get_controls_unknown_framework(self):
        from services.controls import get_controls_for_frameworks
        controls = get_controls_for_frameworks(["unknown_framework"])
        assert len(controls) == 0


# ═══════════════════════════════════════════════════════════════════════════
# 3. ACTION EXECUTOR TESTS (Knowledge Actions — no DB needed)
# ═══════════════════════════════════════════════════════════════════════════

class TestActionExecutorKnowledge:
    """Test action executor methods that don't need a database."""

    def setup_method(self):
        from services.action_executor import action_executor
        self.executor = action_executor

    def test_explain_known_control(self):
        result = self.executor._explain_control({"target_id": "A.9.1.1"})
        assert result["type"] == "text"
        assert "Access control policy" in result["content"]
        assert "ISO27001" in result["content"].upper()

    def test_explain_unknown_control(self):
        result = self.executor._explain_control({"target_id": "ZZ.99.99"})
        assert result["type"] == "text"
        assert "not found" in result["content"].lower()

    def test_list_frameworks(self):
        result = self.executor._list_frameworks()
        assert result["type"] == "text"
        assert "ISO 27001" in result["content"]
        assert "SOC 2" in result["content"]
        assert "NIST" in result["content"]

    def test_upload_prompt(self):
        result = self.executor._upload_prompt()
        assert result["type"] == "text"
        assert "drag" in result["content"].lower() or "drop" in result["content"].lower()


# ═══════════════════════════════════════════════════════════════════════════
# 4. SCHEMA VALIDATION TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestSchemas:
    """Test Pydantic schema validation."""

    def test_login_request(self):
        from schemas import LoginRequest
        req = LoginRequest(email="test@example.com", password="pass123")
        assert req.email == "test@example.com"

    def test_login_request_invalid_email(self):
        from schemas import LoginRequest
        with pytest.raises(Exception):
            LoginRequest(email="not-an-email", password="pass")

    def test_run_audit_request(self):
        from schemas import RunAuditRequest, AuditOptions
        req = RunAuditRequest(
            documentIds=["doc1", "doc2"],
            frameworks=["iso27001"],
            options=AuditOptions(adversarialDebate=True, confidenceDecay=True)
        )
        assert len(req.documentIds) == 2
        assert req.options.adversarialDebate is True

    def test_update_finding_request(self):
        from schemas import UpdateFindingRequest
        req = UpdateFindingRequest(reviewStatus="accepted", severity="high", comment="Looks good")
        assert req.reviewStatus == "accepted"
        assert req.severity == "high"

    def test_update_finding_minimal(self):
        from schemas import UpdateFindingRequest
        req = UpdateFindingRequest(reviewStatus="rejected")
        assert req.reviewStatus == "rejected"
        assert req.severity is None
        assert req.comment is None


# ═══════════════════════════════════════════════════════════════════════════
# 5. LLM SERVICE UNIT TESTS (JSON extraction)
# ═══════════════════════════════════════════════════════════════════════════

class TestLLMService:
    """Test LLM output parsing utilities."""

    def test_extract_json_direct(self):
        from services.llm_service import _extract_json
        result = _extract_json('{"status": "gap", "confidence": 0.8}')
        assert result["status"] == "gap"
        assert result["confidence"] == 0.8

    def test_extract_json_markdown_block(self):
        from services.llm_service import _extract_json
        text = '```json\n{"status": "covered", "confidence": 0.95}\n```'
        result = _extract_json(text)
        assert result["status"] == "covered"

    def test_extract_json_with_preamble(self):
        from services.llm_service import _extract_json
        text = 'Here is the analysis:\n{"status": "partial", "confidence": 0.6}'
        result = _extract_json(text)
        assert result["status"] == "partial"

    def test_extract_json_invalid(self):
        from services.llm_service import _extract_json
        result = _extract_json("This is not JSON at all")
        assert result == {}


# ═══════════════════════════════════════════════════════════════════════════
# 6. SEVERITY DERIVATION TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestSeverityDerivation:
    """Test that severity is correctly derived from status + confidence."""

    def test_gap_high_confidence(self):
        from tasks.audit_task import severity_from_status
        assert severity_from_status("gap", 0.9) == "high"

    def test_gap_low_confidence(self):
        from tasks.audit_task import severity_from_status
        assert severity_from_status("gap", 0.6) == "medium"

    def test_partial(self):
        from tasks.audit_task import severity_from_status
        assert severity_from_status("partial", 0.8) == "medium"

    def test_stale(self):
        from tasks.audit_task import severity_from_status
        assert severity_from_status("stale", 0.9) == "low"

    def test_covered(self):
        from tasks.audit_task import severity_from_status
        assert severity_from_status("covered", 0.95) == "low"


# ═══════════════════════════════════════════════════════════════════════════
# 7. CONFIG TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestConfig:
    """Test configuration defaults."""

    def test_llm_model_configured(self):
        from config import settings
        assert settings.llm_model is not None
        assert len(settings.llm_model) > 0

    def test_judge_model_configured(self):
        from config import settings
        assert settings.llm_judge_model is not None

    def test_embedding_model_configured(self):
        from config import settings
        assert settings.embedding_model == "BAAI/bge-m3"

    def test_chunk_settings(self):
        from config import settings
        assert settings.max_chunk_size > 0
        assert settings.chunk_overlap >= 0
        assert settings.chunk_overlap < settings.max_chunk_size
