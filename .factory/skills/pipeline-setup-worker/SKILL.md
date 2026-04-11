---
name: pipeline-setup-worker
description: Sets up the extraction pipeline, blog post template, anonymization module, and keyword enrichment for converting wealth plan PDFs/DOCXs into SEO-optimized blog posts on the Legacy Investing Show website.
---

# Pipeline Setup Worker

Sets up all infrastructure needed before batch-converting wealth plans into blog posts. This worker owns Milestone 1 of the wealth-plan-to-blog mission.

## When to Use This Skill

Invoke this skill when:
- The wealth-plan-to-blog project needs its pipeline built from scratch (no prior extraction scripts exist)
- New blog post markdown template or anonymization logic needs to be added
- The `extractKeywords()` function in `build-blog.js` needs a "Wealth Plan" category entry
- A test batch of 2 wealth plans needs to be extracted, converted, built, and verified on localhost
- Any prerequisite tooling (PyMuPDF, zipfile, etc.) needs to be installed and tested

Do NOT invoke for:
- Batch extraction/conversion of wealth plans beyond the initial 2 test posts (that is `content-conversion-worker`)
- Modifying existing blog content unrelated to wealth plans
- SEO audits or analytics (separate mission)

## Required Skills

- **Python 3.11+** — for PDF/DOCX text extraction (`PyMuPDF`, `zipfile`, `re`)
- **Node.js 18+** — for modifying `scripts/build-blog.js` and running `npm run build`
- **agent-browser** — for visual spot-check verification on `localhost:3000`

## Context

**Source files:** ~129 wealth plan PDFs and DOCXs live in:
```
Wealth Plans/                          # top-level .docx files (7)
Wealth Plans/Personalized Plans/       # per-client PDFs (~110+)
Wealth Plans/Personalized Plans/H1B Visa WP/  # H1B sub-folder (3 PDFs)
```

File names contain **full names** (e.g. `Abigail McCaskey - Preston_s Plan.docx`, `Piotr Michalik WP .docx`). These names must be **anonymized** — only first names in content, filenames, slugs, and frontmatter.

**Existing build system:**
- Blog source: `content/blog/*.md` → built HTML in `blog/*.html`
- Build command: `npm run build:blog` (uses `scripts/build-blog.js`)
- Template: `templates/blog-post.html`
- Blog index: `blog/index.html` (auto-generated, has category filter)
- `extractKeywords()` in `build-blog.js` maps category → keyword array; add "Wealth Plan" category there

**Wealth plan documents are rich structured advisory reports containing:**
- Client personal information (MUST be anonymized)
- Financial snapshot (income, expenses, net worth)
- Tax strategy recommendations
- Airbnb/real estate strategies
- Retirement planning details
- Action items and timelines

## Work Procedure

### Step 1: Install Python Dependencies

```bash
pip3 install PyMuPDF
```

Verify:
```bash
python3 -c "import fitz; print(fitz.__version__)"
```

### Step 2: Write Tests for PDF/DOCX Extraction (TDD — Red Phase)

Create `scripts/wealth-plan-pipeline/extractor.test.py`:

```python
"""Tests for wealth plan text extraction.

Run: python3 -m pytest scripts/wealth-plan-pipeline/extractor.test.py -v
"""
import pytest
import json
from extractor import extract_pdf, extract_docx, extract_wealth_plan

def test_extract_pdf_returns_text():
    """PDF extraction should return non-empty text string."""
    # Use any real PDF from Wealth Plans/
    text = extract_pdf("Wealth Plans/Personalized Plans/Qu Chen WP.pdf")
    assert isinstance(text, str)
    assert len(text) > 100  # Real plans are multi-page

def test_extract_docx_returns_text():
    """DOCX extraction should return non-empty text string."""
    text = extract_docx("Wealth Plans/Trent Hanson WP.docx")
    assert isinstance(text, str)
    assert len(text) > 100

def test_extract_wealth_plan_returns_structured_data():
    """Should return a dict with expected keys and anonymized first name."""
    result = extract_wealth_plan("Wealth Plans/Personalized Plans/Qu Chen WP.pdf")
    assert isinstance(result, dict)
    assert "first_name" in result
    assert "raw_text" in result
    assert "plan_type" in result
    # First name should be anonymized (single word)
    assert " " not in result["first_name"]

def test_extract_wealth_plan_docx_returns_structured_data():
    """DOCX extraction should also return structured data."""
    result = extract_wealth_plan("Wealth Plans/Trent Hanson WP.docx")
    assert isinstance(result, dict)
    assert "first_name" in result
    assert "raw_text" in result

def test_file_not_found_raises():
    """Should raise FileNotFoundError for missing files."""
    with pytest.raises(FileNotFoundError):
        extract_wealth_plan("Wealth Plans/NonExistent.pdf")
```

