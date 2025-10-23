const bootLines = [
  "Booting Orbital Portfolio v3.0...",
  "Linking personal telemetry feeds...",
  "Syncing AI-driven projects with console UI...",
  "Establishing contact protocols...",
  "System ready. Enjoy the tour."
];

const bootScreen = document.getElementById("boot-screen");
const bootLinesElement = document.getElementById("boot-lines");

(function renderBootSequence(lines, container) {
  if (!container || !bootScreen) {
    return;
  }

  let lineIndex = 0;

  const typeNextLine = () => {
    if (lineIndex >= lines.length) {
      setTimeout(() => {
        bootScreen.classList.add("is-hidden");
      }, 600);
      return;
    }

    const currentLine = lines[lineIndex];
    const lineEl = document.createElement("span");
    container.appendChild(lineEl);

    let charIndex = 0;
    const typeInterval = setInterval(() => {
      lineEl.textContent = `> ${currentLine.slice(0, charIndex + 1)}`;
      charIndex += 1;

      if (charIndex === currentLine.length) {
        clearInterval(typeInterval);
        lineIndex += 1;
        setTimeout(typeNextLine, 220);
      }
    }, 28);
  };

  typeNextLine();
})(bootLines, bootLinesElement);

const navButtons = document.querySelectorAll(".nav-button");

navButtons.forEach((button) => {
  const targetId = button.getAttribute("data-scroll");
  button.addEventListener("click", () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

const capsules = document.querySelectorAll(".project-capsule");
const readoutTitle = document.getElementById("readout-title");
const readoutSubtitle = document.getElementById("readout-subtitle");
const readoutDescription = document.getElementById("readout-description");
const readoutTags = document.getElementById("readout-tags");
const readoutLink = document.getElementById("readout-link");

const activateCapsule = (capsule) => {
  capsules.forEach((item) => item.classList.remove("project-capsule--active"));
  capsule.classList.add("project-capsule--active");

  if (readoutTitle) {
    readoutTitle.textContent = capsule.dataset.title || "";
  }
  if (readoutSubtitle) {
    readoutSubtitle.textContent = capsule.dataset.subtitle || "";
  }
  if (readoutDescription) {
    readoutDescription.textContent = capsule.dataset.description || "";
  }
  if (readoutLink) {
    readoutLink.href = capsule.dataset.link || "#";
  }
  if (readoutTags) {
    readoutTags.innerHTML = "";
    const tags = (capsule.dataset.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    tags.forEach((tag) => {
      const tagEl = document.createElement("span");
      tagEl.textContent = tag;
      readoutTags.appendChild(tagEl);
    });
  }
};

capsules.forEach((capsule) => {
  capsule.setAttribute("tabindex", "0");
  capsule.addEventListener("click", () => activateCapsule(capsule));
  capsule.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCapsule(capsule);
    }
  });
});

const terminalFeed = document.getElementById("terminal-feed");
const terminalMessages = [
  "Signal received from Budget Buddy: conversational finances online.",
  "VictorIA arm calibrated — ready for another round of Connect-4.",
  "Neural Noir spun a fresh case file with unpredictable suspects.",
  "ReminderZ synced tasks across devices without breaking focus.",
  "HoloVinyl linked memories with bespoke playlists for a gallery night.",
  "Pokémon Generator minted a new creature with lore-approved stats."
];

if (terminalFeed) {
  let messageIndex = 0;
  setInterval(() => {
    messageIndex = (messageIndex + 1) % terminalMessages.length;
    const paragraph = document.createElement("p");
    paragraph.textContent = `> ${terminalMessages[messageIndex]}`;
    terminalFeed.appendChild(paragraph);

    const maxEntries = 6;
    while (terminalFeed.children.length > maxEntries) {
      terminalFeed.removeChild(terminalFeed.firstChild);
    }

    terminalFeed.scrollTop = terminalFeed.scrollHeight;
  }, 5200);
}

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
