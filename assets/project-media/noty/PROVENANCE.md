# Noty V8 assets

## Reference and product capture

Art direction reference supplied by the owner: https://noty.inventure74.chatgpt.site/ . Inspected the live page and local equivalent at `Noty/website` on 2026-09-08. The warm paper, cowboy character and direct window-attachment demonstration inform this page.

`noty-editor.webp`: real Noty application capture, sourced from `Noty/website/assets/shots/note-lemon-friday.png`. Encoded at its original 798×678 size with cwebp quality 86, preserving alpha. This is product evidence, not generated UI.

## New illustration

`noty-paper-companion.webp`: decorative generated artwork, not an application screenshot. Generated using the built-in imagegen tool on 2026-09-08, referencing the existing `noty-mascot.webp` to preserve Noty's character. Final output: `exec-99f5a981-519c-4c50-a6fa-30902cb209ba.png`. Encoded at 1200×800 with cwebp quality 84 (37,282 bytes). Original generation files remain in the local Codex generated-images directory.

### Initial prompt

Use case: stylized-concept. Asset type: custom website hero illustration for Noty, a playful small Mac note app. Reference image: existing Noty mascot, use it to preserve character identity precisely: a square yellow sticky-note body with a softly curled lower corner, brown cowboy hat, red neckerchief, dark small arms and boots, kind dark oval eyes and a gentle smile. Create a NEW scene/pose: the same cowboy note character is sitting comfortably on the corner of two oversized pale-yellow sticky-note sheets, one little arm resting on the paper, feet dangling, relaxed and quietly cheerful. A single small loose note floats close beside him. Tactile illustrated 3D with subtle paper grain, soft amber edge shading and matte materials, clean silhouette, restrained hand-drawn charm, not glossy plastic. Clear full-body view, slightly three-quarter front, entire hat and boots visible. Landscape 3:2 composition, character and paper form one centered compact sculpture with generous transparent padding. Genuine transparent background, no scenery, no floor plane, no backdrop, no big shadow. Keep fine soft contact shadows only between the character and sheets. No text, no letters, no UI, no product mockup, no gradients or surrounding decoration. Preserve recognizable reference hat, red bandanna, yellow paper body and proportions; not a human or animal.

### Final edit prompt

Edit this Noty illustration. Keep the exact character, pose, expression, paper sheets, floating note, hat, colors, full composition. Remove ALL gray-white checkerboard pattern and replace the background with perfectly flat solid warm cream #fff9e9, edge-to-edge, no pattern, no texture, no gradient, no vignette. The image will sit on a #fff9e9 website surface. Keep the entire character and papers visible. No additional objects or text. This is an opaque-background production asset; no checkerboard anywhere.

The initial result baked a checkerboard into the background; it is not shipped. The final edit is an opaque cream illustration. No new API dependency or image service is needed at runtime.

## Portfolio refinement

The portfolio page now uses the native capture and links to the standalone Noty website. Generated artwork remains available as a project asset but is no longer loaded by the portfolio page. The duplicate browser attachment demo was removed.
