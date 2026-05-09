"""
PII masker — combines Presidio NER-based detection with India-specific regex patterns.
Built on top of the original team implementation.
"""
import re
import structlog
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

log = structlog.get_logger()

# Singleton engines (heavy to initialize)
_analyzer = None
_anonymizer = None


def _get_engines():
    global _analyzer, _anonymizer
    if _analyzer is None:
        _analyzer = AnalyzerEngine()
        _anonymizer = AnonymizerEngine()
    return _analyzer, _anonymizer


def mask_pii(text: str) -> tuple[str, int]:
    """
    Two-pass PII redaction:
      1. Presidio (NER-based) — names, SSNs, credit cards, emails, etc.
      2. India-specific regex — Aadhaar, PAN, Indian phone numbers
    
    Returns (masked_text, total_pii_entities_found).
    """
    total_count = 0

    # ── Pass 1: Presidio ──────────────────────────────────────────────────
    try:
        analyzer, anonymizer = _get_engines()
        results = analyzer.analyze(text=text, language="en")
        anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
        text = anonymized.text
        total_count += len(results)
    except Exception as e:
        log.error("presidio_masking_failed", error=str(e))

    # ── Pass 2: India-specific regex (from original pii_masker.py) ────────

    # Aadhaar numbers (12 consecutive digits)
    aadhaar = re.findall(r'\b\d{12}\b', text)
    text = re.sub(r'\b\d{12}\b', '[AADHAAR]', text)
    total_count += len(aadhaar)

    # PAN numbers (Indian format: ABCDE1234F)
    pan = re.findall(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', text)
    text = re.sub(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', '[PAN]', text)
    total_count += len(pan)

    # Indian phone numbers (10 digits)
    phone = re.findall(r'\b\d{10}\b', text)
    text = re.sub(r'\b\d{10}\b', '[PHONE]', text)
    total_count += len(phone)

    # Emails (catch any Presidio missed)
    emails = re.findall(r'\S+@\S+', text)
    text = re.sub(r'\S+@\S+', '[EMAIL]', text)
    total_count += len(emails)

    log.info("pii_masking_complete", total_entities=total_count)
    return text, total_count