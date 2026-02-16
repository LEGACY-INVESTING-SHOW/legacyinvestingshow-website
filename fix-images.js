const fs = require('fs');
const path = require('path');
const glob = require('glob');

const CONTENT_DIR = './content/blog';
const files = glob.sync('*.md', { cwd: CONTENT_DIR });

files.forEach(file => {
  const filePath = path.join(CONTENT_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const slug = file.replace('.md', '');
  
  // Replace generic image with slug-based image
  if (content.includes('image: /assets/images/og-blog.jpg')) {
    content = content.replace(
      'image: /assets/images/og-blog.jpg',
      `image: /assets/images/blog/${slug}.jpg`
    );
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done fixing images');
