/**
 * Sterling Mobile Mirror — background service worker (Manifest V3).
 *
 * Responsibilities, deliberately kept small:
 *
 *   1. Toolbar click  →  inject (or toggle) the overlay in the active tab.
 *      Nothing is injected until the user clicks, so the extension holds no
 *      host permissions at all: the click grants `activeTab` for that tab.
 *
 *   2. Screenshot broker — `chrome.tabs.captureVisibleTab()` is not available
 *      to content scripts, so the overlay asks for a frame through a message
 *      and the worker hands back a PNG data URL.
 *
 * The worker is stateless: MV3 can evict it at any moment, so "is the overlay
 * open?" is answered by the page itself (see `probe()` below) rather than by
 * anything remembered here.
 */

/**
 * URL schemes no extension may script. Chrome refuses injection on these, so
 * they get a plain explanation rather than a generic failure.
 */
const RESTRICTED = [
  { test: /^chrome:/i, why: 'Chrome blocks extensions on chrome:// pages.' },
  { test: /^edge:/i, why: 'The browser blocks extensions on edge:// pages.' },
  { test: /^about:/i, why: 'Chrome blocks extensions on about: pages.' },
  { test: /^devtools:/i, why: 'Chrome blocks extensions inside DevTools.' },
  { test: /^view-source:/i, why: 'Chrome blocks extensions on view-source: pages.' },
  { test: /^(chrome|moz)-extension:/i, why: 'Extensions cannot script other extensions.' },
  { test: /^file:/i, why: 'Allow file:// access for this extension in chrome://extensions first.' },
  {
    test: /^https:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/i,
    why: 'Chrome blocks extensions on the Web Store.'
  }
];

/** Content scripts, injected in order. They share one isolated-world scope. */
const OVERLAY_FILES = [
  'src/content/theme.js',   // design tokens + stylesheet text
  'src/content/device.js',  // iPhone 15 Pro Max frame markup
  'src/content/sync.js',    // "which section am I looking at?" logic
  'src/content/promo.js',   // capture + PNG composition
  'src/content/overlay.js'  // orchestrator: mount, controls, drag, scale, storage
];

/* ------------------------------------------------------------------ *
 * Toolbar click
 * ------------------------------------------------------------------ */

/**
 * The whole of the toolbar-click behaviour, named so it can be exercised
 * directly from the service-worker context by the integration test.
 * @param {chrome.tabs.Tab} tab the tab the user clicked on
 */
async function toggleOverlay(tab) {
  if (!tab?.id) return;

  const blocked = RESTRICTED.find((rule) => tab.url && rule.test.test(tab.url));
  if (blocked) return report(tab.id, 'n/a', blocked.why);

  try {
    // Ask the page whether a *live* overlay module is resident.
    //
    // Reloading or updating an extension orphans the content scripts already
    // running in open tabs: their globals survive, but chrome.runtime does
    // not. Calling into that dead copy fails on every click until the tab is
    // refreshed, so a module without a working runtime counts as absent and
    // gets replaced by a fresh injection.
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          const module = globalThis.__STERLING_MOBILE_MIRROR__;
          if (!module || !chrome.runtime?.id) return null;
          return module.version || 'unknown';
        } catch {
          return null;
        }
      }
    });

    const resident = probe?.result === chrome.runtime.getManifest().version;

    if (resident) {
      // Already loaded — just flip it on/off, no re-injection.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => globalThis.__STERLING_MOBILE_MIRROR__.toggle()
      });
    } else {
      // First click on this document: inject, and the module mounts itself.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: OVERLAY_FILES
      });
    }
  } catch (error) {
    // Anything else — a page Chrome will not let us script, a navigation
    // mid-injection, an error thrown by the overlay itself. Say which.
    const message = String(error?.message || error);
    const restricted = /cannot access|must request permission|cannot be scripted/i.test(message);
    report(tab.id, restricted ? 'n/a' : 'err', message);
  }
}

/**
 * Surface a failure where the user can actually find it: the toolbar badge,
 * the icon's hover text, and the service-worker console. Silent failure is
 * what makes an extension feel broken rather than blocked.
 */
function report(tabId, badge, message) {
  console.error(`[Sterling Mobile Mirror] ${message}`);

  chrome.action.setTitle({ tabId, title: `Sterling Mobile Mirror — ${message}` }).catch(() => {});
  flashBadge(tabId, badge);

  setTimeout(() => {
    chrome.action
      .setTitle({ tabId, title: 'Sterling Mobile Mirror — toggle iPhone preview' })
      .catch(() => {});
  }, 12000);
}

chrome.action.onClicked.addListener(toggleOverlay);

/** Show a short-lived badge message on the toolbar icon. */
async function flashBadge(tabId, text) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#FF2E88' });
    await chrome.action.setBadgeText({ tabId, text });
    setTimeout(() => chrome.action.setBadgeText({ tabId, text: '' }), 2600);
  } catch {
    /* tab may already be gone */
  }
}

/* ------------------------------------------------------------------ *
 * Screenshot broker
 * ------------------------------------------------------------------ */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // The overlay reporting its own failure from inside the page.
  if (message?.type === 'SMM_FAILED') {
    if (sender.tab?.id) report(sender.tab.id, 'err', message.reason || 'The overlay failed to open.');
    sendResponse({ ok: true });
    return undefined;
  }

  if (message?.type !== 'SMM_CAPTURE_VISIBLE') return undefined;

  const windowId = sender.tab?.windowId;
  chrome.tabs
    .captureVisibleTab(windowId, { format: 'png' })
    .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));

  return true; // keep the message channel open for the async reply
});
