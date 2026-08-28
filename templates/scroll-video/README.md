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
                                 #      and    …/templates/scroll-video/studio/
node build.mjs                   # one self-contained .html per preset, into dist/
node build.mjs abyssal           # just one
```

Both the template and the studio need a server — `file://` blocks the media reads they depend on.

## Studio — building a site without editing a file

`studio/` is a browser app for making one of these for a client. It asks what they do,
takes their logo and their footage, and hands back a folder you can upload.

| | |
|---|---|
| **Trade** | picks a scheme, a type pairing, the units on the readout and a story skeleton |
| **Brand** | name, tagline, logo, page title and social tags |
| **Colour** | five wells, or pull the palette straight out of the logo or a frame of the film — with live contrast ratios |
| **Film** | drop a video and it is cut into frames *on your machine*, or drop a sequence you already have |
| **Instrument** | the readout's units and range, the rail, the cue, the corner blocks — including live cells that read the value, the percentage or the zone |
| **Journey** | how scroll position maps to the number, zone by zone |
| **Panels** | eyebrow, heading, body, spec grid, big lines, button, fine print — timed automatically, or pinned to the exact moment the preview is sitting on |

The preview beside the form is the real engine on the real config, re-mounted on every edit
and holding its scroll position, with a scrubber so you can sit at 60% while you write the
copy for it.

**Export** gives you a zip: one `index.html` with the styles, the engine and the config
inlined, and `frames/` beside it. Upload the folder anywhere static. Or export the config
alone and drop it into `presets/` to run against a shared copy of the engine — the right
choice once you are running several client sites off one template.

Nothing is uploaded anywhere. The video becomes an object URL, the frames are cut with a
canvas, and the zip is assembled in memory. Your work in progress is kept in `localStorage`
and the frames in IndexedDB, so a reload does not cost you a re-cut — but **Save file** is
what makes a project portable.

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

### Frames, not video

**A frame sequence is the right source, and video is the fallback.** Given
`media.frames`, the engine draws still images and nothing else: no seeking, no codec to
negotiate, no autoplay policy, no `playsinline` quirk, and identical behaviour in every
browser. Scrubbing a video element instead means asking it to seek sixty times a second,
which no browser does well — which is why the video path *bakes the film to frames at load
time anyway*. `media.frames` is that same work, done properly at build time.

The trade is bytes: frames have no interframe compression, so 150 WebP frames at 1440px run
roughly 6–14 MB against 3–6 MB for the equivalent MP4. That is the price of a scrub that
actually tracks the scroll. Keep the count near 150 and the width at 1440 and it stays
comfortable; the studio shows you the weight as you go.

Frames load **coarse to fine** — every 16th, then every 8th, and so on — so the page is
scrubbable within a second or two and simply sharpens from there, rather than holding
everything behind one progress bar. The engine draws the nearest frame that has arrived, so
there is no state in which the screen is blank.

### The video path, when you only have a video

`media.tiers` is an ordered list of fallbacks and the first one that **decodes** wins — not
the first that downloads. A tier is either one URL (a stitched film) or an array of clips
whose end and start frames match, so the hand-off between them is invisible. A single-URL
tier is played through once offscreen at 4× and captured to frames, after which it scrubs
like a sequence. If every tier fails — an old browser, no H.264 — the page runs on
crossfaded `media.keyframes` and stays fully scroll-driven.

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
| `frames` | **the preferred source.** An array of URLs, or `{ pattern: 'frames/f-{i}.webp', count: 180, pad: 4, from: 1 }`. When set, `tiers` is never touched |
| `tiers` | fallback for when you only have a video; ordered, each a URL or an array of clip URLs |
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

- **Ship frames.** Cut them in the studio, or with ffmpeg:
  `ffmpeg -i film.mp4 -vf "fps=12,scale=1440:-2" -q:v 5 frames/f-%04d.webp`
- **Shoot for the scroll, not for playback.** Continuous motion in one direction; no cuts,
  no camera moves that reverse. The viewer controls the speed and will run it backwards.
- **Around 150 frames.** Below about 90 the motion steps; above 220 you are paying real
  bytes for motion nobody can see at scroll speed.
- **Keyframes are the film's own boundary frames**, not separate art — that is what makes
  the video fallback look deliberate rather than broken.
- Watch the total weight. It downloads before anything moves.
