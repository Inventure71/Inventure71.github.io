/**
 * Modern Scroll Animations Module
 * Provides smooth scroll-based animations using Intersection Observer API
 */

class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        this.observers = new Map();
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAnimations());
        } else {
            this.setupAnimations();
        }
    }

    setupAnimations() {
        this.setupFadeIn();
        this.setupSlideIn();
        this.setupScaleIn();
        this.setupParallax();
        this.setupCounterAnimation();
        this.setupNavbarScroll();
        this.setupStaggerAnimation();
    }

    // Fade in animation
    setupFadeIn() {
        const elements = document.querySelectorAll('.fade-in');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, this.observerOptions);

        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            observer.observe(el);
        });
    }

    // Slide in from different directions
    setupSlideIn() {
        const slideLeft = document.querySelectorAll('.slide-in-left');
        const slideRight = document.querySelectorAll('.slide-in-right');
        const slideUp = document.querySelectorAll('.slide-in-up');
        const slideDown = document.querySelectorAll('.slide-in-down');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, this.observerOptions);

        [...slideLeft, ...slideRight, ...slideUp, ...slideDown].forEach(el => {
            el.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out';
            el.style.opacity = '0';
            observer.observe(el);
        });

        // Set initial positions
        slideLeft.forEach(el => {
            el.style.transform = 'translateX(-50px)';
        });
        slideRight.forEach(el => {
            el.style.transform = 'translateX(50px)';
        });
        slideUp.forEach(el => {
            el.style.transform = 'translateY(50px)';
        });
        slideDown.forEach(el => {
            el.style.transform = 'translateY(-50px)';
        });

        // Add CSS for animate class
        const style = document.createElement('style');
        style.textContent = `
            .slide-in-left.animate,
            .slide-in-right.animate,
            .slide-in-up.animate,
            .slide-in-down.animate {
                opacity: 1 !important;
                transform: translate(0, 0) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Scale in animation
    setupScaleIn() {
        const elements = document.querySelectorAll('.scale-in');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'scale(1)';
                    observer.unobserve(entry.target);
                }
            });
        }, this.observerOptions);

        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'scale(0.8)';
            el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            observer.observe(el);
        });
    }

    // Parallax effect
    setupParallax() {
        const elements = document.querySelectorAll('.parallax');
        
        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            elements.forEach(el => {
                const rate = scrolled * (el.dataset.parallaxSpeed || 0.5);
                el.style.transform = `translateY(${rate}px)`;
            });
        };

        if (elements.length > 0) {
            window.addEventListener('scroll', handleScroll, { passive: true });
        }
    }

    // Counter animation
    setupCounterAnimation() {
        const counters = document.querySelectorAll('.counter');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    this.animateCounter(entry.target);
                    entry.target.classList.add('counted');
                    observer.unobserve(entry.target);
                }
            });
        }, this.observerOptions);

        counters.forEach(counter => observer.observe(counter));
    }

    animateCounter(element) {
        const target = parseInt(element.dataset.target || element.textContent);
        const duration = parseInt(element.dataset.duration || 2000);
        const increment = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                element.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
            }
        };

        updateCounter();
    }

    // Navbar scroll effect
    setupNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                navbar.style.backgroundColor = 'rgba(18, 18, 18, 0.95)';
                navbar.style.backdropFilter = 'blur(20px)';
                navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            } else {
                navbar.style.backgroundColor = '';
                navbar.style.backdropFilter = '';
                navbar.style.boxShadow = '';
            }

            // Hide/show navbar on scroll
            if (currentScroll > lastScroll && currentScroll > 200) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }

            lastScroll = currentScroll;
        }, { passive: true });

        navbar.style.transition = 'all 0.3s ease';
    }

    // Stagger animation for lists
    setupStaggerAnimation() {
        const containers = document.querySelectorAll('.stagger-children');
        
        containers.forEach(container => {
            const children = container.children;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        Array.from(children).forEach((child, index) => {
                            setTimeout(() => {
                                child.style.opacity = '1';
                                child.style.transform = 'translateY(0)';
                            }, index * 100);
                        });
                        observer.unobserve(entry.target);
                    }
                });
            }, this.observerOptions);

            Array.from(children).forEach(child => {
                child.style.opacity = '0';
                child.style.transform = 'translateY(20px)';
                child.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            });

            observer.observe(container);
        });
    }
}

// Initialize animations when script loads
const scrollAnimations = new ScrollAnimations();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScrollAnimations;
}

