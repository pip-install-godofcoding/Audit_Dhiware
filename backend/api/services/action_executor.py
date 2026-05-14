"""
Action Executor — maps chatbot intents to real platform actions.

This is the bridge between natural language and the database/services.
Each method calls the same DB/service logic as the REST endpoints.
"""
import re
import uuid
import json
import structlog
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models import (
    User, Document, Audit, Finding, Event,
    AuditStatus, ReviewStatus, FindingSeverity, MaskingStatus,
)
from services.controls import get_controls_for_frameworks, ALL_CONTROLS
from config import settings

log = structlog.get_logger()

# ── Intent patterns (fast regex matching — no LLM call needed) ──────────

INTENT_PATTERNS = [
    # Document intents
    (r"(?:show|list|get|my)\s+(?:all\s+)?(?:doc|document|file)s?", "list_documents", {}),
    (r"(?:upload|attach|add)\s+(?:this|a|the|my)?\s*(?:doc|document|file|policy|pdf)", "upload_document", {}),

    # Audit intents
    (r"(?:run|start|begin|launch|trigger)\s+(?:an?\s+)?(?:new\s+)?audit", "run_audit", {}),
    (r"(?:audit|check)\s+(?:status|progress)", "audit_status", {}),
    (r"(?:show|get|list|what)\s+(?:is\s+)?(?:the\s+)?(?:audit\s+)?(?:status|progress)", "audit_status", {}),

    # Finding intents
    (r"(?:show|list|get|display)\s+(?:all\s+)?(?:the\s+)?findings?", "list_findings", {}),
    (r"(?:how many|count)\s+(?:.*?)(?:finding|gap|issue)s?", "query_findings", {}),
    (r"(?:accept|approve)\s+(?:finding\s+)?([A-Fa-f0-9-]+)", "accept_finding", {}),
    (r"(?:reject|decline)\s+(?:finding\s+)?([A-Fa-f0-9-]+)", "reject_finding", {}),
    (r"(?:modify|change|update|override)\s+(?:finding\s+)?([A-Fa-f0-9-]+)", "modify_finding", {}),
    (r"(?:pending|unreviewed)\s+(?:finding|gap|issue)s?", "pending_findings", {}),

    # Report intents
    (r"(?:generate|create|build|download|export)\s+(?:the\s+)?(?:final\s+)?report", "generate_report", {}),

    # Knowledge intents
    (r"(?:explain|what\s+is|describe|tell\s+me\s+about)\s+(?:control\s+)?([A-Z]{1,3}[\.\-][\d\.]+)", "explain_control", {}),
    (r"(?:what|which)\s+(?:framework|standard)s?\s+(?:do\s+we|are)", "list_frameworks", {}),
]


def detect_intent(user_message: str) -> tuple[str, dict]:
    """
    Detect the user's intent from their message.
    Returns (intent_name, extracted_params).
    Falls back to 'general_chat' for unrecognized intents.
    """
    text = user_message.strip().lower()

    for pattern, intent, default_params in INTENT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            params = dict(default_params)
            # Extract captured groups as params
            if match.groups():
                params["target_id"] = match.group(1)
            # Extract framework names if mentioned
            for fw in ["iso27001", "iso 27001", "soc2", "soc 2", "nist"]:
                if fw in text:
                    params.setdefault("frameworks", [])
                    normalized = fw.replace(" ", "")
                    params["frameworks"].append(normalized)
            return intent, params

    return "general_chat", {}


