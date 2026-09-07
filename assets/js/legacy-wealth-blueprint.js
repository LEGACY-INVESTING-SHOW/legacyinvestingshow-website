/* Links work without JavaScript; enhance them with inline players and plan previews. */
(() => {
    'use strict';
    document.querySelectorAll('[data-vimeo-id]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            )
                return;
            const id = link.dataset.vimeoId;
            if (!/^\d+$/.test(id)) return;
            event.preventDefault();
            const frame = document.createElement('iframe');
            frame.src = `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`;
            frame.title = link.getAttribute('aria-label');
            frame.allow = 'autoplay; fullscreen; picture-in-picture';
            frame.allowFullscreen = true;
            link.replaceWith(frame);
            frame.focus();
        });
    });
    const dialog = document.querySelector('.image-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    document.querySelectorAll('[data-plan-image]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            )
                return;
            event.preventDefault();
            const image = dialog.querySelector('img');
            image.src = link.href;
            dialog.querySelector('.dialog-original').href = link.href;
            image.alt = link.querySelector('img').alt;
            dialog.querySelector('.dialog-caption').textContent =
                link.dataset.caption;
            dialog.showModal();
        });
    });
    dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
        )
            dialog.close();
    });
})();
