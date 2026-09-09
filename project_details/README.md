# Project stories

The project race, command menu, and project network open these pages. All 20 projects use the V8 story system; existing URLs remain stable (including Ghostyper’s `project-ghoststroke.html`).

## Ownership

- `css/project-stories.css`: base widths, typography, actions, accessibility and reduced motion.
- `css/project-stories/collection.css`: shared collection spacing, responsive columns, media, technical notes and process layouts.
- `css/playfolio-project-story.css`: collection route manifest. The three custom pilots retain their own manifests.
- `css/project-stories/apps.css`, `games.css`, `robotics.css`, `data-tools.css`: only diagrams specific to those projects; loaded by relevant pages.
- HTML owns readable content and static fallbacks. Independent modules in `js/project-demos/` own the two pilot demos.
- `js/playfolio/shared-chrome.js` owns the navbar/footer. Do not hand-edit shared chrome.

## Start with the project

Copy `_template.html`, then choose only the components that explain the work. A page normally needs a short introduction, real evidence or an explanatory diagram, and a few meaningful technical decisions. It does not need a standard number of sections.

Use one `h1`, followed by `h2` and `h3` in order. Keep copy wide enough to wrap naturally; avoid forced line breaks, narrow heading measures, repeated technology badges, and repeated summaries. State the project’s actual scope. A prototype can have a short page.

Use real captures and footage when available. Label conceptual diagrams as diagrams; never fabricate interface captures, terminal output, research results, or performance metrics. Record asset provenance alongside new media. Noty links to its separate product website and focuses on technical implementation here.

## Structure and components

Place `article.project-story-content#project-story` directly after the navbar inside `main`. Use the static `.story-skip-link` and `tabindex="-1"` on its target. Do not use the retired `.project-shell` wrapper: it enables the legacy script’s layout transforms and reveals.

- `.story-shell`: centered maximum width. May wrap a figure or be placed on it directly.
- `.story-hero`, `.story-kicker`, `.story-title`, `.story-lede`, `.story-meta`: introduction and compact facts.
- `.story-actions`, `.story-button`, `.is-secondary`: real navigation/actions only.
- `.story-feature`: natural-aspect image and caption. Include actual image dimensions, descriptive alt text, and lazy loading below the fold.
- `.story-section`, `.story-section-heading`, `.story-copy`: story sections and text.
- `.story-split`, `.story-columns`: two-column compositions that stack on smaller screens.
- `.story-notes`: definition list with a `div` containing each `dt`/`dd` pair.
- `.story-process`: ordered list; each item uses `strong` and `span`.
- `.story-diagram`: restrained surface for a semantic HTML or SVG explanation.
- `.story-gallery`: two-column evidence gallery.
- `.story-code`: code or command sample with local horizontal scrolling.
- `.story-end`: return or related-project navigation.

For zoomable images, add `.gallery-card` to a `.story-feature` figure and load `js/project-pages.js`. Its dialog handles keyboard activation, focus trapping, Escape, and focus restoration. That script also loads `.project-video-frame iframe[data-src]` lazily. Use `https://www.youtube-nocookie.com/embed/…`, an accessible title, and a normal YouTube fallback link. Pages without either feature omit this script.

Keep motion limited to meaningful demos and actual controls. Respect reduced motion. Shared geometry belongs in shared CSS; group stylesheets draw project-specific diagrams and must not alter navbar dimensions.

## Validation

1. Register new projects in the catalog, race data and project map when applicable.
2. Run `npm run sync:styles` after route-manifest changes; `npm run sync:chrome` only when intentionally updating shared chrome.
3. Check real pages at mobile, desktop and wide widths; inspect light/dark, keyboard navigation, image/video behavior and reduced motion.
4. Check Home, Projects, Apps, Resume and Contact for shared-layout regressions.
5. Run `npm run check` and `git diff --check`. Git mutations require separate approval.
