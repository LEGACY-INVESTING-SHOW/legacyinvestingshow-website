/**
 * Legacy Investing Show - Main JavaScript
 * Minimal JS for mobile menu and FAQ accordion
 */

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
        mobileMenu.classList.toggle('hidden');
    });
}

// FAQ Accordion
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const icon = question.querySelector('svg');
        const isExpanded = question.getAttribute('aria-expanded') === 'true';

        // Close all other FAQs
        faqQuestions.forEach(q => {
            if (q !== question) {
                q.setAttribute('aria-expanded', 'false');
                q.nextElementSibling.classList.add('hidden');
                q.querySelector('svg').classList.remove('rotate-180');
            }
        });

        // Toggle current FAQ
        question.setAttribute('aria-expanded', !isExpanded);
        answer.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
});

// Instant page prefetching on hover
const prefetchedUrls = new Set();

function prefetchPage(url) {
    if (prefetchedUrls.has(url)) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
    prefetchedUrls.add(url);
}

// Prefetch internal links on hover
document.querySelectorAll('a[href^="/"], a[href$=".html"]').forEach(link => {
    link.addEventListener('mouseenter', () => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('http')) {
            prefetchPage(href);
        }
    }, { once: true });
});
