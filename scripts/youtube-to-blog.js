#!/usr/bin/env node

/**
 * YouTube to Blog Automation
 * 
 * Checks for new videos on the Legacy Investing Show YouTube channel,
 * generates transcripts, and creates blog posts.
 * 
 * Run manually: node scripts/youtube-to-blog.js
 * Or via cron: 0 10 * * 5 (Every Friday at 10 AM)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  channelId: process.env.YT_CHANNEL_ID || 'UCJbOZAqwsdna6kjBZ0UcJmw', // Legacy Investing Show
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  stateFile: path.join(__dirname, '..', '.youtube-state.json'),
  contentDir: path.join(__dirname, '..', 'content', 'blog'),
  blogDir: path.join(__dirname, '..', 'blog'),
  templateFile: path.join(__dirname, '..', 'templates', 'blog-post.html'),
  maxVideosPerRun: 3, // Limit to prevent spam
};

// State management
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
  } catch {
    return { lastChecked: null, processedVideos: [] };
  }
}

function saveState(state) {
  fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
}

// Fetch YouTube videos (RSS feed approach - no API key needed for basic checks)
async function fetchRecentVideos() {
  // Using RSS feed for channel - works without API key
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CONFIG.channelId}`;
  
  return new Promise((resolve, reject) => {
    https.get(rssUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Parse RSS XML
          const videos = [];
          const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
          const titleRegex = /<title>([\s\S]*?)<\/title>/;
          const videoIdRegex = /<yt:videoId>([\s\S]*?)<\/yt:videoId>/;
          const publishedRegex = /<published>([\s\S]*?)<\/published>/;
          
          let match;
          while ((match = entryRegex.exec(data)) !== null && videos.length < CONFIG.maxVideosPerRun) {
            const entry = match[1];
            const titleMatch = entry.match(titleRegex);
            const idMatch = entry.match(videoIdRegex);
            const publishedMatch = entry.match(publishedRegex);
            
            if (titleMatch && idMatch) {
              videos.push({
                id: idMatch[1].trim(),
                title: titleMatch[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/, '$1'),
                published: publishedMatch ? publishedMatch[1].trim() : new Date().toISOString(),
                url: `https://youtube.com/watch?v=${idMatch[1].trim()}`,
              });
            }
          }
          
          resolve(videos);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Get transcript using third-party service or API
async function getTranscript(videoId) {
  // Option 1: Use downsub.com or similar service API
  // Option 2: Use youtube-transcript-api (would need Python)
  // Option 3: Use a transcript service API
  
  // For now, create a placeholder that can be enhanced
  console.log(`Fetching transcript for ${videoId}...`);
  
  // Placeholder - in production, integrate with:
  // - youtube-transcript-api (Python)
  // - AssemblyAI API
  // - Whisper API (if you have audio)
  
  return {
    transcript: `Transcript for video ${videoId}. This is a placeholder - integrate with a transcript service like youtube-transcript-api or AssemblyAI to get real transcripts.`,
    segments: [],
  };
}

// Process transcript into markdown content
function processTranscript(transcript, videoUrl) {
  // Convert transcript to readable markdown
  const paragraphs = transcript.transcript
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join('\n\n');
  
  return `
<div class="video-info">
    <p><strong>Watch the full video:</strong> <a href="${videoUrl}" target="_blank" rel="noopener">View on YouTube</a></p>
</div>

<div class="transcript">
    <h2>Video Transcript</h2>
    ${paragraphs}
</div>

<div class="cta">
    <p>Want to learn more? <a href="/blog/">Explore our blog resources</a> and read more articles.</p>
</div>
  `;
}

// Generate blog post from video data
function generateBlogPost(video, transcript) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = video.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
  
  const filename = `${slug}.md`;
  
  // Create excerpt from transcript
  const excerpt = transcript.transcript
    .split('\n')
    .slice(0, 3)
    .join(' ')
    .substring(0, 200) + '...';
  
  // Read template
  let template = '';
  try {
    template = fs.readFileSync(CONFIG.templateFile, 'utf8');
  } catch {
    // Default template if file doesn't exist
    template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} | Legacy Investing Show</title>
    <meta name="description" content="{{EXCERPT}}">
    <meta name="author" content="Preston Seo">
    <meta name="date" content="{{DATE}}">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/blog/{{FILENAME}}">
</head>
<body>
    <article>
        <h1>{{TITLE}}</h1>
        <time datetime="{{DATE}}">{{DATE}}</time>
        <div class="video-embed">
            <iframe width="560" height="315" src="https://www.youtube.com/embed/{{VIDEO_ID}}" 
                    frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen></iframe>
        </div>
        <div class="content">
            {{CONTENT}}
        </div>
    </article>
</body>
</html>`;
  }

  // Process transcript content
  const content = processTranscript(transcript, video.url);
  
  // Replace template variables
  let html = template
    .replace(/\{\{TITLE\}\}/g, video.title.replace(/"/g, '&quot;'))
    .replace(/\{\{EXCERPT\}\}/g, excerpt.replace(/"/g, '&quot;'))
    .replace(/\{\{DATE\}\}/g, dateStr)
    .replace(/\{\{VIDEO_ID\}\}/g, video.id)
    .replace(/\{\{FILENAME\}\}/g, filename.replace('.md', '.html'))
    .replace(/\{\{CONTENT\}\}/g, content)
    .replace(/\{\{URL\}\}/g, video.url);
  
  // Create markdown frontmatter and content
  const markdown = `---
title: "${video.title.replace(/"/g, '\\"')}"
description: "${excerpt.replace(/"/g, '\\"')}"
date: "${dateStr}"
author: "Preston Seo"
category: "YouTube"
videoId: "${video.id}"
youtubeUrl: "${video.url}"
image: "/assets/images/blog/default.jpg"
---

# ${video.title}

<div class="video-embed">
  <iframe width="100%" height="400" src="https://www.youtube.com/embed/${video.id}" 
          frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen></iframe>
</div>

*[Watch on YouTube](${video.url})*

## Transcript

${transcript.transcript}

---

*This post was automatically generated from a YouTube video. The transcript may contain errors or need editing.*
`;
  
  return { filename, content: markdown, htmlContent: html, title: video.title };
}

// Save blog post
function saveBlogPost(post) {
  // Ensure content directory exists
  if (!fs.existsSync(CONFIG.contentDir)) {
    fs.mkdirSync(CONFIG.contentDir, { recursive: true });
  }
  const filepath = path.join(CONFIG.contentDir, post.filename);
  fs.writeFileSync(filepath, post.content);
  return filepath;
}

// Main function
async function main() {
  console.log('🎬 YouTube to Blog Automation');
  console.log('================================');
  console.log(`Channel ID: ${CONFIG.channelId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');
  
  // Load state
  const state = loadState();
  console.log(`Last checked: ${state.lastChecked || 'Never'}`);
  console.log(`Processed videos: ${state.processedVideos.length}`);
  console.log('');
  
  // Fetch recent videos
  console.log('Fetching recent videos from YouTube...');
  let videos;
  try {
    videos = await fetchRecentVideos();
  } catch (err) {
    console.error('Error fetching videos:', err.message);
    console.log('');
    console.log('⚠️  NOTE: You need to set the correct YouTube channel ID');
    console.log('Update CONFIG.channelId in this script or set YT_CHANNEL_ID env var');
    process.exit(1);
  }
  
  console.log(`Found ${videos.length} recent videos`);
  console.log('');
  
  // Filter out already processed videos
  const newVideos = videos.filter(v => !state.processedVideos.includes(v.id));
  console.log(`New videos to process: ${newVideos.length}`);
  console.log('');
  
  if (newVideos.length === 0) {
    console.log('✅ No new videos to process');
    saveState({ ...state, lastChecked: new Date().toISOString() });
    return;
  }
  
  // Process each new video
  const processed = [];
  for (const video of newVideos.slice(0, CONFIG.maxVideosPerRun)) {
    console.log(`\n--- Processing: ${video.title} ---`);
    
    try {
      // Get transcript
      const transcript = await getTranscript(video.id);
      
      // Generate blog post
      const post = generateBlogPost(video, transcript);
      
      // Save blog post
      const filepath = saveBlogPost(post);
      console.log(`✅ Created: ${filepath}`);
      
      processed.push(video.id);
      
    } catch (err) {
      console.error(`❌ Error processing ${video.title}:`, err.message);
    }
  }
  
  // Update state
  state.lastChecked = new Date().toISOString();
  state.processedVideos.push(...processed);
  saveState(state);
  
  console.log('');
  console.log('================================');
  console.log(`✅ Processed ${processed.length} new videos`);
  console.log('');
  
  // Rebuild site
  console.log('Rebuilding site...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Site rebuilt successfully');
  } catch (err) {
    console.error('❌ Error rebuilding site:', err.message);
  }
  
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the new blog posts in /blog/');
  console.log('2. Edit transcripts to add formatting, headers, images');
  console.log('3. Commit and deploy: git add -A && git commit -m "Add new blog posts from YouTube" && npm run deploy');
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { main, fetchRecentVideos, getTranscript };
