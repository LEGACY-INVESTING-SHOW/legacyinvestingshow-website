'use strict';

function hideFromBlogIndex(frontmatter) {
    if (!frontmatter || typeof frontmatter !== 'object') return false;
    return frontmatter.hideFromBlogIndex === true || frontmatter.hideFromBlogIndex === true;
}

function listedOnBlogIndex(frontmatter) {
    return !hideFromBlogIndex(frontmatter);
}

module.exports = { hideFromBlogIndex, listedOnBlogIndex };