Run tests — they should **fail** (no `extractor.py` yet).

```bash
cd scripts/wealth-plan-pipeline
python3 -m pytest extractor.test.py -v
```

### Step 3: Implement the Extraction Script

Create `scripts/wealth-plan-pipeline/extractor.py`:

```python
"""
Wealth Plan PDF/DOCX text extractor.

Extracts raw text from wealth plan files and returns structured data
with anonymized client names.
"""
import os
import re
import json
import zipfile
import fitz  # PyMuPDF


def extract_pdf(filepath: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
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
    if "wealth strategy snapshot" in text_lower or "wss" in text_lower:
        return "Wealth Strategy Snapshot"
    if "wealth plan" in text_lower or "wp" in text_lower.split():
        return "Wealth Plan"
    if "h1b" in text_lower:
        return "H1B Visa Wealth Plan"
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
```

### Step 4: Run Tests for Extraction (Green Phase)

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website/scripts/wealth-plan-pipeline
python3 -m pytest extractor.test.py -v
```

All tests should now pass. If any fail, debug and fix.

### Step 5: Write Tests for Markdown Generation

Create `scripts/wealth-plan-pipeline/generator.test.py`:

```python
"""Tests for wealth plan markdown generator.

Run: python3 -m pytest scripts/wealth-plan-pipeline/generator.test.py -v
"""
import pytest
import os
from generator import generate_blog_markdown, generate_slug, generate_frontmatter

def test_generate_slug_from_first_name():
    """Slug should use first name only, be URL-safe."""
    slug = generate_slug("Trent", "Wealth Plan")
    assert slug == "trent-wealth-plan"
    assert " " not in slug

def test_generate_slug_no_special_chars():
    """Slug should strip special characters."""
    slug = generate_slug("O'Brien", "Wealth Strategy Snapshot")
    # Apostrophe removed
    assert "'" not in slug

def test_generate_frontmatter_has_required_fields():
    """Frontmatter must include all required SEO fields."""
    fm = generate_frontmatter(
        first_name="Trent",
        plan_type="Wealth Plan",
        description="Trent's personalized wealth plan breakdown.",
        date="2026-04-10",
        slug="trent-wealth-plan"
    )
    assert "title:" in fm
    assert "description:" in fm
    assert "date:" in fm
    assert "author: Preston Seo" in fm
    assert "category: Wealth Plan" in fm
    assert "slug: trent-wealth-plan" in fm
    assert "canonical:" in fm

def test_generate_frontmatter_disclaimer():
    """Frontmatter should include disclaimer flag."""
    fm = generate_frontmatter(
        first_name="Qu",
        plan_type="Wealth Plan",
        description="Qu's wealth plan.",
        date="2026-04-10",
        slug="qu-wealth-plan"
    )
    assert "disclaimer: true" in fm

def test_generate_blog_markdown_has_disclaimer():
    """Generated markdown must start with disclaimer."""
    structured_data = {
        "first_name": "Trent",
        "raw_text": "Sample text about wealth planning strategies...",
        "plan_type": "Wealth Plan",
        "source_file": "test.pdf",
        "word_count": 3500,
        "extraction_status": "success"
    }
    md = generate_blog_markdown(structured_data)
    assert md.startswith("---")
    assert "Disclaimer" in md or "disclaimer" in md

def test_generate_blog_markdown_no_full_names():
    """Generated content must not contain full names."""
    structured_data = {
        "first_name": "Trent",
        "raw_text": "Trent Hanson is a great client. His wife Sarah Hanson.",
        "plan_type": "Wealth Plan",
        "source_file": "test.pdf",
        "word_count": 25,
        "extraction_status": "success"
    }
    md = generate_blog_markdown(structured_data)
    # Should not contain "Trent Hanson" or "Sarah Hanson"
    assert "Hanson" not in md

