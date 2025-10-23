document.addEventListener('DOMContentLoaded', () => {
    const navButtons = Array.from(document.querySelectorAll('.pit-nav__btn'));
    const modules = Array.from(document.querySelectorAll('[data-module]'));
    const statusEl = document.querySelector('.pit-nav__status');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let currentFocus = 'Systems nominal';
    let currentSpeed = 'Idle';

    const updateStatus = () => {
        if (!statusEl) return;
        statusEl.textContent = `${currentFocus} · Speed ${currentSpeed}`;
    };

    updateStatus();

    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const activateNav = (id) => {
        navButtons.forEach((button) => {
            button.classList.toggle('is-active', button.getAttribute('data-target') === id);
        });
    };

    const moduleObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const moduleId = entry.target.id;
                    activateNav(moduleId);
                    const status = entry.target.getAttribute('data-status');
                    if (status) {
                        currentFocus = status.charAt(0).toUpperCase() + status.slice(1);
                        updateStatus();
                    }
                    entry.target.querySelectorAll('[data-signal]').forEach((signalEl) => {
                        signalEl.classList.add('is-active');
                    });
                }
            });
        },
        {
            threshold: 0.55,
        }
    );

    modules.forEach((module) => moduleObserver.observe(module));

    const signalObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-active');
                }
            });
        },
        { threshold: 0.4 }
    );

    document.querySelectorAll('[data-signal]').forEach((el) => signalObserver.observe(el));

    const animateTargets = Array.from(document.querySelectorAll('[data-animate]'));
    const animateObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-active');
                    if (prefersReducedMotion) {
                        entry.target.querySelectorAll('.circuit-car').forEach((car) => {
                            car.style.animation = 'none';
                            car.style.transform = 'translateX(0)';
                        });
                    }
                }
            });
        },
        { threshold: 0.4 }
    );

    animateTargets.forEach((target) => animateObserver.observe(target));

    const statusBoards = Array.from(document.querySelectorAll('[data-status-board]'));
    statusBoards.forEach((board) => {
        try {
            const frames = JSON.parse(board.getAttribute('data-frames'));
            if (!Array.isArray(frames) || frames.length === 0) return;
            const entry = board.querySelector('.status-board__entry');
            let index = 0;
            const rotate = () => {
                if (!entry) return;
                entry.textContent = frames[index];
                index = (index + 1) % frames.length;
            };
            rotate();
            setInterval(rotate, 4200);
        } catch (error) {
            console.error('Failed to parse status board frames', error);
        }
    });

    const dossierButtons = Array.from(document.querySelectorAll('.dossier'));
    const dossierWindow = document.querySelector('.dossier-window');
    const dossierBackdrop = document.querySelector('.dossier-backdrop');
    const closeButton = document.querySelector('.dossier-window__close');
    const titleEl = document.getElementById('dossier-window-title');
    const descEl = document.getElementById('dossier-window-description');
    const linkEl = document.getElementById('dossier-window-link');

    let activeDossier = null;

    const openDossier = (button) => {
        if (!dossierWindow || !dossierBackdrop) return;
        const title = button.getAttribute('data-title');
        const description = button.getAttribute('data-description');
        const link = button.getAttribute('data-link');
        if (titleEl) titleEl.textContent = title || '';
        if (descEl) descEl.textContent = description || '';
        if (linkEl && link) {
            linkEl.href = link;
        }
        dossierWindow.setAttribute('aria-hidden', 'false');
        dossierBackdrop.classList.add('is-visible');
        button.classList.add('is-active');
        dossierWindow.focus();
        activeDossier = button;
    };

    const closeDossier = () => {
        if (!dossierWindow || !dossierBackdrop) return;
        dossierWindow.setAttribute('aria-hidden', 'true');
        dossierBackdrop.classList.remove('is-visible');
        dossierButtons.forEach((btn) => btn.classList.remove('is-active'));
        if (activeDossier) {
            activeDossier.focus({ preventScroll: true });
            activeDossier = null;
        }
    };

    dossierButtons.forEach((button) => {
        button.addEventListener('click', () => openDossier(button));
        button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDossier(button);
            }
        });
    });

    closeButton?.addEventListener('click', closeDossier);
    dossierBackdrop?.addEventListener('click', closeDossier);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDossier();
        }
    });

    if (dossierWindow) {
        dossierWindow.setAttribute('tabindex', '-1');
    }

    let lastScrollY = window.scrollY;
    let lastTime = performance.now();

    const classifySpeed = (value) => {
        if (value < 120) return 'Idle';
        if (value < 320) return 'Coasting';
        if (value < 600) return 'Push';
        return 'Flat-out';
    };

    window.addEventListener(
        'scroll',
        () => {
            const now = performance.now();
            const deltaTime = now - lastTime;
            if (deltaTime === 0) return;
            const deltaY = Math.abs(window.scrollY - lastScrollY);
            const speed = (deltaY / deltaTime) * 1000; // px per second
            currentSpeed = classifySpeed(speed);
            updateStatus();
            lastScrollY = window.scrollY;
            lastTime = now;
        },
        { passive: true }
    );
});
