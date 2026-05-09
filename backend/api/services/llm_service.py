"""
LLM Service — Local inference via Ollama / vLLM (OpenAI-compatible API).

No API keys. No mocks. Fully local.

Models used:
  - Mistral (7B): Prosecutor, Defender, Classifier — fast, good instruction following
  - Llama 3.1 (8B): Judge — stronger reasoning for final verdicts

All calls go through the OpenAI-compatible /v1/chat/completions endpoint
exposed by Ollama at http://ollama:11434/v1

Three capabilities:
  1. classify_control  — Evaluate evidence against a control
  2. run_adversarial_debate — Prosecutor + Defender + Judge tribunal
  3. copilot_chat — Auditor assistant chatbot
"""
import asyncio
import json
import re
import structlog
import httpx

from config import settings

log = structlog.get_logger()

# Timeout for local LLM calls (can be slow on CPU)
LLM_TIMEOUT = 120.0


async def _call_llm(
    prompt: str,
    model: str | None = None,
    system_prompt: str | None = None,
    temperature: float = 0.1,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> str:
    """
    Call the local LLM via OpenAI-compatible chat completions API.
    Works with Ollama, vLLM, llama.cpp, LocalAI, or any OpenAI-compatible server.
    """
    model = model or settings.llm_model

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    if json_mode:
        body["format"] = "json"

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        response = await client.post(
            f"{settings.llm_base_url}/chat/completions",
            json=body,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()

    return data["choices"][0]["message"]["content"]


def _extract_json(text: str) -> dict:
    """
    Robustly extract JSON from LLM output.
    Handles cases where the model wraps JSON in markdown code blocks.
    """
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from ```json ... ``` blocks
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    log.warning("json_extraction_failed", text_preview=text[:200])
    return {}


class LLMService:
    """Local LLM powered compliance intelligence — no API keys required."""

    # ── 1. Control Classification ──────────────────────────────────────────

    async def classify_control(self, control: dict, chunks: list[dict]) -> dict:
        """
        Evaluate retrieved evidence against a compliance control using local LLM.
        Returns: {status, confidence, source, remediation}
        """
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
  "status": "covered" or "partial" or "gap" or "stale",
  "confidence": a number between 0.0 and 1.0,
  "source": "document name and section that most directly addresses this control",
  "remediation": "plain English remediation if status is not covered, otherwise null"
}}

Rules:
- covered: All evidence is present and current
- partial: Some evidence exists but incomplete or ambiguous
- gap: Required by framework, no relevant evidence found
- stale: Evidence exists but is more than 12 months old
- confidence must reflect actual evidence quality
- remediation must be specific and actionable, max 2 sentences"""

        try:
            raw = await _call_llm(
                prompt=prompt,
                model=settings.llm_model,
                temperature=0.1,
                json_mode=True,
            )
            result = _extract_json(raw)

            # Validate and ensure required fields
            status = result.get("status", "partial")
            if status not in ("covered", "partial", "gap", "stale"):
                status = "partial"

            confidence = float(result.get("confidence", 0.5))
            confidence = max(0.0, min(1.0, confidence))

            log.info("llm_classification", control=control["id"], status=status, model=settings.llm_model)

            return {
                "status": status,
                "confidence": confidence,
                "source": result.get("source", chunks[0]["filename"] if chunks else "Unknown"),
                "remediation": result.get("remediation"),
            }

        except Exception as e:
            log.error("llm_classification_failed", control=control["id"], error=str(e))
            # Deterministic fallback — classify as gap so it gets flagged for human review
            return {
                "status": "partial",
                "confidence": 0.5,
                "source": chunks[0]["filename"] if chunks else "LLM unavailable",
                "remediation": f"LLM evaluation failed. Manual review required for {control['name']}.",
            }

    # ── 2. Adversarial Debate ──────────────────────────────────────────────

    async def run_adversarial_debate(self, control: dict, chunks: list[dict]) -> dict:
        """
        Three-agent adversarial tribunal using local LLMs:
          - Prosecutor (Mistral): argues the control is NOT met
          - Defender (Mistral): argues the control IS met
          - Judge (Llama 3.1): weighs arguments and delivers verdict

        Prosecutor and Defender run in parallel for speed.
        """
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
            # Run Prosecutor and Defender in parallel on Mistral
            p_raw, d_raw = await asyncio.gather(
                _call_llm(prosecutor_prompt, model=settings.llm_model, temperature=0.2, json_mode=True),
                _call_llm(defender_prompt, model=settings.llm_model, temperature=0.2, json_mode=True),
            )

            p_data = _extract_json(p_raw)
            d_data = _extract_json(d_raw)

            prosecutor_args = p_data.get("points", ["No arguments generated"])
            defender_args = d_data.get("points", ["No arguments generated"])

            # ── Judge evaluates both sides (Llama 3.1 — heavier model) ─────

            judge_prompt = f"""You are the JUDGE in a compliance audit tribunal.
