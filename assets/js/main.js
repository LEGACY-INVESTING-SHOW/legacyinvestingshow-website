/**
 * Legacy Investing Show - Main JavaScript
 * Shared UI behavior and lightweight analytics hooks
 */

function pushAnalyticsEvent(eventName, properties = {}) {
    if (!eventName) return;

    const payload = {
        event: eventName,
        ...properties
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, properties);
    }
}

function buildTrackingPayload(element) {
    const body = document.body || {};

    return {
        label: element?.dataset?.trackLabel || '',
        location: element?.dataset?.trackLocation || '',
        destination: element?.dataset?.trackDestination || element?.getAttribute?.('href') || '',
        page_type: body.dataset?.pageType || '',
        page_slug: body.dataset?.pageSlug || '',
        page_title: body.dataset?.pageTitle || document.title
    };
}

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        mobileMenuBtn.setAttribute('aria-expanded', String(!isExpanded));
        mobileMenu.classList.toggle('hidden');
    });

    // Close the mobile menu when the reader taps outside it
    document.addEventListener('click', (event) => {
        if (mobileMenu.classList.contains('hidden')) return;
        if (mobileMenu.contains(event.target) || mobileMenuBtn.contains(event.target)) return;

        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    });
}

// FAQ Accordion
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isExpanded = question.getAttribute('aria-expanded') === 'true';

        // Close all other FAQs
        faqQuestions.forEach(other => {
            if (other === question) return;
            other.setAttribute('aria-expanded', 'false');
            if (other.nextElementSibling) other.nextElementSibling.classList.add('hidden');
        });

        // Toggle current FAQ
        question.setAttribute('aria-expanded', String(!isExpanded));
        if (answer) answer.classList.toggle('hidden');
    });
});

// Smooth scroll for in-page anchor links.
// Scoped to links inside <main> that point at a real element, so the skip
// link, the FAQ buttons and any href="#" control keep their native behavior.
document.querySelectorAll('main a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (event) {
        const hash = this.getAttribute('href');
        if (!hash || hash === '#' || this.closest('.skip-link')) return;

        let target = null;
        try {
            target = document.querySelector(hash);
        } catch (error) {
            return;
        }
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (typeof history.replaceState === 'function') {
            history.replaceState(null, '', hash);
        }
    });
});

// Declarative CTA/event tracking
document.querySelectorAll('[data-track-event]').forEach(element => {
    element.addEventListener('click', () => {
        pushAnalyticsEvent(element.dataset.trackEvent, buildTrackingPayload(element));
    });
});

// Automatic funnel and outbound link tracking.
// masterclass_click fires on any link into the registration funnels or offer pages.
// outbound_click fires on any link that leaves the site.
const FUNNEL_LINK_PATTERN = /managemoney101\.com|joinlwb\.com|\/legacy-wealth-blueprint|\/lwbprogram|\/airbnbascension|\/strconcierge|\/str-opportunity/i;

document.addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[href]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    let url;
    try {
        url = new URL(href, window.location.href);
    } catch (error) {
        return;
    }

    const isExternal = url.hostname && url.hostname !== window.location.hostname;
    const isFunnel = FUNNEL_LINK_PATTERN.test(url.href);

    if (isFunnel) {
        pushAnalyticsEvent('masterclass_click', {
            ...buildTrackingPayload(link),
            link_url: url.href,
            link_text: (link.textContent || '').trim().slice(0, 100)
        });
    } else if (isExternal) {
        pushAnalyticsEvent('outbound_click', {
            link_url: url.href,
            link_domain: url.hostname,
            page_slug: document.body?.dataset?.pageSlug || window.location.pathname
        });
    }
}, true);

// Track first meaningful interaction on tool pages
let hasTrackedPageStart = false;
document.addEventListener('input', (event) => {
    if (hasTrackedPageStart) return;

    const pageType = document.body?.dataset?.pageType || '';
    if (pageType !== 'tool') return;
    if (!(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLSelectElement)) {
        return;
    }

    hasTrackedPageStart = true;
    pushAnalyticsEvent('tool_started', buildTrackingPayload(event.target));
});

// Prefetch in-content internal pages on first hover only.
const prefetchedUrls = new Set();

function prefetchPage(url) {
    if (prefetchedUrls.has(url)) return;
    prefetchedUrls.add(url);

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
}

document.querySelectorAll('main a[href^="/"]').forEach(link => {
    link.addEventListener('mouseenter', () => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('//')) {
            prefetchPage(href);
        }
    }, { once: true });
});

// Click-to-play YouTube. The page ships a thumbnail and a button; the iframe
// is created only after the reader asks for the video.
document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const button = target.closest('.yt-facade-btn');
    if (!button) return;

    const facade = button.closest('.yt-facade');
    const videoId = facade && facade.dataset ? facade.dataset.youtubeId : '';
    if (!videoId) return;

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
    iframe.title = facade.dataset.youtubeTitle || 'YouTube video player';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.setAttribute('frameborder', '0');

    facade.classList.add('yt-facade--playing');
    facade.replaceChildren(iframe);
});
