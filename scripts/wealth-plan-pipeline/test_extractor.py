"""Tests for wealth plan text extraction.

Run: python3 -m pytest scripts/wealth-plan-pipeline/test_extractor.py -v
"""
import pytest
import json
import os
import sys

# Add the pipeline directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from extractor import extract_pdf, extract_docx, extract_wealth_plan, _extract_first_name_from_filename, _classify_plan_type


# Get the repo root for test file paths
REPO_ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
WEALTH_PLANS_DIR = os.path.join(REPO_ROOT, 'Wealth Plans ')


class TestFirstNameExtraction:
    """Tests for the first name extraction from filenames."""

    def test_simple_first_last_wp(self):
        """Extract first name from 'First Last WP.docx' format."""
        assert _extract_first_name_from_filename("Trent Hanson WP.docx") == "Trent"

    def test_first_last_space_before_extension(self):
        """Handle files with space before extension."""
        assert _extract_first_name_from_filename("Josh Afutiti WP .docx") == "Josh"

    def test_underscore_format(self):
        """Handle underscore format like 'victoria_west_-_wss.pdf'."""
        assert _extract_first_name_from_filename("victoria_west_-_wss.pdf") == "Victoria"

    def test_parentheses_format(self):
        """Handle format like 'karin_moeller (WSS).pdf'."""
        assert _extract_first_name_from_filename("karin_moeller (WSS).pdf") == "Karin"

    def test_ampersand_format(self):
        """Handle couple format like 'Hang and Antonio Sanchez WP.docx'."""
        assert _extract_first_name_from_filename("Hang and Antonio Sanchez WP.docx") == "Hang"

    def test_wealth_strategy_in_filename(self):
        """Handle 'Wealth Strategy' in filename."""
        assert _extract_first_name_from_filename("Shawn Mozoon Wealth Strategy Plan.docx") == "Shawn"


class TestPlanTypeClassification:
    """Tests for plan type classification from content."""

    def test_wss_detection(self):
        """Detect Wealth Strategy Snapshot from content."""
        text = "This is a Wealth Strategy Snapshot for the client..."
        assert _classify_plan_type(text) == "Wealth Strategy Snapshot"

    def test_wp_detection(self):
        """Detect Wealth Plan from content."""
        text = "Your personalized Wealth Plan includes..."
        assert _classify_plan_type(text) == "Wealth Plan"

    def test_h1b_detection(self):
        """Detect H1B Visa plan from content."""
        text = "This H1B visa holder needs a specialized wealth plan..."
        assert _classify_plan_type(text) == "H1B Visa Wealth Plan"

    def test_default_to_wealth_plan(self):
        """Default to Wealth Plan when no specific keywords found."""
        text = "Some generic financial document without keywords..."
        assert _classify_plan_type(text) == "Wealth Plan"


class TestPDFExtraction:
    """Tests for PDF text extraction."""

    def test_extract_pdf_file_not_found(self):
        """PDF extraction should raise FileNotFoundError for missing files."""
        with pytest.raises(FileNotFoundError):
            extract_pdf("/nonexistent/path/file.pdf")

    def test_extract_pdf_real_file(self):
        """PDF extraction should return non-empty text for real PDFs."""
        # Find a real PDF in the Wealth Plans directory
        pdf_files = []
        if os.path.exists(WEALTH_PLANS_DIR):
            for root, dirs, files in os.walk(WEALTH_PLANS_DIR):
                for f in files:
                    if f.endswith('.pdf'):
                        pdf_files.append(os.path.join(root, f))

        if pdf_files:
            test_pdf = pdf_files[0]
            text = extract_pdf(test_pdf)
            assert isinstance(text, str)
            assert len(text) > 100  # Real plans are multi-page
        else:
            pytest.skip("No PDF files found in Wealth Plans directory")


