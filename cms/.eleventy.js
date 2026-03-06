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
