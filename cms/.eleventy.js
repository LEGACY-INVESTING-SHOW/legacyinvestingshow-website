module.exports = function(eleventyConfig) {
  const siteUrl = process.env.SITE_URL || "https://legacyinvestingshow.com";

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
  
  // Absolute URL filter
  eleventyConfig.addFilter("absoluteUrl", (path) => {
    if (path && path.startsWith("http")) return path;
    return siteUrl + (path || "");
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
