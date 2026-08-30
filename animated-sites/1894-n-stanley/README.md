# 1894 N Stanley Avenue — scroll film

A single-page property site where scrolling scrubs the listing film frame by frame.
Built from `1894NorthStanleyTourSterlingCreations.mp4` (20.4s, 1620×1080, 30fps).

## Run it

```bash
cd animated-sites/1894-n-stanley
python3 -m http.server 8080
# http://localhost:8080
```

It must be served over HTTP — opening `index.html` from the filesystem trips CORS on the frames.
Deploying means copying this folder to any static host; there is no build step.

## What's in here

```
index.html          the whole site — markup, CSS and JS, no dependencies
frames/desktop/     150 WebP frames, 1440×960  (9.3 MB)
frames/mobile/      150 WebP frames, 720×480   (4.0 MB)
frames/manifest.json
fonts/              Cormorant Garamond + DM Sans, latin subsets, self-hosted (280 KB)
```

Fonts are self-hosted rather than pulled from Google so the page has no external
requests and renders identically offline.

## The six chapters

Each chapter is pinned to a real shot in the film, so the copy lands on the room it
describes. `CENTERS` in the JS holds those positions as fractions of the film:

| # | Chapter | Film time | Position |
|---|---------|-----------|----------|
| I | The Outlook | ~1.1s | 0.054 |
| II | Arrival | ~5.9s | 0.291 |
| III | The Great Room | ~10.2s | 0.503 |
| IV | The Hearth | ~12.6s | 0.622 |
| V | The Kitchen | ~15.8s | 0.780 |
| VI | See It After Dark (CTA) | ~19.4s | 0.957 |

`CENTERS` does double duty: it positions the copy *and* tells the scroll-dwell engine
where to slow down. Moving a chapter means changing its number in `CENTERS` and the
matching `data-show` / `data-hide` on its `.st` block — keep the two in step or the
text will drift off its shot.

## Tuning

| Want | Change |
|------|--------|
| Slower / faster overall | `#stage{height:720vh}` |
| Smoother / snappier scrub | `LERP` (0.085) — lower is smoother |
| Longer pause at each chapter | `DWELL_PEAK` (3.4) or `DWELL_WIDTH` (0.040) |
| Different accent | `--copper` and friends in `:root` |
| Fewer / more frames | re-run the extractor, update `FRAME_COUNT` |

Re-extracting frames:

```bash
python3 <skill>/scripts/extract_frames.py \
  --input /path/to/tour.mp4 --output frames \
  --frames 150 --quality 67 --desktop-res 1440x960 --mobile-res 720x480
```

Resolutions must keep the source's 3:2 aspect — the extractor stretches rather than
crops, so 16:9 values would distort every frame.

## Placeholder copy — replace before publishing

These are written to be plausible, not accurate. Swap them for real listing data:

- **Stats** — 5 bd / 7 ba / 9,000 sq ft / 180° (hero `data-count` values)
- **Agent block** in chapter VI — name, DRE number, brokerage, email, phone
- **Drive times** in chapter V
- **Room descriptions** in chapters II–V
- `#inquire` currently links to itself; point it at a real form or `mailto:`

The footer already carries a Fair Housing line and an "approximate, verify
independently" disclaimer — keep both, and check the figures before they go live.