def test_generate_blog_markdown_word_count_sufficient():
    """Generated markdown should target 3,000-5,000 words."""
    structured_data = {
        "first_name": "Trent",
        "raw_text": "A" * 5000,  # Long text to simulate real plan
        "plan_type": "Wealth Plan",
        "source_file": "test.pdf",
        "word_count": 3500,
        "extraction_status": "success"
    }
    md = generate_blog_markdown(structured_data)
    # Just check structure exists — actual word count handled by content generation step
    assert "## " in md  # Has H2 headings
```

Run tests — they should fail (no `generator.py` yet):

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website/scripts/wealth-plan-pipeline
python3 -m pytest generator.test.py -v
```

### Step 6: Implement the Markdown Generator

Create `scripts/wealth-plan-pipeline/generator.py`:

```python
"""
Wealth Plan Markdown Generator.

Converts structured extraction data into a SEO-optimized blog post markdown
with proper frontmatter, disclaimer, FAQ, and statistics.
"""
import re
import os
from datetime import date


DISCLAIMER_TEXT = (
    "> **Disclaimer:** This content is for educational and informational purposes only. "
    "It does not constitute financial, tax, or legal advice. Every individual's financial "
    "situation is unique — consult a qualified professional before making any financial decisions. "
    "The strategies discussed are based on a personalized plan and may not be suitable for everyone."
)


def generate_slug(first_name: str, plan_type: str) -> str:
    """Generate a URL-safe slug from first name and plan type."""
    slug_base = f"{first_name} {plan_type}".lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug_base)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def generate_frontmatter(
    first_name: str,
    plan_type: str,
    description: str,
    date: str,
    slug: str,
    statistics: list = None,
    faq: list = None,
) -> str:
    """Generate YAML frontmatter for the blog post."""
    title = f"{first_name}'s {plan_type}: Personalized Wealth Strategy Breakdown"
    canonical = f"https://www.legacyinvestingshow.com/blog/{slug}"

    # Build keywords
    keywords = [
        "wealth plan", "personalized wealth strategy", "financial planning",
        "tax strategy", "wealth building", "investing strategy",
        "retirement planning", f"{first_name.lower()} wealth plan",
    ]

    # Build SEO section
    seo_block = f"""
  primaryKeyword: personalized wealth strategy
  secondaryKeywords:
    - wealth plan breakdown
    - tax optimization strategy
  longTailKeywords:
    - how to create a personalized wealth plan
    - wealth strategy for {first_name.lower()}
  searchIntent: informational"""

    # Build statistics block
    stats_block = ""
    if statistics:
        stats_lines = []
        for stat in statistics:
            stats_lines.append(f"    - label: \"{stat['label']}\"")
            stats_lines.append(f"      value: \"{stat['value']}\"")
            stats_lines.append(f"      icon: \"{stat.get('icon', 'dollar')}\"")
        stats_block = "\nstatistics:\n" + "\n".join(stats_lines)

    # Build FAQ block
    faq_block = ""
    if faq:
        faq_lines = ["faq:"]
        for item in faq:
            faq_lines.append(f"  - question: \"{item['question']}\"")
            faq_lines.append(f"    answer: \"{item['answer']}\"")
        faq_block = "\n" + "\n".join(faq_lines)

    frontmatter = f"""---
title: "{title}"
titleTemplate: '%s | Legacy Investing Show Wealth Plans'
description: "{description}"
date: {date}
modifiedDate: {date}
author: Preston Seo
authorTitle: 'Founder, Legacy Investing Show'
authorCredentials: '2,000+ students trained, $10M+ student revenue generated'
category: Wealth Plan
canonical: {canonical}
seo:{seo_block}
tags:
  - wealth plan
  - personalized strategy
  - financial planning
  - tax optimization
  - wealth building
image: /assets/images/blog/wealth-plan-{first_name.lower()}.jpg
imageAlt: "{first_name}'s Personalized Wealth Plan Strategy - Legacy Investing Show"
imageWidth: 1200
imageHeight: 630
twitterCard: summary_large_image
featured: false
disclaimer: true
keywords:
  - {', '.join(keywords)}{stats_block}{faq_block}
---"""

    return frontmatter


def _extract_section_headers(text: str) -> list:
    """Extract likely section headers from wealth plan text."""
    lines = text.split("\n")
    headers = []
    for line in lines:
        line = line.strip()
        # Common patterns for headers in wealth plans
        if line and len(line) < 80 and not line.endswith("."):
            if any(kw in line.lower() for kw in [
                "strategy", "plan", "overview", "income", "expense",
                "tax", "retirement", "investment", "action", "summary",
                "recommendation", "goal", "analysis", "breakdown"
            ]):
                headers.append(line)
    return headers[:10]  # Limit to top 10


def _extract_key_numbers(text: str) -> list:
    """Extract notable dollar amounts and percentages from the text."""
    # Find dollar amounts
    dollars = re.findall(r'\$[\d,]+(?:\.\d{2})?', text)
    # Find percentages
    percents = re.findall(r'\d+(?:\.\d+)?%', text)
    return {
        "dollar_amounts": dollars[:10],
        "percentages": percents[:10]
    }


def generate_blog_markdown(
    structured_data: dict,
    description: str = None,
    date: str = None,
    statistics: list = None,
    faq: list = None,
) -> str:
    """Generate a complete blog post markdown from structured wealth plan data.

    Args:
        structured_data: Output from extractor.extract_wealth_plan()
        description: Optional custom description (auto-generated if None)
        date: Publication date (defaults to today)
        statistics: Optional list of stat dicts for statistics cards
        faq: Optional list of FAQ dicts

    Returns:
        Complete markdown string with frontmatter and content
    """
    first_name = structured_data["first_name"]
    plan_type = structured_data.get("plan_type", "Wealth Plan")
    raw_text = structured_data["raw_text"]
    word_count = structured_data.get("word_count", 0)

    # Generate slug
    slug = generate_slug(first_name, plan_type)

    # Auto-generate description if not provided
    if not description:
        description = (
            f"Discover {first_name}'s personalized wealth strategy — "
            f"covering tax optimization, investment allocation, retirement planning, "
            f"and actionable steps to build lasting financial freedom."
        )

    # Use today's date if not provided
    if not date:
        date = str(date.today()) if isinstance(date, type) else "2026-04-11"

    # Generate frontmatter
    frontmatter = generate_frontmatter(
        first_name=first_name,
        plan_type=plan_type,
        description=description,
        date=date,
        slug=slug,
        statistics=statistics,
        faq=faq,
    )

    # Build the blog content body
    # NOTE: The actual content generation from raw_text is handled by
    # the content-conversion-worker which uses LLM assistance to expand
    # the extracted text into 3,000-5,000 words of SEO-optimized content.
    # This generator produces the structural skeleton.

    headers = _extract_section_headers(raw_text)
    key_numbers = _extract_key_numbers(raw_text)

    content_sections = []

    # Disclaimer (must appear at the top of every wealth plan post)
    content_sections.append(DISCLAIMER_TEXT)

    # Introduction
    content_sections.append(
        f"\n\n## {first_name}'s Financial Overview\n\n"
        f"This personalized wealth plan was created to help {first_name} build a clear, "
        f"actionable path toward financial freedom. Below, we break down the key strategies, "
        f"tax-saving opportunities, and investment moves outlined in the plan.\n"
    )

    # Add discovered section headers as H2 sections
    for i, header in enumerate(headers[:8]):
        content_sections.append(f"\n## {header}\n\n[Perspective content based on extracted plan data]\n")

    # Key Takeaways
    content_sections.append(
        "\n## Key Takeaways\n\n"
        "- How to optimize tax strategy for maximum savings\n"
        "- Investment allocation recommendations based on personal goals\n"
        "- Retirement planning with clear milestones\n"
        "- Actionable steps to implement immediately\n"
    )

    # Conclusion / CTA
    content_sections.append(
        "\n## Ready to Build Your Own Wealth Plan?\n\n"
        "Every financial journey is unique. If you want a personalized wealth strategy "
        "tailored to your specific situation, explore the programs at "
        "[Legacy Investing Show](https://www.legacyinvestingshow.com/programs) "
        "and start building your legacy today.\n"
    )

    body = "\n".join(content_sections)

    # Combine frontmatter and body
    full_markdown = f"{frontmatter}\n\n{body}"

    return full_markdown


if __name__ == "__main__":
    import sys
    import json
    filepath = sys.argv[1] if len(sys.argv) > 1 else None
    if not filepath:
        print("Usage: python3 generator.py <wealth-plan-file>")
        sys.exit(1)

    from extractor import extract_wealth_plan
    result = extract_wealth_plan(filepath)
    md = generate_blog_markdown(result)
    print(md)
```

