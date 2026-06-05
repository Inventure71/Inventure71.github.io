const TONE_COLORS = {
    amber: "#f0c95c",
    blue: "#79a0ff",
    coral: "#ff7048",
    green: "#40b898",
    neutral: "#f4f1e8",
};

const topbars = document.querySelectorAll("[data-glass-demo]");
const CONTROL_GROUP_SELECTOR = ".brand-cluster, .nav-links, .nav-tools";
const TARGET_CLEAR_DELAY_MS = 55;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function updatePointerVars(topbar, event) {
    const rect = topbar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = clamp(x / rect.width, 0, 1);
    const py = clamp(y / rect.height, 0, 1);

    topbar.style.setProperty("--glass-x", `${x}px`);
    topbar.style.setProperty("--glass-y", `${y}px`);
    topbar.style.setProperty("--glass-px", px.toFixed(4));
    topbar.style.setProperty("--glass-py", py.toFixed(4));
    topbar.style.setProperty("--glass-dx", `${((px - 0.5) * 100).toFixed(2)}px`);
    topbar.style.setProperty("--glass-dy", `${((py - 0.5) * 100).toFixed(2)}px`);
}

function clearTarget(topbar) {
    const currentTarget = topbar.querySelector(".is-glass-target");
    currentTarget?.classList.remove("is-glass-target");
    topbar._glassTarget = null;
}

function resolveTargetColor(topbar, target) {
    const tone = target.dataset.glassTone;

    if (tone) {
        return TONE_COLORS[tone] || TONE_COLORS.blue;
    }

    return topbar.dataset.glassAccent || TONE_COLORS.green;
}

function applyBarHover(topbar) {
    topbar.classList.add("is-bar-hovering");
    topbar.classList.remove("is-item-hovering");
    topbar.style.removeProperty("--item-color");
    clearTarget(topbar);
}

function shouldBridgeControlGap(event) {
    return Boolean(event.target.closest(CONTROL_GROUP_SELECTOR));
}

function setPhase(topbar, target, event) {
    if (target) {
        window.clearTimeout(topbar._glassClearTimer);
    }

    if (!target && topbar._glassTarget) {
        window.clearTimeout(topbar._glassClearTimer);

        if (!shouldBridgeControlGap(event)) {
            applyBarHover(topbar);
            return;
        }

        topbar._glassClearTimer = window.setTimeout(() => {
            if (topbar._glassPendingTarget) {
                return;
            }

            applyBarHover(topbar);
        }, TARGET_CLEAR_DELAY_MS);
        return;
    }

    topbar.classList.toggle("is-bar-hovering", !target);
    topbar.classList.toggle("is-item-hovering", Boolean(target));

    if (topbar._glassTarget === target) {
        return;
    }

    topbar._glassTarget?.classList.remove("is-glass-target");
    topbar._glassTarget = target || null;

    if (!target) {
        topbar.style.removeProperty("--item-color");
        return;
    }

    target.classList.add("is-glass-target");
    topbar.style.setProperty("--item-color", resolveTargetColor(topbar, target));
}

for (const topbar of topbars) {
    topbar.addEventListener("pointerenter", (event) => {
        updatePointerVars(topbar, event);
        topbar._glassPendingTarget = event.target.closest("[data-glass-item]");
        setPhase(topbar, topbar._glassPendingTarget, event);
        topbar._glassPendingTarget = null;
    });

    topbar.addEventListener("pointermove", (event) => {
        updatePointerVars(topbar, event);
        topbar._glassPendingTarget = event.target.closest("[data-glass-item]");
        setPhase(topbar, topbar._glassPendingTarget, event);
        topbar._glassPendingTarget = null;
    });

    topbar.addEventListener("pointerleave", () => {
        window.clearTimeout(topbar._glassClearTimer);
        topbar.classList.remove("is-bar-hovering", "is-item-hovering");
        topbar.style.removeProperty("--item-color");
        clearTarget(topbar);
    });
}
