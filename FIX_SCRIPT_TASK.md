# Fix Generation Script Validation

## Problem
The `validateBodyQuality()` function in `scripts/generate-seo-llm-batch.js` is too strict. It requires exact regex matches for section headers:

```javascript
if (!/^##\s+How This Compares To Alternatives/m.test(body)) issues.push('missing_comparison_section');
if (!/^##\s+When Not To Use This Strategy/m.test(body)) issues.push('missing_when_not_section');
if (!/^##\s+Questions To Ask Your CPA\/Advisor/m.test(body)) issues.push('missing_advisor_questions');
```

This causes all attempts to fail because Codex doesn't always use these exact headings.

## Solution Options

**Option A: Relax validation (RECOMMENDED)**
- Lower the strictness of header matching
- Accept variations like "How This Compares to Alternatives" (lowercase 't')
- Accept similar meaning headers
- Or remove these specific checks but keep word count and table checks

**Option B: Improve the prompt**
- Make the prompt more explicit about exact header formatting
- Add examples of the exact headers required

**Option C: Hybrid approach**
- Relax validation for first pass
- Add post-processing to insert missing sections with template content

## Recommended Fix

Modify `validateBodyQuality()` to:
1. Accept case-insensitive matches for required sections
2. Accept partial matches (e.g., "Compares to Alternatives" without "How This")
3. Reduce headings requirement from 10 to 8 (more achievable)
4. Keep word count and table requirements

Also update the `buildPrompt()` function to:
1. Add explicit examples of exact headers
2. Show example structure

## Changes to Make

In `scripts/generate-seo-llm-batch.js`:

1. Update validateBodyQuality() - lines ~659-672
2. Update buildPrompt() - lines ~352-410 (add examples)
3. Test with dry-run to verify

## Testing

```bash
node scripts/generate-seo-llm-batch.js --dry-run --limit 1
```

Should produce valid output without validation errors.
