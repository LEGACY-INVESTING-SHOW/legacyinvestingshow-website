const {
  renderHeadAssets,
  renderSiteFooter,
  renderSiteHeader,
  renderAnalyticsBody,
  renderAnalyticsHead,
} = require("../scripts/lib/site-shell");
const blogRender = require("../scripts/lib/blog-render");

module.exports = function(eleventyConfig) {
  const siteUrl = process.env.SITE_URL || "https://www.legacyinvestingshow.com";

  // Copy assets
  eleventyConfig.addPassthroughCopy("assets");

  // ---- Shared site shell -------------------------------------------------
  // The header, footer and head assets are never hand-copied into Nunjucks:
  // they come straight from scripts/lib/site-shell.js, the same renderer the
  // static generators call.
  eleventyConfig.addGlobalData("siteShell", () => ({
    headAssets: renderHeadAssets(),
    header: renderSiteHeader("/blog"),
    footer: renderSiteFooter(),
    analyticsHead: renderAnalyticsHead({
      gaTrackingId: process.env.GA_TRACKING_ID || "G-2578PT1WSS",
      gtmContainerId: process.env.GTM_CONTAINER_ID || "GTM-KQ4R2LKP",
    }),
    analyticsBody: renderAnalyticsBody({
      gtmContainerId: process.env.GTM_CONTAINER_ID || "GTM-KQ4R2LKP",
    }),
  }));

  // ---- Shared post markup ------------------------------------------------
  // scripts/lib/blog-render.js owns the <article> DOM for both renderers, so
  // templates/blog-post.html and this layout cannot drift apart.
  const postsBySlug = new Map(blogRender.loadAllPosts().map((post) => [post.slug, post]));

  eleventyConfig.addFilter("articleBody", (content, slug) => {
    const post = postsBySlug.get(slug);
    if (!post) return content;
    return blogRender.renderArticleBody({
      post,
      contentHtml: content,
      allPosts: blogRender.loadAllPosts(),
    });
  });

  // Hero assets resolve against the canonical repo: a post whose image file was
  // never created renders no <figure>, no preload, and the shared OG fallback.
  eleventyConfig.addFilter("blogHero", (slug) => {
    const post = postsBySlug.get(slug);
    return post
      ? blogRender.resolveHero(post)
      : { exists: false, src: "", webp: "", alt: "", ogImage: siteUrl + blogRender.FALLBACK_OG_IMAGE };
  });

  eleventyConfig.addFilter("blogCategory", (category) =>
    blogRender.normalizeCategoryForArchives(category)
  );

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
