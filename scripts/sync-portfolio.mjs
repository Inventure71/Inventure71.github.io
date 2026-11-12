import { readFileSync, writeFileSync } from 'node:fs';
import { projects, SERIES } from '../js/playfolio/project-catalog.js';
import { escapeHtml as e } from '../js/playfolio/dom.js';
import { buildProjectRaceGuideMarkup } from '../js/project-race-guide.js';
import { iconMarkup } from '../js/playfolio/icons.js';

const check = process.argv.includes('--check');
function sync(file, marker, markup) {
  const source = readFileSync(file, 'utf8');
  const pattern = new RegExp(`<!-- ${marker} -->[\\s\\S]*?<!-- /${marker} -->`);
  if (!pattern.test(source)) throw new Error(`Missing ${marker} markers in ${file}`);
  const next = source.replace(pattern, `<!-- ${marker} -->\n${markup}\n                <!-- /${marker} -->`);
  if (source === next) return;
  if (check) { console.error(`${file} is out of sync with project catalog`); process.exitCode = 1; }
  else writeFileSync(file, next);
}

const ordered = [...projects].sort((a, b) => a.priority - b.priority);
const controls = `<nav class="pf-series-selector pf-reveal" aria-label="Project series">
${SERIES.map(series => `                    <a class="pf-series-choice" href="?series=${series.id}" data-series-choice="${series.id}"><img src="${series.logo}" alt="${series.label}" data-series-logo="${series.id}" width="120" height="40" /><span>${e(series.description)}</span></a>`).join('\n')}
                </nav>`;
sync('projects.html', 'project-series', controls);
sync('projects.html', 'project-race-guide', `<project-race-guide>${buildProjectRaceGuideMarkup()}</project-race-guide>`);
const fallback = `<noscript><ul class="pf-project-fallback">${ordered.map(project => `<li><a href="${e(project.href)}">${e(project.label)}</a></li>`).join('')}</ul></noscript>`;
sync('projects.html', 'project-directory', fallback);

// The first four editorial projects lead the home page. Media is presentation,
// kept separate from priority and factual copy in the project catalog.
const media = {
  paddockjs: null,
  vigil: {src:'/assets/project-media/vigil/fleet-dashboard.webp',alt:'VIGIL robot fleet dashboard',width:960,height:526},
  'project-unity': null,
};
const cards = ordered.slice(0, 4).map((project,index) => {
  const image = media[project.id];
  const visuals = {
    noty: `<div class="pf-work-noty"><strong aria-hidden="true">Noty</strong><img class="pf-work-noty__icon" src="/assets/project-media/noty/noty-icon.webp" width="128" height="128" loading="lazy" decoding="async" alt="" /><img class="pf-work-noty__editor" src="/assets/project-media/noty/noty-editor.webp" width="798" height="678" loading="lazy" decoding="async" alt="Noty’s native note editor with a Friday checklist" /></div>`,
    paddockjs: `<div class="pf-work-paddock" role="img" aria-label="PaddockJS’s current racing cars on the starting grid"><span class="pf-work-paddock__finish" aria-hidden="true"></span>${['purple', 'gold', 'blue'].map(color => `<span class="pf-work-paddock__slot pf-work-paddock__slot--${color}" aria-hidden="true"><span class="pf-work-paddock__car"><img src="/dist/f1-simulator/assets/f1-car-sprite-game.png" width="320" height="121" loading="lazy" decoding="async" alt="" /></span></span>`).join('')}</div>`,
    dream2detect: `<div class="pf-work-samples">${['0_10', '46_55', '86_100'].map(band => `<img src="/assets/project-media/dream2detect/${band}.jpg" width="360" height="240" loading="lazy" alt="Synthetic package image, damage band ${band.replace('_', '–')}" />`).join('')}<span>Synthetic images → real photographs</span></div>`,
    'whos-on-repeat': `<div class="pf-work-music"><span aria-hidden="true">♫</span><strong>Listen. Guess. Reveal.</strong></div>`,
    'project-unity': `<div class="pf-work-systems" aria-label="Mac and Windows input sharing"><span>macOS</span><span aria-hidden="true">↔</span><span>Windows</span></div>`,
  };
  const visual = visuals[project.id] ?? (image ? `<img src="${image.src}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" alt="${e(image.alt)}" />` : `<div class="pf-work-systems"><span>${e(project.label)}</span></div>`);
  return `                    <a class="pf-work pf-work--${project.id} pf-reveal" href="${project.href}" data-project-card data-project-id="${project.id}" data-title="${e(project.label)}" data-summary="${e(project.description)}" data-href="${project.href}">
                        <div class="pf-work-visual">${visual}</div>
                        <div class="pf-work-caption"><span class="pf-work-meta">${String(index+1).padStart(2,'0')} <span>${e(project.stack)}</span></span><h3>${e(project.label)} ${iconMarkup('arrow-up-right')}</h3><p>${e(project.description)}</p></div>
                    </a>`;
}).join('\n');
sync('index.html', 'featured-projects', cards);
console.log(`Portfolio ${check ? 'verified' : 'generated'}: ${projects.length} projects across ${SERIES.length} series.`);
