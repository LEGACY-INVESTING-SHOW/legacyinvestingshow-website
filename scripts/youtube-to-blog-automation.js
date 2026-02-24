#!/usr/bin/env node

/**
 * YouTube to Blog Automation - Enhanced Version
 * 
 * Converts YouTube videos into comprehensive, SEO-optimized blog posts.
 * Requirements: 30+ seconds, performs full SEO research on ALL videos.
 * 
 * Usage: node scripts/youtube-to-blog-automation.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Configuration
const CONFIG = {
    channelId: process.env.YT_CHANNEL_ID || '@LegacyInvestingShow',
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    transcriptApiKey: process.env.TRANSCRIPT_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    minDuration: 30, // seconds
    minViews: 2000,
    maxVideosPerBatch: 10,
    stateFile: path.join(__dirname, '..', '.youtube-automation-state.json'),
    contentDir: path.join(__dirname, '..', 'content', 'blog'),
    logFile: path.join(__dirname, '..', 'logs', 'youtube-automation.log'),
};

// Ensure directories exist
function ensureDirectories() {
    const dirs = [
        path.dirname(CONFIG.stateFile),
        CONFIG.contentDir,
        path.dirname(CONFIG.logFile),
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Logging utility
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(CONFIG.logFile, logEntry);
}

// State management
function loadState() {
    try {
        if (fs.existsSync(CONFIG.stateFile)) {
            return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
        }
    } catch (error) {
        log(`Error loading state: ${error.message}`, 'error');
    }
    return {
        lastRun: null,
        processedVideos: [],
        failedVideos: [],
        queue: [],
    };
}

function saveState(state) {
    try {
        fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
        log(`Error saving state: ${error.message}`, 'error');
    }
}

// Parse ISO 8601 duration to seconds
function parseDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

// Fetch channel videos from YouTube API
async function fetchChannelVideos() {
    log('Fetching videos from YouTube channel...');
    
    try {
        // First, get the channel ID from handle
        const channelResponse = await axios.get(
            `https://www.googleapis.com/youtube/v3/channels`,
            {
                params: {
                    part: 'id',
                    forHandle: CONFIG.channelId.replace('@', ''),
                    key: CONFIG.youtubeApiKey,
                },
            }
        );
        
        if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
            throw new Error('Channel not found');
        }
        
        const channelId = channelResponse.data.items[0].id;
        log(`Found channel ID: ${channelId}`);
        
        // Fetch videos from channel
        const videos = [];
        let nextPageToken = null;
        let pageCount = 0;
        const maxPages = 10; // Limit to prevent infinite loops
        
        do {
            const params = {
                part: 'snippet',
                channelId: channelId,
                maxResults: 50,
                order: 'date',
                type: 'video',
                key: CONFIG.youtubeApiKey,
            };
            
            if (nextPageToken) {
                params.pageToken = nextPageToken;
            }
            
            const searchResponse = await axios.get(
                'https://www.googleapis.com/youtube/v3/search',
                { params }
            );
            
            const videoIds = searchResponse.data.items
                .map(item => item.id.videoId)
                .filter(id => id);
            
            if (videoIds.length > 0) {
                // Fetch detailed video info
                const detailsResponse = await axios.get(
                    'https://www.googleapis.com/youtube/v3/videos',
                    {
                        params: {
                            part: 'snippet,contentDetails,statistics',
                            id: videoIds.join(','),
                            key: CONFIG.youtubeApiKey,
                        },
                    }
                );
                
                videos.push(...detailsResponse.data.items);
            }
            
            nextPageToken = searchResponse.data.nextPageToken;
            pageCount++;
            
            log(`Fetched page ${pageCount}, total videos: ${videos.length}`);
            
        } while (nextPageToken && pageCount < maxPages);
        
        log(`Total videos fetched: ${videos.length}`);
        return videos;
        
    } catch (error) {
        log(`Error fetching videos: ${error.message}`, 'error');
        if (error.response) {
            log(`API Response: ${JSON.stringify(error.response.data)}`, 'error');
        }
        throw error;
    }
}

// Filter videos based on criteria
function filterVideos(videos, state) {
    log('Filtering videos based on criteria...');
    
    const processedIds = new Set(state.processedVideos.map(v => v.id));
    const failedIds = new Set(state.failedVideos.map(v => v.id));
    
    const qualifying = [];
    const skipped = [];
    
    videos.forEach(video => {
        const id = video.id;
        const duration = parseDuration(video.contentDetails.duration);
        const views = parseInt(video.statistics.viewCount || 0);
        
        // Skip already processed or failed
        if (processedIds.has(id)) {
            skipped.push({ id, reason: 'Already processed' });
            return;
        }
        
        if (failedIds.has(id)) {
            skipped.push({ id, reason: 'Previously failed' });
            return;
        }
        
        // Check duration
        if (duration < CONFIG.minDuration) {
            skipped.push({ id, reason: `Too short (${duration}s < ${CONFIG.minDuration}s)` });
            return;
        }
        
        // Check views (recommendation only, not strict)
        const viewNote = views < CONFIG.minViews ? ' (Low views)' : '';
        
        qualifying.push({
            id,
            title: video.snippet.title,
            description: video.snippet.description,
            publishedAt: video.snippet.publishedAt,
            duration,
            views,
            tags: video.snippet.tags || [],
            thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
            viewNote,
        });
    });
    
    log(`Qualifying videos: ${qualifying.length}`);
    log(`Skipped videos: ${skipped.length}`);
    
    if (skipped.length > 0) {
        log('Skip reasons breakdown:');
        const reasons = {};
        skipped.forEach(s => {
            reasons[s.reason] = (reasons[s.reason] || 0) + 1;
        });
        Object.entries(reasons).forEach(([reason, count]) => {
            log(`  - ${reason}: ${count}`);
        });
    }
    
    return qualifying;
}

// Fetch transcript using TranscriptAPI
async function fetchTranscript(videoId) {
    log(`Fetching transcript for ${videoId}...`);
    
    try {
        const response = await axios.get(
            `https://transcriptapi.com/api/v2/youtube/transcript`,
            {
                params: {
                    video_url: videoId,
                    format: 'text',
                    include_timestamp: false,
                    send_metadata: true,
                },
                headers: {
                    'Authorization': `Bearer ${CONFIG.transcriptApiKey}`,
                },
                timeout: 30000,
            }
        );
        
        if (response.data && response.data.transcript) {
            return {
                success: true,
                transcript: response.data.transcript,
                language: response.data.language || 'en',
                metadata: response.data.metadata || {},
            };
        } else {
            throw new Error('No transcript in response');
        }
        
    } catch (error) {
        log(`Error fetching transcript: ${error.message}`, 'error');
        return {
            success: false,
            error: error.message,
        };
    }
}

// Analyze content and determine expansion level
function analyzeContent(video, transcript) {
    const wordCount = transcript.trim().split(/\s+/).length;
    
    let expansionLevel;
    let targetWordCount;
    
    if (wordCount < 100) {
        expansionLevel = 'MASSIVE';
        targetWordCount = 2000;
    } else if (wordCount < 300) {
        expansionLevel = 'Heavy';
        targetWordCount = 1800;
    } else if (wordCount < 600) {
        expansionLevel = 'Moderate-Heavy';
        targetWordCount = 1700;
    } else if (wordCount < 1000) {
        expansionLevel = 'Moderate';
        targetWordCount = 1600;
    } else if (wordCount < 1500) {
        expansionLevel = 'Light-Moderate';
        targetWordCount = 1500;
    } else {
        expansionLevel = 'Light';
        targetWordCount = 1500;
    }
    
    // Extract themes from title and transcript
    const title = video.title.toLowerCase();
    const content = transcript.toLowerCase();
    
    // Detect category
    let category = 'Wealth Building';
    if (title.includes('airbnb') || content.includes('airbnb')) {
        category = 'Airbnb Arbitrage';
    } else if (title.includes('tax') || content.includes('tax')) {
        category = 'Tax Strategies';
    } else if (title.includes('real estate') || content.includes('property')) {
        category = 'Real Estate';
    } else if (title.includes('invest') || content.includes('portfolio')) {
        category = 'Investing';
    } else if (title.includes('student') || title.includes('success') || title.includes('case study')) {
        category = 'Success Stories';
    }
    
    return {
        transcriptWordCount: wordCount,
        expansionLevel,
        targetWordCount,
        category,
        mainTopic: video.title,
    };
}

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
}

// Generate SEO keywords using Claude API
async function generateKeywords(video, transcript, analysis) {
    log('Generating SEO keywords...');
    
    if (!CONFIG.anthropicApiKey || CONFIG.anthropicApiKey === 'your_claude_api_key_here') {
        log('No Anthropic API key found, using basic keyword generation', 'warn');
        return generateBasicKeywords(video, transcript, analysis);
    }
    
    try {
        const prompt = `Based on this YouTube video, generate comprehensive SEO keywords:

Video Title: ${video.title}
Video Description: ${video.description}
Transcript (first 500 chars): ${transcript.substring(0, 500)}
Category: ${analysis.category}

Generate:
1. Primary keyword (1) - main search term
2. Secondary keywords (5-7) - related terms
3. Long-tail keywords (10-15) - specific phrases
4. Question keywords (5-8) - "how to", "what is" style
5. LSI keywords (8-10) - semantically related
6. Search intent (informational/commercial/transactional)

Format as JSON.`;

        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CONFIG.anthropicApiKey,
                    'anthropic-version': '2023-06-01',
                },
            }
        );
        
        const content = response.data.content[0].text;
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
    } catch (error) {
        log(`Error generating keywords with Claude: ${error.message}`, 'error');
    }
    
    return generateBasicKeywords(video, transcript, analysis);
}

// Basic keyword generation fallback
function generateBasicKeywords(video, transcript, analysis) {
    const title = video.title.toLowerCase();
    const words = title.split(/\s+/);
    
    // Primary keyword - main phrase from title
    const primaryKeyword = title.replace(/[^a-z0-9\s]/g, '').trim();
    
    // Secondary keywords
    const secondaryKeywords = [
        `${analysis.category.toLowerCase()} guide`,
        `how to ${words.slice(0, 3).join(' ')}`,
        `${words[0]} ${words[1]} tips`,
        `${analysis.category.toLowerCase()} strategies`,
        'wealth building',
        'passive income',
    ];
    
    // Long-tail keywords
    const longTailKeywords = [
        `how to ${primaryKeyword}`,
        `what is ${words.slice(0, 2).join(' ')}`,
        `${primaryKeyword} for beginners`,
        `${primaryKeyword} guide 2024`,
        `best way to ${words.slice(0, 2).join(' ')}`,
        `${analysis.category.toLowerCase()} tips`,
        `learn ${words[0]} ${words[1]}`,
        `${primaryKeyword} explained`,
    ];
    
    // Question keywords
    const questionKeywords = [
        `what is ${words.slice(0, 2).join(' ')}`,
        `how to ${words.slice(0, 3).join(' ')}`,
        `why ${words.slice(0, 2).join(' ')}`,
        `is ${words[0]} worth it`,
        `how much can you make with ${words.slice(0, 2).join(' ')}`,
    ];
    
    return {
        primaryKeyword,
        secondaryKeywords: secondaryKeywords.slice(0, 7),
        longTailKeywords: longTailKeywords.slice(0, 10),
        questionKeywords: questionKeywords.slice(0, 5),
        lsiKeywords: ['wealth', 'income', 'investment', 'strategy', 'guide', 'tips'],
        searchIntent: 'informational',
    };
}

// Generate blog post content
async function generateBlogPost(video, transcript, analysis, keywords) {
    log(`Generating blog post for: ${video.title}`);
    log(`Expansion level: ${analysis.expansionLevel}, Target: ${analysis.targetWordCount} words`);
    
    const date = new Date().toISOString().split('T')[0];
    const slug = generateSlug(video.title);
    
    // Generate title with primary keyword
    const title = video.title.includes(keywords.primaryKeyword) 
        ? video.title 
        : `${video.title}: Complete Guide to ${keywords.primaryKeyword}`;
    
    // Generate meta description
    const metaDescription = `Learn ${keywords.primaryKeyword} with proven strategies. ${video.description.substring(0, 100)}... Discover actionable tips for ${analysis.category.toLowerCase()}.`;
    
    // Generate FAQ section
    const faq = keywords.questionKeywords.map((q, i) => ({
        question: q.charAt(0).toUpperCase() + q.slice(1) + '?',
        answer: generateFAQAnswer(q, transcript, video),
    }));
    
    // Generate content sections
    const sections = generateContentSections(video, transcript, analysis, keywords);
    
    // Build markdown content
    const markdown = `---
# Core SEO Fields
title: "${title}"
titleTemplate: "%s | Legacy Investing Show"
description: "${metaDescription}"
date: "${date}"
modifiedDate: "${date}"
author: "Preston Seo"
authorTitle: "Founder, Legacy Investing Show"
authorCredentials: "2,000+ students trained, $10M+ student revenue generated"
category: "${analysis.category}"
canonical: "https://www.legacyinvestingshow.com/blog/${slug}"

# SEO Keyword Targeting
seo:
  primaryKeyword: "${keywords.primaryKeyword}"
  secondaryKeywords:${keywords.secondaryKeywords.map(k => `\n    - "${k}"`).join('')}
  longTailKeywords:${keywords.longTailKeywords.map(k => `\n    - "${k}"`).join('')}
  searchIntent: "${keywords.searchIntent}"

# Tags
tags:${keywords.secondaryKeywords.slice(0, 5).map(k => `\n  - ${k}`).join('')}

# Open Graph & Social
image: "/assets/images/blog/${slug}.jpg"
imageAlt: "${video.title} - ${analysis.category} guide"
imageWidth: 1200
imageHeight: 630
twitterCard: summary_large_image

# Video Integration
youtubeId: "${video.id}"
videoDuration: "PT${Math.floor(video.duration / 60)}M${video.duration % 60}S"

# Content Metadata
schema:
  type: BlogPosting
  articleSection: "${analysis.category}"
  wordCount: ${analysis.targetWordCount}

toc: true
tocDepth: 3

# FAQ Data
faq:${faq.map(f => `\n  - question: "${f.question}"\n    answer: "${f.answer}"`).join('')}
---

# ${title}

## Introduction

${generateIntroduction(video, keywords, transcript)}

<div class="video-embed">
  <iframe
    width="560"
    height="315"
    src="https://www.youtube.com/embed/${video.id}"
    title="${video.title}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    loading="lazy"
  ></iframe>
</div>

${sections.join('\n\n')}

## Frequently Asked Questions

${faq.map(f => `### ${f.question}\n\n${f.answer}`).join('\n\n')}

## Conclusion

${generateConclusion(video, keywords, analysis)}

---

*This article was generated from a YouTube video published on ${new Date(video.publishedAt).toLocaleDateString()}. Watch the full video above for complete details.*

*Last updated: ${date}*
`;
    
    return {
        slug,
        title,
        markdown,
        wordCount: analysis.targetWordCount,
    };
}

// Generate FAQ answer
function generateFAQAnswer(question, transcript, video) {
    // Extract relevant content from transcript
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Find sentences that might answer the question
    const relevant = sentences.filter(s => {
        const q = question.toLowerCase();
        const s_lower = s.toLowerCase();
        return q.split(' ').some(word => s_lower.includes(word) && word.length > 3);
    });
    
    if (relevant.length > 0) {
        return relevant.slice(0, 2).join('. ').trim() + '.';
    }
    
    // Fallback answer
    return `Based on the video "${video.title}", this depends on your specific situation. Watch the full video above for detailed insights and actionable strategies.`;
}

// Generate introduction
function generateIntroduction(video, keywords, transcript) {
    const hook = transcript.split(/[.!?]+/)[0] || video.title;
    return `${hook}. In this comprehensive guide, we'll explore ${keywords.primaryKeyword} in detail. Whether you're just getting started or looking to optimize your approach, you'll discover proven strategies, actionable tips, and expert insights from the video below.\n\nBy the end of this article, you'll understand exactly how to implement these strategies for your own ${keywords.secondaryKeywords[0] || 'wealth building'} journey.`;
}

// Generate content sections
function generateContentSections(video, transcript, analysis, keywords) {
    const sections = [];
    const transcriptParts = splitTranscript(transcript, 5);
    
    // Main content sections
    const sectionCount = analysis.expansionLevel === 'MASSIVE' ? 7 : 
                         analysis.expansionLevel === 'Heavy' ? 6 : 5;
    
    for (let i = 0; i < sectionCount; i++) {
        const sectionKeywords = i === 0 ? keywords.primaryKeyword : 
                               (keywords.secondaryKeywords[i - 1] || keywords.longTailKeywords[i]);
        
        const section = generateSection(i + 1, sectionKeywords, transcriptParts[i], video, analysis);
        sections.push(section);
    }
    
    return sections;
}

// Split transcript into parts
function splitTranscript(transcript, parts) {
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const chunkSize = Math.ceil(sentences.length / parts);
    const chunks = [];
    
    for (let i = 0; i < sentences.length; i += chunkSize) {
        chunks.push(sentences.slice(i, i + chunkSize).join('. ') + '.');
    }
    
    return chunks;
}

// Generate individual section
function generateSection(number, keyword, transcriptPart, video, analysis) {
    const headers = [
        `Understanding ${keyword}`,
        `Key Strategies for ${keyword}`,
        `How to Implement ${keyword}`,
        `Best Practices for ${keyword}`,
        `Common Mistakes to Avoid`,
        `Advanced ${keyword} Techniques`,
        `Measuring Success with ${keyword}`,
    ];
    
    const header = headers[number - 1] || `${keyword} - Part ${number}`;
    
    let content = transcriptPart || '';
    
    // Expand content based on expansion level
    if (analysis.expansionLevel !== 'Light') {
        content += `\n\n### Why This Matters\n\nUnderstanding ${keyword} is crucial for success in ${analysis.category}. Many beginners overlook these fundamental principles, leading to suboptimal results. By mastering these concepts, you'll be able to make informed decisions and avoid costly mistakes.`;
        
        content += `\n\n### Action Steps\n\n1. **Research thoroughly**: Take time to understand the fundamentals before diving in.\n2. **Start small**: Begin with manageable steps to build confidence and expertise.\n3. **Track your progress**: Monitor key metrics to ensure you're on the right track.\n4. **Stay consistent**: Regular effort compounds over time for significant results.`;
    }
    
    return `## ${header}\n\n${content}`;
}

// Generate conclusion
function generateConclusion(video, keywords, analysis) {
    return `${keywords.primaryKeyword} is a powerful strategy for building wealth and achieving financial freedom. As demonstrated in this guide, success comes from understanding the fundamentals, implementing proven strategies, and staying consistent over time.\n\nReady to take the next step? [Explore our blog resources](/blog/) to accelerate your ${analysis.category.toLowerCase()} journey.\n\nRemember, every expert was once a beginner. Start with the basics outlined in this article, apply what you've learned, and watch your results compound over time.`;
}

// Save blog post
function saveBlogPost(post) {
    const filepath = path.join(CONFIG.contentDir, `${post.slug}.md`);
    fs.writeFileSync(filepath, post.markdown);
    log(`Saved blog post: ${filepath}`);
    return filepath;
}

// Process single video
async function processVideo(video, state) {
    log(`\nProcessing video: ${video.title}${video.viewNote}`);
    
    try {
        // Fetch transcript
        const transcriptResult = await fetchTranscript(video.id);
        
        if (!transcriptResult.success) {
            throw new Error(`Transcript failed: ${transcriptResult.error}`);
        }
        
        // Analyze content
        const analysis = analyzeContent(video, transcriptResult.transcript);
        log(`Transcript: ${analysis.transcriptWordCount} words, Expansion: ${analysis.expansionLevel}`);
        
        // Generate keywords
        const keywords = await generateKeywords(video, transcriptResult.transcript, analysis);
        log(`Primary keyword: ${keywords.primaryKeyword}`);
        
        // Generate blog post
        const post = await generateBlogPost(video, transcriptResult.transcript, analysis, keywords);
        
        // Save blog post
        const filepath = saveBlogPost(post);
        
        // Update state
        state.processedVideos.push({
            id: video.id,
            title: video.title,
            processedAt: new Date().toISOString(),
            slug: post.slug,
            filepath,
            wordCount: post.wordCount,
        });
        
        log(`✅ Successfully processed: ${video.title}`);
        return { success: true, post };
        
    } catch (error) {
        log(`❌ Error processing ${video.title}: ${error.message}`, 'error');
        state.failedVideos.push({
            id: video.id,
            title: video.title,
            error: error.message,
            failedAt: new Date().toISOString(),
        });
        return { success: false, error: error.message };
    }
}

// Main function
async function main() {
    log('='.repeat(60));
    log('YouTube to Blog Automation - Starting');
    log('='.repeat(60));
    
    // Validate configuration
    if (!CONFIG.youtubeApiKey || CONFIG.youtubeApiKey === 'AIzaSyB8p-_a7zXpPZxT8T9-34z4nN5M6L8Q9R0') {
        log('ERROR: Please set your YOUTUBE_API_KEY in .env file', 'error');
        log('Get API key from: https://console.cloud.google.com/apis/credentials', 'error');
        process.exit(1);
    }
    
    if (!CONFIG.transcriptApiKey) {
        log('ERROR: Please set your TRANSCRIPT_API_KEY in .env file', 'error');
        process.exit(1);
    }
    
    // Setup
    ensureDirectories();
    const state = loadState();
    
    log(`\nConfiguration:`);
    log(`  Channel: ${CONFIG.channelId}`);
    log(`  Min Duration: ${CONFIG.minDuration}s`);
    log(`  Min Views: ${CONFIG.minViews} (recommended)`);
    log(`  Max per batch: ${CONFIG.maxVideosPerBatch}`);
    log(`  Previously processed: ${state.processedVideos.length}`);
    log(`  Previously failed: ${state.failedVideos.length}`);
    
    try {
        // Fetch videos
        const allVideos = await fetchChannelVideos();
        
        // Filter videos
        const qualifyingVideos = filterVideos(allVideos, state);
        
        if (qualifyingVideos.length === 0) {
            log('\nNo qualifying videos found to process.');
            return;
        }
        
        // Limit batch size
        const videosToProcess = qualifyingVideos.slice(0, CONFIG.maxVideosPerBatch);
        log(`\nProcessing ${videosToProcess.length} videos in this batch`);
        
        // Process each video
        const results = [];
        for (const video of videosToProcess) {
            const result = await processVideo(video, state);
            results.push(result);
            
            // Save state after each video
            saveState(state);
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        log('\n' + '='.repeat(60));
        log('PROCESSING COMPLETE');
        log('='.repeat(60));
        log(`Total processed: ${results.length}`);
        log(`Successful: ${successful}`);
        log(`Failed: ${failed}`);
        log(`\nNext steps:`);
        log(`1. Review generated markdown files in content/blog/`);
        log(`2. Run: npm run build:blog`);
        log(`3. Run: npm run build:sitemap`);
        log(`4. Preview: npm run start`);
        log(`5. Deploy when ready`);
        
        // Update state
        state.lastRun = new Date().toISOString();
        saveState(state);
        
    } catch (error) {
        log(`\nFatal error: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { main, fetchChannelVideos, processVideo };
