#!/usr/bin/env node

/**
 * YouTube to Blog - AI-Powered Content Generation
 * 
 * This script fetches YouTube videos and prepares them for AI processing.
 * The actual blog generation is done by the AI assistant (Claude) using the
 * fetched data and transcripts.
 * 
 * Usage: node scripts/youtube-to-blog-processor.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const CONFIG = {
    channelId: process.env.YT_CHANNEL_ID || '@LegacyInvestingShow',
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    transcriptApiKey: process.env.TRANSCRIPT_API_KEY,
    minDuration: 30,
    minViews: 2000,
    stateFile: path.join(__dirname, '..', '.youtube-processing-queue.json'),
    outputDir: path.join(__dirname, '..', 'data', 'video-queue'),
};

// Ensure directories exist
function ensureDirectories() {
    const dirs = [
        path.dirname(CONFIG.stateFile),
        CONFIG.outputDir,
    ];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Parse ISO 8601 duration
function parseDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

// Fetch videos from channel using RSS feed (no API key needed)
async function fetchChannelVideos() {
    console.log('🔍 Fetching videos from YouTube channel via RSS...');
    
    try {
        // Get channel ID from handle first
        const channelResponse = await axios.get(
            'https://www.googleapis.com/youtube/v3/channels',
            {
                params: {
                    part: 'id',
                    forHandle: CONFIG.channelId.replace('@', ''),
                    key: CONFIG.youtubeApiKey,
                },
            }
        ).catch(() => {
            // Fallback: try to get from username format
            return axios.get(
                'https://www.googleapis.com/youtube/v3/channels',
                {
                    params: {
                        part: 'id',
                        forUsername: CONFIG.channelId.replace('@', ''),
                        key: CONFIG.youtubeApiKey,
                    },
                }
            );
        });
        
        if (!channelResponse.data.items?.length) {
            throw new Error('Channel not found');
        }
        
        const channelId = channelResponse.data.items[0].id;
        console.log(`✓ Found channel ID: ${channelId}`);
        
        // Use RSS feed to get videos (no API key needed)
        console.log('📡 Fetching videos via RSS feed...');
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        
        const rssResponse = await axios.get(rssUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const xmlData = rssResponse.data;
        
        // Parse RSS XML
        const videos = [];
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        const titleRegex = /<title>([^<]*)<\/title>/;
        const videoIdRegex = /<yt:videoId>([^<]*)<\/yt:videoId>/;
        const publishedRegex = /<published>([^<]*)<\/published>/;
        
        let match;
        while ((match = entryRegex.exec(xmlData)) !== null && videos.length < 50) {
            const entry = match[1];
            const titleMatch = entry.match(titleRegex);
            const idMatch = entry.match(videoIdRegex);
            const publishedMatch = entry.match(publishedRegex);
            
            if (titleMatch && idMatch) {
                videos.push({
                    id: idMatch[1],
                    snippet: {
                        title: titleMatch[1].trim(),
                        description: '', // Will get from transcript
                        publishedAt: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
                    },
                    contentDetails: {
                        duration: 'PT0M0S', // Will get via API
                    },
                    statistics: {
                        viewCount: '0', // Will estimate
                    },
                });
            }
        }
        
        console.log(`✓ Found ${videos.length} videos from RSS feed`);
        
        // Now get details for each video using API
        console.log('📊 Fetching video details...');
        const detailedVideos = [];
        const batchSize = 50;
        
        for (let i = 0; i < videos.length; i += batchSize) {
            const batch = videos.slice(i, i + batchSize);
            const videoIds = batch.map(v => v.id).join(',');
            
            try {
                const detailsResponse = await axios.get(
                    'https://www.googleapis.com/youtube/v3/videos',
                    {
                        params: {
                            part: 'snippet,contentDetails,statistics',
                            id: videoIds,
                            key: CONFIG.youtubeApiKey,
                        },
                    }
                );
                
                detailedVideos.push(...detailsResponse.data.items);
                console.log(`  ✓ Fetched details for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(videos.length / batchSize)}`);
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`  ⚠️  Error fetching batch: ${error.message}`);
                // Add videos without details
                detailedVideos.push(...batch);
            }
        }
        
        console.log(`✓ Total videos with details: ${detailedVideos.length}\n`);
        return detailedVideos;
        
    } catch (error) {
        console.error('❌ Error fetching videos:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data?.error?.message || error.response.data);
        }
        throw error;
    }
}

// Filter qualifying videos
function filterVideos(videos, state) {
    console.log('🎯 Filtering videos based on criteria...');
    
    const processedIds = new Set(state.processedVideos?.map(v => v.id) || []);
    const queuedIds = new Set(state.queue?.map(v => v.id) || []);
    
    const qualifying = [];
    const skipped = { tooShort: 0, alreadyProcessed: 0, alreadyQueued: 0 };
    
    videos.forEach(video => {
        const id = video.id;
        const duration = parseDuration(video.contentDetails.duration);
        const views = parseInt(video.statistics.viewCount || 0);
        
        if (processedIds.has(id)) {
            skipped.alreadyProcessed++;
            return;
        }
        
        if (queuedIds.has(id)) {
            skipped.alreadyQueued++;
            return;
        }
        
        if (duration < CONFIG.minDuration) {
            skipped.tooShort++;
            return;
        }
        
        qualifying.push({
            id,
            title: video.snippet.title,
            description: video.snippet.description,
            publishedAt: video.snippet.publishedAt,
            duration,
            durationFormatted: formatDuration(duration),
            views,
            viewCountFormatted: formatNumber(views),
            likes: parseInt(video.statistics.likeCount || 0),
            comments: parseInt(video.statistics.commentCount || 0),
            tags: video.snippet.tags || [],
            thumbnail: video.snippet.thumbnails?.high?.url || 
                      video.snippet.thumbnails?.medium?.url || 
                      video.snippet.thumbnails?.default?.url,
            url: `https://youtube.com/watch?v=${id}`,
            qualifies: views >= CONFIG.minViews,
        });
    });
    
    console.log(`✓ Qualifying videos: ${qualifying.length}`);
    console.log(`  Skipped - Already processed: ${skipped.alreadyProcessed}`);
    console.log(`  Skipped - Already queued: ${skipped.alreadyQueued}`);
    console.log(`  Skipped - Too short (<${CONFIG.minDuration}s): ${skipped.tooShort}`);
    console.log(`  Videos with 2K+ views: ${qualifying.filter(v => v.qualifies).length}\n`);
    
    return qualifying;
}

// Format duration
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
}

// Format number
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Fetch transcript
async function fetchTranscript(videoId) {
    try {
        const response = await axios.get(
            'https://transcriptapi.com/api/v2/youtube/transcript',
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
        
        if (response.data?.transcript) {
            return {
                success: true,
                transcript: response.data.transcript,
                language: response.data.language || 'en',
                wordCount: response.data.transcript.trim().split(/\s+/).length,
            };
        }
        
        return { success: false, error: 'No transcript returned' };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Analyze transcript for content type
function analyzeTranscript(transcript, title) {
    const wordCount = transcript.trim().split(/\s+/).length;
    const contentLower = (title + ' ' + transcript).toLowerCase();
    
    // Detect category
    let category = 'Wealth Building';
    if (contentLower.includes('airbnb') || contentLower.includes('rental arbitrage')) {
        category = 'Airbnb Arbitrage';
    } else if (contentLower.includes('tax') || contentLower.includes('deduction')) {
        category = 'Tax Strategies';
    } else if (contentLower.includes('real estate') || contentLower.includes('property')) {
        category = 'Real Estate';
    } else if (contentLower.includes('invest') && contentLower.includes('stock')) {
        category = 'Investing';
    } else if (contentLower.includes('student') || contentLower.includes('success story')) {
        category = 'Success Stories';
    }
    
    // Determine expansion level
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
    
    return {
        wordCount,
        category,
        expansionLevel,
        targetWordCount,
    };
}

// Save video data for AI processing
function saveVideoData(video, transcript, analysis) {
    const data = {
        id: video.id,
        title: video.title,
        description: video.description,
        url: video.url,
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
        duration: video.durationFormatted,
        views: video.viewCountFormatted,
        likes: video.likes,
        comments: video.comments,
        tags: video.tags,
        transcript: transcript.transcript,
        transcriptWordCount: transcript.wordCount,
        category: analysis.category,
        expansionLevel: analysis.expansionLevel,
        targetWordCount: analysis.targetWordCount,
        status: 'ready_for_ai_processing',
        fetchedAt: new Date().toISOString(),
    };
    
    const filename = `${video.id}.json`;
    const filepath = path.join(CONFIG.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    return filepath;
}

// Main processing function
async function main() {
    console.log('='.repeat(70));
    console.log('YouTube to Blog - Video Processor');
    console.log('='.repeat(70));
    console.log();
    
    // Validate config
    if (!CONFIG.youtubeApiKey || CONFIG.youtubeApiKey === 'AIzaSyB8p-_a7zXpPZxT8T9-34z4nN5M6L8Q9R0') {
        console.error('❌ Please set your YOUTUBE_API_KEY in .env file');
        console.error('   Get it from: https://console.cloud.google.com/apis/credentials');
        process.exit(1);
    }
    
    if (!CONFIG.transcriptApiKey) {
        console.error('❌ Please set your TRANSCRIPT_API_KEY in .env file');
        process.exit(1);
    }
    
    ensureDirectories();
    
    // Load state
    let state = { processedVideos: [], queue: [] };
    if (fs.existsSync(CONFIG.stateFile)) {
        state = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    }
    
    console.log(`📊 Current Status:`);
    console.log(`   Previously processed: ${state.processedVideos?.length || 0}`);
    console.log(`   Currently queued: ${state.queue?.length || 0}`);
    console.log();
    
    try {
        // Fetch all videos
        const videos = await fetchChannelVideos();
        
        // Filter qualifying videos
        const qualifying = filterVideos(videos, state);
        
        if (qualifying.length === 0) {
            console.log('✅ No new videos to process!');
            return;
        }
        
        // Process each qualifying video
        console.log('📝 Fetching transcripts and preparing for AI processing...\n');
        
        const newQueue = [];
        const failedTranscripts = [];
        
        for (let i = 0; i < qualifying.length; i++) {
            const video = qualifying[i];
            console.log(`[${i + 1}/${qualifying.length}] Processing: ${video.title}`);
            console.log(`   URL: ${video.url}`);
            console.log(`   Duration: ${video.durationFormatted} | Views: ${video.viewCountFormatted}`);
            
            // Fetch transcript
            const transcript = await fetchTranscript(video.id);
            
            if (!transcript.success) {
                console.log(`   ⚠️  Transcript failed: ${transcript.error}`);
                failedTranscripts.push({ id: video.id, title: video.title, error: transcript.error });
                continue;
            }
            
            console.log(`   ✓ Transcript: ${transcript.wordCount} words`);
            
            // Analyze content
            const analysis = analyzeTranscript(transcript.transcript, video.title);
            console.log(`   ✓ Category: ${analysis.category}`);
            console.log(`   ✓ Expansion: ${analysis.expansionLevel} → Target: ${analysis.targetWordCount} words`);
            
            // Save video data
            const filepath = saveVideoData(video, transcript, analysis);
            console.log(`   ✓ Saved to: ${filepath}\n`);
            
            newQueue.push({
                id: video.id,
                title: video.title,
                filepath,
                wordCount: transcript.wordCount,
                targetWordCount: analysis.targetWordCount,
                category: analysis.category,
            });
        }
        
        // Update state
        state.queue = [...(state.queue || []), ...newQueue];
        state.lastRun = new Date().toISOString();
        fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
        
        // Summary
        console.log('='.repeat(70));
        console.log('PROCESSING COMPLETE');
        console.log('='.repeat(70));
        console.log();
        console.log(`✅ Videos ready for AI blog generation: ${newQueue.length}`);
        console.log(`❌ Failed transcripts: ${failedTranscripts.length}`);
        console.log(`📁 Data saved to: ${CONFIG.outputDir}`);
        console.log();
        
        if (newQueue.length > 0) {
            console.log('📋 Next Steps:');
            console.log('   1. The AI assistant will now generate blog posts for each video');
            console.log('   2. Each blog will be:');
            console.log('      • SEO-optimized with keyword research');
            console.log('      • 1,500-2,500 words (expanded from transcript)');
            console.log('      • Structured with proper headings and FAQs');
            console.log('      • Complete with schema markup');
            console.log();
            console.log('   Run the AI blog generator for each video:');
            console.log('   /youtube-to-blog generate-from data/video-queue/VIDEO_ID.json');
            console.log();
            
            // Show queue
            console.log('📊 Queue Summary:');
            newQueue.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.title}`);
                console.log(`      Category: ${item.category} | Target: ${item.targetWordCount} words`);
            });
        }
        
        if (failedTranscripts.length > 0) {
            console.log('\n⚠️  Videos with failed transcripts:');
            failedTranscripts.forEach(f => {
                console.log(`   - ${f.title}: ${f.error}`);
            });
        }
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, fetchChannelVideos };
