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

// Animated number counters
function animateCounter(element) {
    const target = element.dataset.target;
    if (!target) return;

    const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
    const suffix = target.replace(/[0-9.]/g, '');
    const prefix = target.match(/^[^0-9]*/)?.[0] || '';
    const duration = 2000;
    const start = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = numericTarget * easeOut;

        let display;
        if (numericTarget >= 1) {
            display = prefix + Math.floor(current).toLocaleString() + suffix;
        } else {
            display = prefix + current.toFixed(1) + suffix;
        }

        element.textContent = display;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }

    requestAnimationFrame(update);
}

// Scroll fade-in animations using Intersection Observer
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');

            // Trigger counter animation if it's a stat number
            if (entry.target.classList.contains('stat-number') && entry.target.dataset.target) {
                animateCounter(entry.target);
            }

            fadeInObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all animate-on-scroll elements
document.querySelectorAll('.animate-on-scroll, .stat-number[data-target]').forEach(el => {
    fadeInObserver.observe(el);
});

// Handle elements already visible on page load (DOMContentLoaded ensures DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
    // Trigger counters that are already visible
    setTimeout(() => {
        document.querySelectorAll('.stat-number[data-target]').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                animateCounter(el);
            }
        });
    }, 100);
});

// Pillar card hover lift effect
document.querySelectorAll('.pillar-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});
