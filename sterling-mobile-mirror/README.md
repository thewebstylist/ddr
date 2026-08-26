# Sterling Mobile Mirror

A Chrome extension that drops a realistic **iPhone 15 Pro Max** onto the page you are
already looking at. The desktop site stays full-screen and completely visible; the phone
floats over the lower-right corner showing the *same URL* at a real 430 × 932 mobile
viewport — live, scrollable, and interactive.

One click to open. One click to close. Nothing left behind.

---

## What it does

- **Real mobile rendering.** The phone holds an iframe of the current URL at a 430 × 932
  CSS-pixel viewport, so the site's own responsive breakpoints do the work. It is the
  actual page, not a screenshot. Desktop scrollbars are suppressed *inside the preview
  only*, so the mobile viewport is a true 430px with overlay scrolling, like iOS.
- **Stays put while you scroll.** The phone is fixed to the viewport; the desktop page
  scrolls behind it.
- **Rests on the floor.** By default the phone sits flush with the bottom edge of the
  window rather than floating above it, so promo images all land on the same line. Drag it
  anywhere you like — bring it back within 30px of the bottom and it clicks flush again.
- **Follows the section you're reading.** As you scroll the desktop page, the extension
  works out which section sits nearest the middle of your viewport and scrolls the phone
  to the matching section.
- **Exports the whole composition.** "Download promo image" saves the desktop page *and*
  the phone together as a high-resolution PNG, with the extension's own controls hidden.
- **Remembers how you like it.** Position, scale, frame finish and whether the controls are
  hidden persist across pages and sessions through `chrome.storage`.
- **Never touches the site.** The interface lives in a closed Shadow DOM inside a single
  custom element. Closing removes that element and every listener it registered.

---

## Install (Load unpacked)

1. Download or clone this repository.
2. Open **`chrome://extensions`** in Chrome (Chrome 116 or newer).
3. Turn on **Developer mode** — the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the **`sterling-mobile-mirror`** folder — the one containing `manifest.json`.
   Do not select the repository root and do not select `src`.
6. "Sterling Mobile Mirror" appears in the list. If you edit the source, press the
   **reload** (↻) button on its card.

### Pin it to the toolbar

1. Click the **puzzle-piece** icon to the right of the address bar.
2. Find *Sterling Mobile Mirror* and click the **pin** icon next to it.

The icon now sits permanently in the toolbar. That icon is the only control needed.

---

## Using it

Open any normal website and click the pinned icon.

- **First click** injects and opens the phone at the lower right.
- **Second click** closes it.
- Reloading or navigating away closes it too (nothing is injected until you click again).

### The controls

They sit in a compact rail down the right edge of the phone, aligned to its bottom
corner. Hover any button for its name.

| Control | What it does |
|---|---|
| **Move** (grip) | Drag the phone anywhere in the viewport; near the bottom edge it snaps flush. The phone's titanium frame is also a drag handle — press the bezel, not the screen. |
| **Sync section** | Scrolls the phone to the section nearest the centre of the desktop viewport. **Alt-click** turns auto-follow on/off (it starts on; the button glows pink while active). |
| **Reload** | Reloads whatever the phone is currently showing. **Alt-click** re-mirrors the desktop page's current URL — useful after navigating inside the phone. |
| **Scale up / down** | Resizes the phone in 5% steps, from 30% to 100%. The percentage appears on the button and in a brief toast. |
| **Frame finish** | Switches between **Black Titanium** and **Natural Titanium**. |
| **Phone cut-out** | Saves the phone alone as a transparent PNG with a soft drop shadow, cropped to where that shadow fades out — drops straight onto any background. **Alt-click** crops tight to the frame with no shadow. |
| **Hide controls** | Dismisses the control rail, leaving the phone alone on the page. A dim chip stays where the rail was — click it to bring everything back. The choice is remembered. |
| **Download promo image** | Saves the whole visible composition — desktop page plus phone — as a high-resolution PNG. |
| **Close** | Removes the overlay. `Esc` also works while focus is inside the overlay. |

