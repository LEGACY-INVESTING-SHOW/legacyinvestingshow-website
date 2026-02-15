# Google Search Console Not Configured

**Status:** pending
**Priority:** P1 (CRITICAL - BLOCKS SEO MONITORING)
**Issue ID:** 004
**Tags:** search-console, monitoring, indexation, technical-seo, p1-critical
**Dependencies:** #002 (Sitemap must be fixed first)
**Created:** 2026-01-23

---

## Problem Statement

Google Search Console (GSC) is not set up for the website, preventing monitoring of search performance, index coverage, mobile usability issues, Core Web Vitals data, and manual action warnings. Without GSC, there is **zero visibility** into how Google crawls and indexes the site.

**Why This Matters:**
- Cannot see which pages are indexed vs. not indexed
- Missing critical error and warning notifications
- No insight into search queries driving traffic
- Cannot monitor Core Web Vitals performance
- No mobile usability reporting
- Cannot detect manual actions or penalties
- Cannot submit sitemap for faster indexation
- Missing structured data error reports

---

## Findings

### Current State

**GSC Verification:** Not detected in HTML source
**Sitemap Submission:** Cannot verify (GSC not configured)
**Property Type:** Unknown (should be Domain property for full coverage)

**Missing from all pages:**
```html
<!-- No verification meta tag found -->
<meta name="google-site-verification" content="VERIFICATION_CODE">
```

**Impact:**
- 0% visibility into Google's view of the site
- Cannot proactively fix indexation issues
- Missing actionable SEO insights
- No data on search performance (queries, clicks, impressions, CTR)

---

## Proposed Solutions

### ✅ **Option A: Set Up Domain Property with DNS Verification (RECOMMENDED)**

**Pros:**
- Covers all subdomains and protocols (http, https, www, non-www)
- Most comprehensive coverage
- Preferred by Google for modern sites
- One-time setup

**Cons:**
- Requires DNS access
- Slightly more complex setup

**Effort:** Small (30-45 minutes)
**Risk:** None
**Cost:** Free

**Implementation:**
1. Go to Google Search Console: https://search.google.com/search-console
2. Choose "Domain" property type
3. Enter: `legacyinvestingshow.com`
4. Copy DNS TXT record
5. Add to domain DNS settings (e.g., in Vercel DNS or domain registrar)
6. Verify ownership
7. Submit sitemap

### Option B: Set Up URL Prefix Property with HTML Tag

**Pros:**
- Simpler setup (just add meta tag)
- No DNS access required
- Faster verification

**Cons:**
- Only covers exact URL (https://www.legacyinvestingshow.com)
- Need separate properties for www vs non-www
- Less comprehensive

**Effort:** Small (15 minutes)
**Risk:** None
**Cost:** Free

**Implementation:**
1. Go to GSC
2. Choose "URL prefix" property
3. Enter: `https://www.legacyinvestingshow.com`
4. Select "HTML tag" verification method
5. Copy meta tag: `<meta name="google-site-verification" content="...">`
6. Add to `<head>` of all pages (or just homepage)
7. Click "Verify"

---

## Recommended Action

**Implement Option A (Domain Property)**

**Step-by-step:**

1. **Access Google Search Console**
   - Go to: https://search.google.com/search-console
   - Sign in with Google account
   - Click "Add Property"

2. **Select Domain Property**
   - Choose "Domain" (not URL prefix)
   - Enter: `legacyinvestingshow.com`
   - Click "Continue"

3. **Verify Domain Ownership via DNS**
   - GSC will provide a TXT record like:
     ```
     google-site-verification=abc123xyz456...
     ```
   - Add this TXT record to DNS settings
   - If using Vercel: Add to Vercel DNS settings
   - Wait 5-10 minutes for DNS propagation
   - Click "Verify" in GSC

4. **Submit Sitemap**
   - Once verified, go to "Sitemaps" section
   - Add sitemap URL: `https://www.legacyinvestingshow.com/sitemap.xml`
   - Click "Submit"
   - Wait 24-48 hours for indexation

5. **Configure Settings**
   - Set preferred domain (non-www)
   - Set geographic target: United States
   - Link Google Analytics property (once #001 is fixed)

6. **Monitor Key Reports**
   - Performance (queries, clicks, impressions, CTR)
   - Coverage (indexed pages, errors, warnings)
   - Enhancements (Core Web Vitals, mobile usability)
   - Security & Manual Actions

---

## Technical Details

**Files Affected:**
- DNS TXT record (external DNS configuration)
- OR `<head>` section of all HTML files (if using HTML tag method)

**DNS Verification (Recommended):**
```
Type: TXT
Host: @ (or legacyinvestingshow.com)
Value: google-site-verification=abc123xyz456...
TTL: 3600 (or default)
```

**HTML Tag Verification (Alternative):**
```html
<!-- Add to <head> of index.html (homepage) -->
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE">
```

**Sitemap URL to Submit:**
```
https://www.legacyinvestingshow.com/sitemap.xml
```

**Initial Data Expectations:**
- First data appears in 24-48 hours
- Full historical data: 16 months
- Coverage report updates: 1-2 weeks for complete indexation

---

## Acceptance Criteria

- [ ] Domain property created in GSC
- [ ] Ownership verified via DNS TXT record
- [ ] Sitemap submitted successfully
- [ ] No critical errors in Coverage report
- [ ] Performance data visible (may take 24-48 hours)
- [ ] Mobile usability report shows no errors
- [ ] Core Web Vitals data populating (takes 28 days)
- [ ] Team members granted appropriate access (Owner, Full, Restricted)
- [ ] Weekly email alerts configured for critical issues

---

## Work Log

**2026-01-23:** Issue identified during technical SEO audit. No GSC property exists for monitoring search performance.

---

## Resources

- [GSC Setup Guide](https://support.google.com/webmasters/answer/9008080)
- [Domain Property vs URL Prefix](https://support.google.com/webmasters/answer/9445667)
- [Submit Sitemap](https://support.google.com/webmasters/answer/7451001)
- [Understanding Coverage Report](https://support.google.com/webmasters/answer/7440203)
- Related: #001 (Link GA4 to GSC after both configured)
- Related: #002 (Fix sitemap before submitting to GSC)

---

## Estimated Impact

**Before:** 0% visibility into search performance
**After:** Full transparency into:
- Which pages Google indexes
- Search queries and positions
- Mobile usability issues
- Core Web Vitals scores
- Structured data errors
- Security issues

**Business Value:** CRITICAL - GSC is essential for SEO monitoring and optimization. Cannot improve what you cannot measure.
