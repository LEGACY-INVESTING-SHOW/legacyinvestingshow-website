# Submitting /reviews to search and answer engines

Manual, and all of it needs the live site. Do it after the next production deploy.

## 1. Google Search Console

Property: `https://www.legacyinvestingshow.com` (the domain property, not a URL-prefix one).

1. Sitemaps, left rail. Submit all three, one at a time, path only:
   - `sitemap.xml`
   - `sitemap-video.xml`
   - `sitemap-images.xml`
   `sitemap.xml` is an index and points at the other two, but coverage is reported per submitted
   file, so submit all three.
2. URL inspection, top bar. Paste `https://www.legacyinvestingshow.com/reviews`.
   Read "Page changed?" and confirm the rendered HTML holds the FAQ answers and the Trustpilot
   review text. Then click **Request indexing**. The daily quota is about 10 URLs, so spend it on:
   `/reviews` and the four Legacy Wealth Blueprint case studies.
3. Enhancements, after 3 to 7 days. In the Videos report, "no valid uploadDate" is expected for 18
   of the 19: run `scripts/fetch-video-metadata.js` with `YOUTUBE_API_KEY` set to fix that.
4. `/success-stories` now 301s to `/reviews` and will fall out of the index. Do not submit it.

## 2. Bing Webmaster Tools

1. Sitemaps. Submit the same three files.
2. URL Inspection, then **Submit URL** for `/reviews`. Bing's quota is 10 a day, 50 a month.
3. IndexNow, under Configure My Site, shows every ping the script below sends and whether the key
   file verified. Check there first when a submission looks like it did nothing.

## 3. IndexNow (Bing, Yandex, Seznam, Naver; not Google)

The key file `ff64e7a1822f2fe13777b7f30f04b8f7.txt` is committed at the repo root and the script reads it, so no env var is needed:

    node scripts/submit-indexnow.js --dry-run   # prints the URLs
    npm run seo:indexnow                        # sends the ping

Confirm `https://www.legacyinvestingshow.com/ff64e7a1822f2fe13777b7f30f04b8f7.txt` returns the key on the live site first.
Keep the key forever; changing it throws away the verification.

## 4. Video transcripts

    node scripts/fetch-video-transcripts.js --dry-run        # YouTube only, prints word counts
    VIMEO_TOKEN=<token> node scripts/fetch-video-transcripts.js

`VIMEO_TOKEN` is a Vimeo personal access token with the `private` and `video_files` scopes; without
it the four Vimeo interviews are skipped. Read the diff on `data/reviews-videos.json` before
committing, then rebuild the page:

    node scripts/build-reviews-sections.js
    node scripts/build-reviews-schema.js
    npm run build:reviews-text
    npm run build:sitemap && npm run build:video-sitemap && npm run build:image-sitemap

## 5. Trustpilot

Only the `firstairbnb.com` profile matters (66 reviews, 4.2). The one-review `legacyinvestingshow.com`
profile is ignored on purpose. Add https://www.legacyinvestingshow.com/reviews as the website on the main
profile.
