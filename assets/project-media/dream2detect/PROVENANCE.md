# Dream2Detect evidence used on the V8 page

The ten JPEGs are existing synthetic reference examples copied from the Dream2Detect labeling UI, `apps/labeling-ui/public/band-examples/`. They are 360 × 240 pixels. The experiment walkthrough uses three of these images to explain synthetic training data. Their bands are labeling-guide references, not model predictions. No new research images or predictions were generated for this page.

The walkthrough review bar represents the recorded 623 unchanged / 177 corrected labels. The evaluation flow is a conceptual process diagram, not a per-image inference. The result comparison bars use reported measurements.

Metrics were checked on 2026-09-08 against the local project report at `/Users/inventure71/VSProjects/School/Dream2Detect/docs/FINAL_REPORT_DRAFT.md`:

- Section 5: 899 accepted synthetic base images in the expanded pool; first 800-image QC pass kept 623 labels and corrected 177.
- Real dataset: 385 labeled real photographs.
- Section 9.5: EMD60+SAM40, 21.04% exact-band accuracy, 64.16% within-one-band, 1.3351 mean band error.
- Section 9.6: V5-B multitask scalar head, 39.48% within-one-band on the same 385 real photographs.

The pretrained ensemble's task-specific package-damage training used generated images; its pretrained backbone has prior visual training. The page avoids describing it as trained from scratch or claiming all pretraining data were synthetic.

Project source: https://github.com/Inventure71/Dream2Detect
