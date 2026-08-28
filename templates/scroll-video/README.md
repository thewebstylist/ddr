# Scroll Video

A scroll-scrubbed film behind pinned type, with an instrument HUD reading a value that
climbs or falls as you scroll. The scroll bar *is* the transport control: nothing plays on
its own, and stopping halfway leaves the frame held.

Two presets ship with it, both running the same engine:

| | |
|---|---|
| `?preset=abyssal` | dark, cyan, a descent to 3,800 m — the reference build |
| `?preset=meridian` | light and warm, a value that climbs, rail on the left, no film at all |

```bash
python3 -m http.server 8080      # then open localhost:8080/templates/scroll-video/
node build.mjs                   # one self-contained .html per preset, into dist/
node build.mjs abyssal           # just one
```

The template needs a server — `file://` blocks the video reads the frame baker depends on.

## The three files

```
template.css     every colour, font and size is a custom property
template.js      the engine: builds the whole page from one config object
presets/*.js     the only file you edit — one per site
```

`index.html` is a preview harness that reads `?preset=` and loads the pair. `build.mjs`
flattens a preset into a single self-contained HTML file with its real `<title>` and social
tags baked into the `<head>`, so crawlers see them without running JavaScript. **That file in
`dist/` is what you ship.**

Starting a new site is copying `presets/meridian.js`, renaming it, and rewriting the values.

## How it works

The page has one element with real height (`.sv-track`, 900vh by default). Everything you
see is `position: fixed` on top of it, so scrolling moves nothing — it just advances a
number from 0 to 1. That number drives four things at once:

1. **The film.** A single stitched MP4 is played once in the background at 4× and captured
   to JPEG frames, then scrubbed as still images — far smoother than seeking a video
   element. Until the bake finishes, the engine seeks the video directly; before that, it
   crossfades the keyframe stills.
2. **The readout.** Progress maps to a value through `zones`, so the mapping need not be
   linear — ABYSSAL spends its first fifth barely leaving the surface and its fourth
   crossing 2,700 metres.
3. **The grade.** A gradient washed over the film, interpolated between `stage.grade` stops.
4. **The panels.** Each fades in, holds, and fades out over its own slice of the track.

Scroll position is eased toward (`scroll.smoothing`), so a flick of the wheel glides instead
of snapping. `prefers-reduced-motion` turns the easing off and stops the cue animation.

### Sources degrade rather than fail

`media.tiers` is an ordered list of fallbacks and the first one that **decodes** wins — not
the first that downloads. A tier is either one URL (a stitched film) or an array of clips
whose end and start frames match, so the hand-off between them is invisible. If every tier
fails — an old browser, no H.264 — the page runs on crossfaded `media.keyframes` and stays
fully scroll-driven. There is no state in which the page is blank.

## Config reference

Everything below is optional; the defaults are in `ScrollVideo.DEFAULTS`.

### Copy shorthand

Any string in a panel, eyebrow, spec or status row accepts:

| | |
|---|---|
| `**bold**` | bright emphasis |
| `*accent*` | accent colour, not italic |
| `` `stat` `` | mono accent figure |

Raw HTML passes through untouched — config is authored, not user input.

### `seo`

`lang`, `title`, `description`, `siteName`, `ogTitle`, `ogDescription`, `ogImage`,
`ogImageAlt`, `ogImageWidth`, `ogImageHeight`, `twitterCard`, `themeColor`. `ogTitle` and
`ogDescription` fall back to `title` and `description`; `themeColor` falls back to `theme.bg`.

### `theme`

Each key becomes a CSS custom property — `accentDim` → `--sv-accent-dim` — so anything
`template.css` declares can be set from here.

| key | |
|---|---|
| `bg` `ink` `muted` `accent` | the four colours the scheme is built from |
| `accentDim` `accentFaint` `accentWash` | derived from `accent` unless set |
| `mutedDim` `loadbarBg` | derived from `muted` unless set |
| `ctaInk` | text colour on the filled CTA |
| `panelBg` `vignette` `vignetteInner` | spec-cell fill, vignette colour and where it starts |
| `fontDisplay` `fontBody` `fontMono` | the three faces |
| `weightHeading` `weightBody` `weightLede` | |
| `h1` `h2` `lede` `big` `readout` `hudSize` `brandSize` | type sizes, `clamp()` welcome |
| `padX` `inset` `cornerInset` `maxWidth` `radius` | layout |