class ActionExecutor:
    """Execute detected intents against real DB/services."""

    async def execute(
        self, intent: str, params: dict, user: User, db: AsyncSession
    ) -> dict:
        """
        Dispatch to the correct action handler.
        Returns: {"type": "text"|"findings"|"documents"|"confirm", "content": ...}
        """
        try:
            match intent:
                case "list_documents":
                    return await self._list_documents(user, db)
                case "upload_document":
                    return self._upload_prompt()
                case "run_audit":
                    return await self._run_audit(params, user, db)
                case "audit_status":
                    return await self._audit_status(params, db)
                case "list_findings":
                    return await self._list_findings(params, user, db)
                case "query_findings":
                    return await self._query_findings(params, db)
                case "pending_findings":
                    return await self._pending_findings(db)
                case "accept_finding":
                    return await self._review_finding("accepted", params, user, db)
                case "reject_finding":
                    return await self._review_finding("rejected", params, user, db)
                case "modify_finding":
                    return await self._review_finding("modified", params, user, db)
                case "generate_report":
                    return await self._generate_report(params, user, db)
                case "explain_control":
                    return self._explain_control(params)
                case "list_frameworks":
                    return self._list_frameworks()
                case _:
                    return {"type": "passthrough"}  # Let LLM handle it
        except Exception as e:
            log.error("action_executor_failed", intent=intent, error=str(e))
            return {"type": "text", "content": f"Sorry, I encountered an error: {str(e)}"}

    # ── Document Actions ────────────────────────────────────────────────

    async def _list_documents(self, user: User, db: AsyncSession) -> dict:
        result = await db.execute(
            select(Document).order_by(Document.uploaded_at.desc()).limit(20)
        )
        docs = result.scalars().all()
        if not docs:
            return {"type": "text", "content": "No documents uploaded yet. You can drag-and-drop a file into this chat to upload one, or say **'upload a document'**."}

        items = []
        for d in docs:
            items.append({
                "id": str(d.id),
                "filename": d.filename,
                "type": d.file_type,
                "size": d.size_human or "Unknown",
                "uploaded": d.uploaded_at.strftime("%Y-%m-%d") if d.uploaded_at else "—",
                "masking": d.masking_status.value if d.masking_status else "pending",
            })
        return {"type": "documents", "content": items, "summary": f"Found **{len(items)} documents** in the system."}

    def _upload_prompt(self) -> dict:
        return {
            "type": "text",
            "content": "📎 **Ready to receive your document!**\n\nDrag-and-drop a **PDF**, **DOCX**, or **TXT** file into this chat window, and I'll upload and process it automatically.\n\nI'll handle PII masking, chunking, and embedding — you'll be notified when it's ready for auditing."
        }

    # ── Audit Actions ───────────────────────────────────────────────────

    async def _run_audit(self, params: dict, user: User, db: AsyncSession) -> dict:
        frameworks = params.get("frameworks", [])
        if not frameworks:
            return {
                "type": "text",
                "content": "Which frameworks would you like to audit against? Available options:\n\n• **ISO 27001** — Information security management\n• **SOC 2** — Service organization controls\n• **NIST CSF** — Cybersecurity framework\n\nExample: *'Run audit on ISO 27001 and SOC2'*"
            }

        # Check we have documents
        doc_result = await db.execute(select(Document.id))
        doc_ids = [str(row[0]) for row in doc_result.fetchall()]
        if not doc_ids:
            return {"type": "text", "content": "⚠️ No documents found. Please upload compliance documents first before running an audit."}

        controls = get_controls_for_frameworks(frameworks)

        return {
            "type": "confirm",
            "action": "run_audit",
            "content": f"I'll run an audit with the following configuration:\n\n• **Frameworks:** {', '.join(fw.upper() for fw in frameworks)}\n• **Controls:** {len(controls)} to evaluate\n• **Documents:** {len(doc_ids)} in scope\n• **Adversarial Debate:** Enabled\n\nShall I proceed?",
            "params": {
                "frameworks": frameworks,
                "documentIds": doc_ids,
            }
        }

    async def _audit_status(self, params: dict, db: AsyncSession) -> dict:
        import redis.asyncio as aioredis

        # Get the most recent audit
        result = await db.execute(
            select(Audit).order_by(Audit.started_at.desc()).limit(1)
        )
        audit = result.scalar_one_or_none()
        if not audit:
            return {"type": "text", "content": "No audits have been run yet. Say **'run audit on ISO 27001'** to start one."}

        # Check Redis for live progress
        try:
            redis_client = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
            raw = await redis_client.get(f"audit:{audit.id}:status")
            await redis_client.aclose()

            if raw:
                data = json.loads(raw)
                progress = data.get("progress", 0)
                status = data.get("status", "unknown")
                current = data.get("currentControl", "—")
                findings = data.get("findingsCount", 0)
                total = data.get("totalControls", 0)
                completed = data.get("completedControls", 0)

                if status == "complete":
                    return {"type": "text", "content": f"✅ **Audit Complete!**\n\n• **Controls evaluated:** {total}\n• **Findings generated:** {findings}\n\nSay **'show findings'** to review them, or **'generate report'** to create the final report."}
                elif status == "running":
                    return {"type": "text", "content": f"⏳ **Audit In Progress** — {progress}%\n\n• **Progress:** {completed}/{total} controls\n• **Current:** {current}\n• **Findings so far:** {findings}"}
                else:
                    return {"type": "text", "content": f"⚠️ Audit status: **{status}**"}
        except Exception:
            pass

        return {"type": "text", "content": f"Last audit: **{audit.status.value}** (started {audit.started_at.strftime('%Y-%m-%d %H:%M') if audit.started_at else '—'})"}

    # ── Finding Actions ─────────────────────────────────────────────────

    async def _list_findings(self, params: dict, user: User, db: AsyncSession) -> dict:
        # Get findings from the most recent audit
        audit_result = await db.execute(
            select(Audit.id).order_by(Audit.started_at.desc()).limit(1)
        )
        audit_row = audit_result.first()
        if not audit_row:
            return {"type": "text", "content": "No audits found. Run an audit first."}

        result = await db.execute(
            select(Finding)
            .where(Finding.audit_id == audit_row[0])
            .order_by(Finding.ai_severity.desc(), Finding.confidence.desc())
        )
        findings = result.scalars().all()

        if not findings:
            return {"type": "text", "content": "✅ No findings detected — all controls passed!"}

        items = []
        for f in findings:
            items.append({
                "id": str(f.id),
                "controlId": f.control_id,
                "controlName": f.control_name,
                "severity": f.ai_severity.value,
                "status": f.ai_status.value,
                "reviewStatus": f.review_status.value,
                "confidence": f.confidence,
                "remediation": f.remediation or "—",
            })

        high = sum(1 for i in items if i["severity"] == "high")
        med = sum(1 for i in items if i["severity"] == "medium")
        low = sum(1 for i in items if i["severity"] == "low")
        pending = sum(1 for i in items if i["reviewStatus"] == "pending")

        return {
            "type": "findings",
            "content": items,
            "summary": f"**{len(items)} findings** — 🔴 {high} High, 🟡 {med} Medium, 🟢 {low} Low | ⏳ {pending} pending review"
        }

    async def _query_findings(self, params: dict, db: AsyncSession) -> dict:
        audit_result = await db.execute(
            select(Audit.id).order_by(Audit.started_at.desc()).limit(1)
        )
        audit_row = audit_result.first()
        if not audit_row:
            return {"type": "text", "content": "No audits found."}

        result = await db.execute(
            select(
                func.count(Finding.id).label("total"),
                func.count(Finding.id).filter(Finding.ai_severity == FindingSeverity.high).label("high"),
                func.count(Finding.id).filter(Finding.ai_severity == FindingSeverity.medium).label("med"),
                func.count(Finding.id).filter(Finding.ai_severity == FindingSeverity.low).label("low"),
                func.count(Finding.id).filter(Finding.review_status == ReviewStatus.pending).label("pending"),
            ).where(Finding.audit_id == audit_row[0])
        )
        row = result.first()
        return {
            "type": "text",
            "content": f"📊 **Findings Summary:**\n\n• **Total:** {row.total}\n• 🔴 **High:** {row.high}\n• 🟡 **Medium:** {row.med}\n• 🟢 **Low:** {row.low}\n• ⏳ **Pending review:** {row.pending}"
        }

    async def _pending_findings(self, db: AsyncSession) -> dict:
        result = await db.execute(
            select(Finding)
            .where(Finding.review_status == ReviewStatus.pending)
            .order_by(Finding.ai_severity.desc())
            .limit(20)
        )
        findings = result.scalars().all()
        if not findings:
            return {"type": "text", "content": "✅ All findings have been reviewed!"}

        items = []
        for f in findings:
            items.append({
                "id": str(f.id),
                "controlId": f.control_id,
                "controlName": f.control_name,
                "severity": f.ai_severity.value,
                "status": f.ai_status.value,
                "reviewStatus": "pending",
                "confidence": f.confidence,
                "remediation": f.remediation or "—",
            })
        return {"type": "findings", "content": items, "summary": f"**{len(items)} findings** awaiting your review."}

    async def _review_finding(
        self, action: str, params: dict, user: User, db: AsyncSession
    ) -> dict:
        target_id = params.get("target_id", "")
        if not target_id:
            return {"type": "text", "content": f"Please specify which finding to {action}. Example: *'{action} finding abc-123'*"}

        # Try to find by ID (full or partial match)
        result = await db.execute(
            select(Finding).where(Finding.id.cast(str).startswith(target_id))
        )
        finding = result.scalar_one_or_none()

        if not finding:
            # Try matching by control_id
            result = await db.execute(
                select(Finding).where(Finding.control_id == target_id.upper())
            )
            finding = result.scalar_one_or_none()

        if not finding:
            return {"type": "text", "content": f"❌ Could not find finding with ID **{target_id}**. Say **'show findings'** to see all available findings."}

        finding.review_status = ReviewStatus(action)
        finding.reviewed_at = datetime.utcnow()
        finding.reviewed_by = user.id

        # Store event
        event = Event(
            id=uuid.uuid4(),
            audit_id=finding.audit_id,
            event_type="AuditorReviewed",
            payload={
                "finding_id": str(finding.id),
                "action": action,
                "reviewer": str(user.id),
                "via": "chatbot",
            },
        )
        db.add(event)
        await db.commit()

        status_emoji = {"accepted": "✅", "rejected": "❌", "modified": "✏️"}.get(action, "📝")
        return {
            "type": "text",
            "content": f"{status_emoji} Finding **{finding.control_id} — {finding.control_name}** has been **{action}**."
        }

    # ── Report Actions ──────────────────────────────────────────────────

    async def _generate_report(self, params: dict, user: User, db: AsyncSession) -> dict:
        audit_result = await db.execute(
            select(Audit).order_by(Audit.started_at.desc()).limit(1)
        )
        audit = audit_result.scalar_one_or_none()
        if not audit:
            return {"type": "text", "content": "No audits found. Run an audit first."}

        return {
            "type": "text",
            "content": f"📄 **Report Ready!**\n\nYou can download the audit report in multiple formats:\n\n• [View Interactive Report](/auditor/report?auditId={audit.id})\n\nOr navigate to the **Report Viewer** page to download as PDF, Excel, or JSON."
        }

    # ── Knowledge Actions ───────────────────────────────────────────────

    def _explain_control(self, params: dict) -> dict:
        target = params.get("target_id", "").upper()
        for fw_controls in ALL_CONTROLS.values():
            for ctrl in fw_controls:
                if ctrl["id"].upper() == target:
                    return {
                        "type": "text",
                        "content": (
                            f"📋 **{ctrl['id']} — {ctrl['name']}**\n\n"
                            f"**Framework:** {ctrl['framework'].upper()}\n"
                            f"**Domain:** {ctrl['domain'].replace('_', ' ').title()}\n\n"
                            f"**Requirement:**\n> {ctrl['description']}"
                        )
                    }
        return {"type": "text", "content": f"Control **{target}** not found in the loaded frameworks."}

    def _list_frameworks(self) -> dict:
        return {
            "type": "text",
            "content": (
                "📚 **Available Frameworks:**\n\n"
                f"• **ISO 27001** — {len(ALL_CONTROLS.get('iso27001', []))} controls\n"
                f"• **SOC 2** — {len(ALL_CONTROLS.get('soc2', []))} controls\n"
                f"• **NIST CSF** — {len(ALL_CONTROLS.get('nist', []))} controls\n\n"
                f"**Total:** {sum(len(v) for v in ALL_CONTROLS.values())} controls across all frameworks."
            )
        }


action_executor = ActionExecutor()
""" "description": "Singleton instance of the action executor." """
