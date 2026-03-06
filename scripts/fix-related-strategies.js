const fs = require('fs');
const path = require('path');

const compareDir = '/Users/deveshdhardubey/legacyinvestingshow-website/compare';
const files = fs.readdirSync(compareDir).filter(f => f.endsWith('.html') && f !== 'index.html');

files.forEach(file => {
    const filePath = path.join(compareDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has related-strategies section
    if (!content.includes('class="related-strategies"')) {
        console.log(`Skipping ${file} - no related strategies section`);
        return;
    }
    
    // Add CSS for related-strategies before </style>
    const relatedStrategiesCSS = `
        .related-strategies {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .related-strategies li {
            margin-bottom: 0.75rem;
        }
        .related-strategies a {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #374151;
            text-decoration: none;
            font-size: 0.9rem;
            transition: color 0.2s;
        }
        .related-strategies a:hover {
            color: #059669;
        }
        .related-strategies svg {
            width: 1rem;
            height: 1rem;
            flex-shrink: 0;
            color: #9ca3af;
        }
        .related-strategies a:hover svg {
            color: #059669;
        }
`;
    
    // Insert CSS before the closing </style> tag
    content = content.replace(
        /\.breadcrumb a \{\s*color: #6b7280;\s*text-decoration: none;\s*\}\s*\.breadcrumb a:hover \{\s*color: #111827;\s*\}\s*\.breadcrumb span\.sep \{\s*margin: 0 0\.5rem;\s*color: #9ca3af;\s*\}/,
        match => match + relatedStrategiesCSS
    );
    
    // Add width/height attributes to SVGs in related-strategies
    content = content.replace(
        /<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\s*<path d="M9 18l6-6-6-6"\/>\s*<\/svg>/g,
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>'
    );
    
    // Improve sidebar-card styling
    content = content.replace(
        /<div class="sidebar-card">\s*<h3 class="sidebar-card__title">Related Resources<\/h3>/g,
        '<div class="sidebar-card" style="border-left:3px solid #059669;">\n                        <h3 class="sidebar-card__title">Related Resources</h3>'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${file}`);
});

console.log('\n✅ All comparison pages updated with fixed related resources styling!');
