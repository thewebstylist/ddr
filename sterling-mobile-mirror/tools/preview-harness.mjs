/**
 * Sterling Mobile Mirror — local preview harness (development only).
 *
 * Chrome's own extension surface cannot be scripted from CI, so this harness
 * runs the *content scripts as shipped* inside plain Chromium, standing in for
 * the two extension APIs they touch:
 *
 *   chrome.runtime.sendMessage  -> takes a real screenshot, like the worker does
 *   chrome.storage.sync         -> an in-memory object
 *
 * It then drives every control and writes screenshots and exported PNGs to
 * tools/.preview/ so the overlay can be eyeballed without a browser profile.
 *
 * Requirements: Playwright with a Chromium build.
 *     npm i -D playwright && npx playwright install chromium
 *
 * Usage:
 *     node tools/preview-harness.mjs            # normal run
 *     node tools/preview-harness.mjs --blocked  # site refuses framing
 *     node tools/preview-harness.mjs --light    # natural titanium finish
 */

import { createServer } from 'node:http';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = resolve(HERE, '.preview');

const flags = new Set(process.argv.slice(2));
const BLOCKED = flags.has('--blocked');
const LIGHT = flags.has('--light');

/** Local install first, then anything reachable through NODE_PATH. */
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    /* not a local dependency — try the CommonJS resolver, which honours NODE_PATH */
  }
  try {
    const entry = createRequire(import.meta.url).resolve('playwright');
    const module = await import(pathToFileURL(entry).href);
    return module.chromium ? module : module.default;
  } catch {
    return null;
  }
}

const playwright = await loadPlaywright();
if (!playwright?.chromium) {
  console.error(
    'Playwright is not installed.\n' +
      '  npm i -D playwright && npx playwright install chromium\n' +
      '(or run with NODE_PATH pointing at a global install)'
  );
  process.exit(1);
}
const { chromium } = playwright;

/* --- the content scripts, re-exposed with an open shadow root -------------
 * The extension ships a closed shadow root so pages cannot reach in. The
 * harness needs to click the controls, so it works on a copy whose root is
 * open. Nothing else about the scripts is changed.
 */
const SCRIPTS = ['theme.js', 'device.js', 'sync.js', 'promo.js', 'overlay.js'];
const stage = resolve(tmpdir(), `smm-harness-${process.pid}`);
mkdirSync(stage, { recursive: true });
for (const file of SCRIPTS) {
  const source = readFileSync(resolve(ROOT, 'src/content', file), 'utf8');
  writeFileSync(resolve(stage, file), source.replace("mode: 'closed'", "mode: 'open'"));
}

mkdirSync(OUT, { recursive: true });

const fixture = readFileSync(resolve(HERE, 'fixtures/site.html'));
const server = createServer((request, response) => {
  const headers = { 'content-type': 'text/html; charset=utf-8' };
  if (BLOCKED) headers['x-frame-options'] = 'DENY';
  response.writeHead(200, headers);
  response.end(fixture);
}).listen(0);