Inside the phone's footer sits an address pill showing the host currently loaded, the way a
mobile browser does. It is part of the device rather than part of the controls: it stays
during captures and while the controls are hidden, and it never takes pointer events, so
the site underneath stays fully interactive.

### How section sync decides

The extension scores every plausible section in the desktop viewport (`<section>`,
`<article>`, `<header>`, `<footer>`, `main` children, `[role="region"]`, common
`hero`/`section`/`block` class names, and headings), preferring blocks near the centre of
the viewport over sprawling wrappers. It then looks for the same element inside the phone
by **id**, by **CSS path**, and finally by **heading text**. If a page reorders its markup
so much that nothing matches, it falls back to scrolling the phone to the same relative
depth in the document. A toast tells you which happened.

### The exports

Both exports are taken with `chrome.tabs.captureVisibleTab`, then cropped and re-scaled on
a canvas to at least **2× CSS pixels** (higher if your display is denser). On a 1440 × 900
window, "Download promo image" produces a 2880 × 1800 PNG.

**Phone cut-out** goes further: everything outside the phone's rounded silhouette is masked
to full transparency, so the corners are clear rather than showing the page behind them.
The mask is pulled in by a hair, because the outermost row of captured pixels is the frame
blended against whatever was behind it, and that fringe would read as a halo once the
cut-out is placed on another colour.

The shadow is **drawn, not captured**. `captureVisibleTab` returns the on-screen shadow
already blended with whatever page was behind it, and no amount of processing recovers its
alpha from that — so the cut-out gets its own, composited onto the canvas in three passes
the way the CSS is layered: a wide ambient fall, a mid body, and a tight contact edge. The
canvas grows to exactly the room that shadow needs, so the file is cropped to where the
shadow fades out rather than to a guess. Alt-click the button to skip the shadow and crop
tight to the frame instead.

Only what the window shows can be captured, so a phone hanging off the edge of the window
would come out with a slice missing. Rather than hand over a broken cut-out, the extension
says so and asks you to scale down. (The promo export has no such limit — it is the
viewport by definition.)

Files land in your normal Chrome downloads folder, named like:

```
sterling-mobile-mirror-example-com-promo-20260825-1412.png
sterling-mobile-mirror-example-com-phone-20260825-1412.png
```

The control rail, the restore chip and any toast are hidden for the duration of the
capture, so exports show only the phone and the page. The address pill stays, since it is
part of how the phone reads.

---

## When a site blocks embedding

Some sites send `X-Frame-Options: DENY`, a `Content-Security-Policy: frame-ancestors`
rule, or a `frame-src` policy that forbids loading themselves in a frame. Chrome then
refuses to render the preview, and no extension can override that.

When it happens the phone shows a plain-English card explaining which header caused it,
plus two buttons:

- **Open 430 × 932** — opens the page in a genuine 430 × 932 pop-up window, which is the
  closest honest substitute.
- **Retry** — some sites only block intermittently, or on the first load.

Everything else (drag, scale, finish, capture, promo export) keeps working; the phone
simply shows the card instead of the site.

---

## Troubleshooting

### The icon does nothing, then shows a badge

