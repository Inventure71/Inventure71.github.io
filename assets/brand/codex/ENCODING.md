# Ambassador animation delivery

`codex-logo-ambassador-animated-160-alpha.webm` is a delivery variant of the existing
`codex-logo-ambassador-animated-compressed.webm`. Both preserve the same 36.1-second
animation at 30 frames per second. The original remains available.

The homepage renders the logo at 57.6–76.8 CSS pixels. The 160×160 VP9 variant
covers its largest rendered size at 2× density and reduces the file from
824,088 bytes to 351,583 bytes, including the alpha channel.

Force the libvpx decoder before the input and retain `yuva420p` on output.
FFmpeg's default VP9 decoder drops alpha even when the input has an `ALPHA_MODE`
tag. Metadata alone cannot verify transparency; the browser regression checks
transparent and opaque decoded pixels at multiple animation times.

Reproduce with FFmpeg:

```sh
ffmpeg -c:v libvpx-vp9 -i assets/brand/codex/codex-logo-ambassador-animated-compressed.webm \
  -vf scale=160:160:flags=lanczos -pix_fmt yuva420p -c:v libvpx-vp9 -crf 34 -b:v 0 \
  -an -row-mt 1 -threads 4 -deadline good -cpu-used 2 \
  assets/brand/codex/codex-logo-ambassador-animated-160-alpha.webm
```
