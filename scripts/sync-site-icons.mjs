import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconMarkup } from '../js/playfolio/icons.js';

const root = fileURLToPath(new URL('../', import.meta.url));

export function renderSiteIcons(html) {
  const converted = html.replace(/<i\b([^>]*)>\s*<\/i>/g, (markup, attributes) => {
    const classes = attributes.match(/\bclass\s*=\s*["']([^"']*)["']/)?.[1].split(/\s+/) || [];
    if (!classes.includes('bi')) return markup;
    const names = classes.filter((name) => name.startsWith('bi-'));
    if (names.length !== 1) throw new Error(`Expected one Bootstrap icon name: ${markup}`);
    const extraClasses = classes.filter((name) => name !== 'bi' && name !== names[0]);
    const hooks = Object.fromEntries([...attributes.matchAll(/\b(data-[\w-]+)(?:\s*=\s*["']([^"']*)["'])?/g)]
      .map(([, key, value]) => [key, value ?? true]));
    return iconMarkup(names[0].slice(3), { class: extraClasses.join(' '), ...hooks });
  });

  if (/<[^>]+\bclass\s*=\s*["'][^"']*\bbi(?:\s|["'])/.test(converted)) {
    throw new Error('Unconverted Bootstrap icon markup remains');
  }
  return converted.replace(/^[\t ]*<link\b[^>]*href\s*=\s*["'][^"']*bootstrap-icons(?:@[^/"']+)?\/font\/bootstrap-icons\.css(?:\?[^"']*)?["'][^>]*>[\t ]*\r?\n?/gm, '');
}

export function syncSiteIcons({ rootDir = root, write = false } = {}) {
  // Only public site routes belong here; never descend into package UI,
  // experiments, dependencies, or generated output directories.
  const pages = ['', 'project_details'].flatMap((directory) => {
    const absolute = path.join(rootDir, directory);
    if (!existsSync(absolute)) return [];
    return readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && !['topbar-variants.html', 'f1-simulator.html'].includes(entry.name))
      .map((entry) => path.join(directory, entry.name));
  }).filter((page) => /<body\b[^>]*\bclass=["'][^"']*\bplayfolio-page\b/.test(readFileSync(path.join(rootDir, page), 'utf8')));

  // Validate every route before writing any file.
  const updates = pages.flatMap((page) => {
    const source = readFileSync(path.join(rootDir, page), 'utf8');
    const next = renderSiteIcons(source);
    return source === next ? [] : [{ page, next }];
  });
  if (write) updates.forEach(({ page, next }) => writeFileSync(path.join(rootDir, page), next));
  return { pages, changed: updates.map(({ page }) => page), ok: updates.length === 0 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const write = !process.argv.includes('--check');
  const result = syncSiteIcons({ write });
  if (!write && !result.ok) {
    console.error(`Site icons out of sync: ${result.changed.join(', ')}. Run node scripts/sync-site-icons.mjs.`);
    process.exitCode = 1;
  } else {
    console.log(`Site icons ${write ? 'generated' : 'verified'} in ${result.pages.length} pages.`);
  }
}
