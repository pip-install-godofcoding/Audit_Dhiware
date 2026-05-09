"""
POST /api/v1/copilot/chat → AI assistant chatbot powered by local LLM
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import get_current_user
from models import User
from services.llm_service import llm_service

router = APIRouter()


class CopilotMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class CopilotRequest(BaseModel):
    messages: list[CopilotMessage]
    context: str = ""


class CopilotResponse(BaseModel):
    response: str


@router.post("/chat", response_model=CopilotResponse)
async def chat(
    body: CopilotRequest,
    current_user: User = Depends(get_current_user),
):
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    response = await llm_service.copilot_chat(messages, body.context)
    return CopilotResponse(response=response)
