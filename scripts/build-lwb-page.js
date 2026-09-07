const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[character],
    );
}

function renderPage(template, data) {
    const videos = [data.hero, ...data.interviews, ...data.clips];
    const ids = videos.map((video) => String(video.id));
    if (new Set(ids).size !== ids.length)
        throw new Error('Duplicate Vimeo ID in LWB video library.');
    if (ids.some((id) => !/^\d+$/.test(id)))
        throw new Error('Invalid Vimeo ID in LWB video library.');
    function videoFrame(video, hero = false) {
        const duration =
            typeof video.duration === 'number'
                ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
                : video.duration;
        return `<div class="video-frame"><a href="https://vimeo.com/${video.id}" data-vimeo-id="${video.id}" aria-label="Watch ${escapeHtml(video.title)}" target="_blank" rel="noopener"><img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.name || video.title)}" width="960" height="540" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'}><span class="play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3l15 9-15 9z"/></svg></span><span class="duration">${escapeHtml(duration)}</span></a></div>`;
    }
    function card(video, clip = false) {
        return `<article class="story-card">${videoFrame(video)}<div class="story-copy"><h3>${escapeHtml(clip ? video.title : video.name || video.title)}</h3>${video.description ? `<p>${escapeHtml(video.description)}</p>` : ''}</div></article>`;
    }
    const images = data.snapshots
        .map(
            (snapshot) =>
                `<figure class="plan-card"><a class="plan-image" href="${escapeHtml(snapshot.image)}" data-plan-image data-caption="${escapeHtml(snapshot.description)}" aria-label="Enlarge ${escapeHtml(snapshot.title)}" target="_blank" rel="noopener"><img src="${escapeHtml(snapshot.image)}" alt="${escapeHtml(snapshot.alt)}" width="${snapshot.width}" height="${snapshot.height}" loading="lazy"><span class="expand-icon" aria-hidden="true">↗</span></a><figcaption><h3>${escapeHtml(snapshot.title)}</h3><p>${escapeHtml(snapshot.description)}</p></figcaption></figure>`,
        )
        .join('\n');
    const replacements = {
        HERO_VIDEO: videoFrame(data.hero, true),
        INTERVIEW_VIDEOS: data.interviews
            .map((video) => card(video))
            .join('\n'),
        CLIP_VIDEOS: data.clips.map((video) => card(video, true)).join('\n'),
        PLAN_IMAGES: images,
        CLIENT_QUOTE: `<blockquote class="client-quote"><p>“${escapeHtml(data.quotes[0].quote)}”</p><footer>${escapeHtml(data.quotes[0].person)} · ${escapeHtml(data.quotes[0].date)}</footer></blockquote>`,
    };
    for (const [token, html] of Object.entries(replacements)) {
        if (!template.includes(`{{${token}}}`))
            throw new Error(`Missing LWB template token: ${token}`);
        template = template.replace(`{{${token}}}`, html);
    }
    return template;
}

function build() {
    const data = JSON.parse(
        fs.readFileSync(
            path.join(ROOT_DIR, 'data/lwb-success-stories.json'),
            'utf8',
        ),
    );
    const assets = [data.hero, ...data.interviews, ...data.clips]
        .map((video) => video.thumbnail)
        .concat(data.snapshots.map((snapshot) => snapshot.image));
    for (const asset of assets) {
        if (
            !asset.startsWith('/assets/') ||
            !fs.existsSync(path.join(ROOT_DIR, asset))
        )
            throw new Error(`Missing LWB asset: ${asset}`);
    }
    const template = fs.readFileSync(
        path.join(ROOT_DIR, 'templates/legacy-wealth-blueprint.html'),
        'utf8',
    );
    fs.writeFileSync(
        path.join(ROOT_DIR, 'legacy-wealth-blueprint.html'),
        renderPage(template, data),
    );
    console.log(
        `Built Legacy Wealth Blueprint: ${data.interviews.length} interviews, ${data.clips.length} clips, ${data.snapshots.length} plan images.`,
    );
}

if (require.main === module) {
    try {
        build();
    } catch (error) {
        console.error(`LWB page build failed: ${error.message}`);
        process.exit(1);
    }
}
module.exports = { renderPage };
