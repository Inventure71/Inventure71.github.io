# Static-site performance

## Stylesheet ownership

Keep route dependencies and cascade order in `css/playfolio-*.css`. These files
are import-only manifests. `npm run sync:styles` expands them into direct HTML
stylesheet links so browsers can discover the dependencies during HTML parsing.
Edit the manifests, then regenerate; do not manually edit the generated link
blocks. `npm run check` verifies them alongside shared navigation, tests and the
simulator build.

## Runtime ownership

- `js/navbar.js` owns mobile collapse; the site does not require Bootstrap JS.
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