const { port } = server.address();
const results = [];
const check = (label, pass, detail = '') => {
  results.push({ label, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  acceptDownloads: true
});
const page = await context.newPage();

// Stand-in for chrome.tabs.captureVisibleTab(): a live frame, taken at the
// moment the overlay asks for one — so it proves the rail and chip are
// hidden during export.
await page.exposeFunction('__grabFrame', async () => (await page.screenshot()).toString('base64'));

await page.addInitScript((light) => {
  const KEY = 'sterlingMobileMirror.prefs.v1';
  const memory = light
    ? { [KEY]: { right: 28, bottom: 28, scale: 0.55, light: true, autoSync: true } }
    : {};
  window.__prefs = memory;
  window.chrome = {
    runtime: {
      lastError: undefined,
      sendMessage: (_message, respond) => {
        window
          .__grabFrame()
          .then((b64) => respond({ ok: true, dataUrl: `data:image/png;base64,${b64}` }));
      }
    },
    storage: {
      sync: {
        get: async () => memory,
        set: async (value) => Object.assign(window.__prefs, value)
      }
    }
  };
}, LIGHT);

await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
for (const file of SCRIPTS) await page.addScriptTag({ path: resolve(stage, file) });
await page.waitForTimeout(BLOCKED ? 2400 : 1600);

const host = page.locator('sterling-mobile-mirror');
const control = (label) => host.locator(`button[aria-label="${label}"]`);

check('overlay mounted', await page.evaluate(() => Boolean(window.__STERLING_MOBILE_MIRROR__?.isOpen)));

// The address pill sits inside the phone's footer and shows the live host.
check(
  'address pill in the footer',
  await page.evaluate(() => {
    const shadow = document.querySelector('sterling-mobile-mirror').shadowRoot;
    const bar = shadow.querySelector('.urlbar');
    const screen = shadow.querySelector('.screen');
    if (!bar || !screen) return false;
    const barBox = bar.getBoundingClientRect();
    const screenBox = screen.getBoundingClientRect();
    const inFooter = barBox.top > screenBox.top + screenBox.height * 0.75;
    const centred = Math.abs((barBox.left + barBox.right) / 2 - (screenBox.left + screenBox.right) / 2) < 2;
    return inFooter && centred &&
      getComputedStyle(bar).pointerEvents === 'none' &&
      bar.textContent.includes('localhost') &&
      !shadow.querySelector('.plate');
  })
);
check(
  BLOCKED ? 'fallback card shown' : 'preview frame is live',
  await page.evaluate((blocked) => {
    const shadow = document.querySelector('sterling-mobile-mirror').shadowRoot;
    const shown = shadow.querySelector('.fallback').classList.contains('is-shown');
    return blocked ? shown : !shown;
  }, BLOCKED)
);

await page.screenshot({ path: resolve(OUT, `overlay${BLOCKED ? '-blocked' : ''}.png`) });

if (!BLOCKED) {
  // Section sync: park a known section in the middle of the desktop viewport.
  await page.evaluate(() => window.scrollTo({ top: document.querySelector('#studio').offsetTop - 200 }));
  await page.waitForTimeout(500);
  await control('Sync section · alt-click: auto-follow').click();
  await page.waitForTimeout(350);
  const toast = await host.locator('.toast').textContent();
  check('section sync', /studio/i.test(toast), toast.trim());

  // Exports.
  for (const [label, suffix] of [
    ['Download promo image', 'promo'],
    ['Phone cut-out · alt-click: no shadow', 'phone']
  ]) {
    const download = await Promise.all([
      page.waitForEvent('download'),
      control(label).click()
    ]).then(([item]) => item);
    const file = resolve(OUT, `${suffix}.png`);
    await download.saveAs(file);
    const bytes = readFileSync(file);
    check(
      `${suffix} export`,
      bytes.length > 5000,
      `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)} px, ${download.suggestedFilename()}`
    );
  }

  // The cut-out must be the phone on transparency: clear at the corners, a
  // soft shadow fading outward, and trimmed so the file ends where the shadow
  // ends — every edge row and column carrying at least one lit pixel.
  const cutout = await page.evaluate(async (b64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${b64}`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    const { width, height } = image;
    const { data } = context.getImageData(0, 0, width, height);
    const alphaAt = (x, y) => data[(Math.round(y) * width + Math.round(x)) * 4 + 3];

    const rowHasInk = (y) => {
      for (let x = 0; x < width; x += 1) if (alphaAt(x, y) !== 0) return true;
      return false;
    };
    const columnHasInk = (x) => {
      for (let y = 0; y < height; y += 1) if (alphaAt(x, y) !== 0) return true;
      return false;
    };

    const shadow = document.querySelector('sterling-mobile-mirror').shadowRoot;
    const rect = shadow.querySelector('.device').getBoundingClientRect();

    return {
      size: [width, height],
      frame: [Math.round(rect.width * 2), Math.round(rect.height * 2)],
      corners: [
        alphaAt(1, 1),
        alphaAt(width - 2, 1),
        alphaAt(1, height - 2),
        alphaAt(width - 2, height - 2)
      ],
      middle: alphaAt(width / 2, height / 2),
      // Halfway down the left margin: shadow, so neither clear nor solid.
      shadowBand: alphaAt(4, height / 2),
      edges: {
        top: rowHasInk(0),
        bottom: rowHasInk(height - 1),
        left: columnHasInk(0),
        right: columnHasInk(width - 1)
      }
    };
  }, readFileSync(resolve(OUT, 'phone.png')).toString('base64'));

  check(
    'cut-out is transparent at the corners',
    cutout.corners.every((alpha) => alpha < 8),
    `corners ${cutout.corners.join('/')}`
  );
  check('phone itself is opaque', cutout.middle === 255, `middle ${cutout.middle}`);
  check(
    'shadow is soft, not solid',
    cutout.shadowBand > 0 && cutout.shadowBand < 235,
    `alpha ${cutout.shadowBand} in the margin`
  );
  check(
    'shadow has room around the frame',
    cutout.size[0] > cutout.frame[0] && cutout.size[1] > cutout.frame[1],
    `${cutout.size.join('x')} around a ${cutout.frame.join('x')} frame`
  );
  check(
    'trimmed to the shadow, no empty margin',
    Object.values(cutout.edges).every(Boolean),
    Object.entries(cutout.edges).map(([side, ink]) => `${side}:${ink ? 'ink' : 'empty'}`).join(' ')
  );

  // Scale + persistence. The size is reported on the button and in a toast,
  // now that the header plate is gone.
  await control('Scale up').click();
  await control('Scale up').click();
  await page.waitForTimeout(400);
  const readout = await host.locator('button[aria-label="Scale up"]').getAttribute('data-tip');
  const stored = await page.evaluate(() => window.__prefs['sterlingMobileMirror.prefs.v1']);
  check('scale control', readout.endsWith('65%'), readout);
  check('preferences persisted', stored?.scale === 0.65, JSON.stringify(stored));

  // Controls can be dismissed down to the phone alone, and brought back.
  await control('Hide controls').click();
  await page.waitForTimeout(350);
  const bare = await page.evaluate(() => {
    const element = document.querySelector('sterling-mobile-mirror');
    const rail = element.shadowRoot.querySelector('.rail');
    return {
      flagged: element.classList.contains('smm-bare'),
      railHidden: getComputedStyle(rail).visibility === 'hidden',
      chipShown: getComputedStyle(element.shadowRoot.querySelector('.ghost')).display !== 'none'
    };
  });
  check('hide controls', bare.flagged && bare.railHidden && bare.chipShown, JSON.stringify(bare));
  await page.screenshot({ path: resolve(OUT, 'overlay-bare.png') });

  await host.locator('.ghost').click();
  await page.waitForTimeout(350);
  check('restore controls', await page.evaluate(
    () => !document.querySelector('sterling-mobile-mirror').classList.contains('smm-bare')));

  // Frame finish flips between black and natural titanium.
  const isLight = () =>
    page.evaluate(() => document.querySelector('sterling-mobile-mirror').classList.contains('smm-light'));
  const before = await isLight();
  await control('Frame finish').click();
  const after = await isLight();
  check('frame finish toggle', before !== after, after ? 'natural titanium' : 'black titanium');
}

// Teardown must leave the page untouched.
await control('Close').click();
await page.waitForTimeout(400);
check(
  'closes without residue',
  await page.evaluate(() => !document.querySelector('sterling-mobile-mirror'))
);

await browser.close();
server.close();
rmSync(stage, { recursive: true, force: true });

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed · screenshots in tools/.preview/`);
process.exit(failed.length ? 1 : 0);
