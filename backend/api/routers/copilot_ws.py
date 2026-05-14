"""
WebSocket endpoint for real-time streaming copilot chat.

Supports:
  - JWT authentication via first message
  - Streaming LLM responses token-by-token
  - Intent detection → action execution
  - File upload notifications
"""
import json
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, AsyncSessionLocal
from auth import decode_token
from models import User
from services.llm_service import llm_service, _call_llm_stream
from services.action_executor import detect_intent, action_executor
from config import settings
from sqlalchemy import select

log = structlog.get_logger()

router = APIRouter()

SYSTEM_PROMPT = """You are the Compliance Intelligence Copilot for the Dhiware platform.
You help auditors understand compliance controls, review findings, interpret evidence, and manage audits.
Be concise, precise, and cite specific standards when relevant.
You have direct access to the platform — you can upload documents, run audits, review findings, and generate reports.
When the user asks you to perform an action, confirm what you'll do and execute it.
Format responses in markdown for readability."""


async def _get_user_from_token(token: str) -> User | None:
    """Validate JWT and return the User object."""
    try:
        payload = decode_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()
    except Exception:
        return None


@router.websocket("/ws")
async def copilot_websocket(websocket: WebSocket):
    """
    Real-time copilot chat via WebSocket.

    Protocol:
      1. Client sends: {"type": "auth", "token": "..."}
      2. Server replies: {"type": "auth_ok"} or {"type": "auth_error"}
      3. Client sends: {"type": "message", "content": "..."}
      4. Server streams: {"type": "token", "content": "..."} (many)
      5. Server sends:  {"type": "done"} (end of response)
      6. For actions:   {"type": "action", "action_type": "...", "data": {...}}
    """
    await websocket.accept()
    user = None
    conversation_history = []

    try:
        # ── Step 1: Authenticate ────────────────────────────────────────
        auth_msg = await websocket.receive_json()
        if auth_msg.get("type") != "auth" or not auth_msg.get("token"):
            await websocket.send_json({"type": "auth_error", "error": "Send auth token first"})
            await websocket.close()
            return

        user = await _get_user_from_token(auth_msg["token"])
        if not user:
            await websocket.send_json({"type": "auth_error", "error": "Invalid or expired token"})
            await websocket.close()
            return

        await websocket.send_json({"type": "auth_ok", "user": user.name})
        log.info("copilot_ws_connected", user=user.email)

        # ── Step 2: Message Loop ────────────────────────────────────────
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                conversation_history.append({"role": "user", "content": content})

                # ── Try intent detection first ──────────────────────────
                intent, params = detect_intent(content)

                if intent != "general_chat":
                    # Execute the action
                    async with AsyncSessionLocal() as db:
                        result = await action_executor.execute(intent, params, user, db)

                    if result.get("type") == "passthrough":
                        # Intent detected but action says let LLM handle it
                        pass
                    else:
                        # Send action result
                        await websocket.send_json({
                            "type": "action",
                            "action_type": result.get("type", "text"),
                            "data": result,
                        })
                        # Also add to conversation history
                        summary = result.get("summary", result.get("content", "Action completed."))
                        if isinstance(summary, list):
                            summary = f"Returned {len(summary)} items."
                        conversation_history.append({"role": "assistant", "content": str(summary)})
                        await websocket.send_json({"type": "done"})
                        continue

                # ── Stream LLM response ─────────────────────────────────
                # Build context from recent conversation
                context_msgs = conversation_history[-10:]  # Last 10 messages
                prompt_parts = []
                for msg in context_msgs:
                    role = "User" if msg["role"] == "user" else "Assistant"
                    prompt_parts.append(f"{role}: {msg['content']}")
                prompt = "\n".join(prompt_parts) + "\n\nAssistant:"

                full_response = ""
                try:
                    async for token in _call_llm_stream(
                        prompt=prompt,
                        model=settings.llm_model,
                        system_prompt=SYSTEM_PROMPT,
                        temperature=0.3,
                        max_tokens=800,
                    ):
                        full_response += token
                        await websocket.send_json({
                            "type": "token",
                            "content": token,
                        })
                except Exception as e:
                    log.error("copilot_stream_error", error=str(e))
                    if not full_response:
                        full_response = "I'm having trouble connecting to the reasoning engine. Please try again."
                        await websocket.send_json({
                            "type": "token",
                            "content": full_response,
                        })

                conversation_history.append({"role": "assistant", "content": full_response})
                await websocket.send_json({"type": "done"})

            elif msg_type == "file_uploaded":
                # Client notifies that a file was uploaded via REST API
                filename = data.get("filename", "document")
                await websocket.send_json({
                    "type": "action",
                    "action_type": "text",
                    "data": {
                        "type": "text",
                        "content": f"📎 **{filename}** uploaded successfully! I'm processing it now — PII masking, chunking, and embedding.\n\nYou'll be able to use it in audits once processing completes."
                    }
                })
                await websocket.send_json({"type": "done"})

            elif msg_type == "confirm_action":
                # User confirmed a pending action (e.g., "Yes, run the audit")
                action = data.get("action", "")
                action_params = data.get("params", {})

                if action == "run_audit":
                    from worker import run_audit as run_audit_task
                    from models import Audit
                    import uuid

                    async with AsyncSessionLocal() as db:
                        frameworks = action_params.get("frameworks", [])
                        doc_ids = action_params.get("documentIds", [])
                        controls = get_controls_for_frameworks(frameworks)

                        audit = Audit(
                            id=uuid.uuid4(),
                            status=AuditStatus.running,
                            config_json={
                                "documentIds": doc_ids,
                                "frameworks": frameworks,
                                "options": {"adversarialDebate": True, "confidenceDecay": True, "confidenceThreshold": 0.75},
                            },
                            run_by=user.id,
                            total_controls=len(controls),
                        )
                        db.add(audit)
                        await db.commit()
                        await db.refresh(audit)

                        run_audit_task.delay(str(audit.id))

                        await websocket.send_json({
                            "type": "action",
                            "action_type": "text",
                            "data": {
                                "type": "text",
                                "content": f"🚀 **Audit started!**\n\nAudit ID: `{audit.id}`\nEvaluating **{len(controls)} controls** across **{len(doc_ids)} documents**.\n\nSay **'audit status'** to check progress."
                            }
                        })
                        await websocket.send_json({"type": "done"})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        log.info("copilot_ws_disconnected", user=user.email if user else "unknown")
    except Exception as e:
        log.error("copilot_ws_error", error=str(e))
        try:
            await websocket.close()
        except Exception:
            pass
