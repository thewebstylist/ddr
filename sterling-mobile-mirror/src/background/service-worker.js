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

  try {
    // Ask the page whether our overlay module is already resident.
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => Boolean(globalThis.__STERLING_MOBILE_MIRROR__)
    });

    if (probe?.result) {
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
    // chrome://, the Web Store, PDF viewers and similar are off-limits to
    // every extension. Say so on the badge instead of failing silently.
    console.warn('[Sterling Mobile Mirror] injection blocked:', error);
    await flashBadge(tab.id, 'n/a');
  }
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
  if (message?.type !== 'SMM_CAPTURE_VISIBLE') return undefined;

  const windowId = sender.tab?.windowId;
  chrome.tabs
    .captureVisibleTab(windowId, { format: 'png' })
    .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));

  return true; // keep the message channel open for the async reply
});
