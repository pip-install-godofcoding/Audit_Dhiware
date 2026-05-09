from fastapi import FastAPI, UploadFile, File
import shutil
import os
from parser import parse_document
from pii_masker import mask_pii   # 👈 NEW

app = FastAPI()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/upload-doc")
async def upload_doc(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    # Save file locally
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Step 1: Parse document
    parsed_text = parse_document(file_path)

    # Step 2: Mask PII
    masked_text = mask_pii(parsed_text)

    return {
        "filename": file.filename,
        "parsed_text_preview": parsed_text[:300],
        "masked_text_preview": masked_text[:300]
    }