const PROJECT_RACE_GUIDE_DEFAULTS = {
  ariaLabel: 'How to use the project race',
  lead: 'Each car is a project.',
  action: 'Click a car',
  tail: 'to explore it.',
  browseLead: 'Use',
  browseAction: 'Stop race',
  browseTail: 'to explore the cars at your own pace.',
  resumeAction: 'Start race',
  resumeTail: 'to see the cars in action.',
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
                    <div class="pf-race-guide__copy">
                        <span class="pf-race-guide__marker" aria-hidden="true"></span>
                        <div>
                            <p class="pf-race-guide__headline">
                                ${escapeHtml(content.lead)} <strong>${escapeHtml(content.action)}</strong>
                                ${escapeHtml(content.tail)}
                            </p>
                        </div>
                    </div>
                    <div class="pf-race-guide__right">
                        <p class="pf-race-guide__headline pf-race-guide__browse">
                            ${escapeHtml(content.browseLead)} <strong>${escapeHtml(content.browseAction)}</strong>
                            ${escapeHtml(content.browseTail)}
                        </p>
                        <p class="pf-race-guide__headline pf-race-guide__browse pf-race-guide__browse--stopped">
                            ${escapeHtml(content.browseLead)} <strong>${escapeHtml(content.resumeAction)}</strong>
                            ${escapeHtml(content.resumeTail)}
                        </p>
                        <span class="pf-race-guide__status" data-race-status="loading" role="status">
                            <span class="pf-race-guide__marker pf-race-guide__flag" aria-hidden="true"></span>
                            <span class="pf-race-guide__status-label" data-race-status-label>Loading</span>
                            <span class="pf-race-guide__status-label pf-race-guide__paused-label">Paused</span>
                        </span>
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
