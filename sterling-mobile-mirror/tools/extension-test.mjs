/**
 * Sterling Mobile Mirror — integration test against real Chrome APIs.
 *
 * Loads the extension unpacked into a real Chromium profile and drives it
 * through `chrome.scripting`, `chrome.storage` and `chrome.tabs` for real.
 * Nothing is stubbed; the preview harness (preview-harness.mjs) covers the
 * overlay's internals, this covers the extension surface around it.
 *
 * Two allowances are made in the *test build only* — the shipped source is
 * copied to a temp directory and patched there:
 *
 *   1. `host_permissions: ["<all_urls>"]`, because `activeTab` is granted by a
 *      physical toolbar click that no automation API can synthesise.
 *   2. an open shadow root, so the test can click the rail buttons.
 *
 * Requirements: Playwright with Chromium, and a display (or xvfb-run) —
 * extensions do not load in the headless shell.
 *
 * Usage:
 *     xvfb-run -a node tools/extension-test.mjs
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, cpSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = resolve(HERE, '.preview');

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    /* fall through to the CommonJS resolver, which honours NODE_PATH */
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
  console.error('Playwright is not installed.\n  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

/* --- test build ---------------------------------------------------------- */

const ext = mkdtempSync(resolve(tmpdir(), 'smm-ext-'));
cpSync(ROOT, ext, {
  recursive: true,
  filter: (source) => !source.includes('.preview') && !source.includes('node_modules')
});

const manifest = JSON.parse(readFileSync(resolve(ext, 'manifest.json'), 'utf8'));
manifest.host_permissions = ['<all_urls>'];
writeFileSync(resolve(ext, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const overlay = resolve(ext, 'src/content/overlay.js');
writeFileSync(overlay, readFileSync(overlay, 'utf8').replace("mode: 'closed'", "mode: 'open'"));

mkdirSync(OUT, { recursive: true });

/* --- fixture server ------------------------------------------------------ */

const fixture = readFileSync(resolve(HERE, 'fixtures/site.html'));
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(fixture);
}).listen(0);
const { port } = server.address();

/* --- run ----------------------------------------------------------------- */

const results = [];
const check = (label, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
};

const profile = mkdtempSync(resolve(tmpdir(), 'smm-profile-'));
const context = await playwright.chromium.launchPersistentContext(profile, {
  headless: false,
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-sandbox']
});

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
check('service worker registered', Boolean(worker), worker.url());

const page = context.pages()[0] || (await context.newPage());
await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
await page.bringToFront();

/** Stand in for the physical toolbar click by running its handler. */
const clickToolbarIcon = async () => {
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await toggleOverlay(tab);
  });
  await page.waitForTimeout(1800);
};

const host = page.locator('sterling-mobile-mirror');
const control = (label) => host.locator(`button[aria-label="${label}"]`);
const mounted = () => page.evaluate(() => Boolean(document.querySelector('sterling-mobile-mirror')));

await clickToolbarIcon();
check('toolbar click injects the overlay', await mounted());
check(
  'overlay is live in the isolated world',
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => Boolean(globalThis.__STERLING_MOBILE_MIRROR__?.isOpen)
    });
    return probe.result;
  })
);
check(
  'preview renders the site at 430px',
  await page.evaluate(() => {
    const frame = document.querySelector('sterling-mobile-mirror').shadowRoot.querySelector('iframe');
    const doc = frame.contentDocument;
    return doc && frame.clientWidth === 430 && doc.body.childElementCount > 0;
  })
);
check(
  'desktop scrollbars hidden inside the phone',
  await page.evaluate(() => {
    const frame = document.querySelector('sterling-mobile-mirror').shadowRoot.querySelector('iframe');
    const doc = frame.contentDocument;
    return Boolean(doc?.getElementById('smm-frame-chrome')) &&
      doc.documentElement.clientWidth === 430;
  })
);

await page.screenshot({ path: resolve(OUT, 'extension.png') });

// Export, through the real service worker and chrome.tabs.captureVisibleTab.
const download = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  control('Download promo image').click()
]).then(([item]) => item);
const promoFile = resolve(OUT, 'extension-promo.png');
await download.saveAs(promoFile);
const bytes = readFileSync(promoFile);
check(
  'promo export end to end',
  bytes.length > 20000,
  `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)} px, ${download.suggestedFilename()}`
);

// Drag by the rail's grip: pointer events reach the shadow UI, and the
// position is persisted.
const before = await host.boundingBox();
const grip = await control('Move').boundingBox();
await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
await page.mouse.down();
await page.mouse.move(grip.x + grip.width / 2 - 200, grip.y + grip.height / 2 - 100, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(600);
const after = await host.boundingBox();
check(
  'drag moves the phone',
  before.x - after.x > 150 && before.y - after.y > 60,
  `${Math.round(before.x - after.x)}px left, ${Math.round(before.y - after.y)}px up`
);

const stored = await worker.evaluate(() => chrome.storage.sync.get('sterlingMobileMirror.prefs.v1'));
check(
  'preferences written to chrome.storage.sync',
  Number.isFinite(stored?.['sterlingMobileMirror.prefs.v1']?.right),
  JSON.stringify(stored['sterlingMobileMirror.prefs.v1'])
);

// Toggle off and on again from the toolbar.
await clickToolbarIcon();
check('second click closes it', !(await mounted()));
await clickToolbarIcon();
check('third click re-opens it', await mounted());

// An extension reload orphans the content scripts already running in open
// tabs: their globals survive, chrome.runtime does not. Simulate that leftover
// and confirm a click replaces it instead of calling into the dead copy.
await worker.evaluate(async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      globalThis.__STERLING_MOBILE_MIRROR__.close();
      const orphan = document.createElement('sterling-mobile-mirror');
      orphan.dataset.orphan = 'yes';
      document.documentElement.append(orphan);
      globalThis.__STERLING_MOBILE_MIRROR__ = {
        version: '0.0.0-previous-build',
        alive: () => false,
        toggle() { throw new Error('the stale build was called'); },
        close() { throw new Error('the stale build was called'); }
      };
    }
  });
});
await page.waitForTimeout(400);
await clickToolbarIcon();
check(
  'stale build from an extension reload is replaced',
  (await mounted()) &&
    (await page.evaluate(() => !document.querySelector('[data-orphan]'))) &&
    (await page.evaluate(() => window.__STERLING_MOBILE_MIRROR__ === undefined ||
      document.querySelectorAll('sterling-mobile-mirror').length === 1))
);

// Preferences survive a page reload and a fresh injection.
await page.reload({ waitUntil: 'load' });
await clickToolbarIcon();
const restored = await host.boundingBox();
check(
  'position restored after reload',
  Math.abs(restored.x - after.x) < 4 && Math.abs(restored.y - after.y) < 4,
  `${Math.round(restored.x)},${Math.round(restored.y)}`
);
await page.screenshot({ path: resolve(OUT, 'extension-restored.png') });

await context.close();
server.close();
rmSync(ext, { recursive: true, force: true });
rmSync(profile, { recursive: true, force: true });

const failed = results.filter((pass) => !pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed · screenshots in tools/.preview/`);
process.exit(failed ? 1 : 0);
