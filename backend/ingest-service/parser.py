"""
Document parser — supports PDF, DOCX, TXT, and scanned images (OCR).
Built on top of the original team implementation with added DOCX support.
"""
import os
import io
import pdfplumber
import fitz  # PyMuPDF (fallback)
import docx
from PIL import Image
import pytesseract
import structlog

log = structlog.get_logger()


def parse_document(file_bytes: bytes, file_type: str) -> str:
    """Parse raw file bytes into plain text."""
    file_type = file_type.lower().strip(".")

    if file_type == "pdf":
        return _parse_pdf(file_bytes)
    elif file_type == "docx":
        return _parse_docx(file_bytes)
    elif file_type == "txt":
        return _parse_txt(file_bytes)
    elif file_type in ("png", "jpg", "jpeg"):
        return _parse_image(file_bytes)
    else:
        log.warning("unsupported_file_type", file_type=file_type)
        return file_bytes.decode("utf-8", errors="replace")


def _parse_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF — tries pdfplumber first, falls back to PyMuPDF."""
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception:
        log.info("pdfplumber_failed_falling_back_to_pymupdf")
        text = ""

    # Fallback to PyMuPDF if pdfplumber got nothing
    if not text.strip():
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                text += page.get_text() + "\n"

    return text.strip()


def _parse_docx(file_bytes: bytes) -> str:
    """Extract text from Word documents."""
    doc_obj = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc_obj.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _parse_txt(file_bytes: bytes) -> str:
    """Read plain text files."""
    return file_bytes.decode("utf-8", errors="replace").strip()


def _parse_image(file_bytes: bytes) -> str:
    """OCR for scanned documents and screenshots."""
    image = Image.open(io.BytesIO(file_bytes))
    return pytesseract.image_to_string(image).strip()