const statusEl = document.querySelector(".command-status");
const navButtons = Array.from(document.querySelectorAll(".command-nav__btn"));
const modules = Array.from(document.querySelectorAll("[data-module]"));
const bootLogEl = document.querySelector("[data-boot-log]");
const laneEl = document.querySelector("[data-lane]");
const laneFeedEl = document.querySelector("[data-lane-feed]");
const dossierButtons = Array.from(document.querySelectorAll(".dossier-card"));
const dossierWindow = document.querySelector(".dossier-window");
const dossierBackdrop = document.querySelector(".dossier-backdrop");
const dossierClose = dossierWindow?.querySelector(".dossier-window__close");
const dossierTitle = dossierWindow?.querySelector("#dossier-window-title");
const dossierDescription = dossierWindow?.querySelector("#dossier-window-description");
const dossierLink = dossierWindow?.querySelector("#dossier-window-link");
const statusMessages = modules.map((module) => module.dataset.status);

if (modules.length) {
    updateStatus?.(0);
}

if (navButtons.length) {
    navButtons[0].setAttribute("aria-current", "true");
}

function updateStatus(index) {
    const status = statusMessages[index] || "Deck ready";
    if (statusEl) {
        statusEl.textContent = status;
    }
}

function scrollToTarget(id) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
}

navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        scrollToTarget(btn.dataset.target);
    });
});

const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const module = entry.target;
            const index = modules.indexOf(module);
            updateStatus(index);
            navButtons.forEach((btn) => {
                const matches = btn.dataset.target === module.id;
                btn.setAttribute("aria-current", matches ? "true" : "false");
            });
            module.querySelectorAll("[data-signal]").forEach((el) => {
                el.classList.add("is-active");
            });
        });
    },
    {
        threshold: 0.5,
    }
);

modules.forEach((module) => observer.observe(module));

function typeBootLog() {
    if (!bootLogEl) return;
    const caret = bootLogEl.querySelector(".boot-caret");
    const lines = [
        "[init] Loading experimental command deck…",
        "[ai] Companion OS online — emotional heuristics warmed.",
        "[story] Memory artifacts synced to tactile network.",
        "[robotics] Stage bots calibrating servos.",
        "[race] Formation lap HUD connected to scroll telemetry.",
        "[done] Welcome aboard. Choose your module.",
    ];
    let index = 0;

    function appendLine() {
        if (index >= lines.length) return;
        const line = document.createElement("span");
        line.textContent = lines[index];
        bootLogEl.insertBefore(line, caret);
        index += 1;
        setTimeout(appendLine, 700);
    }

    appendLine();
}

typeBootLog();

function rotateLaneFeed() {
    if (!laneFeedEl) return;
    const items = Array.from(laneFeedEl.children);
    if (!items.length) return;
    let pointer = 0;

    function cycle() {
        items.forEach((item, idx) => {
            item.style.opacity = idx === pointer ? "1" : "0.25";
        });
        pointer = (pointer + 1) % items.length;
        setTimeout(cycle, 2200);
    }

    cycle();
}

rotateLaneFeed();

if (laneEl) {
    const laneObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    laneEl.classList.add("is-active");
                } else {
                    laneEl.classList.remove("is-active");
                }
            });
        },
        { threshold: 0.3 }
    );

    laneObserver.observe(laneEl);

    let lastY = window.scrollY;
    let lastTime = performance.now();

    function updateHud() {
        if (!laneFeedEl) return;
        const now = performance.now();
        const delta = now - lastTime;
        const distance = Math.abs(window.scrollY - lastY);
        lastY = window.scrollY;
        lastTime = now;
        const speed = Math.min(1, distance / Math.max(delta, 16) * 0.6);
        laneFeedEl.style.filter = `saturate(${1 + speed})`;
        requestAnimationFrame(updateHud);
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(updateHud);
    }
}

function openDossier(button) {
    if (!dossierWindow || !dossierBackdrop) return;
    dossierWindow.setAttribute("aria-hidden", "false");
    dossierBackdrop.classList.add("is-visible");
    dossierTitle.textContent = button.dataset.title || "Project";
    dossierDescription.textContent = button.dataset.description || "";
    dossierLink.href = button.dataset.link || "#";
    dossierLink.focus();
}

function closeDossier() {
    if (!dossierWindow || !dossierBackdrop) return;
    dossierWindow.setAttribute("aria-hidden", "true");
    dossierBackdrop.classList.remove("is-visible");
}

dossierButtons.forEach((button) => {
    button.addEventListener("click", () => openDossier(button));
});

dossierClose?.addEventListener("click", closeDossier);

dossierBackdrop?.addEventListener("click", closeDossier);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeDossier();
    }
});
