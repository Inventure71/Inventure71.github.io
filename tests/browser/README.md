# Browser regression checks

```sh
npm ci
npx playwright install chromium
npm run build:f1
npm run test:browser
```

The suite starts and stops a static server on `127.0.0.1:4317`; no deployment
or external account is needed. To reuse an installed Chromium, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path. Screenshots and
failure traces go to the ignored `output/playwright/` directory.

The suite exercises real navigation and mobile collapse, skip targets and
subsequent keyboard focus, command search/real links/arrows/empty state, modal
focus/Escape/return, map keyboard/touch selection and non-overlapping geometry,
reduced motion, bounded floating motion and offscreen draw counts, Ghostyper pause/resume, and an actual
WebGL startup failure followed by retry of the same cached integration module.
It also checks standalone startup and every sitemap/canonical/social-image
URL against the local files. The shared visibility observer's hidden-document
event path retains unit coverage; headless tabs do not reliably become hidden.

These replace the gallery source-string assertions and retired shell/reveal/
reading-progress assertions. Existing discovery, data, media, asset-budget,
theme and shared-chrome tests remain in `npm run check`.
