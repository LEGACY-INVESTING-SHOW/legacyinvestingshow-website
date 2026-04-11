"""
PII Anonymization Module for Wealth Plan Blog Posts.

Ensures no full names, email addresses, phone numbers, SSNs, or
physical addresses appear in generated content.
"""
import re


# Common PII patterns to scrub
PII_PATTERNS = [
    # Email addresses
    (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[email removed]'),
    # Phone numbers (US formats)
    (r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', '[phone removed]'),
    # SSN patterns
    (r'\d{3}-\d{2}-\d{4}', '[SSN removed]'),
    (r'\d{3}\s\d{2}\s\d{4}', '[SSN removed]'),
    # Street addresses (heuristic)
    (r'\d+\s+[A-Z][a-z]+\s+(?:Street|St|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Lane|Ln|Rd|Road|Way|Court|Ct|Place|Pl|Circle|Cir)[,.]?\s*(?:[A-Za-z]+)?[,.]?\s*(?:[A-Z]{2}\s+\d{5}(?:-\d{4})?)?', '[address removed]'),
    # ZIP codes appearing alone (less aggressive — only 9-digit)
    (r'\d{5}-\d{4}', '[ZIP removed]'),
]


def anonymize_text(text: str, first_name: str, last_name: str = None) -> str:
    """Remove all PII from text, keeping only the first name.

    Args:
        text: Raw extracted text from wealth plan
        first_name: The client's first name (kept in output)
        last_name: The client's last name (removed from output)

    Returns:
        Anonymized text string
    """
    result = text

    # Remove full name patterns (First + Last)
    if last_name:
        # Remove "FirstName LastName" patterns
        full_name = f"{first_name} {last_name}"
        result = result.replace(full_name, first_name)
        # Also handle "LastName, FirstName" patterns
        reversed_name = f"{last_name}, {first_name}"
        result = result.replace(reversed_name, first_name)
        # Remove standalone last name (careful — could be common word)
        # Only remove if preceded/followed by specific context words
        result = re.sub(
            rf'\b{re.escape(last_name)}\b(?=\s*(?:is|was|has|had|earned|made|reported|filed|contributed|received))',
            first_name,
            result
        )

    # Remove email addresses
    result = re.sub(PII_PATTERNS[0][0], PII_PATTERNS[0][1], result)

    # Remove phone numbers
    result = re.sub(PII_PATTERNS[1][0], PII_PATTERNS[1][1], result)

    # Remove SSN patterns
    result = re.sub(PII_PATTERNS[2][0], PII_PATTERNS[2][1], result)
    result = re.sub(PII_PATTERNS[3][0], PII_PATTERNS[3][1], result)

    # Remove street addresses
    result = re.sub(PII_PATTERNS[4][0], PII_PATTERNS[4][1], result)

    # Remove 9-digit ZIP codes
    result = re.sub(PII_PATTERNS[5][0], PII_PATTERNS[5][1], result)

    return result


def generate_disclaimer() -> str:
    """Generate the standard disclaimer for wealth plan blog posts."""
    return (
        "> **Disclaimer:** This content is for educational and informational purposes only. "
        "It does not constitute financial, tax, or legal advice. Every individual's financial "
        "situation is unique — consult a qualified professional before making any financial decisions. "
        "The strategies discussed are based on a personalized plan and may not be suitable for everyone."
    )


def scan_for_pii(text: str, known_names: list = None) -> list:
    """Scan text for any remaining PII and return findings.

    Used as a verification step after anonymization to catch anything missed.

    Args:
        text: The text to scan
        known_names: Optional list of known full names to search for

    Returns:
        List of dicts with 'type' and 'match' keys
    """
    findings = []

    # Check for email-like patterns
    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    for email in emails:
        findings.append({"type": "email", "match": email})

    # Check for phone-like patterns
    phones = re.findall(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    for phone in phones:
        findings.append({"type": "phone", "match": phone})

    # Check for SSN-like patterns
    ssns = re.findall(r'\d{3}-\d{2}-\d{4}', text)
    for ssn in ssns:
        findings.append({"type": "SSN", "match": ssn})

    # Check for known full names if provided
    if known_names:
        for full_name in known_names:
            if full_name in text:
                findings.append({"type": "known_full_name", "match": full_name})

    # Check for full names (two consecutive capitalized words appearing together multiple times)
    # This is heuristic — it may produce false positives
    name_pattern = re.findall(r'\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b', text)
    name_counts = {}
    for first, last in name_pattern:
        full = f"{first} {last}"
        name_counts[full] = name_counts.get(full, 0) + 1

    # Filter out known safe phrases
    safe_phrases = {
        "Preston Seo", "Legacy Investing", "Legacy Investing Show",
        "Short Term", "Long Term", "Real Estate", "Tax Strategy",
        "Wealth Plan", "Financial Freedom", "Airbnb Arbitrage",
        "Net Worth", "Tax Deduction", "Cost Segregation",
    }
    for full_name, count in name_counts.items():
        if full_name not in safe_phrases and count >= 2:
            findings.append({"type": "possible_full_name", "match": full_name, "occurrences": count})

    return findings
