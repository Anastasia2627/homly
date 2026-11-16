/**
 * HOMLY Motion layer
 * Motion JS: MIT license — https://motion.dev/
 * No framework migration. All existing shopping logic remains in app.js.
 *
 * If the animation CDN is unavailable, the original IntersectionObserver
 * reveals in app.js remain fully functional.
 */
(() => {
  const root = document.documentElement;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const registry = new WeakSet();

  const whenReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else callback();
  };

  function enhance({ animate, inView, scroll }) {
    root.dataset.motionEngine = 'motion';
    const ease = [0.2, 0.85, 0.2, 1];
    const base = { duration: 0.9, ease };

    const watch = (selector, createAnimation, options = {}) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (registry.has(element)) return;
        registry.add(element);
        inView(element, () => {
          createAnimation(element);
          element.dataset.motionSeen = 'true';
        }, { margin: '0px 0px -12% 0px', amount: 0.08, ...options });
      });
    };

    const register = () => {
      // Adapted from Animata's mask/scroll reveal patterns:
      // every block animates only when its own viewport threshold is crossed.
      watch('.section-top, .studio-head, .unbox-heading, .about-quote', (element) => {
        const text = element.querySelector('h2, p');
        if (text) {
          animate(text, { opacity: [0.35, 1], y: [36, 0] },
            { ...base, duration: 1.05 });
        }
      });

      // Aceternity-style focus cards — constrained to product photography.
      watch('.gallery-tile', (tile) => {
        const image = tile.querySelector('.tile-photo img');
        const caption = tile.querySelector('.tile-label');
        if (image) animate(image,
          { scale: [1.16, 1], rotate: [-2, 0] },
          { ...base, duration: 1.25 });
        if (caption) animate(caption,
          { y: [27, 0], opacity: [0.2, 1] },
          { ...base, duration: 0.75, delay: 0.12 });
      });

      // A curtain reveal for opening the craft box — no stickers or clutter.
      watch('.unbox-image', (box) => {
        animate(box, {
          clipPath: [
            'inset(14% 6% 14% 6% round 44px)',
            'inset(0% 0% 0% 0% round 0px)'
          ]
        }, { ...base, duration: 1.15 });
      });

      // One independent entrance per step, followed by existing photo switching.
      watch('.story-step', (step) => {
        const title = step.querySelector('h3');
        const detail = step.querySelector('p');
        if (title) animate(title,
          { opacity: [0.35, 1], y: [24, 0], scale: [0.95, 1] },
          { ...base, duration: 0.8 });
        if (detail) animate(detail,
          { opacity: [0.35, 1], y: [16, 0] },
          { ...base, delay: 0.14, duration: 0.8 });
      });

      // Works for dynamically filtered catalog and favorite cards as well.
      watch('.product-card', (card) => {
        const image = card.querySelector('.product-photo img');
        const info = card.querySelector('.product-info');
        if (image) animate(image, { scale: [1.12, 1] },
          { ...base, duration: 1.05 });
        if (info) animate(info, { opacity: [0.25, 1], y: [18, 0] },
          { ...base, duration: 0.78, delay: 0.13 });
      });

      watch('.final-photo, .about-photo, .detail-visual', (figure) => {
        const image = figure.querySelector('img');
        if (image) animate(image,
          { scale: [1.13, 1], rotate: [1.5, 0] },
          { ...base, duration: 1.35 });
      });
    };

    register();
    const dynamicAreas = [
      document.getElementById('catalog-grid'),
      document.getElementById('favorites-content'),
      document.getElementById('cart-content')
    ].filter(Boolean);
    if (window.MutationObserver && dynamicAreas.length) {
      const observer = new MutationObserver(register);
      dynamicAreas.forEach(area => observer.observe(area, { childList: true, subtree: true }));
    }

    // Native scroll-linked motion: reads progress, not cumulative wheel events.
    const progress = document.createElement('div');
    progress.className = 'homly-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
    scroll(p => {
      progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    });

    const slowPhoto = (selector, amount) => {
      const section = document.querySelector(selector);
      if (!section) return;
      scroll((progress) => {
        section.style.setProperty('--parallax-picture', ((progress - 0.5) * amount).toFixed(1) + 'px');
      }, { target: section, offset: ['start end', 'end start'] });
    };
    slowPhoto('.unbox-image', -68);
    slowPhoto('.final-photo', -44);

    // The hero photograph reacts to the pointer but remains completely still
    // on touch screens and when reduced motion is requested.
    if (isFinePointer) {
      const layer = document.querySelector('.hero-art');
      const main = layer?.querySelector('.hero-photo-main');
      const small = layer?.querySelector('.hero-photo-small');
      if (layer && main && small) {
        layer.addEventListener('pointermove', event => {
          const b = layer.getBoundingClientRect();
          const x = (event.clientX - b.left) / b.width - 0.5;
          const y = (event.clientY - b.top) / b.height - 0.5;
          animate(main, { x: x * 14, y: y * 12 }, { type: 'spring', stiffness: 170, damping: 25 });
          animate(small, { x: -x * 21, y: -y * 16 }, { type: 'spring', stiffness: 140, damping: 23 });
        }, { passive: true });
        layer.addEventListener('pointerleave', () => {
          animate(main, { x: 0, y: 0 }, { type: 'spring', stiffness: 170, damping: 25 });
          animate(small, { x: 0, y: 0 }, { type: 'spring', stiffness: 150, damping: 25 });
        });
      }

      // Magnetic button-arrow, inspired by Aceternity's magnetic button.
      // Only the arrow moves, so the clickable target never wanders.
      document.querySelectorAll('.btn').forEach(button => {
        const arrow = button.querySelector('.btn-icon');
        if (!arrow) return;
        button.addEventListener('pointermove', event => {
          const b = button.getBoundingClientRect();
          const x = ((event.clientX - b.left) / b.width - .5) * 16;
          const y = ((event.clientY - b.top) / b.height - .5) * 12;
          animate(arrow, { x, y }, { type: 'spring', stiffness: 400, damping: 25 });
        }, { passive: true });
        button.addEventListener('pointerleave', () => {
          animate(arrow, { x: 0, y: 0 }, { type: 'spring', stiffness: 400, damping: 25 });
        });
      });
    }
  }

  whenReady(() => {
    if (isReduced) {
      root.dataset.motionEngine = 'reduced';
      return;
    }
    // Pinned version: reproducible; native observer fallback if CDN is blocked.
    import('https://cdn.jsdelivr.net/npm/motion@13.0.0/+esm')
      .then(enhance)
      .catch((error) => {
        root.dataset.motionEngine = 'fallback';
        console.info('HOMLY: Motion library unavailable; using native reveals.', error);
      });
  });
})();