Control: {control['id']} — {control['name']}
Requirement: {control['description']}

PROSECUTOR argues control is NOT met:
{json.dumps(prosecutor_args, indent=2)}

DEFENDER argues control IS met:
{json.dumps(defender_args, indent=2)}

Weigh both arguments carefully and deliver your verdict.
Respond with JSON:
{{
  "confidence": a number between 0.0 and 1.0,
  "verdict": "covered" or "partial" or "gap" or "stale",
  "decisiveEvidence": "the single most decisive piece of evidence or its absence"
}}"""

            j_raw = await _call_llm(
                judge_prompt,
                model=settings.llm_judge_model,
                temperature=0.1,
                json_mode=True,
            )
            judge_data = _extract_json(j_raw)

            verdict = judge_data.get("verdict", "partial")
            if verdict not in ("covered", "partial", "gap", "stale"):
                verdict = "partial"

            confidence = float(judge_data.get("confidence", 0.6))
            confidence = max(0.0, min(1.0, confidence))

            log.info(
                "adversarial_debate_complete",
                control=control["id"],
                verdict=verdict,
                judge_model=settings.llm_judge_model,
            )

            return {
                "prosecutorArgs": prosecutor_args,
                "defenderArgs": defender_args,
                "judgeVerdict": {
                    "confidence": confidence,
                    "verdict": verdict,
                    "decisiveEvidence": judge_data.get(
                        "decisiveEvidence",
                        "Unable to determine decisive evidence",
                    ),
                },
            }

        except Exception as e:
            log.error("adversarial_debate_failed", control=control["id"], error=str(e))
            return {
                "prosecutorArgs": [f"LLM debate failed for {control['id']}. Manual review required."],
                "defenderArgs": ["Unable to generate defense — LLM unavailable."],
                "judgeVerdict": {
                    "confidence": 0.5,
                    "verdict": "partial",
                    "decisiveEvidence": "Adversarial debate could not complete. Flagged for manual review.",
                },
            }

    # ── 3. Copilot Chat ────────────────────────────────────────────────────

    async def copilot_chat(self, messages: list[dict], context: str = "") -> str:
        """
        Auditor copilot chatbot powered by local Mistral.
        Answers compliance questions with awareness of the current audit context.
        """
        system_prompt = f"""You are an expert cybersecurity compliance auditor assistant for the Dhiware Compliance Intelligence Platform.
Help auditors understand findings, interpret controls, and suggest remediations.
Be concise, precise, and cite specific standards when relevant.
Current audit context: {context}"""

        # Build the conversation as a single prompt for the local LLM
        conversation = ""
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            conversation += f"\n{role}: {msg['content']}"

        prompt = f"{conversation}\n\nAssistant:"

        try:
            reply = await _call_llm(
                prompt=prompt,
                model=settings.llm_model,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=500,
            )
            return reply.strip()

        except Exception as e:
            log.error("copilot_chat_failed", error=str(e))
            return (
                "I'm having trouble connecting to the local LLM service. "
                "Please ensure Ollama is running and the model is loaded. "
                "You can check with: docker logs ollama"
            )


llm_service = LLMService()
