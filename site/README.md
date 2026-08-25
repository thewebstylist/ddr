# TrishSteele.com

A redesign of trishsteele.com, leading with mentorship. Static HTML, no runtime
dependencies, no build tooling beyond Node.

**Read [`CONTENT.md`](./CONTENT.md) before publishing.** Some of the copy is
proposal rather than fact, and it is all marked.
**Read [`ASSETS.md`](./ASSETS.md)** for the photography brief and how to drop
pictures into the reserved slots.

## Run it

```bash
node build.mjs                 # assemble the seven pages
npx http-server -p 8899 .      # or open index.html directly

node preview.mjs               # flatten all seven into one shareable file
```

`preview.mjs` writes `preview.html`: the whole site in a single self-contained
document, fonts base64'd inline and a hash router standing in for the nav. It is
for sending someone a link with nothing to host. It is build output and is
gitignored; the seven files at the root are what actually deploys.

There is no bundler, no framework, and nothing to install. `build.mjs` is a
single dependency-free script that stitches page fragments into the shared
layout. The finished HTML is committed, so the folder deploys as is to Netlify,
Vercel, GitHub Pages, S3, or straight into a WordPress theme.

## How it is put together

```
site/
  build.mjs              the assembler; page list and metadata live here
  src/
    layout.html          the shell, with {{title}} {{nav}} {{body}} slots
    partials/            nav.html, footer.html
    pages/               one body fragment per page
  assets/
    css/                 tokens, base, components, motion, pages
    js/site.js           the whole behaviour layer
    fonts/               self-hosted woff2, latin + latin-ext
  index.html …           generated. Edit src/, then run build.mjs
```

Editing a generated `.html` at the root works, but the next build overwrites it.
Change `src/` instead.

## The design system

Everything is driven by custom properties in `assets/css/tokens.css`. Change the
palette, the type scale or the motion curves there and the whole site follows.

- **Colour** is blocked by section rather than flat: cream, blush, white and
  plum. One high-chroma gold carries every call to action; rose is a highlight
  only and never a button.
- **Type** is Bodoni Moda for headings and figures, Cormorant Garamond italic for
  the one accented word in a headline, and Inter for anything read at length.
- **Fonts are self-hosted** (408 KB total). No third-party request at runtime,
  nothing to leak, and the two critical faces are preloaded.
- **Dark mode** follows the system by default and can be toggled. The toggle
  writes to `localStorage`, and an inline script in `<head>` applies it before
  first paint so a dark viewer never sees a cream flash.

## Motion

`assets/js/site.js` is the whole behaviour layer: one rAF loop, no libraries.

Only `transform`, `opacity` and `clip-path` animate. Hidden states are scoped to
`.js`, so with scripting off the page renders complete rather than blank. Scroll
reveals use an IntersectionObserver **plus** a sweep pass on each frame, because
an observer never fires for content the reader jumps clean over.

`prefers-reduced-motion` is honoured throughout: it removes the motion and keeps
the content, never the reverse.

**The signature move** is the gold underline. Every highlighted word is
underscored by a hand-drawn SVG stroke that draws itself once as the heading
arrives. It is a path rather than a border, so it has the wobble of something
written instead of ruled.

## Not finished yet

- **Forms have no endpoint.** All three intercept submit and show a notice
  saying plainly that nothing was sent, with the phone number and email address.
  To wire one up, point the `<form>` at your handler and delete the
  `data-demo-form` attribute; the fallback notice disappears with it.
- **Photography is pending.** Every image is a reserved, captioned slot.
- **Journal posts** link out to the live site; their text was never retrieved.

## Verified

Checked in Chromium at 360, 390, 768, 1024 and 1920 px, in both colour schemes,
across all seven pages: no horizontal overflow, no console errors, and every
reveal resolves. Not yet checked on real iOS or Android hardware, in Safari or
Firefox, or with a screen reader.
