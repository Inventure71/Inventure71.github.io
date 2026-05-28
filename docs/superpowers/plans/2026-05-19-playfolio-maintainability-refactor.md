# Playfolio Maintainability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the website codebase so shared chrome, page behavior, and styling have clear ownership boundaries with minimal duplication and no avoidable monoliths.

**Architecture:** Keep Playfolio as the site-wide shell layer, with shared navigation/footer rendering in modular JS and CSS split by feature ownership. Leave project case-study primitives in `project-pages.css`, but remove duplicated page shells and move page-local styles out of HTML into dedicated assets.

**Tech Stack:** Static HTML, modular browser JavaScript, CSS, Bootstrap utilities, Vitest, Vite

---

### Task 1: Normalize shared page shells

**Files:**
- Modify: `index.html`
- Modify: `projects.html`
- Modify: `apps.html`
- Modify: `contact.html`
- Modify: `resume.html`
- Modify: `tags.html`
- Modify: `project_details/*.html`
- Modify: `project_details/_template.html`
- Modify: `js/theme-boot.js`
- Modify: `js/playfolio.js`
- Modify: `js/playfolio/shared-chrome.js`

- [x] Replace inline theme boot scripts with `js/theme-boot.js` or `../js/theme-boot.js`.
- [x] Replace duplicated navbar markup with placeholder `<nav>` roots carrying `data-active-page` where useful.
- [x] Replace duplicated footer markup with empty shared footer roots.
- [x] Convert all `playfolio.js` page includes to ES module scripts.

### Task 2: Move page-specific presentation to owned assets

**Files:**
- Create: `css/tag-network.css`
- Modify: `tags.html`

- [x] Move tag-network page CSS out of inline `<style>` into `css/tag-network.css`.
- [x] Keep `tags.html` as a thin document shell that imports shared and page-local assets only.

### Task 3: Split the Playfolio stylesheet by ownership boundary

**Files:**
- Create: `css/playfolio/foundation.css`
- Create: `css/playfolio/ai-guide.css`
- Create: `css/playfolio/home.css`
- Create: `css/playfolio/projects.css`
- Create: `css/playfolio/race.css`
- Create: `css/playfolio/directory.css`
- Create: `css/playfolio/project-overrides.css`
- Create: `css/playfolio/resume.css`
- Create: `css/playfolio/utilities.css`
- Modify: `css/playfolio.css`

- [ ] Move global tokens, shell, navbar, buttons, and hero primitives into `foundation.css`.
- [ ] Move Ask-AI toast styling into `ai-guide.css`.
- [ ] Move homepage workbench, portrait, and principle sections into `home.css`.
- [ ] Move projects explorer and command palette styles into `projects.css`.
- [ ] Move race page and simulator bridge styles into `race.css`.
- [ ] Move apps/contact directory layouts into `directory.css`.
- [ ] Move project-page overrides into `project-overrides.css`.
- [ ] Move resume page styles into `resume.css`.
- [ ] Keep footer, reveal, motion-reduction, and responsive rules in `utilities.css`.
- [ ] Turn `css/playfolio.css` into an import-only manifest that preserves cascade order.

### Task 4: Verify behavior and fix regressions

**Files:**
- Modify: any affected file only if verification exposes a regression
- Test: `js/playfolio/shared-chrome.test.js`
- Test: `js/playfolio/command-palette.test.js`

- [ ] Run `npm run check`.
- [ ] Run `git diff --check`.
- [ ] Run targeted browser or DOM smoke checks on the updated shared shell.
- [ ] Fix any regressions found before calling the refactor complete.
