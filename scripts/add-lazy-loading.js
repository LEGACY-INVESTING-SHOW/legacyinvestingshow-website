#!/usr/bin/env node

/**
 * Add lazy loading to images (excluding above-the-fold images like logos)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Get all PSEO pages
function getAllPseoPages() {
    const pages = [];
    
    // Tax strategies
    const taxDir = path.join(ROOT_DIR, 'tax-strategies');
    fs.readdirSync(taxDir)
        .filter(f => f.endsWith('.html') && f !== 'index.html')
        .forEach(f => pages.push(`tax-strategies/${f}`));
    
    // Retirement
    const retirementDir = path.join(ROOT_DIR, 'retirement');
    fs.readdirSync(retirementDir)
        .filter(f => f.endsWith('.html'))
        .forEach(f => pages.push(`retirement/${f}`));
    
    // Persona pages
    const personaDir = path.join(ROOT_DIR, 'tax-strategies/for');
    fs.readdirSync(personaDir)
        .filter(f => f.endsWith('.html'))
        .forEach(f => pages.push(`tax-strategies/for/${f}`));
    
    // Main pages
    pages.push('index.html');
    pages.push('about.html');
    pages.push('programs.html');
    pages.push('success-stories.html');
    
    return pages;
}

/**
 * Check if an image tag is likely above the fold (logo, header images)
 */
function isAboveTheFold(imgTag) {
    // Logo images are typically above the fold
    if (imgTag.includes('logo')) return true;
    
    // Header/nav images are above the fold
    if (imgTag.includes('header')) return true;
    
    return false;
}

/**
 * Add lazy loading to images in a file
 */
function addLazyLoading(filePath) {
    const fullPath = path.join(ROOT_DIR, filePath);
    
    if (!fs.existsSync(fullPath)) {
        return { file: filePath, modified: false, reason: 'not found' };
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    
    // Find all img tags
    const imgRegex = /<img[^>]*>/g;
    let match;
    let modified = false;
    let skipped = 0;
    let added = 0;
    
    while ((match = imgRegex.exec(originalContent)) !== null) {
        const imgTag = match[0];
        
        // Skip if already has loading attribute
        if (imgTag.includes('loading=')) {
            skipped++;
            continue;
        }
        
        // Skip above-the-fold images
        if (isAboveTheFold(imgTag)) {
            skipped++;
            continue;
        }
        
        // Add lazy loading
        const newImgTag = imgTag.replace('>', ' loading="lazy">');
        content = content.replace(imgTag, newImgTag);
        added++;
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(fullPath, content);
    }
    
    return { 
        file: filePath, 
        modified, 
        added, 
        skipped,
        total: added + skipped 
    };
}

/**
 * Main function
 */
function main() {
    console.log('Adding lazy loading to images...\n');
    
    const pages = getAllPseoPages();
    const results = [];
    let totalAdded = 0;
    let totalModified = 0;
    
    for (const page of pages) {
        const result = addLazyLoading(page);
        results.push(result);
        
        if (result.modified) {
            totalModified++;
            totalAdded += result.added;
            console.log(`✅ ${result.file}: Added lazy loading to ${result.added} images`);
        }
    }
    
    console.log(`\n=================================`);
    console.log(`Files modified: ${totalModified}`);
    console.log(`Images updated with lazy loading: ${totalAdded}`);
    console.log(`=================================`);
}

main();
