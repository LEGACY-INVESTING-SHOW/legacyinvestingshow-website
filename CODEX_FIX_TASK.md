# Fix SEO Content Quality Issues

Fix all quality issues in the recently generated blog posts (55 completed posts in content/blog/).

## Issues to Fix

### 1. Internal Links (CRITICAL)
**Problem:** Each post only has 1 internal link (to canonical URL)
**Required:** ≥3 internal links per post
**Fix:** Add contextual internal links within content to:
- /topics/tax-strategies (for tax posts)
- /topics/passive-income (for passive income posts)
- /blog (blog index)
- /programs (main program page)
- Related strategy posts (e.g., link "cost segregation" post from "tax strategies" post)

**Example fix:**
```markdown
Before:
Learn more about tax strategies in our complete guide.

After:
Learn more about [tax strategies](/topics/tax-strategies) in our complete guide, 
or explore our [blog](/blog) for more wealth-building content.
```

### 2. FAQ Schema Quality (CRITICAL)
**Problem:** FAQ answers are generic/template: "A workable first version is often possible in 2 to 6 weeks"
**Required:** Topic-specific, data-driven answers with real numbers
**Fix:** Replace generic FAQs with specific ones:

**Example for "ATM business" post:**
```yaml
# Before (generic):
- question: How fast can I implement ATM business?
  answer: A workable first version is often possible in 2 to 6 weeks.

# After (specific):
- question: How much can I earn from an ATM business?
  answer: >-
    Typical ATM businesses earn $0.50-$3.00 per transaction.
    With 200 transactions/month at $2.50 average, gross revenue is $500/month
    per machine. After rent ($100), cash loading ($50), and maintenance ($50),
    net profit is ~$300/month per machine.
```

### 3. Add readingTime and wordCount (MEDIUM)
**Problem:** Frontmatter missing readingTime and wordCount
**Fix:** Calculate and add to each post's frontmatter:
```yaml
readingTime: "12 min"  # Based on word count / 250 wpm
wordCount: 2979        # Actual word count of content
```

### 4. Fix Image Placeholder Reuse (MEDIUM)
**Problem:** All posts use `/assets/images/og-blog.jpg`
**Fix:** Generate unique image paths based on slug:
```yaml
# Before:
image: /assets/images/og-blog.jpg

# After:
image: /assets/images/blog/atm-business-guide.jpg
imageAlt: 'ATM Business Guide: Passive Income from Cash Machines'
```

## Target Files
Focus on the 55 completed posts (status: completed in data/seo-topics-1000.json).

## Success Criteria
- [ ] All posts have ≥3 internal links
- [ ] All FAQ answers are topic-specific with real data
- [ ] All posts have readingTime and wordCount in frontmatter
- [ ] All posts have unique image paths
- [ ] Changes committed to git

## Commands to Run
1. Read data/seo-topics-1000.json to find completed posts
2. For each completed post in content/blog/:
   - Count words, calculate readingTime
   - Add internal links (3+)
   - Rewrite FAQs with specific data
   - Update image path
3. Commit changes with descriptive message
