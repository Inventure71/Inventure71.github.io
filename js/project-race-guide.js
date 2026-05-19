const PROJECT_RACE_GUIDE_DEFAULTS = {
  ariaLabel: 'How to use the project race',
  lead: 'Each car is a project.',
  action: 'Click a car',
  tail: 'to open its story, tech stack, screenshots, links, and build notes.',
  cue: 'Pick a car from the grid',
  hints: [
    { icon: '🏎️', text: 'Cars = projects' },
    { icon: '☝️', text: 'Click / hover for details' },
  ],
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildProjectRaceGuideMarkup(options = {}) {
  const content = {
    ...PROJECT_RACE_GUIDE_DEFAULTS,
    ...options,
    hints: options.hints || PROJECT_RACE_GUIDE_DEFAULTS.hints,
  };

  const hints = content.hints
    .map((hint) => `
                        <span><i aria-hidden="true">${escapeHtml(hint.icon)}</i> ${escapeHtml(hint.text)}</span>`)
    .join('');

  return `
                <section class="pf-race-guide" aria-label="${escapeHtml(content.ariaLabel)}">
                    <div class="pf-race-guide__copy">
                        <span class="pf-race-guide__marker" aria-hidden="true"></span>
                        <div>
                            <p class="pf-race-guide__headline">
                                ${escapeHtml(content.lead)} <strong>${escapeHtml(content.action)}</strong>
                                ${escapeHtml(content.tail)}
                            </p>
                        </div>
                    </div>
                    <div class="pf-race-guide__hints" aria-label="Project race controls">${hints}
                    </div>
                    <div class="pf-race-guide__track-cue" aria-hidden="true">
                        <span></span>
                        <b>${escapeHtml(content.cue)}</b>
                        <span></span>
                    </div>
                </section>`;
}

export function renderProjectRaceGuide(target, options = {}) {
  if (!target) return null;

  target.innerHTML = buildProjectRaceGuideMarkup(options);
  return target.querySelector('.pf-race-guide');
}

const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

class ProjectRaceGuideElement extends BaseHTMLElement {
  connectedCallback() {
    if (this.dataset.rendered === 'true') return;

    renderProjectRaceGuide(this);
    this.dataset.rendered = 'true';
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('project-race-guide')) {
  customElements.define('project-race-guide', ProjectRaceGuideElement);
}

export { PROJECT_RACE_GUIDE_DEFAULTS, ProjectRaceGuideElement };
