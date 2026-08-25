/* ==========================================================================
   TRISH STEELE — scroll engine
   No dependencies. Every enhancement is additive: hidden states live behind
   .js, so with scripting off the page renders complete and static.
   One rAF loop reads scroll and writes custom properties. Measurement happens
   on load and resize, never inside the loop.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- theme */
  const KEY = 'ts-theme';
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };

  const saved = read();
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;

  const isDark = () => root.dataset.theme
    ? root.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

  $$('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(isDark()));
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      write(next);
      btn.setAttribute('aria-pressed', String(next === 'dark'));
    });
  });

  /* ------------------------------------------------------------------ nav */
  const toggle = $('[data-nav-toggle]');
  const panel  = $('#site-nav');
  if (toggle && panel) {
    const set = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      panel.dataset.open = String(open);
      document.body.style.overflow = open && window.innerWidth <= 960 ? 'hidden' : '';
    };
    toggle.addEventListener('click', () =>
      set(toggle.getAttribute('aria-expanded') !== 'true'));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 960) set(false); });
  }

  /* Mark the current page without hard-coding it into seven files. */
  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__link, .colophon__links a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!href || /^(#|https?:|mailto:|tel:)/.test(href)) return;
    if (href.split('#')[0] === here) a.setAttribute('aria-current', 'page');
  });

  /* -------------------------------------------------------------- reveals */
  const revealables = $$('[data-reveal], [data-wipe]');
  const mark = (el) => {
    if (el.hasAttribute('data-reveal')) el.setAttribute('data-revealed', '');
    if (el.hasAttribute('data-wipe'))   el.setAttribute('data-wiped', '');
  };

  // Elements still waiting. The scroll loop sweeps this list too, because an
  // IntersectionObserver never fires for content you jumped clean over.
  let pending = revealables.slice();

  const sweep = (vh) => {
    if (!pending.length) return;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top >= vh * 0.92) return true;
      mark(el);
      return false;
    });
  };

  if (!('IntersectionObserver' in window) || reduced.matches) {
    revealables.forEach(mark);
    pending = [];
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        mark(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

    revealables.forEach((el) => io.observe(el));

    // Anything already on screen reveals next frame, so it transitions in
    // rather than appearing pre-finished.
    requestAnimationFrame(() => sweep(window.innerHeight));
  }

  /* ------------------------------------------------------------- counters */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduced.matches) {
    const fmt = new Intl.NumberFormat('en-US');
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        cio.unobserve(el);
        const target = Number(el.dataset.count);
        if (!Number.isFinite(target)) return;
        const t0 = performance.now();
        const tick = (now) => {
          const t = clamp((now - t0) / 1700);
          el.textContent = fmt.format(Math.round(target * (1 - Math.pow(1 - t, 4))));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ==================================================================
     THE THREAD
     Measure the path once, hand its length to CSS, then let scroll
     progress retract the dash offset.
     ================================================================== */
  const threadPath = $('.thread-path');
  if (threadPath) {
    const measure = () => {
      try {
        const len = threadPath.getTotalLength();
        if (len > 0) root.style.setProperty('--thread-len', String(Math.ceil(len)));
      } catch { /* getTotalLength unsupported: the ghost route still shows */ }
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  /* ==================================================================
     DEVICE: PAN
     The outer section is as tall as the track is wide, so one screen of
     vertical scroll buys one screen of lateral travel.
     ================================================================== */
  const pans = $$('[data-pan]').map((section) => ({
    section,
    track: $('.pan__track', section),
    distance: 0,
  }));

  const measurePans = () => {
    const lateral = window.innerWidth > 820 && !reduced.matches;
    pans.forEach((p) => {
      if (!p.track) return;
      if (!lateral) {
        p.section.style.height = '';
        p.distance = 0;
        p.track.style.removeProperty('--pan-x');
        return;
      }
      p.distance = Math.max(0, p.track.scrollWidth - window.innerWidth);
      p.section.style.height = `${window.innerHeight + p.distance}px`;
    });
  };

  /* ==================================================================
     DEVICE: PIN
     Progress through the section lights the copy one line at a time.
     ================================================================== */
  const pins = $$('[data-pin]').map((section) => ({
    section,
    lines: $$('.pin__line', section),
  }));

  /* ---------------------------------------------------- the scroll loop */
  const progressBar = $('[data-progress]');
  const masthead    = $('[data-masthead]');
  const parallaxEls = reduced.matches ? [] : $$('[data-parallax]');

  let ticking = false;

  const frame = () => {
    ticking = false;
    const y  = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;
    const pageProgress = max > 0 ? clamp(y / max) : 0;

    sweep(vh);

    if (progressBar) progressBar.style.setProperty('--progress', String(pageProgress));
    if (threadPath)  root.style.setProperty('--thread-draw', String(pageProgress));
    if (masthead)    masthead.dataset.stuck = String(y > 24);

    pans.forEach((p) => {
      if (!p.track || p.distance <= 0) return;
      const top = p.section.offsetTop;
      const t = clamp((y - top) / p.distance);
      p.track.style.setProperty('--pan-x', `${(-t * p.distance).toFixed(1)}px`);
    });

    pins.forEach((p) => {
      if (!p.lines.length) return;
      const rect = p.section.getBoundingClientRect();
      const span = Math.max(1, p.section.offsetHeight - vh);
      const t = clamp(-rect.top / span);
      // Hold the last line lit for the final stretch: the authored silence.
      const lit = Math.floor(t * (p.lines.length + 0.6));
      p.lines.forEach((line, i) => {
        if (i <= lit) line.setAttribute('data-lit', '');
        else line.removeAttribute('data-lit');
      });
    });

    parallaxEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const speed = Number(el.dataset.parallax) || 0.1;
      const centred = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty('--py-shift', `${clamp(-centred * speed * 100, -90, 90).toFixed(1)}px`);
    });
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };

  const onResize = () => { measurePans(); onScroll(); };

  measurePans();
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

  /* ==================================================================
     DEVICE: LIVE SURFACE
     The closing act responds to the pointer instead of to scroll.
     ================================================================== */
  if (!reduced.matches && window.matchMedia('(pointer: fine)').matches) {
    $$('.magnetic-host').forEach((host) => {
      const targets = $$('.magnetic', host);
      let raf = null;
      let mx = 0, my = 0, tx = 0, ty = 0;

      const loop = () => {
        // Critically damped follow: no overshoot, no rubber band.
        mx += (tx - mx) * 0.12;
        my += (ty - my) * 0.12;
        targets.forEach((t) => {
          const k = Number(t.dataset.magnet) || 1;
          t.style.setProperty('--mx', `${(mx * k).toFixed(2)}px`);
          t.style.setProperty('--my', `${(my * k).toFixed(2)}px`);
        });
        if (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) raf = requestAnimationFrame(loop);
        else raf = null;
      };

      const start = () => { if (raf === null) raf = requestAnimationFrame(loop); };

      host.addEventListener('pointermove', (e) => {
        const r = host.getBoundingClientRect();
        host.style.setProperty('--px', `${e.clientX - r.left}px`);
        host.style.setProperty('--py', `${e.clientY - r.top}px`);
        tx = ((e.clientX - r.left) / r.width - 0.5) * 26;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 18;
        host.dataset.live = '';
        start();
      });

      host.addEventListener('pointerleave', () => {
        tx = 0; ty = 0;
        delete host.dataset.live;
        start();
      });
    });
  }

  /* ------------------------------------------------------------- forms */
  $$('form[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.querySelector('[data-form-note]');
      if (note) { note.hidden = false; note.focus(); }
    });
  });
})();
