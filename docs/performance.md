# Static-site performance

## Stylesheet ownership

Keep route dependencies and cascade order in `css/playfolio-*.css`. These files
are import-only manifests. `npm run sync:styles` expands them into direct HTML
stylesheet links so browsers can discover the dependencies during HTML parsing.
Edit the manifests, then regenerate; do not manually edit the generated link
blocks. `npm run check` verifies them alongside shared navigation, tests and the
simulator build.

Plus Jakarta Sans is delivered from the same unmodified WOFF2 subsets previously
requested from Google Fonts. `css/fonts.css` retains its weight range and Unicode
coverage; the runtime generator adds a Latin-subset preload and replaces external
font stylesheet links. Font sources and the OFL license are in `assets/fonts`.
The Home portrait and HoloVinyl hero image are preloaded before the font so their
first-screen downloads do not wait behind the stylesheet queue.

## Runtime ownership

- `npm run build:site` bundles the shared page runtime into `dist/site` and
  synchronizes its content-versioned URL in all Playfolio pages. Resume filtering
  is included in that entry; homepage motion and project selection remain lazy
  chunks. `npm run check` builds this runtime before checking the generated pages.
- The tiny theme and pointer startup scripts are inlined immediately after the
  charset declaration by the same generator. Pointer tracking is available before
  stylesheet downloads, preserving navbar hover state during slow navigation.
- Resume uses inline SVG icons, avoiding the global icon-font download. Its
  wrapping role toolbar reserves its natural layout while JavaScript initializes;
  without JavaScript the toolbar remains hidden and the complete CV stays readable.
- All public Playfolio pages now use the same inline-icon helper. `sync:icons`
  migrates static markup, and `check:icons` rejects a reintroduced icon-font
  dependency. Content generators emit the helper markup directly.
- Projects pre-renders its race guide and loads simulator CSS/code concurrently.
  Dream2Detect reserves the enhanced walkthrough geometry before its module loads,
  while its complete walkthrough remains readable without JavaScript.
- Reveal setup only arms content below the viewport, so late initialization or
  a restored scroll position cannot hide content already on screen.
- `js/navbar.js` owns navigation fit and mobile collapse; the site does not require
  Bootstrap JS. It measures the actual brand, links and tools, reserving one square
  control's width between Ask AI and the links. It hides the command button before
  collapsing the menu, and rechecks on width, font and label changes. Keyboard focus
  moves to a visible control when its previous target becomes hidden.
- `js/playfolio/init.js` imports homepage motion and project selection only when
  their elements exist.
- `js/playfolio/visibility.js` combines intersection and document visibility.
  Portrait timers and Codex video/flight pause while invisible; reduced-motion
  preferences disable decorative movement. The project map uses the same activity
  observer and draws a static reduced-motion scene. Its physics settles after 60
  updates; a gentle in-place float continues at up to 30 updates per second while
  visible. Topic controls and labels move with their nodes. Dragged nodes push
  their neighbors using the same positions as rendering. Grid anchors stay intact
  and all displaced nodes spring home, or return immediately under reduced motion.
  Contact physics runs during dragging and settling, then sleeps again.
- The map runtime is a lazy chunk of the shared build. Its world coordinates and
  full scrolling topic layout stay intact, but canvas pixels are capped to one
  viewport at DPR ≤2. Scroll redraws the current slice, including reduced motion;
  topic targets move with transforms rather than layout coordinates.
  The introduction's race link stays in document flow, and the initial map height
  keeps the footer below the viewport while the full graph initializes.
- The homepage logo uses a 160px VP9 delivery variant at its original duration and
  frame rate. See `assets/brand/codex/ENCODING.md`; deferred loading and visibility,
  reduced-motion and data-saving behavior are preserved.
- Reactive-glass pointer coordinates are coalesced into one update per frame.

## Media variants

Original artwork remains available. HTML references optimized variants, with
intrinsic image dimensions to reserve space and asynchronous decoding. Portrait
variants are 1100px wide, covering the desktop portrait at 2x pixel density.

Measured file sizes on 2026-09-08 (bytes, before HTTP compression):

| Assets | Previous | Current | Reduction |
| --- | ---: | ---: | ---: |
| Both portraits | 273,082 | 147,728 | 45.9% |
| Neural Noir gallery | 5,556,949 | 391,224 | 93.0% |
| Codex poster | 90,168 | 33,562 | 62.8% |
| Favicon | 410,598 | 2,154 | 99.5% |
| Navbar JavaScript | 80,420 | 1,853 | 97.7% |

To regenerate with `cwebp` and macOS `sips`:

```sh
cwebp -q 82 -resize 1100 0 assets/profile.png -o assets/profile-1100.webp
cwebp -q 82 -resize 1100 0 assets/profile2.png -o assets/profile2-1100.webp
cwebp -q 88 assets/neural_noir/img1.png -o assets/neural_noir/img1.webp
cwebp -q 88 assets/neural_noir/img2.png -o assets/neural_noir/img2.webp
cwebp -lossless assets/brand/codex/codex-logo-ambassador.png -o assets/brand/codex/codex-logo-ambassador.webp
sips -s format png -Z 32 assets/favicon.ico --out assets/favicon-32.png
```

## Verification

Local browser checks covered all main routes and 20 project pages at 390px and
1440px widths, mobile collapse and resizing, topbar dimensions/hover, project
selection, command-menu focus, Codex pause/resume, reduced motion, dark mode,
gallery images and race startup. Non-home routes no longer request homepage
motion/selection modules, and no active route requests Bootstrap's JS bundle.

These are asset-size and local behavior measurements, not a deployed Lighthouse
score or a claim about real-user network timing.


## Static metadata and browser checks

`npm run sync:metadata` regenerates canonical/Open Graph/Twitter tags from each
public route's existing title, description and project imagery, plus the sitemap
and robots.txt. The canonical origin is `https://mgiorgetti.com/`. The template
is noindex; local experiments are excluded, and the Matrices external redirect
is outside this generator. `npm run check:metadata` checks for drift.

`npm run test:browser` runs the interaction suite against an isolated local
static server. See `tests/browser/README.md` for browser setup. These checks
include actual renderer failure/retry using the built PaddockJS integration.
The host exports `initializeProjectsRace(shell)` (duplicate starts share a
promise) and `destroyProjectsRace(shell)` (awaits startup before teardown).
The loader awaits initialization; importing its cached bundle does not start an
embedded race by itself. Standalone startup remains automatic.
