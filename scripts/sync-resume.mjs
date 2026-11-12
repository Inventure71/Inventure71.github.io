import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { projects, ROLE_OPTIONS } from '../js/playfolio/project-catalog.js';
import { iconMarkup } from '../js/playfolio/icons.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await fs.readFile(path.join(root, 'data/resume.json'), 'utf8'));
const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const roles = (entry) => `data-resume-entry="${escape(entry.id)}" data-resume-roles="${escape(entry.roles.join(' '))}"${entry.essential ? ' data-resume-essential' : ''}`;
const selectedIds = new Set(data.projectIds);
const selectedProjects = [...projects].filter((project) => selectedIds.has(project.id)).sort((a, b) => a.priority - b.priority);
for (const id of data.projectIds) {
  if (!selectedProjects.some((project) => project.id === id)) throw new Error(`Resume project missing from catalog: ${id}`);
}

function line(entry) {
  const heading = entry.href ? `<a href="${escape(entry.href)}">${escape(entry.title)}</a>` : escape(entry.title);
  return `<article class="pf-resume-line" ${roles(entry)}>
    <time>${escape(entry.dates)}</time>
    <div><h3>${heading}</h3><p class="pf-resume-place">${escape([entry.organization, entry.location].filter(Boolean).join(' · '))}</p>
      ${(entry.bullets || []).map((bullet) => `<p>${escape(bullet)}</p>`).join('\n      ')}
    </div>${entry.badge ? `<span class="pf-resume-badge">${escape(entry.badge)}</span>` : ''}
  </article>`;
}

function section(id, number, title, contents) {
  return `<section class="pf-resume-block pf-reveal" id="${id}" data-resume-section>
    <header><span>${number}</span><h2>${title}</h2></header>
    ${contents}
  </section>`;
}

const sections = [
  ['experience', 'Experience', data.experience.map(line).join('\n')],
  ['projects', 'Selected projects', `<div class="pf-resume-projects">${selectedProjects.map((project) => `<article ${roles(project)}>
    <span>${escape(project.dates)}</span><h3><a href="${escape(project.href)}">${escape(project.label)}</a></h3>
    <p>${escape(project.description)}</p><small>${escape(project.stack)}</small>
  </article>`).join('\n')}</div>`],
  ['education', 'Education', data.education.map(line).join('\n')],
  ['community', 'Community & leadership', data.community.map(line).join('\n')],
  ['certifications', 'Courses & certifications', data.certifications.map(line).join('\n')],
  ['skills', 'Skills & languages', `<div class="pf-resume-skills">${data.skills.map((skill) => `<div ${roles(skill)}><h3>${escape(skill.title)}</h3><p>${escape(skill.items.join(', '))}.</p></div>`).join('\n')}</div>`],
];

const markup = `<!-- resume-content:start -->
    <main class="flex-shrink-0" id="main-content" tabindex="-1">
      <section class="pf-page pf-resume-page">
        <div class="pf-shell">
          <header class="pf-resume-top pf-reveal">
            <div><h1>${escape(data.identity.name)}</h1><p>${escape(data.identity.headline)}</p></div>
            <div class="pf-resume-actions">
              <a class="pf-button" href="/assets/docs/matteo-giorgetti-resume-current.pdf" target="_blank" rel="noopener">View CV PDF ${iconMarkup('file-text')}</a>
              <a class="pf-button is-quiet" href="/assets/docs/matteo-giorgetti-resume-current.pdf" download>Download CV ${iconMarkup('download')}</a>
            </div>
          </header>
          <div class="pf-resume-filter pf-reveal" data-resume-filter hidden>
            <span class="pf-resume-filter-label" id="resume-filter-label">Explore by role</span>
            <div class="pf-resume-filter-options" role="group" aria-labelledby="resume-filter-label">
              ${ROLE_OPTIONS.map((role) => `<button type="button" data-resume-role="${escape(role.id)}" aria-pressed="${role.id === 'all'}" aria-controls="resume-document">${escape(role.label)}</button>`).join('\n              ')}
            </div>
            <p class="pf-resume-filter-status" data-resume-filter-status role="status" aria-live="polite" aria-atomic="true"></p>
          </div>
          <div class="pf-resume-layout">
            <aside class="pf-resume-panel pf-reveal" aria-label="Resume quick details">
              <div class="pf-resume-id"><span>Based</span><strong>Madrid / Milan</strong></div>
              <div class="pf-resume-id"><span>Community</span><strong>OpenAI Codex Ambassador</strong></div>
              <div class="pf-resume-id"><span>Contact</span>
                <a href="mailto:${escape(data.identity.email)}">${escape(data.identity.email)}</a>
                <a href="${escape(data.identity.github)}">github.com/Inventure71</a>
                <a href="${escape(data.identity.linkedin)}">LinkedIn</a>
              </div>
              <nav class="pf-resume-nav" aria-label="Resume sections">
                ${sections.map(([id, title]) => `<a href="#${id}" data-resume-section-link="${id}">${title}</a>`).join('\n                ')}
              </nav>
            </aside>
            <div class="pf-resume-doc" id="resume-document">
              ${sections.map(([id, title, content], index) => section(id, String(index + 1).padStart(2, '0'), title, content)).join('\n              ')}
            </div>
          </div>
        </div>
      </section>
    </main>
    <!-- resume-content:end -->`.replace(/[ \t]+$/gm, '');

const filename = path.join(root, 'resume.html');
const previous = await fs.readFile(filename, 'utf8');
const region = /<!-- resume-content:start -->[\s\S]*?<!-- resume-content:end -->/;
let next = previous.replace(region.test(previous) ? region : /    <main class="flex-shrink-0" id="main-content"[\s\S]*?<\/main>/, markup);
if (next === previous && !region.test(previous)) throw new Error('Resume content boundary not found');
if (process.argv.includes('--check')) {
  if (next !== previous) { console.error('Resume content is out of sync. Run node scripts/sync-resume.mjs.'); process.exitCode = 1; }
  else console.log('Resume content is in sync.');
} else {
  await fs.writeFile(filename, next);
  console.log('Synced resume content.');
}
