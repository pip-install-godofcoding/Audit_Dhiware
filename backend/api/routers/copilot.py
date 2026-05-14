"""
Copilot Router — Personalized auditor AI assistant.

Endpoints:
  POST /chat           → General chat with conversation memory
  POST /explain        → Explain a specific finding in plain English
  POST /remediate      → Get specific remediation steps for a finding
  POST /map-control    → Map a control across frameworks
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import get_current_user
from models import User
from services.llm_service import llm_service

router = APIRouter()


# ── Request/Response Models ─────────────────────────────────────────────

class CopilotMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class CopilotRequest(BaseModel):
    messages: list[CopilotMessage]
    context: str = ""


class CopilotResponse(BaseModel):
    response: str


class ExplainFindingRequest(BaseModel):
    controlId: str
    controlName: str
    status: str
    severity: str
    confidence: float
    remediation: str = ""
    source: str = ""
    frameworks: list[str] = []


class RemediationRequest(BaseModel):
    controlId: str
    controlName: str
    status: str
    frameworks: list[str] = []
    evidenceSummary: str = ""


class MapControlRequest(BaseModel):
    controlId: str
    controlName: str
    sourceFramework: str


# ── Endpoints ───────────────────────────────────────────────────────────

@router.post("/chat", response_model=CopilotResponse)
async def chat(
    body: CopilotRequest,
    current_user: User = Depends(get_current_user),
):
    """Chat with the personalized compliance copilot."""
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    response = await llm_service.copilot_chat(messages, body.context)
    return CopilotResponse(response=response)


@router.post("/explain", response_model=CopilotResponse)
async def explain_finding(
    body: ExplainFindingRequest,
    current_user: User = Depends(get_current_user),
):
    """Get a plain-English explanation of a compliance finding."""
    finding = body.model_dump()
    response = await llm_service.explain_finding(finding)
    return CopilotResponse(response=response)


@router.post("/remediate", response_model=CopilotResponse)
async def suggest_remediation(
    body: RemediationRequest,
    current_user: User = Depends(get_current_user),
):
    """Get specific remediation steps for a compliance gap."""
    finding = body.model_dump()
    response = await llm_service.suggest_remediation(finding, body.evidenceSummary)
    return CopilotResponse(response=response)


@router.post("/map-control", response_model=CopilotResponse)
async def map_control(
    body: MapControlRequest,
    current_user: User = Depends(get_current_user),
):
    """Map a control across ISO 27001, SOC 2, NIST, PCI DSS."""
    response = await llm_service.map_control_across_frameworks(
        body.controlId, body.controlName, body.sourceFramework
    )
    return CopilotResponse(response=response)
