/* ==========================================================================
   TRISH STEELE — site behaviour
   No dependencies. Every enhancement is additive: the hidden states live
   behind .js, so with scripting off the page renders whole and static.
   One rAF loop reads scroll and writes custom properties.
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
  const readTheme  = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const writeTheme = (v) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };

  const saved = readTheme();
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;

  const isDark = () => root.dataset.theme
    ? root.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

  $$('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(isDark()));
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      writeTheme(next);
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
      document.body.style.overflow = open && window.innerWidth <= 1000 ? 'hidden' : '';
    };
    toggle.addEventListener('click', () =>
      set(toggle.getAttribute('aria-expanded') !== 'true'));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1000) set(false); });
  }

  /* Mark the current page rather than hard-coding it into seven files. */
  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__link, .foot__links a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!href || /^(#|https?:|mailto:|tel:)/.test(href)) return;
    if (href.split('#')[0] === here) a.setAttribute('aria-current', 'page');
  });

  /* -------------------------------------------------------------- reveals */
  const revealables = $$('[data-reveal]');
  let pending = revealables.slice();

  const mark = (el) => el.setAttribute('data-revealed', '');

  // The observer never fires for anything the reader jumps clean over, so the
  // scroll loop sweeps whatever is left as well.
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
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    revealables.forEach((el) => io.observe(el));
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
          if (t < 1) {
            el.textContent = fmt.format(Math.round(target * (1 - Math.pow(1 - t, 4))));
            requestAnimationFrame(tick);
          } else {
            // Land on the exact figure. Easing toward it can stop a hair short,
            // and a philanthropy number that reads 1,998 is simply wrong.
            el.textContent = fmt.format(target);
          }
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------------------------------------------------- the gold draw
     A highlighted word inside a heading that is not itself a reveal target
     still needs its underline to draw. Observe those directly. */
  const draws = $$('.draw').filter((d) => !d.closest('[data-reveal]'));
  if (draws.length && 'IntersectionObserver' in window && !reduced.matches) {
    const dio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('draw--on');
        dio.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    draws.forEach((d) => dio.observe(d));
  } else {
    draws.forEach((d) => d.classList.add('draw--on'));
  }

  /* ------------------------------------------------------- the scroll loop */
  const progressBar = $('[data-progress]');
  const nav         = $('[data-nav]');
  const parallaxEls = reduced.matches ? [] : $$('[data-parallax]');
  let ticking = false;

  const frame = () => {
    ticking = false;
    const y  = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;

    sweep(vh);

    if (progressBar) {
      progressBar.style.setProperty('--progress', max > 0 ? String(clamp(y / max)) : '0');
    }
    if (nav) nav.dataset.stuck = String(y > 16);

    parallaxEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const speed = Number(el.dataset.parallax) || 0.1;
      const centred = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty('--py', `${clamp(-centred * speed * 100, -90, 90).toFixed(1)}px`);
    });
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ------------------------------------------------------ the live surface */
  if (!reduced.matches && window.matchMedia('(pointer: fine)').matches) {
    $$('.magnet-host').forEach((host) => {
      const targets = $$('.magnet', host);
      let raf = null, mx = 0, my = 0, tx = 0, ty = 0;

      const loop = () => {
        // Critically damped follow: no overshoot, no rubber band.
        mx += (tx - mx) * 0.12;
        my += (ty - my) * 0.12;
        targets.forEach((t) => {
          const k = Number(t.dataset.magnet) || 1;
          t.style.setProperty('--mx', `${(mx * k).toFixed(2)}px`);
          t.style.setProperty('--my', `${(my * k).toFixed(2)}px`);
        });
        raf = (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1)
          ? requestAnimationFrame(loop) : null;
      };
      const start = () => { if (raf === null) raf = requestAnimationFrame(loop); };

      host.addEventListener('pointermove', (e) => {
        const r = host.getBoundingClientRect();
        host.style.setProperty('--px', `${e.clientX - r.left}px`);
        host.style.setProperty('--py-pos', `${e.clientY - r.top}px`);
        tx = ((e.clientX - r.left) / r.width - 0.5) * 22;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 14;
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

  /* ------------------------------------------------------------------ forms
     Static build: no endpoint is wired. Rather than silently doing nothing,
     say so. Replace this with the real handler when the endpoint exists. */
  $$('form[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = form.querySelector('[data-form-note]');
      if (note) { note.hidden = false; note.focus(); }
    });
  });
})();
