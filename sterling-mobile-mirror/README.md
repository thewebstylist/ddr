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
  actual page, not a screenshot.
- **Stays put while you scroll.** The phone is fixed to the viewport; the desktop page
  scrolls behind it.
- **Follows the section you're reading.** As you scroll the desktop page, the extension
  works out which section sits nearest the middle of your viewport and scrolls the phone
  to the matching section.
- **Exports the whole composition.** "Download promo image" saves the desktop page *and*
  the phone together as a high-resolution PNG, with the extension's own controls hidden.
- **Remembers how you like it.** Position, scale and frame finish persist across pages and
  sessions through `chrome.storage`.
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

They sit in a compact rail down the left edge of the phone. Hover any button for its name.

| Control | What it does |
|---|---|
| **Move** (grip) | Drag the phone anywhere in the viewport. The header plate is also a drag handle. |
| **Sync section** | Scrolls the phone to the section nearest the centre of the desktop viewport. **Alt-click** turns auto-follow on/off (it starts on; the button glows pink while active). |
| **Reload** | Reloads whatever the phone is currently showing. **Alt-click** re-mirrors the desktop page's current URL — useful after navigating inside the phone. |
| **Scale up / down** | Resizes the phone in 5% steps, from 30% to 100%. The percentage shows in the header plate. |
| **Frame finish** | Switches between **Black Titanium** and **Natural Titanium**. |
| **Capture phone** | Saves a high-resolution PNG of just the phone and its shadow. |
| **Download promo image** | Saves the whole visible composition — desktop page plus phone — as a high-resolution PNG. |
| **Close** | Removes the overlay. `Esc` also works while focus is inside the overlay. |

The header plate above the phone shows the brand mark, the URL currently loaded inside the
phone, and the current scale.

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
window, "Download promo image" produces a 2880 × 1800 PNG. Files land in your normal
Chrome downloads folder, named like:

```
sterling-mobile-mirror-example-com-promo-20260825-1412.png
sterling-mobile-mirror-example-com-phone-20260825-1412.png
```

The rail, the header plate and any toast are hidden for the duration of the capture, so
exports show only the artwork.

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
3. **Live and interactive.** Scroll inside the phone, tap a link, watch the header plate's
   URL follow along.
4. **Section sync.** Scroll to a mid-page section on the desktop and watch the phone move
   to the same section. Alt-click *Sync section* to turn auto-follow off and on.
5. **Move, scale, finish.** Drag the phone by the grip or the plate; scale it up and down;
   switch to Natural Titanium. Reload the page and click the icon again — the phone
   returns exactly where and how you left it.
6. **Exports.** Click *Download promo image*, then open the PNG: the desktop page and the
   phone, no extension controls, at twice the CSS resolution.
7. **Blocked site.** Try a site that refuses framing (for example `https://www.google.com`)
   and confirm the fallback card explains itself and that the pop-out button opens a
   430 × 932 window.
8. **Isolation.** Try a heavily styled site; the overlay's typography, spacing and colours
   are unaffected by the page's CSS.

### Automated harness

`tools/preview-harness.mjs` runs the content scripts *as shipped* inside plain Chromium,
standing in for the two extension APIs they touch, then drives every control and writes
screenshots and exported PNGs to `tools/.preview/`.

```bash
cd sterling-mobile-mirror
npm i -D playwright && npx playwright install chromium

node tools/preview-harness.mjs            # normal run — 9 checks
node tools/preview-harness.mjs --blocked  # site sends X-Frame-Options: DENY
node tools/preview-harness.mjs --light    # natural titanium finish
```

It exits non-zero if any check fails. `tools/fixtures/site.html` is the test page: real
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
    ├── preview-harness.mjs        Headless Chromium harness (dev only)
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
ornament: brushed titanium band with a hairline edge highlight, black bezel, Dynamic
Island, home indicator, machined side buttons, and a three-layer shadow that grounds it
against the page.