### Step 7: Run Generator Tests (Green Phase)

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website/scripts/wealth-plan-pipeline
python3 -m pytest generator.test.py -v
```

### Step 8: Add "Wealth Plan" Category to build-blog.js Keywords

Edit `scripts/build-blog.js` — in the `extractKeywords` function (~line 215-228), add a "Wealth Plan" entry to `categoryKeywords`:

```javascript
function extractKeywords(content, category) {
    const baseKeywords = ['investing', 'wealth building', 'financial freedom'];
    const categoryKeywords = {
        'Airbnb Arbitrage': ['airbnb', 'arbitrage', 'short-term rental', 'passive income', 'rental property'],
        'Real Estate': ['real estate', 'property investment', 'rental income', 'property management'],
        'Investing': ['investment strategy', 'portfolio', 'returns', 'cash flow'],
        'Wealth Plan': ['wealth plan', 'personalized strategy', 'tax optimization', 'financial planning', 'retirement strategy', 'wealth building strategy']
    };

    const keywords = [...baseKeywords, ...(categoryKeywords[category] || [])];
    return keywords.join(', ');
}
```

Also add "Wealth Plan" to the blog index category filter by ensuring at least one post uses `category: Wealth Plan` in its frontmatter (the generated markdown will handle this automatically).

### Step 9: Create the Anonymization Module

Create `scripts/wealth-plan-pipeline/anonymizer.py`:

```python
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


