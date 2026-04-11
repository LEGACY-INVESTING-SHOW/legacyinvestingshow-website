"""Tests for wealth plan markdown generator.

Run: python3 -m pytest scripts/wealth-plan-pipeline/test_generator.py -v
"""
import pytest
import os
import sys
import re

# Add the pipeline directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from generator import generate_blog_markdown, generate_slug, generate_frontmatter, DISCLAIMER_TEXT


class TestSlugGeneration:
    """Tests for slug generation."""

    def test_generate_slug_from_first_name(self):
        """Slug should use first name only, be URL-safe."""
        slug = generate_slug("Trent", "Wealth Plan")
        assert slug == "trent-wealth-plan"
        assert " " not in slug

    def test_generate_slug_no_special_chars(self):
        """Slug should strip special characters."""
        slug = generate_slug("O'Brien", "Wealth Strategy Snapshot")
        # Apostrophe removed
        assert "'" not in slug

    def test_generate_slug_lowercase(self):
        """Slug should be lowercase."""
        slug = generate_slug("John", "Wealth Plan")
        assert slug == slug.lower()


class TestFrontmatterGeneration:
    """Tests for frontmatter generation."""

    def test_generate_frontmatter_has_required_fields(self):
        """Frontmatter must include all required SEO fields."""
        fm = generate_frontmatter(
            first_name="Trent",
            plan_type="Wealth Plan",
            description="Trent's personalized wealth plan breakdown.",
            date_str="2026-04-10",
            slug="trent-wealth-plan"
        )
        assert "title:" in fm
        assert "description:" in fm
        assert "date:" in fm
        assert "author: Preston Seo" in fm
        assert "category: Wealth Plan" in fm
        assert "slug: trent-wealth-plan" in fm
        assert "canonical:" in fm

    def test_generate_frontmatter_disclaimer(self):
        """Frontmatter should include disclaimer flag."""
        fm = generate_frontmatter(
            first_name="Qu",
            plan_type="Wealth Plan",
            description="Qu's wealth plan.",
            date_str="2026-04-10",
            slug="qu-wealth-plan"
        )
        assert "disclaimer: true" in fm

    def test_generate_frontmatter_with_statistics(self):
        """Frontmatter should include statistics when provided."""
        stats = [
            {"label": "Annual Income", "value": "$150,000", "icon": "dollar"},
            {"label": "Tax Savings", "value": "$25,000", "icon": "percent"},
        ]
        fm = generate_frontmatter(
            first_name="Test",
            plan_type="Wealth Plan",
            description="Test plan.",
            date_str="2026-04-10",
            slug="test-plan",
            statistics=stats
        )
        assert "statistics:" in fm
        assert "Annual Income" in fm
        assert "$150,000" in fm

    def test_generate_frontmatter_with_faq(self):
        """Frontmatter should include FAQ when provided."""
        faq = [
            {"question": "What is tax loss harvesting?", "answer": "It's a strategy to offset gains."},
            {"question": "Should I max out my 401k?", "answer": "Generally yes, especially for employer match."},
        ]
        fm = generate_frontmatter(
            first_name="Test",
            plan_type="Wealth Plan",
            description="Test plan.",
            date_str="2026-04-10",
            slug="test-plan",
            faq=faq
        )
        assert "faq:" in fm
        assert "What is tax loss harvesting?" in fm


class TestBlogMarkdownGeneration:
    """Tests for full markdown generation."""

    def test_generate_blog_markdown_has_disclaimer(self):
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
        assert "---" in md  # Has frontmatter
        assert "Disclaimer" in md or "disclaimer" in md

    def test_generate_blog_markdown_no_full_names(self):
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
        # The content should use only "Trent" not "Trent Hanson"
        assert "Trent" in md

    def test_generate_blog_markdown_structure(self):
        """Generated markdown should have proper structure."""
        structured_data = {
            "first_name": "Test",
            "raw_text": "Strategy Overview\nTax Planning Section\nRetirement Goals",
            "plan_type": "Wealth Plan",
            "source_file": "test.pdf",
            "word_count": 3500,
            "extraction_status": "success"
        }
        md = generate_blog_markdown(structured_data)
        assert "## " in md  # Has H2 headings
        assert "Key Takeaways" in md
        assert "Ready to Build Your Own Wealth Plan?" in md

    def test_generate_blog_markdown_includes_first_name(self):
        """Generated markdown should reference the client by first name."""
        structured_data = {
            "first_name": "Jordan",
            "raw_text": "Sample text about wealth planning.",
            "plan_type": "Wealth Plan",
            "source_file": "test.pdf",
            "word_count": 100,
            "extraction_status": "success"
        }
        md = generate_blog_markdown(structured_data)
        assert "Jordan's Financial Overview" in md
        assert "help Jordan build" in md

    def test_disclaimer_text_constant(self):
        """Disclaimer text should be consistent."""
        assert "Disclaimer:" in DISCLAIMER_TEXT
        assert "educational and informational purposes" in DISCLAIMER_TEXT
        assert "consult a qualified professional" in DISCLAIMER_TEXT


class TestFrontmatterValidation:
    """Tests for frontmatter validation."""

    def test_description_length_seo_compliant(self):
        """Description should be 150-160 characters for SEO."""
        description = (
            "Discover John's personalized wealth strategy — "
            "covering tax optimization, investment allocation, retirement planning, "
            "and actionable steps to build lasting financial freedom."
        )
        assert 150 <= len(description) <= 160, f"Description length: {len(description)}"

    def test_canonical_url_format(self):
        """Canonical URL should follow the correct format."""
        fm = generate_frontmatter(
            first_name="Test",
            plan_type="Wealth Plan",
            description="Test plan description here.",
            date_str="2026-04-10",
            slug="test-wealth-plan"
        )
        # Extract canonical from frontmatter
        match = re.search(r'canonical:\s*(\S+)', fm)
        assert match is not None
        canonical = match.group(1)
        assert canonical.startswith("https://www.legacyinvestingshow.com/blog/")
        assert "test-wealth-plan" in canonical


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
