import re

def mask_pii(text: str) -> str:
    # Mask emails
    text = re.sub(r'\S+@\S+', '[EMAIL]', text)

    # Mask phone numbers (10 digit)
    text = re.sub(r'\b\d{10}\b', '[PHONE]', text)

    # Mask Aadhaar-like numbers (12 digit)
    text = re.sub(r'\b\d{12}\b', '[AADHAAR]', text)

    # Mask PAN (India format: ABCDE1234F)
    text = re.sub(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', '[PAN]', text)

    return text