class TestDOCXExtraction:
    """Tests for DOCX text extraction."""

    def test_extract_docx_file_not_found(self):
        """DOCX extraction should raise FileNotFoundError for missing files."""
        with pytest.raises(FileNotFoundError):
            extract_docx("/nonexistent/path/file.docx")

    def test_extract_docx_real_file(self):
        """DOCX extraction should return non-empty text for real DOCXs."""
        # Find a real DOCX in the Wealth Plans directory
        docx_files = []
        if os.path.exists(WEALTH_PLANS_DIR):
            for root, dirs, files in os.walk(WEALTH_PLANS_DIR):
                for f in files:
                    if f.endswith('.docx'):
                        # Skip temporary Office files
                        if not f.startswith('~$'):
                            docx_files.append(os.path.join(root, f))

        if docx_files:
            test_docx = docx_files[0]
            text = extract_docx(test_docx)
            assert isinstance(text, str)
            assert len(text) > 100
        else:
            pytest.skip("No DOCX files found in Wealth Plans directory")


class TestFullExtractionPipeline:
    """Tests for the full extraction pipeline."""

    def test_extract_wealth_plan_pdf_returns_structured_data(self):
        """Should return a dict with expected keys and anonymized first name."""
        # Find a real PDF
        pdf_files = []
        if os.path.exists(WEALTH_PLANS_DIR):
            for root, dirs, files in os.walk(WEALTH_PLANS_DIR):
                for f in files:
                    if f.endswith('.pdf') and not f.startswith('~$'):
                        pdf_files.append(os.path.join(root, f))

        if pdf_files:
            result = extract_wealth_plan(pdf_files[0])
            assert isinstance(result, dict)
            assert "first_name" in result
            assert "raw_text" in result
            assert "plan_type" in result
            # First name should be anonymized (single word)
            assert " " not in result["first_name"]
            assert result["extraction_status"] == "success"
            assert result["word_count"] > 0
        else:
            pytest.skip("No PDF files found for testing")

    def test_extract_wealth_plan_docx_returns_structured_data(self):
        """DOCX extraction should also return structured data."""
        docx_files = []
        if os.path.exists(WEALTH_PLANS_DIR):
            for root, dirs, files in os.walk(WEALTH_PLANS_DIR):
                for f in files:
                    if f.endswith('.docx') and not f.startswith('~$'):
                        docx_files.append(os.path.join(root, f))

        if docx_files:
            result = extract_wealth_plan(docx_files[0])
            assert isinstance(result, dict)
            assert "first_name" in result
            assert "raw_text" in result
            assert result["extraction_status"] == "success"
        else:
            pytest.skip("No DOCX files found for testing")

    def test_file_not_found_raises(self):
        """Should raise FileNotFoundError for missing files."""
        with pytest.raises(FileNotFoundError):
            extract_wealth_plan("Wealth Plans/NonExistent.pdf")

    def test_unsupported_file_type_raises(self):
        """Should raise ValueError for unsupported file types."""
        # Create a temporary file with unsupported extension
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b"test content")
            temp_path = f.name

        try:
            with pytest.raises(ValueError) as exc_info:
                extract_wealth_plan(temp_path)
            assert "Unsupported file type" in str(exc_info.value)
        finally:
            os.unlink(temp_path)


class TestAnonymization:
    """Tests for PII anonymization."""

    def test_email_removed(self):
        """Email addresses should be replaced."""
        from extractor import _anonymize_text
        text = "Contact me at john@example.com for details."
        result = _anonymize_text(text, "John")
        assert "[email removed]" in result
        assert "john@example.com" not in result

    def test_phone_removed(self):
        """Phone numbers should be replaced."""
        from extractor import _anonymize_text
        text = "Call me at (555) 123-4567."
        result = _anonymize_text(text, "John")
        assert "[phone removed]" in result
        assert "(555) 123-4567" not in result

    def test_ssn_removed(self):
        """SSN patterns should be replaced."""
        from extractor import _anonymize_text
        text = "SSN: 123-45-6789"
        result = _anonymize_text(text, "John")
        assert "[SSN removed]" in result
        assert "123-45-6789" not in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
