# Portfolio and career content

`js/playfolio/project-catalog.js` owns the public project facts, role tags, tier
and editorial priority. Lower priority values start earlier on the grid. F1
contains refined projects, F2 prototypes and explorations, and F3 focused work and studies.
Refinement and intended scope determine tiers; role relevance and confidence in
research evidence remain separate. The current provisional F1 promotions can be
revisited without changing their documented evidence.
These are editorial classifications, separate from simulated driver/car ratings.
All entrants use equal ratings; the simulation can change their running order.

The command menu, topic map, race entrants, directory, featured home projects and
resume project cards consume this catalog. Existing project URLs and race IDs
remain stable. MOSAIC has one catalog entry and race entrant (retaining historical
ID `mosaic-swarm` / race ID `mosaic`); its visualization detail URL remains a
component page and points to the combined case study. The private career library references published priorities here
rather than maintaining a second set of values. Unpublished local work is not
included automatically.

Set up the pinned CV tooling once, then activate it before the checks:

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements-cv.txt
```

After editing public project facts or priorities:

```sh
npm run sync:portfolio
npm run sync:resume
npm run sync:agents
npm run sync:metadata
python3 scripts/build-resume.py
npm run check
npm run test:browser
```

`data/resume.json` owns the personal background, non-project role classifications,
selected project IDs and CV wording. Resume filters are shareable through
`?role=robotics` (also software-engineering, ai-ml and native-apps). The download
always serves the generic CV; job-specific copies belong outside this website.

Projects use `?series=F2` or `?series=F3`; F1 is the default. A single
simulator opens in Grid Walk. The host's Start race / Back to grid / Resume race
control changes presentation while preserving exact race progress. Changing
series starts a fresh grid with that tier's entrants, reusing the renderer and
canvas through `restart()`. The wordmark is a DOM image updated by the website;
the renderer's asset set stays unchanged. Project links remain available in a
no-JavaScript fallback.

`npm run sync:agents` generates `llms.txt`, `profile.md` and one Markdown page per
catalog project. It reads the catalog, resume, public project article content and
reviewed scope in `data/agent-project-context.json`. The private career library is
not an input. These resources are discoverable through head metadata only; no
visible site navigation, footer links or controls lead to them. Direct URLs are
public. `npm run check` includes the read-only freshness check and fails when any
generated text is stale or missing. Update public facts at their source and run
the sync commands above; do not maintain the Markdown outputs by hand. Changes
in real projects still require a deliberate review of their public facts.

The PDF generator uses ReportLab and pypdf, produces at most two A4 pages and
keeps contact/project links. `npm run check:cv` verifies the artifact matches its
inputs and is included in `npm run check`; stale or missing PDFs fail the check
without rewriting the download. Its Python dependencies are pinned in
`requirements-cv.txt`.
Private research dossiers and job applications are not website build inputs.
