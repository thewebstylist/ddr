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
// moment the overlay asks for one — so it proves the rail and plate are
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
    ['Capture phone', 'phone']
  ]) {
    const download = await Promise.all([
      page.waitForEvent('download'),
      control(label).click()
    ]).then(([item]) => item);
    const file = resolve(OUT, `${suffix}.png`);
    await download.saveAs(file);
    const bytes = readFileSync(file);
    check(
      `${label.toLowerCase()} export`,
      bytes.length > 5000,
      `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)} px, ${download.suggestedFilename()}`
    );
  }

  // Scale + persistence.
  await control('Scale up').click();
  await control('Scale up').click();
  await page.waitForTimeout(400);
  const readout = await host.locator('[data-role="scale"]').textContent();
  const stored = await page.evaluate(() => window.__prefs['sterlingMobileMirror.prefs.v1']);
  check('scale control', readout.trim() === '65%', readout.trim());
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
