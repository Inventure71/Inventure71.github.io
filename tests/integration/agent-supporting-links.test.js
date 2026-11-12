import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const markdown = id => readFileSync(new URL(`projects/${id}.md`, root), 'utf8');
const supportingLinks = id => markdown(id).split('## Public supporting links\n')[1];

test('generated project sources exclude next-project and end-of-article navigation', () => {
  const navigation = [
    ['paddockjs', 'project-neural-noir.html'],
    ['neural-noir', 'project-gengame.html'],
    ['core-conflict', 'project-algorithms-project.html'],
    ['algorithms-game', 'project-paddockjs.html'],
    ['pead-learning-demos', 'project-dream2detect.html'],
    ['matrices-recommender', 'project-pead.html'],
    ['whos-on-repeat', 'project-paddockjs.html'],
    ['gdg-event-website', '/resume.html'],
    ['ghostyper', '/apps.html'],
  ];
  for (const [id, destination] of navigation) {
    expect(supportingLinks(id), `${id} supporting links`).not.toContain(destination);
  }
});

test('repository and demo actions remain supporting evidence without leaking into narrative', () => {
  expect(supportingLinks('paddockjs')).toContain('https://github.com/Inventure71/PaddockJS');
  expect(supportingLinks('paddockjs')).toContain('https://www.npmjs.com/package/@inventure71/paddockjs');
  expect(supportingLinks('holovinyl')).toContain('https://github.com/Inventure71/HoloVinyl');
  expect(supportingLinks('holovinyl')).toContain('https://youtu.be/ryHQKgpnL-Q');
  expect(supportingLinks('whos-on-repeat')).toContain('https://github.com/Inventure72/DevOpsAssignement#run');
  expect(supportingLinks('ghostyper')).toContain('https://downloads.mgiorgetti.com/ghostyper/1.0.0-1/Ghostyper-1.0.0-1-app.dmg');
  expect(supportingLinks('ghostyper')).not.toContain('https://mgiorgetti.com/apps.html');
  const narrative = markdown('paddockjs').split('## Technical approach and public case study\n')[1].split('## Results and limitations')[0];
  expect(narrative).toContain('Both interfaces use the same simulation.');
  expect(narrative).not.toMatch(/View source|Next: Neural Noir|Open npm package/);
});

test('checked-in Markdown matches the public content generator', () => {
  expect(() => execFileSync(process.execPath, ['scripts/sync-agent-content.mjs', '--check'], { cwd: root, stdio: 'pipe' })).not.toThrow();
});
