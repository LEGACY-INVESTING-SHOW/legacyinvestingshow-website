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
    date_str: str,
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
date: {date_str}
modifiedDate: {date_str}
author: Preston Seo
authorTitle: 'Founder, Legacy Investing Show'
authorCredentials: '2,000+ students trained, $10M+ student revenue generated'
category: Wealth Plan
slug: {slug}
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
    date_str: str = None,
    statistics: list = None,
    faq: list = None,
) -> str:
    """Generate a complete blog post markdown from structured wealth plan data.

    Args:
        structured_data: Output from extractor.extract_wealth_plan()
        description: Optional custom description (auto-generated if None)
        date_str: Publication date (defaults to today)
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

    # Auto-generate description if not provided (SEO-optimized: 150-160 chars)
    if not description:
        description = (
            f"Discover {first_name}'s personalized wealth strategy — tax optimization, "
            f"investment allocation, and actionable steps to financial freedom."
        )

    # Use today's date if not provided
    if not date_str:
        date_str = str(date.today())

    # Generate frontmatter
    frontmatter = generate_frontmatter(
        first_name=first_name,
        plan_type=plan_type,
        description=description,
        date_str=date_str,
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
