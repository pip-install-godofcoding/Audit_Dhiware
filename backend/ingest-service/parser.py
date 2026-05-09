import os
import pdfplumber
from PIL import Image
import pytesseract


def parse_document(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext == ".txt":
        return parse_txt(file_path)
    elif ext in [".png", ".jpg", ".jpeg"]:
        return parse_image(file_path)
    else:
        return "Unsupported file type"


def parse_pdf(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


def parse_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def parse_image(file_path: str) -> str:
    image = Image.open(file_path)
    return pytesseract.image_to_string(image)