const { renderSourceBlock } = require("../scripts/lib/site-shell");
const indexationPolicy = require("../data/indexation-policy.json");

const FORCE_INDEX_SLUGS = new Set(indexationPolicy.forceIndexBlogSlugs || []);
const REDIRECTED_SLUGS = new Set(
  (indexationPolicy.blogRedirects || [])
    .filter((entry) => entry.source)
    .map((entry) => entry.source.replace(/^\/blog\//, ""))
);
const NOINDEX_SLUG_PATTERNS = (indexationPolicy.noindexBlogSlugPatterns || [])
  .map((entry) => new RegExp(entry.pattern));

/**
 * Mirrors scripts/apply-indexation-policy.js so related links only point at
 * blog URLs that stay in the index.
 */
function isIndexableSlug(slug) {
  if (!slug) return false;
  if (REDIRECTED_SLUGS.has(slug)) return false;
  if (FORCE_INDEX_SLUGS.has(slug)) return true;
  return !NOINDEX_SLUG_PATTERNS.some((pattern) => pattern.test(slug));
}

module.exports = function(eleventyConfig) {
  const siteUrl = process.env.SITE_URL || "https://www.legacyinvestingshow.com";

  // Copy assets
  eleventyConfig.addPassthroughCopy("assets");
  
  // Date filter
  eleventyConfig.addFilter("readableDate", function(dateObj) {
    return new Date(dateObj).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // ISO date filter for meta/schema consistency
  eleventyConfig.addFilter("isoDate", function(dateObj) {
    const date = new Date(dateObj);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString();
  });
  
  // JSON filter for safe embedding
  eleventyConfig.addFilter("json", (obj) => {
    return JSON.stringify(obj);
  });

  // JSON-LD filter for script-safe embedding without HTML entity escaping
  eleventyConfig.addFilter("jsonLd", (obj) => {
    return JSON.stringify(obj === undefined ? null : obj)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  });
  
  // Absolute URL filter
  eleventyConfig.addFilter("absoluteUrl", (path) => {
    if (path && path.startsWith("http")) return path;
    return siteUrl + (path || "");
  });

  // Canonical URL normalization:
  // - force https
  // - force www host
  // - remove trailing slash except root
  eleventyConfig.addFilter("canonicalizeUrl", (input) => {
    if (!input) return input;
    let url = input.trim();

    if (!url.startsWith("http")) {
      url = siteUrl + url;
    }

    url = url.replace("http://", "https://");
    url = url.replace("https://legacyinvestingshow.com", "https://www.legacyinvestingshow.com");

    try {
      const parsed = new URL(url);
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString();
    } catch {
      return url;
    }
  });

  /**
   * Resolve a post's relatedPosts frontmatter against the blog collection.
   * Falls back to the newest indexable posts in the same category.
   */
  eleventyConfig.addFilter(
    "relatedGuides",
    (relatedPosts, posts, currentSlug, category, limit = 4) => {
      const all = Array.isArray(posts) ? posts : [];
      const bySlug = new Map();

      for (const post of all) {
        const slug = post.page && post.page.fileSlug;
        if (!slug || !post.data || !post.data.title) continue;
        bySlug.set(slug, {
          slug,
          title: post.data.title,
          url: `/blog/${slug}`,
          category: post.data.category || "",
          date: post.date ? new Date(post.date).getTime() : 0,
        });
      }

      const picked = [];
      const seen = new Set([currentSlug]);

      const add = (slug) => {
        if (picked.length >= limit) return;
        if (!slug || seen.has(slug)) return;
        const entry = bySlug.get(slug);
        if (!entry) return;
        if (!isIndexableSlug(slug)) return;
        seen.add(slug);
        picked.push(entry);
      };

      for (const item of Array.isArray(relatedPosts) ? relatedPosts : []) {
        add(typeof item === "string" ? item : item && item.slug);
      }

      if (picked.length === 0 && category) {
        const sameCategory = [...bySlug.values()]
          .filter((entry) => entry.category === category)
          .sort((a, b) => b.date - a.date);

        for (const entry of sameCategory) {
          add(entry.slug);
        }
      }

      return picked;
    }
  );

  eleventyConfig.addShortcode("sourceBlock", function(title = "", slug = "", type = "") {
    return renderSourceBlock({
      title,
      slug,
      type,
      heading: "Sources To Check Before You Act",
    });
  });
  
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "../_includes",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk"
  };
};
