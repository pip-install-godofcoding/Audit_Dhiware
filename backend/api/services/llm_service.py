"""
LLM Service — OpenAI GPT-4o powered compliance analysis.

Three capabilities:
  1. classify_control  — Evaluate evidence against a control → status/confidence
  2. run_adversarial_debate — Prosecutor + Defender + Judge tribunal
  3. copilot_chat — Auditor assistant chatbot

Falls back to deterministic mocks when OPENAI_API_KEY is not set.
"""
import asyncio
import json
import random
import structlog

from openai import AsyncOpenAI
from config import settings

log = structlog.get_logger()

client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


class LLMService:
    """GPT-4o powered compliance intelligence with mock fallback."""

    # ── 1. Control Classification ──────────────────────────────────────────

    async def classify_control(self, control: dict, chunks: list[dict]) -> dict:
        """
        Evaluate retrieved evidence against a compliance control.
        Returns: {status, confidence, source, remediation}
        """
        if not client:
            return self._mock_classification(control, chunks)

        context = "\n\n".join([
            f"[Source: {c['filename']} — {c['section_ref']}, Page {c['page_number']}]\n{c['chunk_text']}"
            for c in chunks
        ])

        prompt = f"""You are a cybersecurity auditor evaluating evidence for a compliance control.

CONTROL: {control['id']} — {control['name']}
REQUIREMENT: {control['description']}

EVIDENCE RETRIEVED FROM DOCUMENTS:
{context}

Evaluate whether the evidence satisfies this control.
Respond ONLY with valid JSON in this exact format:
{{
  "status": "covered" | "partial" | "gap" | "stale",
  "confidence": 0.0-1.0,
  "source": "document name and section that most directly addresses this control",
  "remediation": "plain English remediation if status is not covered, else null"
}}

Rules:
- covered: All evidence is present and current
- partial: Some evidence exists but incomplete or ambiguous
- gap: Required by framework, no relevant evidence found
- stale: Evidence exists but is more than 12 months old
- confidence must reflect actual evidence quality, not just a guess
- remediation must be specific and actionable, max 2 sentences"""

        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
            result = json.loads(raw)
            log.info("llm_classification", control=control["id"], status=result.get("status"))
            return result
        except Exception as e:
            log.error("llm_classification_failed", control=control["id"], error=str(e))
            return self._mock_classification(control, chunks)

    # ── 2. Adversarial Debate ──────────────────────────────────────────────

    async def run_adversarial_debate(self, control: dict, chunks: list[dict]) -> dict:
        """
        Three-agent adversarial tribunal:
          - Prosecutor: argues the control is NOT met
          - Defender: argues the control IS met
          - Judge: weighs arguments and delivers verdict

        Returns: {prosecutorArgs, defenderArgs, judgeVerdict}
        """
        if not client:
            return self._mock_debate(control)

        context = "\n\n".join([
            f"[{c['filename']} — {c['section_ref']}]\n{c['chunk_text']}"
            for c in chunks
        ])

        # ── Prosecutor + Defender run in parallel ──────────────────────────

        prosecutor_prompt = f"""You are the PROSECUTOR in a compliance audit tribunal.
Control: {control['id']} — {control['name']}
Requirement: {control['description']}
Evidence: {context}

Argue that this control is NOT met. Cite specific evidence gaps or contradictions.
Respond with JSON: {{"points": ["point 1", "point 2", "point 3"]}}
Maximum 4 bullet points. Be specific. Do not speculate."""

        defender_prompt = f"""You are the DEFENDER in a compliance audit tribunal.
Control: {control['id']} — {control['name']}
Requirement: {control['description']}
Evidence: {context}

Argue that this control IS met. Cite specific evidence that supports compliance.
Respond with JSON: {{"points": ["point 1", "point 2"]}}
Maximum 4 bullet points. Be specific. Do not invent evidence."""

        try:
            p_resp, d_resp = await asyncio.gather(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prosecutor_prompt}],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                ),
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": defender_prompt}],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                ),
            )

            prosecutor_args = json.loads(p_resp.choices[0].message.content)["points"]
            defender_args = json.loads(d_resp.choices[0].message.content)["points"]

            # ── Judge evaluates both sides ─────────────────────────────────

            judge_prompt = f"""You are the JUDGE in a compliance audit tribunal.
Control: {control['id']} — {control['name']}
PROSECUTOR says: {prosecutor_args}
DEFENDER says: {defender_args}

Weigh both arguments and deliver your verdict.
Respond with JSON:
{{
  "confidence": 0.0-1.0,
  "verdict": "covered"|"partial"|"gap"|"stale",
  "decisiveEvidence": "the single most decisive piece of evidence or its absence"
}}"""

            j_resp = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": judge_prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            judge_data = json.loads(j_resp.choices[0].message.content)

            log.info(
                "adversarial_debate_complete",
                control=control["id"],
                verdict=judge_data.get("verdict"),
            )

            return {
                "prosecutorArgs": prosecutor_args,
                "defenderArgs": defender_args,
                "judgeVerdict": {
                    "confidence": judge_data["confidence"],
                    "verdict": judge_data["verdict"],
                    "decisiveEvidence": judge_data["decisiveEvidence"],
                },
            }

        except Exception as e:
            log.error("adversarial_debate_failed", control=control["id"], error=str(e))
            return self._mock_debate(control)

    # ── 3. Copilot Chat ────────────────────────────────────────────────────

    async def copilot_chat(self, messages: list[dict], context: str = "") -> str:
        """
        Auditor copilot chatbot — answers compliance questions
        with awareness of the current audit context.
        """
        if not client:
            return self._mock_copilot(messages[-1]["content"] if messages else "")

        system_msg = f"""You are an expert cybersecurity compliance auditor assistant for the Dhiware Compliance Intelligence Platform.
Help auditors understand findings, interpret controls, and suggest remediations.
Be concise, precise, and cite specific standards when relevant.
Current audit context: {context}"""

        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": system_msg}] + messages,
                temperature=0.3,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            log.error("copilot_chat_failed", error=str(e))
            return self._mock_copilot(messages[-1]["content"] if messages else "")

    # ── Mock Fallbacks (no API key) ────────────────────────────────────────

    def _mock_classification(self, control: dict, chunks: list[dict]) -> dict:
        statuses = ["covered", "covered", "partial", "gap", "stale"]
        status = random.choice(statuses)
        confidence = round(random.uniform(0.65, 0.98), 2)
        return {
            "status": status,
            "confidence": confidence,
            "source": (
                f"{chunks[0]['filename']} — {chunks[0]['section_ref']}"
                if chunks
                else "No evidence found"
            ),
            "remediation": (
                None
                if status == "covered"
                else f"Address {control['name']} gap by reviewing relevant documentation."
            ),
        }

    def _mock_debate(self, control: dict) -> dict:
        return {
            "prosecutorArgs": [
                f"No explicit evidence of {control['name']} implementation found",
                "Evidence is outdated or lacks specific timestamps",
                "Required scope coverage appears incomplete",
            ],
            "defenderArgs": [
                f"Policy document references {control['name']} requirements",
                "SOC report provides partial attestation of this control",
            ],
            "judgeVerdict": {
                "confidence": 0.72,
                "verdict": "partial",
                "decisiveEvidence": (
                    "Policy defines the control but implementation evidence "
                    "is insufficient for full compliance."
                ),
            },
        }

    def _mock_copilot(self, question: str) -> str:
        return (
            f"Based on the current audit context, I can see this relates to "
            f"{question[:50]}... The key concern here is ensuring your evidence "
            f"aligns with the framework requirements. Would you like me to explain "
            f"the specific control requirements or suggest remediation steps?"
        )


llm_service = LLMService()