The badge is the extension telling you why, and **hovering the icon spells it out in
full** — the tooltip carries the actual reason for about twelve seconds after a failure.
The same message is logged to the service-worker console (`chrome://extensions` → the
extension's card → **service worker** → Console).

| Badge | Meaning |
|---|---|
| `n/a` | Chrome will not let *any* extension run on this page — `chrome://` pages, the Web Store, DevTools, `view-source:`, other extensions, or `file://` URLs without file access enabled. |
| `err` | Something went wrong opening the overlay. The tooltip and the console carry the error. |

### After updating or reloading the extension, clicks stop working

**Refresh the page.** Reloading an unpacked extension orphans the content scripts already
running in tabs you had open: their code stays in the page but loses its connection to the
extension, so clicks land on a dead copy.

The extension now detects that and replaces the stale copy on the next click, so this
should heal itself — but a refresh is the instant fix, and it is worth doing on any tab
that was open while you were installing a new build.

### The phone shows a card instead of the site

That site refuses to be framed. See [When a site blocks embedding](#when-a-site-blocks-embedding).

---

## Permissions, storage and privacy

| Permission | Why |
|---|---|
| `activeTab` | Grants access to the current tab **only at the moment you click the toolbar icon** — that is what allows injection and screenshots. There are no host permissions, so the extension has no standing access to any site. |
| `scripting` | Injects the overlay's content scripts on that click, and only then. |
| `storage` | Saves four preferences: position, scale, frame finish, auto-follow. |

There is no backend, no account, no analytics and no network traffic of any kind. Captures
are composed locally on a canvas and handed straight to Chrome's downloads. Page content is
never read except to find the section you are looking at, and never leaves the browser.

---

## Testing it

### Manual checklist

1. **Open / close.** Load any responsive site (e.g. `https://developer.mozilla.org`),
   click the icon, confirm the phone appears at the lower right with the site rendered in
   its mobile layout. Click again — it disappears with no layout shift on the page.
2. **The page stays whole.** Scroll the desktop page; it scrolls fully behind a stationary
   phone. Nothing about the site's own layout changes.
3. **Live and interactive.** Scroll inside the phone, tap a link, watch the address pill in
   its footer follow along.
4. **Section sync.** Scroll to a mid-page section on the desktop and watch the phone move
   to the same section. Alt-click *Sync section* to turn auto-follow off and on.
5. **Move, scale, finish.** Drag the phone by the grip or by its titanium frame; scale it
   up and down;
   switch to Natural Titanium. Reload the page and click the icon again — the phone
   returns exactly where and how you left it.
6. **Hide the controls.** Click *Hide controls*: the rail goes, leaving the phone, its
   address pill, and one dim chip. Click the chip to bring the controls back.
7. **Exports.** Click *Download promo image*, then open the PNG: the desktop page and the
   phone, no extension controls, at twice the CSS resolution.
8. **Blocked site.** Try a site that refuses framing (for example `https://www.google.com`)
   and confirm the fallback card explains itself and that the pop-out button opens a
   430 × 932 window.
9. **Isolation.** Try a heavily styled site; the overlay's typography, spacing and colours
   are unaffected by the page's CSS.

### Automated tests

Two suites, both dependency-light and both run against the code as shipped.

#### 1. Integration test — real Chrome APIs

`tools/extension-test.mjs` loads the extension **unpacked into a real Chromium profile**
and drives it through the genuine `chrome.scripting`, `chrome.storage` and `chrome.tabs`
APIs — nothing stubbed. It covers the toolbar-click injection and toggle cycle, the
430px preview, the promo export travelling through the service worker's
`captureVisibleTab`, dragging, persistence, and preferences surviving a page reload.

```bash
cd sterling-mobile-mirror
npm i -D playwright && npx playwright install chromium

node tools/extension-test.mjs              # 11 checks
xvfb-run -a node tools/extension-test.mjs  # on a headless machine
```

Chrome refuses to load extensions in the headless shell, so this one needs a display (or
`xvfb-run`). It copies the source to a temp directory and patches two things **in the test
build only**: `host_permissions` (a physical toolbar click, which grants `activeTab`,
cannot be synthesised by any automation API) and an open shadow root (so the rail buttons
can be clicked). The shipped extension keeps `activeTab` and a closed root.

#### 2. Preview harness — the overlay's internals

`tools/preview-harness.mjs` runs the content scripts *as shipped* inside plain Chromium,
standing in for the two extension APIs they touch, then drives every control and writes
screenshots and exported PNGs to `tools/.preview/`.

```bash
node tools/preview-harness.mjs            # normal run — 11 checks
node tools/preview-harness.mjs --blocked  # site sends X-Frame-Options: DENY
node tools/preview-harness.mjs --light    # natural titanium finish
```

Both exit non-zero if any check fails. `tools/fixtures/site.html` is the test page: real
sections, real breakpoints, nothing else.

---

## How it is put together

```
sterling-mobile-mirror/
├── manifest.json                  Manifest V3: activeTab + scripting + storage
├── src/
│   ├── background/
│   │   └── service-worker.js      Toolbar click → inject or toggle; screenshot broker
│   └── content/                   Injected in this order, sharing one isolated scope
│       ├── theme.js               Design tokens + the whole shadow stylesheet
│       ├── device.js              iPhone 15 Pro Max markup, icon set, fallback card
│       ├── sync.js                "Which section am I looking at?" and how to match it
│       ├── promo.js               Capture, crop, rescale, download
│       └── overlay.js             Mount, controls, drag, scale, storage, teardown
├── icons/                         Toolbar icons (regenerate: node tools/make-icons.mjs)
└── tools/
    ├── extension-test.mjs         Real unpacked extension in real Chromium (dev only)
    ├── preview-harness.mjs        Overlay internals in headless Chromium (dev only)
    ├── make-icons.mjs             Dependency-free PNG icon generator
    └── fixtures/site.html         Test page for the harness
```

**Architecture notes**

- The service worker holds no state. MV3 can evict it at any time, so "is the overlay
  open?" is answered by probing the page itself before every toggle.
- The five content scripts are classic scripts sharing one isolated-world namespace
  (`globalThis.__SMM__`); the public toggle lives on
  `globalThis.__STERLING_MOBILE_MIRROR__`.
- The overlay is one `<sterling-mobile-mirror>` element appended to `<html>`, with a
  **closed** shadow root. Structural styles on the host are set `!important` so a page
  cannot hide or move it.
- The phone's layout box is sized to the *scaled* device, so dragging, clamping and
  cropping all work in the same coordinate space at any scale.
- Because the iframe loads the same origin as the page, the extension can read its
  document directly — which is what makes real section sync possible rather than a guess.

---

## Known limits

- Sites that forbid framing show the fallback card. This is a browser-enforced rule; the
  pop-out window is the workaround.
- Chrome does not allow extensions to run on `chrome://` pages, the Chrome Web Store, or
  the PDF viewer. Clicking the icon there flashes `n/a` on the badge.
- The preview reflects **viewport width**, not a mobile user-agent. Sites that switch
  layouts by sniffing the user-agent string rather than by CSS breakpoints will show their
  desktop markup at 430px wide.
- Screenshots capture what is on screen: anything scrolled out of the desktop viewport is
  not in the promo image.

---

## Design

Sterling Creations AI: black glass, white type, hairline edges at 13% white, micro-labels
at 9px with wide tracking. Two accents, used sparingly — **neon pink** `#FF2E88` for active
state, **electric blue** `#2ED4FF` for focus and numerals. The device itself is the only
ornament: brushed titanium band with a hairline edge highlight, black bezel, home
indicator, machined side buttons, and a three-layer shadow that grounds it against the
page.

The Dynamic Island is deliberately absent. It is true to the device, but it lands on top of
the site's own header — the part of a mobile layout people most want to look at — and the
preview is the point, not the prop.

The toolbar mark belongs to the wider Sterling extension family rather than to the
overlay's own palette: a squircle of light neon running pink at the top-left through
violet to electric blue at the bottom-right, glossed from the top-left corner, carrying a
solid white iPhone with the gradient showing through its screen. It is generated, not
drawn by hand — `node tools/make-icons.mjs` re-renders all four sizes from the shape maths
in that file, and the white frame around the screen has a pixel floor so the phone still
reads at 16px.
