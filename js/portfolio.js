(function () {
    const bootLog = document.getElementById('boot-log');
    if (bootLog) {
        try {
            const lines = JSON.parse(bootLog.dataset.lines);
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                bootLog.textContent = lines.join('\n');
            } else {
                bootLog.textContent = '';
                let index = 0;
                const typeNext = () => {
                    if (index >= lines.length) return;
                    bootLog.textContent += `${lines[index]}\n`;
                    index += 1;
                    setTimeout(typeNext, 550);
                };
                setTimeout(typeNext, 350);
            }
        } catch (error) {
            console.warn('Unable to parse boot log lines', error);
        }
    }

    const navButtons = Array.from(document.querySelectorAll('.hud__nav-btn'));
    if (navButtons.length) {
        navButtons[0].classList.add('is-active');
    }
    const sections = Array.from(document.querySelectorAll('.scene'));

    navButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const progressEl = document.querySelector('.hud__progress-meter');
    const updateProgress = () => {
        if (!progressEl) return;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable <= 0 ? 0 : (window.scrollY / scrollable);
        progressEl.style.width = `${Math.min(Math.max(progress, 0), 1) * 100}%`;
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    const highlightObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const { id } = entry.target;
            navButtons.forEach((btn) => {
                const isActive = btn.dataset.target === id;
                btn.classList.toggle('is-active', isActive);
            });
        });
    }, { threshold: 0.55 });

    sections.forEach((section) => highlightObserver.observe(section));

    const signalObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.dataset.active = 'true';
            } else {
                entry.target.dataset.active = 'false';
            }
        });
    }, { threshold: 0.35 });

    document.querySelectorAll('[data-signal]').forEach((node) => {
        signalObserver.observe(node);
    });

    const projectWindow = document.querySelector('.project-window');
    const backdrop = document.querySelector('.window-backdrop');
    const windowTitle = document.getElementById('project-window-title');
    const windowDescription = document.getElementById('project-window-description');
    const windowLink = document.getElementById('project-window-link');
    const closeBtn = projectWindow ? projectWindow.querySelector('.project-window__close') : null;
    let activeTrigger = null;

    const openProjectWindow = (trigger) => {
        if (!projectWindow || !backdrop || !closeBtn || !windowTitle || !windowDescription || !windowLink) return;
        const { title, description, link } = trigger.dataset;
        windowTitle.textContent = title || 'Project';
        windowDescription.textContent = description || '';
        if (link) {
            windowLink.href = link;
            windowLink.classList.remove('is-disabled');
            windowLink.setAttribute('aria-disabled', 'false');
        } else {
            windowLink.href = '#';
            windowLink.classList.add('is-disabled');
            windowLink.setAttribute('aria-disabled', 'true');
        }
        projectWindow.classList.add('is-visible');
        projectWindow.setAttribute('aria-hidden', 'false');
        backdrop.classList.add('is-visible');
        closeBtn.focus({ preventScroll: true });
        activeTrigger = trigger;
        document.body.style.overflow = 'hidden';
    };

    const closeProjectWindow = () => {
        if (!projectWindow || !backdrop) return;
        projectWindow.classList.remove('is-visible');
        projectWindow.setAttribute('aria-hidden', 'true');
        backdrop.classList.remove('is-visible');
        document.body.style.overflow = '';
        if (activeTrigger) {
            activeTrigger.focus({ preventScroll: true });
            activeTrigger = null;
        }
    };

    document.querySelectorAll('.project-node').forEach((node) => {
        node.addEventListener('click', () => openProjectWindow(node));
        node.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openProjectWindow(node);
            }
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeProjectWindow);
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeProjectWindow);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && projectWindow && projectWindow.classList.contains('is-visible')) {
            closeProjectWindow();
        }
    });
})();
