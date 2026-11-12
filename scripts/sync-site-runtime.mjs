import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function syncSiteRuntime({ rootDir = root, write = false } = {}) {
  const bundle = readFileSync(path.join(rootDir, 'dist/site/playfolio.js'));
  const version = createHash('sha256').update(bundle).digest('hex').slice(0, 12);
  const bootSource = ['navigation-pointer.js', 'theme-boot.js']
    .map(name => readFileSync(path.join(rootDir, 'js', name), 'utf8').trim()).join('\n');
  const boot = `<!-- site-boot -->\n    <script>\n${bootSource}\n    </script>\n    <!-- /site-boot -->`;
  const bootPattern = /<!-- site-boot -->[\s\S]*?<!-- \/site-boot -->/;
  const runtime = `<script type="module" src="/dist/site/playfolio.js?v=${version}"></script>`;
  const pages = ['', 'project_details'].flatMap(dir => readdirSync(path.join(rootDir, dir))
    .filter(name => name.endsWith('.html')).map(name => path.join(dir, name)));
  const changed = [];
  let count = 0;
  for (const page of pages) {
    const filename = path.join(rootDir, page);
    const html = readFileSync(filename, 'utf8');
    if (!html.includes('playfolio-page')) continue;
    const pattern = /<script type="module" src="(?:[^"\n]*\/)?(?:js\/playfolio\.js|dist\/site\/playfolio\.js)(?:\?[^"\n]*)?"><\/script>/;
    if (!pattern.test(html)) throw new Error(`Missing shared runtime: ${page}`);
    let next = html.replace(pattern, runtime)
      .replace(/(?:\n[^\S\n]*)?<script src="(?:[^"\n]*\/)?js\/theme-boot\.js(?:\?[^"\n]*)?"><\/script>/, '')
      .replace(/(?:\n[^\S\n]*)?<script type="module" src="(?:[^"\n]*\/)?js\/resume-page\.js(?:\?[^"\n]*)?"><\/script>/g, '');
    if (bootPattern.test(next)) next = next.replace(bootPattern, boot);
    else {
      const charset = /<meta\s+charset=[^>]+>/i;
      if (!charset.test(next)) throw new Error(`Missing early boot insertion point: ${page}`);
      next = next.replace(charset, match => `${match}\n    ${boot}`);
    }
    count++;
    if (html !== next) {
      changed.push(page);
      if (write) writeFileSync(filename, next);
    }
  }
  return { count, changed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const write = !process.argv.includes('--check');
  const { count, changed } = syncSiteRuntime({ write });
  if (!write && changed.length) {
    console.error(`Shared runtime out of sync: ${changed.join(', ')}. Run npm run build:site.`);
    process.exitCode = 1;
  } else console.log(`Shared runtime ${write ? 'generated' : 'verified'} in ${count} pages.`);
}
