/**
 * PROJECT PAGES - MODULAR JAVASCRIPT
 * Reusable functionality for all project detail pages
 */

(function() {
    'use strict';

    /**
     * Image Gallery Modal
     * Handles click-to-zoom functionality for images
     */
    const ImageGallery = {
        modal: null,
        modalImage: null,

        init: function() {
            // Create modal if it doesn't exist
            if (!document.getElementById('imageModal')) {
                this.createModal();
            }

            this.modal = document.getElementById('imageModal');
            this.modalImage = document.getElementById('modalImage');

            // Attach event listeners
            this.attachListeners();
        },

        createModal: function() {
            const modal = document.createElement('div');
            modal.id = 'imageModal';
            modal.className = 'image-modal';
            modal.innerHTML = `
                <span class="image-modal-close">&times;</span>
                <img class="image-modal-content" id="modalImage" alt="Enlarged view">
            `;
            document.body.appendChild(modal);
        },

        attachListeners: function() {
            const self = this;

            // Gallery items click
            document.querySelectorAll('.gallery-item').forEach(item => {
                item.addEventListener('click', function() {
                    const img = this.querySelector('img');
                    if (img) {
                        self.open(img.src, img.alt);
                    }
                });
            });

            // Close button click
            if (this.modal) {
                const closeBtn = this.modal.querySelector('.image-modal-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }

                // Click outside image to close
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) {
                        this.close();
                    }
                });
            }

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal && this.modal.style.display === 'block') {
                    this.close();
                }
            });
        },

        open: function(src, alt = '') {
            if (this.modal && this.modalImage) {
                this.modal.style.display = 'block';
                this.modalImage.src = src;
                this.modalImage.alt = alt;
                document.body.style.overflow = 'hidden';
            }
        },

        close: function() {
            if (this.modal) {
                this.modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    };

    /**
     * Smooth scroll for anchor links
     */
    const SmoothScroll = {
        init: function() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const href = this.getAttribute('href');
                    if (href === '#' || href === '#!') return;

                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
    };

    /**
     * External link handling
     * Add security attributes to external links
     */
    const ExternalLinks = {
        init: function() {
            document.querySelectorAll('a[href^="http"]').forEach(link => {
                // Skip if it's an internal link
                if (link.hostname === window.location.hostname) return;

                // Add security attributes
                if (!link.hasAttribute('rel')) {
                    link.setAttribute('rel', 'noopener noreferrer');
                }
                if (!link.hasAttribute('target')) {
                    link.setAttribute('target', '_blank');
                }
            });
        }
    };

    /**
     * Video embed lazy loading
     * Improves page load performance
     */
    const VideoLazyLoad = {
        init: function() {
            const videos = document.querySelectorAll('.video-container iframe[data-src]');

            if ('IntersectionObserver' in window) {
                const videoObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const iframe = entry.target;
                            iframe.src = iframe.dataset.src;
                            iframe.removeAttribute('data-src');
                            videoObserver.unobserve(iframe);
                        }
                    });
                });

                videos.forEach(video => videoObserver.observe(video));
            } else {
                // Fallback for browsers without IntersectionObserver
                videos.forEach(video => {
                    video.src = video.dataset.src;
                    video.removeAttribute('data-src');
                });
            }
        }
    };

    /**
     * Work In Progress tape dismissal
     */
    const WorkInProgress = {
        init: function() {
            const tape = document.querySelector('[data-component="wip-tape"]');
            if (!tape) return;

            const button = tape.querySelector('.project-wip__tape');
            if (!button) return;

            const dismiss = () => {
                tape.classList.add('is-dismissed');
                tape.setAttribute('aria-hidden', 'true');
            };

            button.addEventListener('click', dismiss);
            button.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    dismiss();
                }
            });
        }
    };

    /**
     * Initialize all modules when DOM is ready
     */
    function init() {
        ImageGallery.init();
        SmoothScroll.init();
        ExternalLinks.init();
        VideoLazyLoad.init();
        WorkInProgress.init();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose to global scope if needed
    window.ProjectPages = {
        ImageGallery,
        SmoothScroll,
        ExternalLinks,
        VideoLazyLoad,
        WorkInProgress
    };

})();


