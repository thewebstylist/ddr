/**
 * Sterling Mobile Mirror — the device itself.
 *
 * Builds the iPhone 15 Pro Max: titanium band, black bezel, machined side
 * buttons, home indicator, and the 430 x 932 screen that hosts the live
 * iframe. Also owns the fallback card shown when a site refuses to be
 * embedded, and the small SVG icon set used by the rail.
 *
 * The Dynamic Island is deliberately absent. It is true to the device, but it
 * sits on top of the site's own header — the one part of a mobile layout
 * people most want to look at — so the screen is left unobstructed.
 */

(() => {
  const SMM = (globalThis.__SMM__ = globalThis.__SMM__ || {});

  /** 16px stroke icons — one path set each, drawn in currentColor. */
  SMM.icons = {
    grip:
      '<circle cx="6.5" cy="4.5" r="1.3"/><circle cx="11.5" cy="4.5" r="1.3"/>' +
      '<circle cx="6.5" cy="9" r="1.3"/><circle cx="11.5" cy="9" r="1.3"/>' +
      '<circle cx="6.5" cy="13.5" r="1.3"/><circle cx="11.5" cy="13.5" r="1.3"/>',
    sync:
      '<path d="M2.6 6.4h7.2M2.6 6.4l2.3-2.3M2.6 6.4l2.3 2.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M15.4 11.6H8.2m7.2 0-2.3-2.3m2.3 2.3-2.3 2.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    refresh:
      '<path d="M14 5.6A6 6 0 1 0 15 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M14.6 2.6v3.4h-3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    plus:
      '<path d="M9 4.4v9.2M4.4 9h9.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    minus:
      '<path d="M4.4 9h9.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    frame:
      '<rect x="5.6" y="2.4" width="6.8" height="13.2" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M7.7 4.6h2.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M12.4 6.2A4.6 4.6 0 0 1 12.4 11.8z" fill="currentColor" opacity=".55"/>',
    shot:
      '<rect x="2.4" y="4.8" width="13.2" height="9.6" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<circle cx="9" cy="9.6" r="2.6" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M6.6 4.8 7.6 3h2.8l1 1.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    promo:
      '<path d="M9 2.6v8.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M5.8 8.2 9 11.4l3.2-3.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M3.2 12.4v1.6a1.4 1.4 0 0 0 1.4 1.4h8.8a1.4 1.4 0 0 0 1.4-1.4v-1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    close:
      '<path d="M5.2 5.2 12.8 12.8M12.8 5.2 5.2 12.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    hide:
      '<path d="M1.9 9S4.7 4.3 9 4.3 16.1 9 16.1 9 13.3 13.7 9 13.7 1.9 9 1.9 9Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<circle cx="9" cy="9" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M3.5 14.5 14.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    external:
      '<path d="M7.4 3.6H4.2A1.6 1.6 0 0 0 2.6 5.2v8.6a1.6 1.6 0 0 0 1.6 1.6h8.6a1.6 1.6 0 0 0 1.6-1.6v-3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M10.6 2.6h4.8v4.8M15.4 2.6 8.6 9.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
  };

  /** Wrap an icon path set in a sized <svg>. */
  SMM.icon = (name) =>
    `<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">${
      SMM.icons[name] || ''
    }</svg>`;

  /**
   * Build the phone.
   * @returns {{root: HTMLElement, screen: HTMLElement, iframe: HTMLIFrameElement,
   *            urlText: HTMLElement, fallback: HTMLElement,
   *            fallbackBody: HTMLElement, retryBtn: HTMLElement,
   *            popoutBtn: HTMLElement}}
   */
  SMM.buildDevice = () => {
    const { width, height } = SMM.SCREEN;
    const { bezel, band } = SMM.FRAME;

    const root = document.createElement('div');
    root.className = 'device';
    root.style.setProperty('--smm-screen-w', `${width}px`);
    root.style.setProperty('--smm-screen-h', `${height}px`);
    root.style.setProperty('--smm-bezel-w', `${bezel}px`);
    root.style.setProperty('--smm-band-w', `${band}px`);

    root.innerHTML = `
      <div class="device__band">
        <span class="btnstack btnstack--action"></span>
        <span class="btnstack btnstack--up"></span>
        <span class="btnstack btnstack--down"></span>
        <span class="btnstack btnstack--power"></span>

        <div class="device__bezel">
          <div class="screen" part="screen">
            <iframe
              class="screen__frame"
              title="Mobile preview"
              referrerpolicy="no-referrer-when-downgrade"
              allow="clipboard-read; clipboard-write; fullscreen"></iframe>

            <div class="screen__glare"></div>

            <div class="urlbar"><span class="urlbar__text" data-role="url"></span></div>
            <div class="home"></div>

            <div class="fallback" role="status">
              <span class="fallback__tag">Live preview blocked</span>
              <h2 class="fallback__title">This site won't allow itself to be framed.</h2>
              <p class="fallback__body" data-role="reason"></p>
              <div class="fallback__actions">
                <button type="button" class="pill pill--primary" data-role="popout">
                  ${SMM.icon('external')} Open 430 &times; 932
                </button>
                <button type="button" class="pill" data-role="retry">
                  ${SMM.icon('refresh')} Retry
                </button>
              </div>
              <p class="fallback__note">
                Nothing is wrong with the extension &mdash; the page is sending
                an <strong>X-Frame-Options</strong> or <strong>Content-Security-Policy</strong>
                header that forbids embedding. The pop-out window is a real
                430 &times; 932 viewport and behaves the same way.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    const q = (sel) => root.querySelector(sel);

    return {
      root,
      screen: q('.screen'),
      iframe: q('.screen__frame'),
      urlText: q('[data-role="url"]'),
      fallback: q('.fallback'),
      fallbackBody: q('[data-role="reason"]'),
      retryBtn: q('[data-role="retry"]'),
      popoutBtn: q('[data-role="popout"]')
    };
  };

  /**
   * Give the framed copy phone-like scrollbars.
   *
   * iOS draws overlay scrollbars; desktop Chrome would draw a solid ~15px
   * gutter inside the phone, which looks wrong and eats into the 430px mobile
   * viewport. The rule is added to the framed copy only — same-origin, gone on
   * reload, and never applied to the page the user is actually on.
   */
  SMM.dressFrame = (doc) => {
    if (!doc || doc.getElementById('smm-frame-chrome')) return;
    const style = doc.createElement('style');
    style.id = 'smm-frame-chrome';
    style.textContent =
      'html { scrollbar-width: none !important; }' +
      '::-webkit-scrollbar { width: 0 !important; height: 0 !important; }';
    (doc.head || doc.documentElement).append(style);
  };

  /** Outer size of the phone at scale 1, chrome excluded. */
  SMM.deviceSize = () => ({
    width: SMM.SCREEN.width + (SMM.FRAME.bezel + SMM.FRAME.band) * 2,
    height: SMM.SCREEN.height + (SMM.FRAME.bezel + SMM.FRAME.band) * 2
  });
})();
