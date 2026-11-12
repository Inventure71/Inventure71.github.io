const PROJECT_RACE_GUIDE_DEFAULTS = {
  ariaLabel: 'Project race guide',
  lead: 'Each car is a project.',
  action: 'Click a car',
  tail: 'to explore it.',
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
  };

  return `
                <section class="pf-race-guide" aria-label="${escapeHtml(content.ariaLabel)}">
                    <span class="pf-race-guide__marker" aria-hidden="true"><span class="pf-race-guide__fabric"></span></span>
                    <p class="pf-race-guide__headline">
                        ${escapeHtml(content.lead)} <strong>${escapeHtml(content.action)}</strong>
                        ${escapeHtml(content.tail)}
                    </p>
                        <span class="pf-race-guide__status" data-race-status="loading" role="status">
                            <span class="pf-race-guide__marker pf-race-guide__flag" aria-hidden="true"><span class="pf-race-guide__fabric"></span></span>
                            <span class="pf-race-guide__status-label" data-race-status-label>Loading</span>
                        </span>
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

    const options = this.dataset.mode === 'browse'
      ? { ariaLabel: 'Project browser guide', lead: '', action: 'Select a project', tail: 'to see its details.' }
      : {};
    renderProjectRaceGuide(this, options);
    this.dataset.rendered = 'true';
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('project-race-guide')) {
  customElements.define('project-race-guide', ProjectRaceGuideElement);
}

export { PROJECT_RACE_GUIDE_DEFAULTS, ProjectRaceGuideElement };
