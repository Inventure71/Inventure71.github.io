import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://site.invalid';
const generated = /<!-- route-styles: (\/css\/playfolio-[\w-]+\.css) -->[\s\S]*?<!-- \/route-styles -->/;
const legacy = /<link\b[^>]*href="([^"]*css\/playfolio-[\w-]+\.css)(?:\?[^"]*)?"[^>]*>/;

// The existing CSS manifests remain the source of truth for order and route scope.
// Direct links let the HTML preload scanner discover every stylesheet immediately.
export function renderRouteStyles(manifest, rootDir = root) {
  const css = readFileSync(path.join(rootDir, manifest), 'utf8');
  const imports = [...css.matchAll(/@import url\("([^"\n]+)"\);/g)];
  const remaining = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import url\("([^"\n]+)"\);/g, '').trim();
  if (!imports.length || remaining) throw new Error(`Expected an import-only manifest: ${manifest}`);
  const links = imports.map(([, source]) => {
    const url = new URL(source, `${origin}${manifest}`);
    if (url.origin !== origin || !existsSync(path.join(rootDir, url.pathname))) {
      throw new Error(`Missing local stylesheet: ${source} in ${manifest}`);
    }
    return `    <link href="${url.pathname}${url.search}" rel="stylesheet" />`;
  });
  return `<!-- route-styles: ${manifest} -->\n${links.join('\n')}\n    <!-- /route-styles -->`;
}

export function syncRouteStyles({ rootDir = root, write = false } = {}) {
  const pages = ['', 'project_details'].flatMap((dir) =>
    readdirSync(path.join(rootDir, dir)).filter((name) => name.endsWith('.html')).map((name) => path.join(dir, name)),
  );
  const changed = [];
  let count = 0;
  for (const page of pages) {
    const absolute = path.join(rootDir, page);
    const html = readFileSync(absolute, 'utf8');
    if (!html.includes('playfolio-page')) continue;
    const match = html.match(generated) || html.match(legacy);
    if (!match) throw new Error(`Missing route stylesheet manifest: ${page}`);
    const manifest = new URL(match[1], `${origin}/${page}`).pathname;
    const next = html.replace(match[0], renderRouteStyles(manifest, rootDir));
    count++;
    if (next !== html) {
      changed.push(page);
      if (write) writeFileSync(absolute, next);
    }
  }
  return { count, changed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const write = !process.argv.includes('--check');
  const { count, changed } = syncRouteStyles({ write });
  if (!write && changed.length) {
    console.error(`Route styles out of sync: ${changed.join(', ')}. Run npm run sync:styles.`);
    process.exitCode = 1;
  } else {
    console.log(`Route styles ${write ? 'generated' : 'verified'} in ${count} pages.`);
  }
}
