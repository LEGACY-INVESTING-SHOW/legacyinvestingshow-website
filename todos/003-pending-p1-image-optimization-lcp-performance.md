# Image Optimization - LCP Performance Issue

**Status:** pending
**Priority:** P1 (CRITICAL - BLOCKS CORE WEB VITALS)
**Issue ID:** 003
**Tags:** performance, core-web-vitals, lcp, images, speed, p1-critical
**Dependencies:** None
**Created:** 2026-01-23

---

## Problem Statement

The website uses unoptimized JPG images without modern format support (WebP/AVIF), resulting in slow Largest Contentful Paint (LCP) times. The 14MB `/assets/images/` directory and large hero images (837KB) significantly impact page load speed, particularly on mobile devices.

**Why This Matters:**
- Slow LCP hurts Core Web Vitals score (ranking factor)
- Poor mobile user experience (high bounce rate)
- Lower search rankings due to page experience signals
- Wasted bandwidth and slower load times globally
- Mobile users on slow connections cannot access content quickly

---

## Findings

### Current State

**Image Directory Size:** 14MB total
**Hero Image:** `hero-image.jpg` - 837KB (WAY too large)
**Format:** JPG only (no WebP or AVIF fallbacks)
**Optimization:** Minimal or none

**Example from index.html:**
```html
<!-- Current - No modern formats -->
<img src="/assets/images/hero-image.jpg"
     alt="Preston Seo with his wife"
     width="617"
     height="731"
     loading="eager"
     fetchpriority="high">
```

**Problems:**
- Single image format (JPG) - no compression optimization
- Large file sizes (837KB for hero, likely 200-500KB for other images)
- Missing WebP/AVIF support (30-50% file size reduction)
- No responsive image srcset for different screen sizes

---

## Proposed Solutions

### ✅ **Option A: Implement WebP with JPG Fallback (RECOMMENDED)**

**Pros:**
- 30-40% file size reduction
- Broad browser support (95%+ with fallback)
- Simple implementation with `<picture>` element
- Significant LCP improvement

**Cons:**
- Requires image conversion (one-time effort)
- Slightly more HTML markup

**Effort:** Medium (2-3 hours for initial conversion, 30min per new image)
**Risk:** None (graceful fallback)
**Cost:** Free (tools available)

**Implementation:**
```html
<picture>
  <source srcset="/assets/images/hero-image.webp" type="image/webp">
  <img src="/assets/images/hero-image.jpg"
       alt="Preston Seo with his wife - Building generational wealth together"
       width="617"
       height="731"
       loading="eager"
       fetchpriority="high">
</picture>
```

**Image Conversion Process:**
```bash
# Using cwebp (WebP converter)
cwebp -q 85 hero-image.jpg -o hero-image.webp

# Or use online tools like Squoosh.app
```

### Option B: Implement AVIF + WebP + JPG (Future-Proof)

**Pros:**
- 50% file size reduction with AVIF
- Maximum optimization
- Future-proof for next 5+ years

**Cons:**
- More conversion effort
- More complex markup
- AVIF support still growing (~80% browsers)

**Effort:** Large (4-5 hours initial, 45min per new image)
**Risk:** Low (multiple fallbacks)
**Cost:** Free

**Implementation:**
```html
<picture>
  <source srcset="/assets/images/hero-image.avif" type="image/avif">
  <source srcset="/assets/images/hero-image.webp" type="image/webp">
  <img src="/assets/images/hero-image.jpg" alt="..." width="617" height="731">
</picture>
```

### Option C: Add Responsive srcset + Modern Formats

**Pros:**
- Optimal image for each screen size
- Maximum performance gain
- Best mobile experience

**Cons:**
- Requires creating multiple image sizes
- Most complex implementation
- Largest initial effort

**Effort:** Large (6-8 hours initial)
**Risk:** Low
**Cost:** Free

---

## Recommended Action

**Phase 1 (This Week):** Implement Option A (WebP + JPG fallback)

1. **Convert all hero/featured images to WebP**
   - Hero images on main pages (index, about, programs, success-stories)
   - Featured images on top 10 blog posts
   - Target quality: 85% (good balance of quality vs size)

2. **Update HTML to use `<picture>` element**
   - Replace `<img>` with `<picture>` + source elements
   - Maintain all existing attributes (width, height, loading, fetchpriority)

3. **Compress original JPGs as backup**
   - Use tools like ImageOptim or TinyPNG
   - Target <200KB for hero images, <100KB for thumbnails

4. **Test LCP improvement**
   - Run PageSpeed Insights before/after
   - Target LCP <2.5s (currently unknown, likely >4s)

**Phase 2 (Next Month):** Add responsive srcset for mobile optimization

**Phase 3 (Future):** Add AVIF support when browser adoption >85%

---

## Technical Details

**Files Affected:**
- `/index.html` - hero image (lines 218-226)
- `/about.html` - Preston image (lines 257-262)
- `/programs.html` - feature images
- `/success-stories.html` - testimonial images
- All blog post HTML files - featured images
- Total: ~50-60 image tags to update

**Image Conversion Tools:**
- **cwebp** (command-line): `brew install webp`
- **Squoosh.app** (online): https://squoosh.app
- **ImageMagick**: `convert image.jpg -quality 85 image.webp`

**Target File Sizes:**
- Hero images: <150KB (currently 837KB)
- Blog featured images: <100KB
- Thumbnail images: <50KB
- Icon/logo: <20KB

**HTML Pattern to Find/Replace:**
```html
<!-- Find this pattern -->
<img src="/assets/images/hero-image.jpg"
     alt="..."
     width="617"
     height="731"
     loading="eager">

<!-- Replace with this -->
<picture>
  <source srcset="/assets/images/hero-image.webp" type="image/webp">
  <img src="/assets/images/hero-image.jpg"
       alt="..."
       width="617"
       height="731"
       loading="eager">
</picture>
```

---

## Acceptance Criteria

- [ ] All hero images converted to WebP (<150KB each)
- [ ] All blog featured images converted to WebP (<100KB each)
- [ ] `<picture>` elements implemented on all main pages
- [ ] JPG fallbacks remain functional
- [ ] Original JPGs compressed to reasonable sizes
- [ ] LCP score improved to <2.5s on desktop, <3.5s on mobile
- [ ] PageSpeed Insights score increased by 10-20 points
- [ ] Total image directory size reduced from 14MB to <5MB
- [ ] Documentation created for image optimization workflow

---

## Work Log

**2026-01-23:** Issue identified during Core Web Vitals audit. Hero image 837KB causing slow LCP.

---

## Resources

- [WebP Conversion Guide](https://developers.google.com/speed/webp)
- [Core Web Vitals - LCP](https://web.dev/lcp/)
- [Squoosh Image Optimizer](https://squoosh.app)
- [ImageOptim](https://imageoptim.com/) (Mac)
- [TinyPNG](https://tinypng.com/) (online)
- Current image directory: `/assets/images/` (14MB, 39 files)

---

## Estimated Impact

**LCP Before:** ~4-6 seconds (estimated based on 837KB hero image)
**LCP After:** <2.5 seconds (target)

**File Size Reduction:**
- Hero image: 837KB → ~250KB (70% reduction)
- Total directory: 14MB → ~5MB (65% reduction)

**PageSpeed Insights:**
- Current: Unknown (likely 40-60 mobile, 70-85 desktop)
- Target: 70+ mobile, 90+ desktop

**Business Value:** HIGH - Improved user experience leads to lower bounce rate and better SEO rankings
