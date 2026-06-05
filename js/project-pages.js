(function () {
  'use strict';

  const selectors = {
    galleryItem: '.gallery-item, .gallery-card',
    modal: '#imageModal',
    modalImage: '#modalImage',
    modalClose: '.image-modal-close',
    lazyVideo: '.video-container iframe[data-src], .project-video-frame iframe[data-src]',
    wipTape: '[data-component="wip-tape"]',
    wipButton: '.project-wip__tape',
  };

  let modal;
  let modalImage;
  let previousBodyOverflow = '';

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
    modal = modal || document.querySelector(selectors.modal) || createImageModal();
    modalImage = modalImage || modal.querySelector(selectors.modalImage);
    return modal;
  }

  function openImageModal(src, alt = '') {
    if (!src) return;

    const element = getImageModal();
    if (!modalImage) return;

    modalImage.src = src;
    modalImage.alt = alt;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.hidden = false;
  }

  function closeImageModal() {
    const element = getImageModal();
    element.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
  }

  function initImageGallery() {
    if (!document.querySelector(selectors.galleryItem)) return;

    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest(selectors.modalClose);
      if (closeButton) {
        closeImageModal();
        return;
      }

      const element = getImageModal();
      if (event.target === element) {
        closeImageModal();
        return;
      }

      const galleryItem = event.target.closest(selectors.galleryItem);
      if (!galleryItem) return;

      const image = galleryItem.querySelector('img');
      if (image) openImageModal(image.currentSrc || image.src, image.alt);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.hidden) {
        closeImageModal();
      }
    });
  }

  function initSmoothScroll() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#' || href === '#!') return;

      try {
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        // Invalid fragment selectors should keep normal browser navigation.
      }
    });
  }

  function secureExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach((link) => {
      if (link.hostname === window.location.hostname) return;
      if (!link.hasAttribute('rel')) link.setAttribute('rel', 'noopener noreferrer');
      if (!link.hasAttribute('target')) link.setAttribute('target', '_blank');
    });
  }

  function loadVideo(iframe) {
    iframe.src = iframe.dataset.src;
    iframe.removeAttribute('data-src');
  }

  function initLazyVideoEmbeds() {
    const videos = Array.from(document.querySelectorAll(selectors.lazyVideo));
    if (!videos.length) return;

    if (!('IntersectionObserver' in window)) {
      videos.forEach(loadVideo);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadVideo(entry.target);
        observer.unobserve(entry.target);
      });
    });

    videos.forEach((video) => observer.observe(video));
  }

  function initWorkInProgressTape() {
    const tape = document.querySelector(selectors.wipTape);
    const button = tape?.querySelector(selectors.wipButton);
    if (!tape || !button) return;

    button.addEventListener('click', () => {
      tape.classList.add('is-dismissed');
      tape.setAttribute('aria-hidden', 'true');
    });
  }

  function init() {
    initImageGallery();
    initSmoothScroll();
    secureExternalLinks();
    initLazyVideoEmbeds();
    initWorkInProgressTape();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ProjectPages = {
    init,
    openImageModal,
    closeImageModal,
    secureExternalLinks,
  };
})();
