#!/usr/bin/env python3
"""Convenience runner for the wealth plan pipeline from the repo root."""
import sys
import os
import json
import glob

# Add the pipeline directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from extractor import extract_wealth_plan
from generator import generate_blog_markdown
from anonymizer import scan_for_pii, generate_disclaimer


def print_usage():
    print("Usage:")
    print("  python3 run.py extract <filepath>           - Extract text from a wealth plan")
    print("  python3 run.py generate <filepath>          - Generate markdown from a wealth plan")
    print("  python3 run.py scan-pii <filepath-or-dir>   - Scan for PII in markdown files")
    print("  python3 run.py batch-extract <directory>    - Extract all wealth plans in directory")
    print()
    print("Examples:")
    print('  python3 run.py extract "Wealth Plans/Trent Hanson WP.docx"')
    print('  python3 run.py generate "Wealth Plans/Personalized Plans/Qu Chen WP.pdf"')
    print('  python3 run.py scan-pii content/blog/')


def cmd_extract(filepath):
    """Extract text from a wealth plan file."""
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)

    result = extract_wealth_plan(filepath)
    print(json.dumps(result, indent=2, ensure_ascii=False))


def cmd_generate(filepath):
    """Generate markdown from a wealth plan file."""
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)

    result = extract_wealth_plan(filepath)
    markdown = generate_blog_markdown(result)
    print(markdown)


def cmd_scan_pii(target):
    """Scan for PII in markdown files."""
    all_findings = []

    if os.path.isdir(target):
        # Scan all .md files in directory
        md_files = glob.glob(os.path.join(target, "*.md"))
        for md_file in md_files:
            with open(md_file, 'r') as f:
                content = f.read()
            findings = scan_for_pii(content)
            if findings:
                all_findings.append({"file": md_file, "findings": findings})
    elif os.path.isfile(target):
        with open(target, 'r') as f:
            content = f.read()
        findings = scan_for_pii(content)
        if findings:
            all_findings.append({"file": target, "findings": findings})
    else:
        print(f"Error: Path not found: {target}")
        sys.exit(1)

    if all_findings:
        print(json.dumps(all_findings, indent=2))
        print(f"\n⚠️  Found PII in {len(all_findings)} file(s)")
        sys.exit(1)
    else:
        print("✅ No PII found in scanned files")
        sys.exit(0)


def cmd_batch_extract(directory):
    """Extract all wealth plans in a directory."""
    if not os.path.exists(directory):
        print(f"Error: Directory not found: {directory}")
        sys.exit(1)

    results = []

    # Find all PDF and DOCX files
    patterns = [
        os.path.join(directory, "*.pdf"),
        os.path.join(directory, "*.docx"),
        os.path.join(directory, "**/*.pdf"),
        os.path.join(directory, "**/*.docx"),
    ]

    files = []
    for pattern in patterns:
        files.extend(glob.glob(pattern, recursive=True))

    # Filter out temporary Office files
    files = [f for f in files if not os.path.basename(f).startswith('~$')]

    print(f"Found {len(files)} wealth plan files")
    print()

    for filepath in files:
        try:
            result = extract_wealth_plan(filepath)
            results.append({
                "file": filepath,
                "status": "success",
                "first_name": result["first_name"],
                "plan_type": result["plan_type"],
                "word_count": result["word_count"]
            })
            print(f"✅ {os.path.basename(filepath)} - {result['first_name']} ({result['word_count']} words)")
        except Exception as e:
            results.append({
                "file": filepath,
                "status": "error",
                "error": str(e)
            })
            print(f"❌ {os.path.basename(filepath)} - Error: {e}")

    print()
    print(f"Summary: {len([r for r in results if r['status'] == 'success'])} succeeded, {len([r for r in results if r['status'] == 'error'])} failed")


def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1]

    if command == "extract":
        if len(sys.argv) < 3:
            print("Usage: python3 run.py extract <filepath>")
            sys.exit(1)
        cmd_extract(sys.argv[2])

    elif command == "generate":
        if len(sys.argv) < 3:
            print("Usage: python3 run.py generate <filepath>")
            sys.exit(1)
        cmd_generate(sys.argv[2])

    elif command == "scan-pii":
        if len(sys.argv) < 3:
            print("Usage: python3 run.py scan-pii <filepath-or-dir>")
            sys.exit(1)
        cmd_scan_pii(sys.argv[2])

    elif command == "batch-extract":
        if len(sys.argv) < 3:
            print("Usage: python3 run.py batch-extract <directory>")
            sys.exit(1)
        cmd_batch_extract(sys.argv[2])

    else:
        print(f"Unknown command: {command}")
        print_usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
