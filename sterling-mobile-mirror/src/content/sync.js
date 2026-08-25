/**
 * Sterling Mobile Mirror — section synchronisation.
 *
 * The idea: whatever block of the desktop page sits closest to the middle of
 * the viewport is what the user is "looking at". We describe that block in a
 * way the copy inside the phone can recognise (a CSS path, its id, its heading
 * text, plus how far down the document it sits) and scroll the mobile view to
 * the match.
 *
 * The iframe loads the *same* URL as the host page, so it is same-origin and
 * we can read its document directly. When it is not reachable (a site that
 * refuses framing), every function here degrades to a no-op.
 */

(() => {
  const SMM = (globalThis.__SMM__ = globalThis.__SMM__ || {});

  /** Elements that usually mark a real "section" of a page. */
  const CANDIDATES = [
    'section', 'article', 'main > div', 'main > *', 'header', 'footer',
    '[data-section]', '[role="region"]', 'div[class*="section" i]',
    'div[class*="hero" i]', 'div[class*="block" i]', 'h1', 'h2', 'h3'
  ].join(',');

  const MAX_NODES = 1200;

  /** Same-origin document inside the phone, or null when unreachable. */
  SMM.frameDoc = (iframe) => {
    try {
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) return null;
      return doc;
    } catch {
      return null;
    }
  };

  /** True when the frame holds a real, rendered document (not an error page). */
  SMM.frameIsLive = (iframe) => {
    const doc = SMM.frameDoc(iframe);
    if (!doc) return false;
    if (doc.location.href === 'about:blank') return false;
    return doc.body.childElementCount > 0 || doc.body.textContent.trim().length > 0;
  };

  const isRendered = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 24) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  };

  /**
   * A CSS path that survives the trip into the iframe: an id when we have a
   * unique one, otherwise nth-of-type steps up to the nearest id or <body>.
   */
  function selectorFor(el) {
    const esc = (value) => (window.CSS && CSS.escape ? CSS.escape(value) : value);

    if (el.id && el.ownerDocument.querySelectorAll(`#${esc(el.id)}`).length === 1) {
      return `#${esc(el.id)}`;
    }

    const steps = [];
    let node = el;

    while (node && node.nodeType === 1 && node !== node.ownerDocument.body && steps.length < 8) {
      if (node.id && node.ownerDocument.querySelectorAll(`#${esc(node.id)}`).length === 1) {
        steps.unshift(`#${esc(node.id)}`);
        return steps.join(' > ');
      }

      const tag = node.tagName.toLowerCase();
      const sameTag = Array.from(node.parentNode?.children || []).filter(
        (sibling) => sibling.tagName === node.tagName
      );
      steps.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(node) + 1})` : tag);
      node = node.parentElement;
    }

    return steps.length ? `body > ${steps.join(' > ')}` : null;
  }

  /** First heading-ish string inside an element, trimmed and collapsed. */
  function headingOf(el) {
    const heading = /^H[1-6]$/.test(el.tagName) ? el : el.querySelector('h1, h2, h3, h4');
    const text = (heading?.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length > 2 && text.length < 120 ? text : '';
  }

  /**
   * Describe the block nearest the centre of the desktop viewport.
   * @returns {{selector: string|null, heading: string, ratio: number, label: string}}
   */
  SMM.describeViewportAnchor = () => {
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const centre = viewportH / 2;

    const doc = document.documentElement;
    const scrollable = Math.max(1, doc.scrollHeight - viewportH);
    const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));

    let best = null;
    let bestScore = Infinity;

    const nodes = document.querySelectorAll(CANDIDATES);
    const limit = Math.min(nodes.length, MAX_NODES);

    for (let i = 0; i < limit; i += 1) {
      const el = nodes[i];
      const rect = el.getBoundingClientRect();

      // Must overlap the viewport and be a plausible "section", not a wrapper
      // that spans the whole document.
      if (rect.bottom < 0 || rect.top > viewportH) continue;
      if (rect.height > viewportH * 4) continue;
      if (!isRendered(el)) continue;

      const elCentre = rect.top + rect.height / 2;
      const distance = Math.abs(elCentre - centre);

      // Prefer tight blocks over sprawling ones, and headings over containers
      // only when they are genuinely closer.
      const bulk = (rect.height / viewportH) * 36;
      const score = distance + bulk;

      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (!best) return { selector: null, heading: '', ratio, label: 'top of page' };

    const heading = headingOf(best);
    return {
      selector: selectorFor(best),
      heading,
      ratio,
      label: heading || best.id || best.tagName.toLowerCase()
    };
  };

  /** Find the matching element inside the phone's document. */
  function matchInFrame(doc, anchor) {
    if (anchor.selector) {
      try {
        const direct = doc.querySelector(anchor.selector);
        if (direct) return direct;
      } catch {
        /* selector unusable in the other document — fall through */
      }
    }

    if (anchor.heading) {
      const wanted = anchor.heading.toLowerCase();
      const headings = doc.querySelectorAll('h1, h2, h3, h4, [role="heading"]');
      for (const heading of headings) {
        const text = (heading.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (text && (text === wanted || text.startsWith(wanted) || wanted.startsWith(text))) {
          return heading;
        }
      }
    }

    return null;
  }

  /**
   * Scroll the phone to the section described by `anchor`.
   * @returns {'matched'|'approximate'|'unavailable'}
   */
  SMM.applyAnchor = (iframe, anchor, { smooth = true } = {}) => {
    const doc = SMM.frameDoc(iframe);
    if (!doc) return 'unavailable';

    const win = doc.defaultView;
    const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'smooth'
      : 'auto';

    const target = matchInFrame(doc, anchor);
    const maxScroll = Math.max(0, doc.documentElement.scrollHeight - win.innerHeight);

    if (target) {
      const rect = target.getBoundingClientRect();
      const top = Math.min(maxScroll, Math.max(0, rect.top + win.scrollY - 28));
      win.scrollTo({ top, behavior });
      return 'matched';
    }

    // No structural match (heavily re-ordered mobile markup, for example):
    // fall back to the same relative depth in the document.
    win.scrollTo({ top: Math.round(maxScroll * anchor.ratio), behavior });
    return 'approximate';
  };
})();
