(function () {
  'use strict';

  const selectors = {
    galleryItem: '.gallery-item, .gallery-card',
    lazyVideo: '.video-container iframe[data-src], .project-video-frame iframe[data-src]',
    placeholderMedia: '[data-placeholder-media]',
    projectMain: 'main',
    projectShell: '.project-shell',
    zoomableMedia: '.project-media-stage--image',
  };

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const initializedVideos = new WeakSet();
  let modal;
  let modalImage;
  let modalClose;
  let previousFocus;
  let previousBodyOverflow = '';
  let inertState = [];
  let eventsBound = false;
  let readingProgressInitialized = false;
  let videoObserver;
  let revealObserver;

  function createImageModal() {
    const element = document.createElement('div');
    element.id = 'imageModal';
    element.className = 'image-modal';
    element.hidden = true;
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-label', 'Image preview');
    element.innerHTML = `
      <button class="image-modal-close" type="button" aria-label="Close image preview">&times;</button>
      <img class="image-modal-content" id="modalImage" alt="">
    `;
    document.body.appendChild(element);
    return element;
  }

  function getImageModal() {
    modal = modal || document.querySelector('#imageModal') || createImageModal();
    modalImage = modalImage || modal.querySelector('#modalImage');
    modalClose = modalClose || modal.querySelector('.image-modal-close');
    return modal;
  }

  function setBackgroundInert(isInert) {
    const element = getImageModal();

    if (isInert) {
      inertState = Array.from(document.body.children)
        .filter((child) => child !== element)
        .map((child) => ({ child, wasInert: child.hasAttribute('inert') }));
      inertState.forEach(({ child }) => child.setAttribute('inert', ''));
      return;
    }

    inertState.forEach(({ child, wasInert }) => {
      if (!wasInert) child.removeAttribute('inert');
    });
    inertState = [];
  }

  function openImageModal(src, alt = '', trigger = document.activeElement) {
    if (!src) return;

    const element = getImageModal();
    if (!modalImage || !modalClose) return;

    previousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    modalImage.src = src;
    modalImage.alt = alt;
    document.body.style.overflow = 'hidden';
    element.hidden = false;
    setBackgroundInert(true);
    modalClose.focus({ preventScroll: true });
  }

  function closeImageModal() {
    const element = getImageModal();
    if (element.hidden) return;

    element.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    setBackgroundInert(false);
    modalImage.removeAttribute('src');

    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  }

  function enhanceGalleryItems(root = document) {
    root.querySelectorAll(selectors.galleryItem).forEach((item) => {
      if (item.dataset.galleryReady === 'true' || item.hidden) return;
      const image = item.querySelector('img');
      if (!image) return;

      item.dataset.galleryReady = 'true';
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `View larger image: ${image.alt || 'project image'}`);
    });
  }

  function enhanceZoomableMedia(root = document) {
    root.querySelectorAll(selectors.zoomableMedia).forEach((stage) => {
      if (stage.dataset.zoomReady === 'true' || stage.hidden) return;
      const image = stage.querySelector('img');
      if (!image) return;

      stage.dataset.zoomReady = 'true';
      stage.tabIndex = 0;
      stage.setAttribute('role', 'button');
      stage.setAttribute('aria-haspopup', 'dialog');
      stage.setAttribute('aria-label', `View larger image: ${image.alt || 'project image'}`);
    });
  }

  function bindDocumentEvents() {
    if (eventsBound) return;
    eventsBound = true;

    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest('.image-modal-close');
      if (closeButton) {
        closeImageModal();
        return;
      }

      const element = modal || document.querySelector('#imageModal');
      if (element && event.target === element) {
        closeImageModal();
        return;
      }

      const mediaTrigger = event.target.closest(`${selectors.galleryItem}, ${selectors.zoomableMedia}`);
      const isReadyMedia = mediaTrigger
        && (mediaTrigger.dataset.galleryReady === 'true' || mediaTrigger.dataset.zoomReady === 'true');
      if (isReadyMedia) {
        const image = mediaTrigger.querySelector('img');
        if (image) openImageModal(image.currentSrc || image.src, image.alt, mediaTrigger);
        return;
      }

      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#' || href === '#!') return;

      try {
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        if (window.location.hash !== href) {
          window.history.pushState(null, '', href);
        }
        target.scrollIntoView({
          behavior: reducedMotion?.matches ? 'auto' : 'smooth',
          block: 'start',
        });
      } catch (error) {
        // Invalid fragment selectors keep normal browser navigation.
      }
    });

    document.addEventListener('keydown', (event) => {
      const element = modal || document.querySelector('#imageModal');
      const isModalOpen = element && !element.hidden;

      if (isModalOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeImageModal();
        } else if (event.key === 'Tab') {
          event.preventDefault();
          modalClose?.focus({ preventScroll: true });
        }
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') return;
      const mediaTrigger = event.target.closest?.(`${selectors.galleryItem}, ${selectors.zoomableMedia}`);
      const isReadyMedia = mediaTrigger
        && (mediaTrigger.dataset.galleryReady === 'true' || mediaTrigger.dataset.zoomReady === 'true');
      if (!isReadyMedia) return;

      const image = mediaTrigger.querySelector('img');
      if (!image) return;
      event.preventDefault();
      openImageModal(image.currentSrc || image.src, image.alt, mediaTrigger);
    });
  }

  function secureExternalLinks(root = document) {
    root.querySelectorAll('a[href^="http"]').forEach((link) => {
      if (link.hostname === window.location.hostname) return;
      link.setAttribute('rel', 'noopener noreferrer');
      if (!link.hasAttribute('target')) link.setAttribute('target', '_blank');
    });
  }

  function loadVideo(iframe) {
    if (!iframe.dataset.src) return;
    iframe.src = iframe.dataset.src;
    iframe.removeAttribute('data-src');
  }

  function initLazyVideoEmbeds(root = document) {
    const videos = Array.from(root.querySelectorAll(selectors.lazyVideo))
      .filter((video) => !initializedVideos.has(video));
    if (!videos.length) return;

    videos.forEach((video) => initializedVideos.add(video));

    if (!('IntersectionObserver' in window)) {
      videos.forEach(loadVideo);
      return;
    }

    videoObserver = videoObserver || new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadVideo(entry.target);
        videoObserver.unobserve(entry.target);
      });
    }, { rootMargin: '240px 0px' });

    videos.forEach((video) => videoObserver.observe(video));
  }

  function initPlaceholderMedia(root = document) {
    const placeholders = Array.from(root.querySelectorAll(selectors.placeholderMedia));
    placeholders.forEach((placeholder) => {
      placeholder.hidden = true;
      placeholder.setAttribute('aria-hidden', 'true');
    });

    root.querySelectorAll('.project-media-panel').forEach((panel) => {
      const visibleStage = panel.querySelector('.project-media-stage:not([hidden]), .ratio:not([hidden])');
      panel.classList.toggle('project-media-panel--without-media', !visibleStage);
    });

    root.querySelectorAll('.project-gallery').forEach((gallery) => {
      const visibleMedia = gallery.querySelector('.gallery-card:not([hidden]), .gallery-item:not([hidden])');
      if (visibleMedia) return;

      const section = gallery.closest('.project-section');
      if (section) {
        section.hidden = true;
        section.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function enhanceSectionSemantics(root = document) {
    root.querySelectorAll('.project-section').forEach((section, index) => {
      const heading = section.querySelector('.project-section-header h2');
      if (!heading) return;
      if (!heading.id) heading.id = `project-section-${index + 1}`;
      if (!section.hasAttribute('aria-labelledby')) {
        section.setAttribute('aria-labelledby', heading.id);
      }
    });

    root.querySelectorAll('.project-sidecard').forEach((sidecard) => {
      if (!sidecard.hasAttribute('aria-label')) sidecard.setAttribute('aria-label', 'Project summary');
    });
  }

  function initProjectIntroStage(root = document) {
    const shell = root.querySelector(selectors.projectShell);
    if (!shell || shell.querySelector(':scope > .project-intro-stage')) return;

    const hero = shell.querySelector(':scope > .project-hero');
    if (!hero) return;

    const adjacentPanel = hero.nextElementSibling?.matches('.project-media-panel')
      ? hero.nextElementSibling
      : null;
    const meta = hero.querySelector(':scope > .hero-meta');
    const stage = document.createElement('div');
    stage.className = 'project-intro-stage';

    shell.insertBefore(stage, hero);
    stage.appendChild(hero);

    if (!adjacentPanel) {
      stage.classList.add('project-intro-stage--solo');
      return;
    }

    adjacentPanel.classList.add('project-intro-panel');
    stage.appendChild(adjacentPanel);

    if (meta) {
      const sidecard = adjacentPanel.querySelector(':scope > .project-sidecard');
      adjacentPanel.insertBefore(meta, sidecard || null);
    }
  }

  function initCaseStudyChrome(root = document) {
    const main = root.querySelector(selectors.projectMain);
    const shell = root.querySelector(selectors.projectShell);
    if (!main || !shell) return;

    if (!main.id) main.id = 'project-content';
    if (!root.querySelector('.project-skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.className = 'project-skip-link';
      skipLink.href = `#${main.id}`;
      skipLink.textContent = 'Skip to project content';
      document.body.prepend(skipLink);
    }

    enhanceSectionSemantics(root);

    const blocks = Array.from(shell.children)
      .filter((child) => child.matches('.project-intro-stage, .project-section, .text-center'));
    if (!blocks.length || reducedMotion?.matches) return;

    if (!('IntersectionObserver' in window)) {
      blocks.forEach((block) => block.classList.add('is-project-visible'));
      return;
    }

    document.body.classList.add('project-motion-ready');
    revealObserver = revealObserver || new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-project-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });

    blocks.forEach((block, index) => {
      if (block.dataset.revealReady === 'true') return;
      block.dataset.revealReady = 'true';
      if (index === 0) {
        requestAnimationFrame(() => block.classList.add('is-project-visible'));
      } else {
        revealObserver.observe(block);
      }
    });
  }

  function initReadingProgress(root = document) {
    if (readingProgressInitialized || reducedMotion?.matches) return;

    const shell = root.querySelector(selectors.projectShell);
    if (!shell) return;

    const progress = document.createElement('div');
    progress.className = 'project-reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
    readingProgressInitialized = true;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = shell.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      const distance = Math.max(1, shell.offsetHeight - window.innerHeight);
      const value = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
      progress.style.setProperty('--project-read-progress', value.toFixed(4));
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
  }

  function initMediaDepth(root = document) {
    if (reducedMotion?.matches || !window.matchMedia?.('(pointer: fine)').matches) return;

    root.querySelectorAll('.project-media-stage--image').forEach((stage) => {
      if (stage.dataset.mediaDepth === 'true') return;
      const image = stage.querySelector('img');
      if (!image) return;

      stage.dataset.mediaDepth = 'true';
      let frame = 0;
      let nextX = 0;
      let nextY = 0;

      const render = () => {
        frame = 0;
        image.style.setProperty('--project-media-x', `${nextX.toFixed(2)}px`);
        image.style.setProperty('--project-media-y', `${nextY.toFixed(2)}px`);
      };
      const requestRender = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(render);
      };
      const reset = () => {
        nextX = 0;
        nextY = 0;
        requestRender();
      };

      stage.addEventListener('pointermove', (event) => {
        const rect = stage.getBoundingClientRect();
        nextX = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
        nextY = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
        requestRender();
      }, { passive: true });
      stage.addEventListener('pointerleave', reset, { passive: true });
    });
  }

  function init(root = document) {
    initPlaceholderMedia(root);
    initProjectIntroStage(root);
    enhanceGalleryItems(root);
    enhanceZoomableMedia(root);
    secureExternalLinks(root);
    initLazyVideoEmbeds(root);
    initCaseStudyChrome(root);
    initReadingProgress(root);
    initMediaDepth(root);
    bindDocumentEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  window.ProjectPages = {
    init,
    openImageModal,
    closeImageModal,
    initPlaceholderMedia,
    initProjectIntroStage,
    secureExternalLinks,
  };
})();
