# YouTube to Blog Automation

This automation checks for new YouTube videos every Friday, generates transcripts, and publishes them as blog posts.

## Setup

### 1. Configure YouTube Channel

Edit `scripts/youtube-to-blog.js` and set your YouTube channel ID:

```javascript
const CONFIG = {
  channelId: 'YOUR_CHANNEL_ID_HERE', // e.g., 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
  // ...
};
```

**Find your Channel ID:**
- Go to YouTube Studio → Settings → Channel → Advanced settings
- Or: View page source on your channel page and search for `channelId`

### 2. Set Up Transcript Service (Optional but Recommended)

The script includes a placeholder transcript function. For real transcripts, integrate one of:

**Option A: youtube-transcript-api (Python)**
```bash
pip install youtube-transcript-api
```
Then modify the `getTranscript()` function to call it.

**Option B: AssemblyAI API**
- Sign up at assemblyai.com
- Set API key: `export ASSEMBLYAI_API_KEY=your_key`
- Update script to use their API

**Option C: Whisper API (Groq)**
- Already have Groq API key set up
- Would need to download audio first, then transcribe

### 3. Test the Script

```bash
cd /home/clawd/legacyinvestingshow-website
node scripts/youtube-to-blog.js
```

### 4. Set Up Cron Job

Add to crontab to run every Friday at 10 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 10 * * 5 cd /home/clawd/legacyinvestingshow-website && /usr/bin/node scripts/youtube-to-blog.js >> /var/log/youtube-blog.log 2>&1
```

Or use the built-in cron tool:

```bash
# Via OpenClaw cron (already done)
```

## How It Works

1. **Check**: Fetches recent videos from YouTube RSS feed
2. **Compare**: Checks against already processed videos (stored in `.youtube-state.json`)
3. **Transcribe**: Gets transcript for new videos
4. **Generate**: Creates HTML blog post from template
5. **Save**: Writes to `/blog/` directory
6. **Rebuild**: Runs `npm run build` to regenerate sitemap and RSS

## File Structure

```
scripts/
  youtube-to-blog.js    # Main automation script
  .youtube-state.json   # Tracks processed videos (auto-created)

templates/
  blog-post.html        # Template for new blog posts

blog/
  [new-posts].html      # Generated blog posts
```

## Customization

### Edit Blog Post Template

Modify `templates/blog-post.html` with placeholders:
- `{{TITLE}}` - Video title
- `{{EXCERPT}}` - Short description
- `{{DATE}}` - Publication date
- `{{VIDEO_ID}}` - YouTube video ID
- `{{CONTENT}}` - Transcript content
- `{{FILENAME}}` - Generated filename
- `{{URL}}` - YouTube video URL

### Change Schedule

Edit the cron expression:
- `0 10 * * 5` = Every Friday at 10 AM
- `0 9 * * 1` = Every Monday at 9 AM
- `0 */6 * * *` = Every 6 hours

## Manual Run

```bash
node scripts/youtube-to-blog.js
```

## Logs

Check `/var/log/youtube-blog.log` for execution history.

## Troubleshooting

### "Channel not found"
- Verify your Channel ID is correct
- Try visiting: `https://www.youtube.com/feeds/videos.xml?channel_id=YOUR_ID`

### "No new videos"
- Check `.youtube-state.json` to see processed videos
- Delete the file to re-process (will create duplicates)

### "Transcript empty"
- Some videos don't have auto-generated transcripts
- May need captions enabled on YouTube
- Consider using AssemblyAI for audio transcription instead