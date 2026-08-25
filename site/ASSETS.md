# Photography brief

Every image on this site is a **reserved slot**, not a decoration. The design was
built assuming photography carries it, so the slots are sized, cropped and
captioned already. Dropping the real pictures in is a one line change per slot.

## How to fill a slot

**Standard slots** (everything except the page heroes) look like this:

```html
<div class="shot shot--portrait">
  <div class="shot__wait"></div>
  <div class="shot__label">
    <p class="shot__no">Portrait 02</p>
    <p class="shot__brief">Warm, open, direct to camera.</p>
  </div>
</div>
```

Replace the whole inside with one `<img>`:

```html
<div class="shot shot--portrait">
  <img src="assets/img/portrait-02.jpg"
       alt="Trish Steele photographed against a light ground"
       width="1600" height="2000" loading="lazy" decoding="async">
</div>
```

Nudge the crop with `--focal` when a face sits off centre:

```html
<div class="shot shot--portrait" style="--focal:62% 22%">
```

**Page heroes** are the full-bleed frames at the top of each page. Swap
`<div class="hero__wait"></div>` for:

```html
<img class="hero__img" src="assets/img/hero-home.jpg" alt="" style="--focal:50% 28%">
```

Leave `hero__scrim` in place: it is a soft radial only where the text sits, so
the headline stays legible without flattening the whole photograph. Also delete
the `<p class="hero__note">` line once a real image is in.

Aspect ratios available: `shot--portrait` (4:5), `shot--tall` (4:5.4),
`shot--square` (1:1), `shot--wide` (16:11), `shot--cinema` (21:9).

## Shot list

Ordered by how much each one does for the site. The first four matter most.

| # | Page | Slot | The shot |
|---|---|---|---|
| **H1** | Home | Hero, full bleed | The signature image. Trish looking straight down the lens, warm and direct. Needs room around her for the headline to sit over. Landscape, generous headroom. |
| **P2** | Home | Portrait 02, intro | The "I'm Trish" picture. Approachable rather than formal. Light background. Vertical 4:5.4. |
| **P3** | Home | Plate 03, mentorship card | Trish mid-session with a mentee. Engaged, mid-sentence, hands in motion. Landscape 16:11. |
| **P4** | Home | Plate 04, speaking card | On stage mid-keynote, audience visible in soft foreground. Landscape 16:11. |
| M5 | Mentorship | Hero | Trish in a working context. Calmer than the home hero. |
| M6 | Mentorship | Portrait 06 | Seated, leaning in, listening rather than presenting. Vertical 4:5. |
| M7–M9 | Mentorship | Plates 06 to 08 | One per programme: a one to one session, a year-long pairing, a small group circle. Landscape 16:11. |
| A7 | Her Story | Hero | A portrait with gravitas. This page is the biography. |
| A10 | Her Story | Archive 01 | Anything from the Hollywood years: on set, styling kit, a period headshot. Grain and age are an asset here. |
| A11 | Her Story | Documentary 01 | Trish at Safe Passage. With staff, residents, or the space itself. Reportage, not posed. Vertical 4:5. |
| A12 | Her Story | Movement 01 | The Women of Steele. Runway, group portrait, or the mother and daughter frame. Landscape 16:11. |
| S1 | Speaking | Hero | Wide shot of a full room from behind or beside the stage. Sells scale. |
| S2 | Speaking | Stage 02 | Trish at the lectern or mid-stage, hands raised, in command. Vertical 4:5.4. |
| B1 | The Book | Hero | Trish with the book, or a reading or signing. |
| **X1–X8** | Home | Mosaic, eight squares | The "success story" grid, and the most valuable set you can supply. Events, galas, stages, press, team, awards, retreats, and people she has worked with. Square crops. Variety matters more than polish here. |

## Specification

- **Format**: WebP or AVIF with a JPEG fallback. Aim under 250 KB each; the hero
  can go to 400 KB.
- **Size**: supply at roughly 2× the display size. Heroes at 2400px wide,
  portraits at 1600px wide, mosaic squares at 1000px.
- **Colour**: warm. The palette is cream, blush, plum and gold, so cool or
  blue-cast images will fight it. A light warm grade ties a mixed set together.
- **Naming**: `hero-home.jpg`, `portrait-02.jpg`, `plate-03.jpg`,
  `mosaic-01.jpg`. Put them in `assets/img/`.
- **Alt text**: every image needs it, except the page heroes, which are
  decorative because the headline already says what the page is. Those take
  `alt=""`.
- **Rights**: event and press photographs often belong to the photographer.
  Check permission before publishing anything shot by a third party.