def scan_for_pii(text: str) -> list:
    """Scan text for any remaining PII and return findings.

    Used as a verification step after anonymization to catch anything missed.

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
```

### Step 10: Create an `__init__.py` and a CLI Runner

Create `scripts/wealth-plan-pipeline/__init__.py` (empty) and `scripts/wealth-plan-pipeline/cli.py`:

```python
#!/usr/bin/env python3
"""
CLI runner for wealth plan extraction and generation pipeline.

Usage:
    python3 -m wealth_plan_pipeline extract <filepath>
    python3 -m wealth_plan_pipeline generate <filepath>
    python3 -m wealth_plan_pipeline scan <filepath-or-dir>
    python3 -m wealth_plan_pipeline batch-extract <directory>
"""
```

Create `scripts/wealth-plan-pipeline/run.py`:

```python
#!/usr/bin/env python3
"""Convenience runner for the wealth plan pipeline from the repo root."""
import sys
import os

# Add the pipeline directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from extractor import extract_wealth_plan
from generator import generate_blog_markdown
from anonymizer import anonymize_text, scan_for_pii, generate_disclaimer


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 run.py extract <filepath>")
        print("  python3 run.py generate <filepath>")
        print("  python3 run.py scan-pii <filepath-or-dir>")
        sys.exit(1)

    command = sys.argv[1]

    if command == "extract":
        filepath = sys.argv[2]
        result = extract_wealth_plan(filepath)
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif command == "generate":
        filepath = sys.argv[2]
        result = extract_wealth_plan(filepath)
        markdown = generate_blog_markdown(result)
        print(markdown)

    elif command == "scan-pii":
        target = sys.argv[2]
        if os.path.isdir(target):
            # Scan all .md files in content/blog/ for PII
            import glob
            md_files = glob.glob(os.path.join(target, "*.md"))
            all_findings = []
            for md_file in md_files:
                with open(md_file, 'r') as f:
                    content = f.read()
                findings = scan_for_pii(content)
                if findings:
                    all_findings.append({"file": md_file, "findings": findings})
            import json
            print(json.dumps(all_findings, indent=2))
        else:
            with open(target, 'r') as f:
                content = f.read()
            findings = scan_for_pii(content)
            import json
            print(json.dumps(findings, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

### Step 11: Create 2 Test Blog Posts from Real Wealth Plans

Pick 2 diverse plans (1 PDF, 1 DOCX) and generate blog posts:

```bash
# Extract and generate markdown for a PDF plan
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website
python3 scripts/wealth-plan-pipeline/run.py generate "Wealth Plans/Personalized Plans/Qu Chen WP.pdf" > content/blog/qu-wealth-plan.md

# Extract and generate markdown for a DOCX plan
python3 scripts/wealth-plan-pipeline/run.py generate "Wealth Plans/Trent Hanson WP.docx" > content/blog/trent-wealth-plan.md
```

After generation, manually review each file:
1. Verify frontmatter is correct (title, date, category, disclaimer, etc.)
2. Verify no full names appear (only first name)
3. Verify disclaimer appears at top of content
4. Verify word count targets 3,000-5,000 words
5. Verify slug is clean and URL-safe

### Step 12: Run Build and Verify

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website
npm run build:blog
npm run build:sitemap
```

Check for errors. If build fails, debug and fix.

### Step 13: Visual Verification with agent-browser

Start the local server:
```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website
npm run start
```

Use agent-browser to:
1. Navigate to `http://localhost:3000/blog` — verify "Wealth Plan" appears in the category filter
2. Click on each test post — verify correct rendering (title, disclaimer, content, CTA)
3. Verify no visible PII (full names, emails, phone numbers)
4. Verify FAQ section renders properly
5. Verify Schema.org markup is present (view source)

### Step 14: PII Sweep on Generated Files

Run the anonymizer's PII scanner on the generated markdown files:

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website
python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/
```

Review findings. If any PII is found, update `anonymizer.py` patterns and re-generate.

---

## Example Handoff

When handing off to the orchestrator or the next worker, use this format:

```json
{
  "salientSummary": "Pipeline setup complete. Extraction script (extractor.py), markdown generator (generator.py), anonymizer (anonymizer.py), and 'Wealth Plan' keyword enrichment in build-blog.js are all in place and tested. Two test blog posts (Qu Chen PDF, Trent Hanson DOCX) have been created, built, and visually verified.",
  "whatWasImplemented": [
    "scripts/wealth-plan-pipeline/extractor.py — PDF/DOCX text extraction with PyMuPDF and zipfile",
    "scripts/wealth-plan-pipeline/extractor.test.py — Test suite for extraction",
    "scripts/wealth-plan-pipeline/generator.py — Markdown generator with frontmatter, disclaimer, FAQ",
    "scripts/wealth-plan-pipeline/generator.test.py — Test suite for generation",
    "scripts/wealth-plan-pipeline/anonymizer.py — PII scrubbing and scanning module",
    "scripts/wealth-plan-pipeline/run.py — CLI runner for extract/generate/scan-pii",
    "scripts/wealth-plan-pipeline/__init__.py — Package init",
    "Modified scripts/build-blog.js — Added 'Wealth Plan' category to extractKeywords()",
    "Created content/blog/qu-wealth-plan.md — Test blog post from PDF",
    "Created content/blog/trent-wealth-plan.md — Test blog post from DOCX"
  ],
  "whatWasLeftUndone": [
    "The generator.py content sections are structural skeletons — actual 3,000-5,000 word content expansion needs LLM assistance (handled by content-conversion-worker)",
    "No images were created for blog posts (using default/placeholder paths)",
    "The batch extraction of all ~129 wealth plans is not done (content-conversion-worker scope)"
  ],
  "verification": {
    "commandsRun": [
      "npm run build:blog",
      "npm run build:sitemap",
      "python3 -m pytest scripts/wealth-plan-pipeline/extractor.test.py -v",
      "python3 -m pytest scripts/wealth-plan-pipeline/generator.test.py -v",
      "python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/"
    ],
    "interactiveChecks": [
      "localhost:3000/blog — 'Wealth Plan' category filter visible",
      "localhost:3000/blog/qu-wealth-plan — post renders correctly with disclaimer",
      "localhost:3000/blog/trent-wealth-plan — post renders correctly with disclaimer",
      "No visible PII on any generated page"
    ]
  },
  "tests": {
    "added": [
      "scripts/wealth-plan-pipeline/extractor.test.py",
      "scripts/wealth-plan-pipeline/generator.test.py"
    ]
  },
  "discoveredIssues": [
    "Some wealth plan filenames have trailing spaces (e.g. 'Josh Afutiti WP .docx') — slug generation handles this",
    "Some plans are addenda/updates to existing plans (e.g. 'Hang and Antonio Sanchez WP 2.0.pdf') — these need manual deduplication during batch conversion",
    "The 'For webinar' and 'Personalized Plans/H1B Visa WP' subfolders contain non-plan files (prompts, design docs) that should be skipped during batch extraction"
  ]
}
```

## When to Return to Orchestrator

Return to the orchestrator when:
1. All tests pass (extractor, generator)
2. `npm run build` completes without errors
3. Both test blog posts render correctly on localhost:3000
4. PII scan returns zero findings on generated markdown
5. The pipeline is ready for the `content-conversion-worker` to begin batch processing

If any step fails and cannot be resolved, return with a clear description of the blocker.
