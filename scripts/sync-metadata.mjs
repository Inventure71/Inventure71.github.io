import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from '../js/playfolio/dom.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://mgiorgetti.com';
const marker = /\s*<!-- site-metadata -->[\s\S]*?<!-- \/site-metadata -->/;
const rootRoutes = new Set(['index.html', 'projects.html', 'apps.html', 'resume.html', 'contact.html', 'tags.html', 'f1-simulator.html']);
const pages = [...rootRoutes, ...readdirSync(path.join(root, 'project_details'))
  .filter(name => name === '_template.html' || /^project-[\w-]+\.html$/.test(name))
  .map(name => `project_details/${name}`)];
const write = !process.argv.includes('--check');
let changed = 0;
const urls = [];
function update(file, next) {
  if (readFileSync(path.join(root, file), 'utf8') === next) return;
  changed++;
  if (write) writeFileSync(path.join(root, file), next);
  else console.error(`Metadata out of sync: ${file}`);
}
for (const file of pages) {
  const html = readFileSync(path.join(root, file), 'utf8');
  // Only real public routes are indexed; templates and experiments stay out.
  const publicPage = rootRoutes.has(file) || /^project_details\/project-[\w-]+\.html$/.test(file);
  const url = `${origin}/${file === 'index.html' ? '' : file}`;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"\s*\/?\s*>/)?.[1];
  if (publicPage && (!title || !description)) throw new Error(`Missing title/description: ${file}`);
  const projectImage = publicPage && file.startsWith('project_details/')
    ? html.match(/<figure[^>]*class="[^"]*story-feature[^>]*>\s*<img[^>]*src="([^"]+)"/)?.[1]
    : null;
  const image = projectImage ? new URL(projectImage, `${origin}/${file}`).pathname : '/assets/profile-1100.webp';
  const imageAlt = projectImage ? html.match(/<figure[^>]*class="[^"]*story-feature[^>]*>\s*<img[^>]*alt="([^"]*)"/)?.[1] || title : 'Portrait of Matteo Giorgetti';
  if (!existsSync(path.join(root, image))) throw new Error(`Missing social image: ${image}`);
  const metadata = publicPage ? `
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Matteo Giorgetti" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${origin}${image}" />
    <meta property="og:image:alt" content="${imageAlt}" />
    <meta name="twitter:card" content="${projectImage ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${origin}${image}" />` : '\n    <meta name="robots" content="noindex, nofollow" />';
  // Read title/description as already escaped HTML attribute content.
  const block = `\n    <!-- site-metadata -->${metadata}\n    <!-- /site-metadata -->`;
  const next = marker.test(html) ? html.replace(marker, block) : html.replace('</head>', `${block}\n</head>`);
  update(file, next);
  if (publicPage) urls.push(url);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.sort().map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\nDisallow: /project_details/_template.html\nDisallow: /topbar-variants.html\nSitemap: ${origin}/sitemap.xml\n`;
for (const [file, content] of [['sitemap.xml', sitemap], ['robots.txt', robots]]) {
  if (!existsSync(path.join(root, file))) { changed++; if (write) writeFileSync(path.join(root,file),content); }
  else update(file,content);
}
if (!write && changed) process.exitCode = 1;
console.log(`Metadata ${write ? 'generated' : 'verified'} for ${urls.length} public routes; ${changed} changed files.`);
