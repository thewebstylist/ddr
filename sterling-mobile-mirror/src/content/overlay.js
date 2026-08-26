/**
 * Sterling Mobile Mirror — overlay orchestrator.
 *
 * Mounts a closed Shadow DOM on top of the current page and wires up the
 * device, the control rail, dragging, scaling, persistence and export.
 *
 * Design rules this file keeps to:
 *   - The page is never modified permanently. One custom element is appended;
 *     closing removes it and every listener it registered.
 *   - The page cannot restyle us: the UI lives behind a closed shadow root and
 *     the few structural properties on the host element are set !important.
 *   - Nothing is remembered but three preferences (position, scale, frame
 *     finish) plus the auto-follow flag, in chrome.storage.
 */

(() => {
  const SMM = (globalThis.__SMM__ = globalThis.__SMM__ || {});

  /** This build's version, read from the manifest so it can never drift. */
  const VERSION = (() => {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return 'unknown';
    }
  })();

  // Re-injection guard.
  //
  // A live module of this same build just toggles — that is the normal second
  // click. Anything else is a leftover from a previous build (an extension
  // reload orphans content scripts without refreshing the page), so it is
  // retired and replaced rather than called into.
  const previous = globalThis.__STERLING_MOBILE_MIRROR__;
  if (previous) {
    if (previous.version === VERSION && previous.alive?.()) {
      previous.toggle();
      return;
    }
    try {
      previous.close();
    } catch {
      /* the stale copy may be half dead; its DOM is swept below regardless */
    }
  }

  const HOST_TAG = 'sterling-mobile-mirror';
  const PREFS_KEY = 'sterlingMobileMirror.prefs.v1';

  const DEFAULTS = {
    right: 72,      // distance from the right edge of the viewport, px
    bottom: 28,     // distance from the bottom edge, px
    scale: SMM.SCALE.default,
    light: false,   // false = Black Titanium, true = Natural Titanium
    autoSync: true, // follow the desktop scroll position
    bare: false     // controls dismissed, leaving only the phone
  };

  /** Live state; a copy is persisted on every settled change. */
  let prefs = { ...DEFAULTS };

  /** DOM handles, all null while the overlay is closed. */
  let host = null;
  let shadow = null;
  let stage = null;
  let rail = null;
  let plate = null;
  let plateHost = null;
  let plateScale = null;
  let toast = null;
  let ghost = null;
  let device = null;
  let buttons = {};

  let isOpen = false;
  let frameStatus = 'idle'; // idle | loading | live | blocked
  let loadTimer = 0;
  let toastTimer = 0;
  let saveTimer = 0;
  let syncTimer = 0;
  let syncFrame = 0;

  /** Everything added to the page or window, so unmount can undo it exactly. */
  const bindings = [];

  const bind = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    bindings.push(() => target.removeEventListener(type, handler, options));
  };

  const unbindAll = () => {
    while (bindings.length) bindings.pop()();
  };

  /* ------------------------------------------------------------------ *
   * Preferences
   * ------------------------------------------------------------------ */

  const area = () => {
    try {
      return chrome.storage?.sync || chrome.storage?.local || null;
    } catch {
      return null;
    }
  };

  /** @returns {Promise<boolean>} true when saved preferences were restored. */
  async function loadPrefs() {
    const store = area();
    if (!store) return false;
    try {
      const stored = await store.get(PREFS_KEY);
      if (!stored?.[PREFS_KEY]) return false;
      prefs = { ...DEFAULTS, ...stored[PREFS_KEY] };
      return true;
    } catch {
      /* first run, or storage unavailable — defaults are fine */
      return false;
    }
  }

  function savePrefs() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const store = area();
      if (!store) return;
      store.set({ [PREFS_KEY]: { ...prefs } }).catch(() => {});
    }, 220);
  }

  /* ------------------------------------------------------------------ *
   * Host element
   * ------------------------------------------------------------------ */

  /** Structural styles the page must not be able to override. */
  function pinHost(styles) {
    for (const [property, value] of Object.entries(styles)) {
      host.style.setProperty(property, value, 'important');
    }
  }

  function createHost() {
    // Sweep any overlay left behind by a previous build of this extension.
    for (const orphan of document.querySelectorAll(HOST_TAG)) orphan.remove();

    host = document.createElement(HOST_TAG);
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Sterling Mobile Mirror');

    pinHost({
      position: 'fixed',
      display: 'block',
      margin: '0',
      padding: '0',
      border: '0',
      'z-index': '2147483646',
      'color-scheme': 'dark',
      'pointer-events': 'auto'
    });

    shadow = host.attachShadow({ mode: 'closed' });

    const styles = document.createElement('style');
    styles.textContent = SMM.CSS;
    shadow.append(styles);

    stage = document.createElement('div');
    stage.className = 'stage';
    shadow.append(stage);
  }

  /* ------------------------------------------------------------------ *
   * Chrome: plate (header + drag handle) and rail (controls)
   * ------------------------------------------------------------------ */

  function buildPlate() {
    plate = document.createElement('div');
    plate.className = 'plate';
    plate.title = 'Drag to reposition';
    plate.innerHTML = `
      <span class="plate__mark"></span>
      <span class="plate__name">Mobile Mirror</span>
      <span class="plate__rule"></span>
      <span class="plate__host" data-role="host"></span>
      <span class="plate__rule"></span>
      <span class="plate__scale" data-role="scale">55%</span>
    `;
    plateHost = plate.querySelector('[data-role="host"]');
    plateScale = plate.querySelector('[data-role="scale"]');

    bind(plate, 'pointerdown', startDrag);
    stage.append(plate);
  }

  function railButton({ name, icon, tip, className = '', onClick }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${className}`.trim();
    button.dataset.tip = tip;
    button.setAttribute('aria-label', tip);
    button.innerHTML = SMM.icon(icon);
    if (onClick) bind(button, 'click', onClick);
    buttons[name] = button;
    return button;
  }

  function buildRail() {
    rail = document.createElement('div');
    rail.className = 'rail';

    const grip = railButton({
      name: 'grip',
      icon: 'grip',
      tip: 'Move',
      className: 'is-grip'
    });
    bind(grip, 'pointerdown', startDrag);

    const separator = () => {
      const line = document.createElement('div');
      line.className = 'rail__sep';
      return line;
    };

    rail.append(
      grip,
      separator(),
      railButton({
        name: 'sync',
        icon: 'sync',
        tip: 'Sync section · alt-click: auto-follow',
        className: prefs.autoSync ? 'is-on' : '',
        onClick: onSyncClick
      }),
      railButton({
        name: 'refresh',
        icon: 'refresh',
        tip: 'Reload · alt-click: re-mirror this page',
        onClick: reloadFrame
      }),
      separator(),
      railButton({ name: 'zoomIn', icon: 'plus', tip: 'Scale up', onClick: () => nudgeScale(+1) }),
      railButton({ name: 'zoomOut', icon: 'minus', tip: 'Scale down', onClick: () => nudgeScale(-1) }),
      railButton({ name: 'frame', icon: 'frame', tip: 'Frame finish', onClick: toggleFinish }),
      separator(),
      railButton({ name: 'shot', icon: 'shot', tip: 'Capture phone', onClick: capturePhone }),
      railButton({ name: 'promo', icon: 'promo', tip: 'Download promo image', onClick: capturePromo }),
      separator(),
      railButton({ name: 'bare', icon: 'hide', tip: 'Hide controls', onClick: () => setBare(true) }),
      railButton({ name: 'close', icon: 'close', tip: 'Close', className: 'is-danger', onClick: () => close() })
    );

    stage.append(rail);
  }

  /**
   * With the controls dismissed the phone stands alone, so one quiet chip is
   * left where the rail was — dim until hovered, and the only way back.
   */
  function buildGhost() {
    ghost = document.createElement('button');
    ghost.type = 'button';
    ghost.className = 'ghost';
    ghost.dataset.tip = 'Show controls';
    ghost.setAttribute('aria-label', 'Show controls');
    ghost.innerHTML = '<span class="ghost__mark"></span>';
    bind(ghost, 'click', () => setBare(false));
    stage.append(ghost);
  }

  /** Dismiss or restore the rail and the plate. */
  function setBare(bare) {
    prefs.bare = bare;
    host.classList.toggle('smm-bare', bare);
    if (!bare) notify('Controls restored');
    savePrefs();
  }

  function buildToast() {
    toast = document.createElement('div');
    toast.className = 'toast';
    stage.append(toast);
  }

  function notify(message, { error = false } = {}) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('is-error', error);
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 2600);
  }

  /* ------------------------------------------------------------------ *
   * Layout: scale, clamping, position
   * ------------------------------------------------------------------ */

  function stageSize() {
    const size = SMM.deviceSize();
    return {
      width: Math.round(size.width * prefs.scale),
      height: Math.round(size.height * prefs.scale)
    };
  }

  function clampPosition(width, height) {
    // The rail hangs off the right edge of the phone and the plate above its
    // top edge; both have to stay on screen. The gutters are reserved even
    // while the controls are hidden, so restoring them never shifts the phone.
    const railGutter = (rail?.offsetWidth || 44) + 12;
    const plateGutter = (plate?.offsetHeight || 30) + 14;

    const minRight = railGutter + 16;
    const maxRight = Math.max(minRight, window.innerWidth - width - 8);
    const maxBottom = Math.max(8, window.innerHeight - height - plateGutter - 8);

    prefs.right = Math.min(Math.max(minRight, Math.round(prefs.right)), maxRight);
    prefs.bottom = Math.min(Math.max(8, Math.round(prefs.bottom)), maxBottom);
  }

  function applyLayout() {
    const { width, height } = stageSize();
    clampPosition(width, height);

    device.root.style.transform = `scale(${prefs.scale})`;
    pinHost({
      width: `${width}px`,
      height: `${height}px`,
      right: `${prefs.right}px`,
      bottom: `${prefs.bottom}px`,
      left: 'auto',
      top: 'auto'
    });

    if (plateScale) plateScale.textContent = `${Math.round(prefs.scale * 100)}%`;
    host.classList.toggle('smm-light', prefs.light);
    host.classList.toggle('smm-bare', prefs.bare);
  }

  /** A first-run scale that guarantees the phone fits the current window. */
  function fittedScale() {
    const size = SMM.deviceSize();
    const room = window.innerHeight - 86;
    return Math.max(
      SMM.SCALE.min,
      Math.min(SMM.SCALE.default, Math.round((room / size.height) * 100) / 100)
    );
  }

  function nudgeScale(direction) {
    const next = Math.round((prefs.scale + direction * SMM.SCALE.step) * 100) / 100;
    prefs.scale = Math.min(SMM.SCALE.max, Math.max(SMM.SCALE.min, next));
    applyLayout();
    savePrefs();
  }

  function toggleFinish() {
    prefs.light = !prefs.light;
    host.classList.toggle('smm-light', prefs.light);
    notify(prefs.light ? 'Natural titanium' : 'Black titanium');
    savePrefs();
  }

  /* ------------------------------------------------------------------ *
   * Dragging
   * ------------------------------------------------------------------ */

  function startDrag(event) {
    if (event.button !== 0) return;
    event.preventDefault();

    const handle = event.currentTarget;
    const originX = event.clientX;
    const originY = event.clientY;
    const originRight = prefs.right;
    const originBottom = prefs.bottom;

    // Pointer capture keeps the drag alive over the iframe and over any part
    // of the page that would otherwise swallow the events.
    handle.setPointerCapture?.(event.pointerId);
    device.iframe.style.pointerEvents = 'none';

    const move = (moveEvent) => {
      prefs.right = originRight - (moveEvent.clientX - originX);
      prefs.bottom = originBottom - (moveEvent.clientY - originY);
      applyLayout();
    };

    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      handle.releasePointerCapture?.(event.pointerId);
      device.iframe.style.pointerEvents = '';
      savePrefs();
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  /* ------------------------------------------------------------------ *
   * The preview frame
   * ------------------------------------------------------------------ */

  function currentUrl() {
    return location.href;
  }

  function showFallback(reason) {
    frameStatus = 'blocked';
    device.fallbackBody.innerHTML = reason;
    device.fallback.classList.add('is-shown');
  }

  function hideFallback() {
    device.fallback.classList.remove('is-shown');
  }

  function loadFrame(url = currentUrl()) {
    hideFallback();
    frameStatus = 'loading';
    device.iframe.src = url;

    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      if (!isOpen || !device) return;
      if (frameStatus !== 'live') {
        showFallback(
          '<strong>' +
            escapeHtml(location.hostname) +
            '</strong> did not finish rendering inside the frame. Sites often ' +
            'stall embedded copies of themselves on purpose.'
        );
      }
    }, 5000);
  }

  /**
   * Plain click reloads whatever the phone is showing — the user may have
   * navigated inside it. Alt-click re-mirrors the desktop page's current URL.
   */
  function reloadFrame(event) {
    const button = buttons.refresh;
    button.classList.add('is-busy');
    setTimeout(() => button.classList.remove('is-busy'), 900);

    const doc = SMM.frameDoc(device.iframe);
    if (event?.altKey || !doc) {
      loadFrame();
      if (event?.altKey) notify('Re-mirrored this page');
      return;
    }
    doc.location.reload();
  }

  function onFrameLoad() {
    clearTimeout(loadTimer);

    // Give the error page a tick to settle before deciding.
    setTimeout(() => {
      if (!isOpen || !device) return;
      if (SMM.frameIsLive(device.iframe)) {
        frameStatus = 'live';
        hideFallback();
        SMM.dressFrame(SMM.frameDoc(device.iframe));
        updatePlateHost();
        if (prefs.autoSync) syncSection({ quiet: true });
      } else {
        showFallback(
          'The response carried an <strong>X-Frame-Options</strong> or ' +
            '<strong>frame-ancestors</strong> rule that forbids embedding, so the ' +
            'browser refused to render it here.'
        );
      }
    }, 80);
  }

  function updatePlateHost() {
    const doc = SMM.frameDoc(device.iframe);
    const url = doc ? doc.location : location;
    const path = url.pathname === '/' ? '' : url.pathname;
    plateHost.textContent = `${url.hostname}${path}`;
    plateHost.title = url.href;
  }

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])
    );

  /* ------------------------------------------------------------------ *
   * Section sync
   * ------------------------------------------------------------------ */

  function syncSection({ quiet = false } = {}) {
    if (!isOpen || !device) return;
    if (frameStatus !== 'live') {
      if (!quiet) notify('Preview is not live — nothing to sync', { error: true });
      return;
    }

    const anchor = SMM.describeViewportAnchor();
    const result = SMM.applyAnchor(device.iframe, anchor);

    if (quiet) return;
    if (result === 'matched') notify(`Synced to “${anchor.label}”`);
    else if (result === 'approximate') notify('Synced by scroll depth');
    else notify('Preview is not reachable', { error: true });
  }

  function onSyncClick(event) {
    if (event.altKey) {
      prefs.autoSync = !prefs.autoSync;
      buttons.sync.classList.toggle('is-on', prefs.autoSync);
      notify(prefs.autoSync ? 'Auto-follow on' : 'Auto-follow off');
      savePrefs();
      if (prefs.autoSync) syncSection({ quiet: true });
      return;
    }
    syncSection();
  }

  /** Desktop scroll → mobile scroll, throttled to a frame and settled at 140ms. */
  function onDesktopScroll() {
    if (!prefs.autoSync || frameStatus !== 'live') return;
    if (syncFrame) return;

    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => syncSection({ quiet: true }), 140);
    });
  }

  /* ------------------------------------------------------------------ *
   * Capture
   * ------------------------------------------------------------------ */

  /** Viewport rectangle of the phone, padded so its shadow is included. */
  function phoneRegion() {
    const rect = device.root.getBoundingClientRect();
    const pad = 34;
    const x = Math.max(0, rect.left - pad);
    const y = Math.max(0, rect.top - pad);
    return {
      x,
      y,
      width: Math.min(window.innerWidth - x, rect.width + pad * 2),
      height: Math.min(window.innerHeight - y, rect.height + pad * 2)
    };
  }

  async function runCapture(button, region, suffix, message) {
    button.classList.add('is-busy');
    try {
      const blob = await SMM.withoutChrome(host, async () => {
        const frame = await SMM.captureVisible();
        return SMM.composePng(frame, region);
      });
      SMM.download(blob, SMM.exportName(suffix));
      notify(message);
    } catch (error) {
      notify(`Capture failed: ${error.message}`, { error: true });
    } finally {
      button.classList.remove('is-busy');
    }
  }

  const capturePhone = () =>
    runCapture(buttons.shot, phoneRegion(), 'phone', 'Phone capture saved');

  const capturePromo = () =>
    runCapture(buttons.promo, null, 'promo', 'Promo image saved');

  /* ------------------------------------------------------------------ *
   * Mount / unmount
   * ------------------------------------------------------------------ */

  /**
   * Mount the overlay. Any failure here is reported rather than swallowed:
   * a click that appears to do nothing is the worst possible symptom.
   */
  async function open() {
    if (isOpen) return;
    try {
      await mount();
    } catch (error) {
      reportFailure(error);
    }
  }

  /**
   * Tear down whatever was half-built, then tell the service worker why, so
   * the failure reaches the toolbar badge, the icon's tooltip and the console
   * instead of dying quietly in the isolated world.
   */
  function reportFailure(error) {
    console.error('[Sterling Mobile Mirror] the overlay could not open:', error);

    try {
      unbindAll();
      host?.remove();
    } catch {
      /* nothing left to clean up */
    }

    host = shadow = stage = rail = plate = device = null;
    plateHost = plateScale = toast = ghost = null;
    buttons = {};
    isOpen = false;
    frameStatus = 'idle';

    try {
      chrome.runtime.sendMessage({
        type: 'SMM_FAILED',
        reason: `Could not open on this page — ${error?.message || error}`
      });
    } catch {
      /* the worker may be gone; the console message stands */
    }
  }

  async function mount() {
    const restored = await loadPrefs();
    createHost();

    device = SMM.buildDevice();
    stage.append(device.root);

    buildPlate();
    buildRail();
    buildGhost();
    buildToast();

    // A saved scale always wins; on a first run, fit the phone to this window.
    if (!restored || !Number.isFinite(prefs.scale)) prefs.scale = fittedScale();
    prefs.scale = Math.min(SMM.SCALE.max, Math.max(SMM.SCALE.min, prefs.scale));

    document.documentElement.append(host);
    applyLayout();
    isOpen = true;

    plateHost.textContent = location.hostname;

    bind(device.iframe, 'load', onFrameLoad);
    bind(device.retryBtn, 'click', () => loadFrame());
    bind(device.popoutBtn, 'click', openPopout);
    bind(document, 'scroll', onDesktopScroll, { passive: true, capture: true });
    bind(window, 'resize', applyLayout);
    bind(document, 'securitypolicyviolation', onCspViolation);
    bind(document, 'keydown', onKeyDown, true);

    loadFrame();
  }

  function onCspViolation(event) {
    if (!isOpen) return;
    if (!String(event.violatedDirective || '').startsWith('frame-src')) return;
    clearTimeout(loadTimer);
    showFallback(
      "This page's own <strong>Content-Security-Policy</strong> (frame-src) forbids " +
        'loading it inside a frame, so the live preview cannot be rendered here.'
    );
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape' || !isOpen) return;
    // Only when the focus is genuinely inside the overlay, so we never steal
    // Escape from the page itself.
    if (!event.composedPath().includes(host)) return;
    event.stopPropagation();
    close();
  }

  function openPopout() {
    const { width, height } = SMM.SCREEN;
    window.open(
      currentUrl(),
      'sterling-mobile-mirror',
      `popup=yes,width=${width},height=${height},left=${Math.max(0, screen.availWidth - width - 60)},top=60`
    );
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;

    clearTimeout(loadTimer);
    clearTimeout(toastTimer);
    clearTimeout(syncTimer);
    if (syncFrame) cancelAnimationFrame(syncFrame);
    unbindAll();

    // Hold on to the outgoing nodes so that re-opening during the exit
    // animation cannot have its fresh overlay torn down by this timer.
    const outgoingHost = host;
    const outgoingStage = stage;

    host = shadow = stage = rail = plate = device = null;
    plateHost = plateScale = toast = ghost = null;
    buttons = {};
    frameStatus = 'idle';

    // Play the exit animation, then leave the page exactly as we found it.
    outgoingStage.classList.add('is-leaving');
    setTimeout(() => outgoingHost.remove(), 190);
  }

  function toggle() {
    // Deliberately returns nothing: the service worker injects this call, and
    // a returned promise would surface a page-side error as an injection
    // failure. Failures report themselves through reportFailure() instead.
    if (isOpen) close();
    else void open();
  }

  /* ------------------------------------------------------------------ *
   * Public surface — the service worker calls toggle() on later clicks
   * ------------------------------------------------------------------ */

  globalThis.__STERLING_MOBILE_MIRROR__ = {
    version: VERSION,
    /** False once an extension reload has orphaned this copy. */
    alive: () => {
      try {
        return Boolean(chrome.runtime?.id);
      } catch {
        return false;
      }
    },
    toggle,
    open,
    close,
    get isOpen() {
      return isOpen;
    }
  };

  // First injection mounts immediately: the user already clicked.
  open();
})();
