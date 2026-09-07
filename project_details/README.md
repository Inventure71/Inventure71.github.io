# Project case-study pages

The F1 race in `../projects.html` is the primary way to browse projects. These pages are the focused case studies opened from a car, the command palette, or the project network.

## Source of truth

- `_template.html` is the canonical page structure.
- `../css/project-pages.css` is the only owner of project-detail layout and components.
- `../css/playfolio-project-detail.css` is the route manifest; do not add a second override stylesheet.
- `../js/project-pages.js` owns progressive behavior: the media-led intro stage, lazy video loading, gallery and primary-media dialog access, external-link safety, skip navigation, reading progress, restrained reveals, and fine-pointer media depth.
- `../js/playfolio/shared-chrome.js` owns the shared navbar and footer.

Cross-page spacing, breakpoints, media geometry, and component styles belong in `project-pages.css`. Do not add page-local layout styles.

## Information architecture

Every case study should be understandable by scanning only its headings and facts:

1. **Intro stage** — project type, name, one concise explanation, up to three technology tags, compact facts, and the primary proof when one exists.
2. **Primary proof** — one real screenshot, video, artifact, research visual, or live surface. The shared script places it beside the story on desktop and directly after the title on mobile. Omit it when no real media exists.
3. **Result** — concrete metrics, tested scope, shipped artifact, or verified capabilities when available.
4. **How it works** — choose either an architecture view or a process view. Do not repeat both unless they explain genuinely different things.
5. **Outcome and limitation** — what worked, what remains limited, and the honest current state.
6. **Return** — link back to the project race.

Avoid repeating the hero inside a “short version,” spotlight, and flow section. Each section needs one job.

## Required structure

```html
<body class="playfolio-page project-page project-page--my-project">
  <a class="project-skip-link" href="#project-content">Skip to project content</a>

  <main id="project-content">
    <nav class="navbar ..." data-active-page="projects"></nav>

    <section class="py-5">
      <div class="container px-5">
        <article class="project-shell">
          <header class="project-hero">...</header>
          <!-- optional proof/media -->
          <section class="project-media-panel">...</section>
          <!-- one or more evidence-led sections -->
          <section class="project-section">...</section>
          <nav class="text-center" aria-label="Project navigation">...</nav>
        </article>
      </div>
    </section>
  </main>
</body>
```

Keep the existing outer classes so the shared route manifest can neutralize legacy global container and section rules safely.
`project-pages.js` groups the hero and adjacent primary-proof panel into `project-intro-stage` at runtime. Do not hand-author that generated wrapper.

## Components

### Hero and facts

Use one `h1`. Facts are a semantic definition list:

```html
<dl class="hero-meta" aria-label="Project facts">
  <div class="hero-meta-card">
    <dt class="label">Role</dt>
    <dd class="value">Creator · Engineer</dd>
  </div>
</dl>
```

Prefer `Role`, `Year`, `State`, and `Proof`. PaddockJS-style release/distribution facts are valid when they are more meaningful.

### Primary proof

```html
<section class="project-media-panel project-media-panel--split" aria-label="Primary project proof">
  <div class="project-media-stage project-media-stage--image">
    <img src="..." alt="Describe what this evidence shows" />
  </div>
  <aside class="project-sidecard" aria-labelledby="summary-title">
    <h2 id="summary-title">The result or challenge</h2>
    <p>Context that does not repeat the hero.</p>
  </aside>
</section>
```

For a text-first page, omit the media node and use `project-media-panel--without-media`. Do not add placeholders.

Primary media is `16 / 9` on desktop and `16 / 10` on mobile. Videos remain `16 / 9`. Use `project-media-stage--noty` for the existing contained mascot treatment; add another shared modifier only when the asset genuinely needs a different fit.

### Architecture or key points

Use `project-insight-grid`, `project-keypoints`, or `project-module-grid`. Items use `h3`, never `h4` or `h5` beneath a section `h2`.

```html
<section class="project-section">
  <div class="project-section-header">
    <p class="project-section-eyebrow">How it works</p>
    <h2>Three responsibilities</h2>
  </div>
  <div class="project-insight-grid">
    <article class="project-insight-card">
      <h3>Capture</h3>
      <p>One specific responsibility.</p>
    </article>
  </div>
</section>
```

### Process

Use `project-flow-steps` only when sequence is the important explanation. Flow item headings are `h3`.

### Metrics

Use `project-data-strip` for verified numbers or an explicit tested scope. Do not turn guesses or simulation tuning values into product claims.

### Gallery

Gallery figures are progressively enhanced into a horizontally scrollable filmstrip of keyboard-operable image triggers. Every image needs useful alt text; every caption should explain why the image matters.

```html
<div class="project-gallery">
  <figure class="gallery-card">
    <img src="..." alt="..." loading="lazy" />
    <figcaption>What this artifact proves.</figcaption>
  </figure>
</div>
```

### Video

Below-the-fold YouTube videos use the privacy-enhanced host and `data-src` so `project-pages.js` can lazy-load them:

```html
<div class="project-video-frame">
  <iframe
    data-src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
    title="Project demo"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen></iframe>
</div>
```

## Page-specific styling

Page modifiers may set one variable only:

```css
.project-page--my-project {
  --project-accent: #3977d4;
}
```

Do not duplicate component rules, tint every surface, or introduce an override cascade.

## Accessibility and behavior

- Use `h1 → h2 → h3` without skipped levels.
- Keep native links for navigation.
- Give icon-only controls accessible names and decorative icons `aria-hidden="true"`.
- Use real media or omit the block; never publish placeholder images.
- Gallery images and the primary proof image open the same dialog. It moves focus inside, traps it, closes with Escape, and restores focus.
- Motion is one-shot and progressive: sections enter quietly, the reading line reflects actual page progress, and image depth stays within four pixels.
- Motion is disabled by `prefers-reduced-motion`; pointer depth is also omitted on coarse pointers.
- Do not animate passive cards or facts on hover. Hover feedback belongs to real links, gallery triggers, and media only.
- Use a single shared surface for related passive facts instead of boxing every item. Reserve visible rules for real controls, media frames, state, and scrollable evidence.
- Do not add generated chapter numbers, floating section navigation, ornamental icons, or sticky headings. The story is carried by hierarchy, media, and concise labels.
- All visible controls need a clear `:focus-visible` state and at least a 44px mobile hit target.

## Adding a project

1. Copy `_template.html`.
2. Replace all bracketed content and add a unique page modifier.
3. Keep only modules that add new evidence.
4. Add the project to `../js/portfolio-race-data.js`, `../js/playfolio/catalog.js`, and `../js/neuron-brain.js`.
5. Run `npm run sync:chrome`.
6. Verify light/dark themes, keyboard navigation, reduced motion, 390px mobile, 1280px desktop, and an ultra-wide viewport.
7. Run `npm run check` and `git diff --check`.

## Current reference pages

- `project-victoria.html` — image, video, gallery, architecture, and process.
- `project-paddockjs.html` — text-first case study with external package links.
- `project-dream2detect.html` — research metrics and horizontally scrollable evidence ladder.
- `project-noty.html` — contained illustration treatment.
- `project-contextkey.html` — concise text-first experimental project.
- `project-unity.html` — metrics-led cross-platform systems case study.
- `project-mattyflow.html` — text-first local AI application.
- `project-mosaic.html` — distributed robotics ownership model.
- `project-databases-ie.html` — data-model and transaction case study.
- `project-ghoststroke.html` — notarized native utility with real identity artwork and a target-safety-led flow.
