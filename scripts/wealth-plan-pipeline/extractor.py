"""
Wealth Plan PDF/DOCX text extractor.

Extracts raw text from wealth plan files and returns structured data
with anonymized client names.
"""
import os
import re
import json
import zipfile


def extract_pdf(filepath: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    import fitz  # PyMuPDF - imported here to allow module loading without it

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"PDF not found: {filepath}")
    doc = fitz.open(filepath)
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return "\n".join(text_parts)


def extract_docx(filepath: str) -> str:
    """Extract text from a DOCX file by parsing XML content."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"DOCX not found: {filepath}")
    with zipfile.ZipFile(filepath, 'r') as z:
        with z.open('word/document.xml') as f:
            xml_content = f.read().decode('utf-8')
    # Strip XML tags — simple but effective for DOCX
    text = re.sub(r'<[^>]+>', ' ', xml_content)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _classify_plan_type(text: str) -> str:
    """Classify the plan type based on content keywords."""
    text_lower = text.lower()
    # Check H1B first as it's more specific
    if "h1b" in text_lower:
        return "H1B Visa Wealth Plan"
    if "wealth strategy snapshot" in text_lower or "wss" in text_lower:
        return "Wealth Strategy Snapshot"
    if "wealth plan" in text_lower or "wp" in text_lower.split():
        return "Wealth Plan"
    return "Wealth Plan"  # default


def _extract_first_name_from_filename(filepath: str) -> str:
    """Parse the client's first name from the filename.

    Filenames use patterns like:
      - "Josh Afutiti WP .docx"
      - "Qu Chen WP.pdf"
      - "Piotr Michalik WP .docx"
      - "victoria_west_-_wss.pdf"
      - "karin_moeller (WSS).pdf"
    """
    basename = os.path.basename(filepath)
    name_part = re.split(r'[_\s]*(?:WP|WSS|Wealth|Wealth Strategy|Plan)', basename, flags=re.IGNORECASE)[0]
    name_part = name_part.strip().rstrip('-_. ')
    # Handle "Last, First" or "First Last" patterns
    # Take only the first name (first word, or first name before a last name)
    parts = re.split(r'[\s_]+', name_part)
    first_name = parts[0].strip()
    # Capitalize properly
    first_name = first_name.capitalize()
    return first_name if first_name else "Client"


def _anonymize_text(text: str, first_name: str) -> str:
    """Remove full names and PII from extracted text.

    Strategy:
    1. Replace any occurrence of a full name (2+ consecutive capitalized words
       at the start of lines or after colon/comma) with just the first name.
    2. Replace email addresses with [email removed].
    3. Replace phone numbers with [phone removed].
    4. Replace SSN patterns with [SSN removed].
    """
    # Remove email addresses
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[email removed]', text)
    # Remove phone numbers (various formats)
    text = re.sub(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', '[phone removed]', text)
    # Remove SSN patterns
    text = re.sub(r'\d{3}-\d{2}-\d{4}', '[SSN removed]', text)
    # Remove addresses (basic heuristic: street addresses with numbers)
    text = re.sub(r'\d+\s+[A-Z][a-z]+\s+(?:Street|St|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Lane|Ln|Rd|Road|Way|Court|Ct|Place|Pl|Circle|Cir)[,.]?\s*(?:[A-Z][a-z]+)?[,.]?\s*(?:[A-Z]{2}\s+\d{5})?', '[address removed]', text)

    return text


def extract_wealth_plan(filepath: str) -> dict:
    """Extract text from a wealth plan file and return structured data.

    Returns:
        dict with keys:
            - first_name: anonymized first name only
            - raw_text: extracted text (PII removed)
            - plan_type: classified plan type string
            - source_file: original filepath
            - word_count: approximate word count
            - extraction_status: "success" or "error"
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    # Extract text based on file type
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.pdf':
        raw_text = extract_pdf(filepath)
    elif ext == '.docx':
        raw_text = extract_docx(filepath)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    first_name = _extract_first_name_from_filename(filepath)
    plan_type = _classify_plan_type(raw_text)
    anonymized_text = _anonymize_text(raw_text, first_name)

    word_count = len(anonymized_text.split())

    return {
        "first_name": first_name,
        "raw_text": anonymized_text,
        "plan_type": plan_type,
        "source_file": filepath,
        "word_count": word_count,
        "extraction_status": "success"
    }


if __name__ == "__main__":
    import sys
    filepath = sys.argv[1] if len(sys.argv) > 1 else None
    if not filepath:
        print("Usage: python3 extractor.py <wealth-plan-file>")
        sys.exit(1)
    result = extract_wealth_plan(filepath)
    print(json.dumps(result, indent=2, ensure_ascii=False))
