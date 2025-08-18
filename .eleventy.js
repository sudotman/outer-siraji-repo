module.exports = function(eleventyConfig) {
  // Passthrough copy for static assets and data
  eleventyConfig.addPassthroughCopy({
    "src/assets": "assets"
  });
  eleventyConfig.addPassthroughCopy({
    "data": "data"
  });

  // Collections
  eleventyConfig.addCollection("works", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/works/*.md");
  });

  const pathPrefix = process.env.ELEVENTY_PATH_PREFIX || "/";

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix
  };
};