Pair with `fonts.href` — one stylesheet URL, Google Fonts or your own. `preconnect` is
inferred for Google Fonts and can be listed explicitly for other hosts.

### `scroll`

`length` (`'900vh'` — longer is a slower scrub) and `smoothing` (`0.14`; `1` disables easing).

### The HUD

| key | |
|---|---|
| `brand` | `{ word, tagline, logo: { src, alt, height }, href }` — a logo image replaces the wordmark, in the corner and on the loader |
| `mission` | array of lines, top right |
| `status` | `{ rows: [[{k,v}, …], …] }` bottom left. `v` may be a string, or `fn(progress, value, zone)` for a live reading |
| `readout` | `{ from, to, unit, pad, decimals, format, showZone }`. `format(value, progress)` overrides `pad`/`decimals` |
| `rail` | `{ side, min, max, ticks, step, majorEvery, unit }`. Omit `ticks` and they generate from `step` |
| `cue` | `{ text }` — hides itself once you start scrolling |
| `corners` | the four bracket marks |

### `zones`

```js
zones: [
  { at: [0.00, 0.20], value: [0, 5],   label: 'SURFACE' },
  { at: [0.20, 0.40], value: [5, 200], label: 'SUNLIT ZONE' }
]
```

`at` is scroll progress, `value` is what the readout shows across it, `label` sits under the
number. Omit `zones` entirely and the value runs linearly from `readout.from` to
`readout.to`.

### `stage`

`fit` (`'cover'` | `'contain'`), `vignette`, `gradeOpacity`, `gradeBlend` (`'multiply'` reads
well over dark footage, `'screen'` over light, `'normal'` when there is no footage at all),
and `grade` — `[[progress, colour], …]` stops interpolated as you travel.

### `media`

| key | |
|---|---|
| `tiers` | ordered fallbacks; each is a URL or an array of clip URLs |
| `keyframes` | boundary stills, shown while the film loads and crossfaded if none decodes |
| `poster` | first frame, painted immediately |
| `bake` `bakeFps` `bakeWidth` `bakeQuality` | the background frame bake |
| `crossOrigin` | `'anonymous'`; baking reads pixels back, so the film must be CORS-clean. Set `null` if your CDN sends no CORS headers — you keep the film, you lose the bake |

### `loader`

`word` / `logo` (default to the brand's), `message`, `ready`, `timeout` — after which the
loader lifts regardless, so a stalled download never traps anyone.

### `panels`

```js
{
  id: 'offer',
  align: 'left' | 'center' | 'right',
  width: 760,                      // max width of the text column
  at: [fadeIn, full, holdEnd, gone],   // scroll progress; omit for automatic spacing
  persist: true,                   // stay visible once reached — for the closing panel
  eyebrow: 'Zone 04 · The floor',
  heading: 'One line<br>or two',
  level: 1,                        // h1/h2; the first panel defaults to h1
  body: 'One string, or an array for several paragraphs',
  specs: [{ k: 'Depth rating', v: '*4,000 m* operational' }],
  specColumns: 2,
  lines: [['*8* seats.', '$250,000.'], ['Departing *March 2027*.']],
  cta: { label: 'Join the Manifest', href: '#manifest', arrow: '↧', target, onClick },
  fine: 'Medical clearance required',
  order: ['eyebrow', 'heading', 'lines', 'body', 'specs', 'cta', 'fine']   // the default
}
```

Blocks render in the order above — the big `lines` sit above the explanatory `body`,
statement first and reasoning second. Name a different `order` to rearrange them, or leave a
block out of the list to drop it.

Panels without `at` share the track evenly — a short fade in, a long hold, a short fade out.
Give one panel an explicit `at` and the rest still auto-space around their own slots, so you
can pin the two that matter and leave the others alone. `cta.onClick` returning `false`
prevents the default navigation.

## Notes for authoring the film

- **One stitched file beats several.** The bake only runs on a single-URL tier, and the bake
  is what makes the scrub smooth.
- **Shoot for the scroll, not for playback.** Continuous motion in one direction; no cuts,
  no camera moves that reverse. The viewer controls the speed and will run it backwards.
- **Keyframes are the film's own boundary frames**, not separate art — that is what makes
  the fallback look deliberate rather than broken.
- Keep it under about 25 MB. It is downloaded before anything moves.
