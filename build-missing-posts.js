const fs = require('fs');
const path = require('path');

// Simple markdown to HTML converter for blog posts
function markdownToHtml(markdown, frontmatter) {
  // Extract content after frontmatter
  const contentMatch = markdown.match(/---[\s\S]*?---([\s\S]*)/);
  if (!contentMatch) return null;
  
  let content = contentMatch[1].trim();
  
  // Convert markdown to HTML
  // Headers
  content = content.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  content = content.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  content = content.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold and italic
  content = content.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#5869fc] hover:underline">$1</a>');
  
  // Images
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full rounded-lg my-6">');
  
  // Lists
  content = content.replace(/^\* (.*$)/gim, '<li>$1</li>');
  content = content.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-6 my-4 space-y-2">$&</ul>');
  
  // Paragraphs
  content = content.replace(/\n\n/g, '</p>\n\n<p>');
  content = '<p>' + content + '</p>';
  
  // Clean up empty paragraphs
  content = content.replace(/<p><\/p>/g, '');
  content = content.replace(/<p>(<h[1-6]>)/g, '$1');
  content = content.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  content = content.replace(/<p>(<ul)/g, '$1');
  content = content.replace(/(<\/ul>)<\/p>/g, '$1');
  
  return content;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;
  
  for (const line of lines) {
    // New key
    if (line.match(/^[a-zA-Z]/)) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        currentKey = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (value === '') {
          // Could be array start
          currentArray = [];
          fm[currentKey] = currentArray;
        } else {
          // Remove quotes
          fm[currentKey] = value.replace(/^["']|["']$/g, '');
          currentArray = null;
        }
      }
    }
    // Array item
    else if (line.match(/^\s*-\s*/) && currentArray !== null) {
      const value = line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
      currentArray.push(value);
    }
  }
  
  return fm;
}

function generateHtml(filename, markdown) {
  const fm = parseFrontmatter(markdown);
  const content = markdownToHtml(markdown, fm);
  
  if (!content) {
    console.log(`Skipping ${filename} - no content found`);
    return null;
  }
  
  const title = fm.title || filename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const description = fm.description || '';
  const date = fm.date || '2026-01-24';
  const author = fm.author || 'Preston Seo';
  const category = fm.category || 'Real Estate';
  const image = fm.image || '/assets/images/blog/default.webp';
  const canonical = fm.canonical || `https://legacyinvestingshow.com/blog/${filename}.html`;
  
  // Generate schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "image": image,
    "datePublished": date,
    "dateModified": fm.modifiedDate || date,
    "author": {
      "@type": "Person",
      "name": author,
      "jobTitle": fm.authorTitle || "Founder, Legacy Investing Show"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Legacy Investing Show",
      "logo": {
        "@type": "ImageObject",
        "url": "https://legacyinvestingshow.com/assets/images/logo.webp"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonical
    }
  };
  
  // Read existing template from a reference post
  const templatePath = path.join(__dirname, 'blog/chad-90k-year-one-property.html');
  let template = '';
  
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (e) {
    console.log(`Template not found: ${templatePath}`);
    return null;
  }
  
  // Replace content in template
  let html = template;
  
  // Replace title
  html = html.replace(/<title>.*?<\/title>/, `<title>${title} | Legacy Investing Show</title>`);
  
  // Replace meta description
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${description}">`);
  
  // Replace canonical
  html = html.replace(/<link rel="canonical" href=".*?">/, `<link rel="canonical" href="${canonical}">`);
  
  // Replace OG tags
  html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${title}">`);
  html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`);
  html = html.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${canonical}">`);
  html = html.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${image}">`);
  
  // Replace schema
  const schemaRegex = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  html = html.replace(schemaRegex, `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`);
  
  // Replace article content - find the main content area
  // Look for article or main content div
  const contentRegex = /(<article[^>]*>[\s\S]*?<h1[^>]*>.*?<\/h1>[\s\S]*?<div[^>]*class="[^"]*(?:text|content)[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/;
  
  if (html.match(contentRegex)) {
    html = html.replace(contentRegex, `$1\n${content}\n$3`);
  } else {
    // Fallback: replace everything between </h1> and </article>
    const simpleRegex = /(<\/h1>[\s\S]*?<div[^>]*>)([\s\S]*?)(<\/div>[\s\S]*?<\/article>)/;
    if (html.match(simpleRegex)) {
      html = html.replace(simpleRegex, `$1\n${content}\n$3`);
    }
  }
  
  // Update date
  html = html.replace(/<time datetime=".*?">.*?<\/time>/, `<time datetime="${date}">${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>`);
  
  // Update author
  html = html.replace(/<span class="author-name">.*?<\/span>/, `<span class="author-name">${author}</span>`);
  
  return html;
}

// Main execution
const contentDir = path.join(__dirname, 'content/blog');
const outputDir = path.join(__dirname, 'blog');

// Get all markdown files
const mdFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

// Get all existing HTML files
const htmlFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.html'));
const htmlNames = htmlFiles.map(f => f.replace('.html', ''));

// Find missing files
const missingFiles = mdFiles.filter(f => {
  const name = f.replace('.md', '');
  return !htmlNames.includes(name);
});

console.log(`Found ${missingFiles.length} missing blog posts to generate:`);
missingFiles.forEach(f => console.log(`  - ${f}`));

let generated = 0;
let errors = 0;

for (const file of missingFiles) {
  try {
    const markdown = fs.readFileSync(path.join(contentDir, file), 'utf8');
    const filename = file.replace('.md', '');
    const html = generateHtml(filename, markdown);
    
    if (html) {
      fs.writeFileSync(path.join(outputDir, `${filename}.html`), html);
      console.log(`✅ Generated: ${filename}.html`);
      generated++;
    } else {
      console.log(`❌ Failed to generate: ${filename}.html`);
      errors++;
    }
  } catch (e) {
    console.log(`❌ Error processing ${file}: ${e.message}`);
    errors++;
  }
}

console.log(`\n📊 Summary: ${generated} generated, ${errors} errors`);
