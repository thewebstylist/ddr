/**
 * Sterling Mobile Mirror — capture and export.
 *
 * A content script cannot screenshot its own tab, so the background worker
 * takes the frame with `chrome.tabs.captureVisibleTab()` (allowed by the
 * `activeTab` grant the toolbar click created) and sends back a PNG data URL.
 * That frame already contains the desktop page *and* the phone overlay drawn
 * on top of it, which is exactly the promo composition we want.
 *
 * Everything below is then just cropping and re-scaling on a canvas: no
 * network, no third-party libraries, nothing leaves the machine.
 */

(() => {
  const SMM = (globalThis.__SMM__ = globalThis.__SMM__ || {});

  /** Target density of exports, in device pixels per CSS pixel. */
  const EXPORT_DENSITY = 2;

  /**
   * The drop shadow baked into the phone cut-out, in CSS pixels at scale 1.
   *
   * The on-screen shadow cannot be captured: `captureVisibleTab` returns it
   * already blended with whatever page was behind it, and there is no way to
   * recover its alpha from that. So the cut-out gets its own, drawn on the
   * canvas — three passes, the way the CSS is layered: a wide ambient fall,
   * a mid body, and a tight contact edge.
   */
  const SHADOW = [
    { blur: 90, offsetY: 46, alpha: 0.34 },
    { blur: 30, offsetY: 14, alpha: 0.26 },
    { blur: 7, offsetY: 2, alpha: 0.22 }
  ];

  /**
   * Room the shadow needs around the phone, in CSS pixels, so the export is
   * cropped to where the shadow actually fades out rather than to a guess.
   */
  SMM.shadowMargin = (scale) => {
    const spread = SHADOW[0].blur * scale;
    const drop = SHADOW[0].offsetY * scale;
    return {
      top: Math.ceil(spread * 0.55),
      right: Math.ceil(spread * 0.8),
      bottom: Math.ceil(spread + drop * 0.5),
      left: Math.ceil(spread * 0.8)
    };
  };

  /** Ask the service worker for a screenshot of the visible viewport. */
  SMM.captureVisible = () =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'SMM_CAPTURE_VISIBLE' }, (response) => {
        const failure = chrome.runtime.lastError?.message;
        if (failure) return reject(new Error(failure));
        if (!response?.ok) return reject(new Error(response?.error || 'Capture failed'));
        resolve(response.dataUrl);
      });
    });

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode the captured frame'));
      image.src = src;
    });

  /** Let the compositor paint before we ask for a frame. */
  const nextPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 90)));
    });

  /**
   * Hide the extension's own chrome (rail, chip, toasts), run `task`, then
   * put everything back — even if `task` throws.
   */
  SMM.withoutChrome = async (host, task) => {
    host.classList.add('smm-capturing');
    try {
      await nextPaint();
      return await task();
    } finally {
      host.classList.remove('smm-capturing');
    }
  };

  /**
   * Crop and rescale a captured frame, then hand back a PNG blob.
   *
   * @param {string} dataUrl  frame from captureVisibleTab
   * @param {{x:number,y:number,width:number,height:number}|null} cropCss
   *        region in CSS pixels of the viewport; null means "whole viewport"
   * @param {{radius?: number, shadowScale?: number}} [options]
   *        `radius` (CSS px) masks the export to a rounded rectangle, leaving
   *        everything outside it fully transparent — a cut-out of the phone
   *        rather than a rectangle with the page showing in its corners.
   *        `shadowScale` draws a soft drop shadow into the alpha channel and
   *        grows the canvas to fit it.
   */
  SMM.composePng = async (dataUrl, cropCss, { radius = 0, shadowScale = 0 } = {}) => {
    const frame = await loadImage(dataUrl);

    // captureVisibleTab returns device pixels; work out the real ratio from
    // the frame itself rather than trusting devicePixelRatio.
    const ratio = frame.width / (window.innerWidth || frame.width);

    const region = cropCss || {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };

    const sx = Math.max(0, Math.round(region.x * ratio));
    const sy = Math.max(0, Math.round(region.y * ratio));
    const sw = Math.min(frame.width - sx, Math.round(region.width * ratio));
    const sh = Math.min(frame.height - sy, Math.round(region.height * ratio));

    // Never downscale: export at 2x CSS pixels, or native density if higher.
    const density = Math.max(EXPORT_DENSITY, ratio);
    const margin = shadowScale > 0
      ? SMM.shadowMargin(shadowScale)
      : { top: 0, right: 0, bottom: 0, left: 0 };

    const out = document.createElement('canvas');
    out.width = Math.round((region.width + margin.left + margin.right) * density);
    out.height = Math.round((region.height + margin.top + margin.bottom) * density);

    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Where the phone itself lands on the canvas.
    const left = Math.round(margin.left * density);
    const top = Math.round(margin.top * density);
    const width = Math.round(region.width * density);
    const height = Math.round(region.height * density);
    const corner = radius * density;

    // Pull the mask in by a hair: the outermost row of captured pixels is the
    // frame blended against whatever was behind it, and that fringe would read
    // as a halo once the cut-out is placed on another colour.
    const inset = radius > 0 ? Math.max(1, Math.round(density * 0.75)) : 0;
    const silhouette = (path) => {
      path.beginPath();
      path.roundRect(
        left + inset,
        top + inset,
        width - inset * 2,
        height - inset * 2,
        Math.max(0, corner - inset)
      );
    };

    if (shadowScale > 0) {
      for (const layer of SHADOW) {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${layer.alpha})`;
        ctx.shadowBlur = layer.blur * shadowScale * density;
        ctx.shadowOffsetY = layer.offsetY * shadowScale * density;
        ctx.fillStyle = '#000';
        silhouette(ctx);
        ctx.fill();
        ctx.restore();
      }

      // Each pass also filled the phone's own footprint with solid black.
      // Punch that back out along the very same path, so the phone lands in a
      // hole shaped exactly like itself and leaves no dark rim behind.
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      silhouette(ctx);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (radius > 0) {
      silhouette(ctx);
      ctx.clip();
    }
    ctx.drawImage(frame, sx, sy, sw, sh, left, top, width, height);
    ctx.restore();

    return new Promise((resolve, reject) => {
      out.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
        'image/png'
      );
    });
  };

  /** Save a blob through a throwaway object URL. */
  SMM.download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(link);
    link.click();
    // The page is left exactly as we found it.
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  };

  /** sterling-mobile-mirror-example-com-20260825-1412.png */
  SMM.exportName = (suffix) => {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 12)
      .replace(/(\d{8})(\d{4})/, '$1-$2');
    const site = location.hostname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    return `sterling-mobile-mirror-${site || 'page'}-${suffix}-${stamp}.png`;
  };
})();
