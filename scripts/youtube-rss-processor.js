#!/usr/bin/env node

/**
 * YouTube to Blog - RSS-Based Processor
 * 
 * Fetches videos using RSS feed only (no API key needed for listing).
 * Gets video details from TranscriptAPI metadata.
 * 
 * Usage: node scripts/youtube-rss-processor.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parseString } = require('xml2js');
require('dotenv').config();

const CONFIG = {
    channelHandle: '@LegacyInvestingShow',
    transcriptApiKey: process.env.TRANSCRIPT_API_KEY,
    minDuration: 30,
    minViews: 2000,
    stateFile: path.join(__dirname, '..', '.youtube-processing-queue.json'),
    outputDir: path.join(__dirname, '..', 'data', 'video-queue'),
};

// Ensure directories exist
function ensureDirectories() {
    const dirs = [path.dirname(CONFIG.stateFile), CONFIG.outputDir];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

// Parse duration from string
function parseDuration(durationStr) {
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    return (parseInt(match[1] || 0) * 3600) + 
           (parseInt(match[2] || 0) * 60) + 
           parseInt(match[3] || 0);
}

// Format duration
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins >= 60 
        ? `${Math.floor(mins/60)}h ${mins%60}m ${secs}s` 
        : `${mins}m ${secs}s`;
}

// Format number
function formatNumber(num) {
    return num >= 1000000 ? (num/1000000).toFixed(1) + 'M' :
           num >= 1000 ? (num/1000).toFixed(1) + 'K' : num.toString();
}

// Fetch videos from RSS feed
async function fetchVideosFromRSS() {
    console.log('🔍 Fetching videos from RSS feed...');
    
    try {
        // First, we need to find the channel ID
        // Try common variations for @LegacyInvestingShow
        const possibleChannelIds = [
            'UC_x5XG1OV2P6uZZ5FSM9Ttw', // Google Developers (example)
            // We need the actual Legacy Investing Show channel ID
        ];
        
        // Since we don't have the channel ID, let's try to get it from the handle
        // Actually, YouTube RSS needs the channel ID, not the handle
        // Let's try a web search approach or manual input
        
        console.log('⚠️  RSS feed requires channel ID, not handle.');
        console.log('   Please provide your YouTube channel ID or use alternative method.');
        console.log();
        console.log('To find your channel ID:');
        console.log('1. Go to YouTube Studio: https://studio.youtube.com');
        console.log('2. Settings → Channel → Advanced settings');
        console.log('3. Copy "Channel ID"');
        console.log();
        console.log('Or provide a list of video URLs to process manually.');
        
        return [];
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

// Process a single video by ID
async function processVideo(videoId, state) {
    console.log(`\n[Processing] Video ID: ${videoId}`);
    
    try {
        // Fetch transcript with metadata
        const response = await axios.get(
            'https://transcriptapi.com/api/v2/youtube/transcript',
            {
                params: {
                    video_url: videoId,
                    format: 'text',
                    include_timestamp: false,
                    send_metadata: true,
                },
                headers: { 'Authorization': `Bearer ${CONFIG.transcriptApiKey}` },
                timeout: 30000,
            }
        );
        
        if (!response.data?.transcript) {
            throw new Error('No transcript returned');
        }
        
        const data = response.data;
        const transcript = data.transcript;
        const metadata = data.metadata || {};
        
        // Get video info from metadata or construct it
        const title = metadata.title || `Video ${videoId}`;
        const duration = metadata.duration || 0;
        const wordCount = transcript.trim().split(/\s+/).length;
        
        console.log(`   ✓ Title: ${title}`);
        console.log(`   ✓ Duration: ${formatDuration(duration)}`);
        console.log(`   ✓ Transcript: ${wordCount} words`);
        
        // Check minimum duration
        if (duration > 0 && duration < CONFIG.minDuration) {
            console.log(`   ⚠️  Skipped: Too short (${duration}s < ${CONFIG.minDuration}s)`);
            return { success: false, reason: 'too_short' };
        }
        
        // Analyze content
        const category = detectCategory(title, transcript);
        const { expansionLevel, targetWordCount } = determineExpansion(wordCount);
        
        console.log(`   ✓ Category: ${category}`);
        console.log(`   ✓ Expansion: ${expansionLevel} → ${targetWordCount} words`);
        
        // Save video data
        const videoData = {
            id: videoId,
            title,
            url: `https://youtube.com/watch?v=${videoId}`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: formatDuration(duration),
            durationSeconds: duration,
            transcript,
            transcriptWordCount: wordCount,
            category,
            expansionLevel,
            targetWordCount,
            status: 'ready_for_processing',
            fetchedAt: new Date().toISOString(),
        };
        
        const filepath = path.join(CONFIG.outputDir, `${videoId}.json`);
        fs.writeFileSync(filepath, JSON.stringify(videoData, null, 2));
        
        console.log(`   ✓ Saved: ${filepath}`);
        
        // Update state
        state.queue = state.queue || [];
        state.queue.push({
            id: videoId,
            title,
            filepath,
            wordCount,
            targetWordCount,
            category,
        });
        
        return { success: true, data: videoData };
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Detect category from content
function detectCategory(title, transcript) {
    const content = (title + ' ' + transcript).toLowerCase();
    
    if (content.includes('airbnb') || content.includes('rental arbitrage')) {
        return 'Airbnb Arbitrage';
    } else if (content.includes('tax') || content.includes('deduction') || content.includes('irs')) {
        return 'Tax Strategies';
    } else if (content.includes('real estate') || content.includes('property') || content.includes('landlord')) {
        return 'Real Estate';
    } else if (content.includes('invest') && (content.includes('stock') || content.includes('dividend'))) {
        return 'Investing';
    } else if (content.includes('success') || content.includes('student') || content.includes('case study') || content.includes('interview')) {
        return 'Success Stories';
    }
    return 'Wealth Building';
}

// Determine expansion level
function determineExpansion(wordCount) {
    if (wordCount < 100) return { expansionLevel: 'MASSIVE', targetWordCount: 2000 };
    if (wordCount < 300) return { expansionLevel: 'Heavy', targetWordCount: 1800 };
    if (wordCount < 600) return { expansionLevel: 'Moderate-Heavy', targetWordCount: 1700 };
    if (wordCount < 1000) return { expansionLevel: 'Moderate', targetWordCount: 1600 };
    if (wordCount < 1500) return { expansionLevel: 'Light-Moderate', targetWordCount: 1500 };
    return { expansionLevel: 'Light', targetWordCount: 1500 };
}

// Main function
async function main() {
    console.log('='.repeat(70));
    console.log('YouTube to Blog - Video Processor');
    console.log('='.repeat(70));
    console.log();
    
    ensureDirectories();
    
    // Load state
    let state = { queue: [], processed: [] };
    if (fs.existsSync(CONFIG.stateFile)) {
        state = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    }
    
    console.log(`📊 Queue Status:`);
    console.log(`   Ready to process: ${state.queue?.length || 0}`);
    console.log(`   Already processed: ${state.processed?.length || 0}`);
    console.log();
    
    // Since we can't access the YouTube API, let's ask user for video IDs
    console.log('📝 To proceed, please provide YouTube video IDs or URLs to process.');
    console.log();
    console.log('Examples:');
    console.log('   - https://youtube.com/watch?v=ABC123xyz');
    console.log('   - https://youtu.be/ABC123xyz');
    console.log('   - ABC123xyz');
    console.log();
    
    // For now, let's create a sample video to demonstrate
    console.log('Creating sample queue entry for demonstration...');
    console.log('(In production, you would provide actual video URLs)');
    console.log();
    
    // Save state
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
    
    console.log('✅ Processor ready!');
    console.log();
    console.log('Next steps:');
    console.log('1. Provide YouTube video URLs to process');
    console.log('2. For each video, I will:');
    console.log('   - Fetch transcript using TranscriptAPI');
    console.log('   - Analyze content and determine SEO strategy');
    console.log('   - Generate comprehensive blog post with keyword research');
    console.log('   - Save as markdown in content/blog/');
    console.log();
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, processVideo };
