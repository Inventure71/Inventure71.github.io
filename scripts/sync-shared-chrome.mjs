import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSharedNavbarMarkup } from '../js/playfolio/shared-chrome.js';

const SKIP_DIRS = new Set(['.git', 'dist', 'node_modules']);
const SHARED_NAV_CLASS = 'navbar navbar-expand-lg pf-reactive-glass pf-reactive-glass--site-bloom';
const NAV_PATTERN = /(?<indent>[^\S\r\n]*)<nav class="navbar navbar-expand-lg(?: pf-reactive-glass pf-reactive-glass--site-bloom)?" data-active-page="(?<activeKey>[^"]+)">[\s\S]*?<\/nav>/;

function collectHtmlFiles(dir, root = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) return [];

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(absolutePath, root);
    if (!entry.isFile() || !entry.name.endsWith('.html')) return [];

    return [path.relative(root, absolutePath)];
  });
}

function isPlayfolioPage(rootDir, relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8').includes('playfolio-page');
}

export function renderStaticNavbar(activeKey, indent = '') {
  return `${indent}<nav class="${SHARED_NAV_CLASS}" data-active-page="${activeKey}">${buildSharedNavbarMarkup(activeKey).trimEnd()}\n${indent}</nav>`;
}

export function syncSharedNavbar({ rootDir = process.cwd(), write = false } = {}) {
  const pages = collectHtmlFiles(rootDir).filter((file) => isPlayfolioPage(rootDir, file));
  const changed = [];
  const missing = [];

  for (const file of pages) {
    const absolutePath = path.join(rootDir, file);
    const html = readFileSync(absolutePath, 'utf8');
    const match = html.match(NAV_PATTERN);

    if (!match?.groups) {
      missing.push(file);
      continue;
    }

    const nextNavbar = renderStaticNavbar(match.groups.activeKey, match.groups.indent);
    const nextHtml = html.replace(NAV_PATTERN, nextNavbar);

    if (nextHtml !== html) {
      changed.push(file);
      if (write) {
        writeFileSync(absolutePath, nextHtml);
      }
    }
  }

  return {
    pages,
    changed,
    missing,
    ok: changed.length === 0 && missing.length === 0,
  };
}

function runCli() {
  const write = !process.argv.includes('--check');
  const result = syncSharedNavbar({ write });

  if (result.missing.length) {
    console.error(`Missing shared navbar in ${result.missing.length} page(s):`);
    result.missing.forEach((file) => console.error(`- ${file}`));
  }

  if (write) {
    console.log(`Synced shared navbar in ${result.changed.length} of ${result.pages.length} Playfolio page(s).`);
    if (result.missing.length) process.exitCode = 1;
    return;
  }

  if (!result.ok) {
    if (result.changed.length) {
      console.error(`Shared navbar is out of sync in ${result.changed.length} page(s):`);
      result.changed.forEach((file) => console.error(`- ${file}`));
      console.error('Run `npm run sync:chrome` to update generated navbar markup.');
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Shared navbar is synced in ${result.pages.length} Playfolio page(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runCli();
}
