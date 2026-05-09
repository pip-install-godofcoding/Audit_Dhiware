"""
Router: POST /api/v1/copilot/chat
Auditor copilot chatbot powered by LLM service.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from models import User
from auth import get_current_user
from services.llm_service import llm_service

router = APIRouter(prefix="/api/v1/copilot", tags=["copilot"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    auditContext: str = ""


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def copilot_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    reply = await llm_service.copilot_chat(messages, context=body.auditContext)
    return ChatResponse(reply=reply)
