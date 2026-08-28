/* ============================================================================
   SCROLL VIDEO TEMPLATE — engine
   ----------------------------------------------------------------------------
   A scroll-scrubbed film behind pinned type, with an instrument HUD reading a
   value that climbs or falls with the scroll.

   The page is built entirely from one config object. Nothing here is
   site-specific: brand, copy, colours, fonts, the film, the units on the
   readout and the zones it passes through all arrive as data.

       ScrollVideo.mount(config)

   or set `window.SCROLL_VIDEO_CONFIG` before this file loads and it mounts
   itself. See README.md for every key.
   ========================================================================== */
(function (global) {
  'use strict'

  /* ---------------------------------------------------------------- utils */

  const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v)
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
  const lerp = (a, b, t) => a + (b - a) * t

  /* Arrays replace wholesale — a preset that lists four panels means four, not
     four merged onto the default six. Objects merge key by key. */
  function merge (base, over) {
    if (!isPlain(base) || !isPlain(over)) return over === undefined ? base : over
    const out = Object.assign({}, base)
    for (const k of Object.keys(over)) out[k] = isPlain(base[k]) ? merge(base[k], over[k]) : over[k]
    return out
  }

  const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

  function toRgb (c) {
    if (typeof c !== 'string') return null
    const s = c.trim()
    let m = /^#([0-9a-f]{3})$/i.exec(s)
    if (m) return m[1].split('').map((h) => parseInt(h + h, 16))
    m = /^#([0-9a-f]{6})$/i.exec(s)
    if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255] }
    m = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2]] }
    return null
  }
  function alpha (c, a) {
    const rgb = toRgb(c)
    return rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})` : c
  }
  function mixRgb (a, b, t) {
    return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`
  }

  /* Copy shorthand, so presets stay readable prose:
       **bold**  -> bright emphasis
       *accent*  -> accent colour, not italic
       `stat`    -> mono accent figure
     Raw HTML passes straight through. Config is authored, not user input. */
  function fmt (s) {
    if (s == null) return ''
    return String(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<span class="sv-stat">$1</span>')
  }

  function el (tag, cls, html) {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (html != null) n.innerHTML = html
    return n
  }

  const ready = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn()

  /* ------------------------------------------------------------- defaults */

  const DEFAULTS = {
    seo: {
      lang: 'en',
      title: '',
      description: '',
      siteName: '',
      ogTitle: null,          // falls back to title
      ogDescription: null,    // falls back to description
      ogImage: '',
      ogImageAlt: '',
      ogImageWidth: 1200,
      ogImageHeight: 630,
      twitterCard: 'summary_large_image',
      themeColor: null        // falls back to theme.bg
    },

    fonts: {
      /* One stylesheet URL — Google Fonts, or any host. Set to null and supply
         your own @font-face in a stylesheet of your own. */
      href: null,
      preconnect: []
    },

    /* Every key becomes a CSS custom property: `accentDim` -> `--sv-accent-dim`.
       Anything template.css declares can be overridden from here. */
    theme: {
      bg: '#000000',
      ink: '#e9f3f6',
      muted: '#7ea6b5',
      accent: '#3ce6ff',
      ctaInk: '#00131a',
      panelBg: 'rgba(1,5,10,.72)',
      vignette: 'rgba(0,0,0,.55)'
      /* mutedDim / accentDim / accentFaint / accentWash / loadbarBg are derived
         from `muted` and `accent` unless you set them explicitly. */
    },

    scroll: {
      length: '900vh',   // height of the scroll track: longer = slower scrub
      smoothing: 0.14    // 0..1 easing toward the scroll position; 1 = no easing
    },

    brand: {
      show: true,
      word: '',
      tagline: '',
      logo: null,        // { src, alt, height }
      href: null
    },

    /* Top-right block. Array of lines, copy shorthand applies. */
    mission: [],

    /* Bottom-left instrument rows: [[{k,v},{k,v}], [...]].
       `v` may be a string, or fn(progress, value, zone) for a live reading. */
    status: { show: true, rows: [] },

    /* The big number. */
    readout: {
      show: true,
      from: 0,
      to: 100,
      unit: '',
      pad: 0,            // zero-pad the integer part to this width
      decimals: 0,
      format: null,      // fn(value, progress) -> string, wins over pad/decimals
      showZone: true
    },

    /* Progress rail down one edge. */
    rail: {
      show: true,
      side: 'right',
      min: null,         // defaults to readout.from
      max: null,         // defaults to readout.to
      ticks: null,       // explicit values, or null to generate from `step`
      step: 500,
      majorEvery: 1000,
      unit: null         // defaults to readout.unit
    },

    /* [ {at:[p0,p1], value:[v0,v1], label:'…'} ] — also accepts the flat
       array form [p0, p1, v0, v1, 'LABEL']. Omit and the value runs linearly
       from readout.from to readout.to. */
    zones: [],

    cue: { show: true, text: 'SCROLL' },

    corners: true,

    stage: {
      fit: 'cover',           // 'cover' | 'contain'
      gradeBlend: 'multiply', // 'multiply' suits dark films, 'screen' light ones
      gradeOpacity: 0.55,
      /* Colour the film is washed with as you travel: [progress, colour]. */
      grade: [],
      vignette: true
    },

    media: {
      /* THE PREFERRED SOURCE. A frame sequence scrubs perfectly: no seeking, no
         codec to negotiate, no autoplay policy, and the same behaviour in every
         browser. Either an explicit list of URLs, or a pattern:
             frames: { pattern: 'frames/f-{i}.webp', count: 180, pad: 4 }
         Frames are fetched coarse-to-fine, so the scrub works long before the
         last one lands. When this is set, `tiers` is never touched. */
      frames: null,

      /* Fallback for when you only have a video. The first tier that decodes
         wins. A tier is one URL (a single stitched film) or an array of clips
         played back to back. A single-URL tier gets baked to frames at runtime
         — which is this doing at load time, badly, what `frames` does properly
         at build time. */
      tiers: [],
      /* Boundary stills, crossfaded when no tier decodes — and shown
         immediately while the film downloads. Clip N runs still N -> N+1. */
      keyframes: [],
      poster: null,
      /* Single-file tiers get baked to frames in the background: far smoother
         scrubbing than seeking a video element. */
      bake: true,
      crossOrigin: 'anonymous',  // needed to bake; set null if your CDN sends no CORS headers
      bakeFps: 3,
      bakeWidth: 1280,
      bakeQuality: 0.72
    },

    loader: {
      show: true,
      word: null,        // defaults to brand.word
      logo: null,        // defaults to brand.logo
      message: 'Loading',
      ready: 'Ready',
      timeout: 12000     // never trap anyone behind a stalled download
    },

    /* The pinned sections. Each is:
       { id, eyebrow, heading, level, body, specs, specColumns, lines, cta,
         fine, align, width, at:[fadeIn, full, holdEnd, gone], persist } */
    panels: []
  }

  /* -------------------------------------------------------------- head/DOM */

  function applyHead (cfg) {
    const seo = cfg.seo
    if (seo.lang) document.documentElement.lang = seo.lang
    if (seo.title) document.title = seo.title

    const head = document.head
    const has = (sel) => head.querySelector(sel)
    const meta = (attr, key, content) => {
      if (!content) return
      if (has(`meta[${attr}="${key}"]`)) return   // a static tag in the HTML wins
      const m = document.createElement('meta')
      m.setAttribute(attr, key)
      m.setAttribute('content', String(content))
      head.appendChild(m)
    }

    meta('name', 'description', seo.description)
    meta('name', 'theme-color', seo.themeColor || cfg.theme.bg)
    meta('property', 'og:type', 'website')
    meta('property', 'og:site_name', seo.siteName)
    meta('property', 'og:title', seo.ogTitle || seo.title)
    meta('property', 'og:description', seo.ogDescription || seo.description)
    meta('property', 'og:image', seo.ogImage)
    meta('property', 'og:image:alt', seo.ogImageAlt)
    if (seo.ogImage) {
      meta('property', 'og:image:width', seo.ogImageWidth)
      meta('property', 'og:image:height', seo.ogImageHeight)
    }
    meta('name', 'twitter:card', seo.twitterCard)
    meta('name', 'twitter:title', seo.ogTitle || seo.title)
    meta('name', 'twitter:description', seo.ogDescription || seo.description)
    meta('name', 'twitter:image', seo.ogImage)

    const links = [].concat(cfg.fonts.preconnect || [])
    if (cfg.fonts.href && !links.length && /fonts\.googleapis\.com/.test(cfg.fonts.href)) {
      links.push('https://fonts.googleapis.com', 'https://fonts.gstatic.com')
    }
    links.forEach((href) => {
      if (has(`link[rel="preconnect"][href="${href}"]`)) return
      const l = document.createElement('link')
      l.rel = 'preconnect'
      l.href = href
      if (/gstatic/.test(href)) l.crossOrigin = ''
      head.appendChild(l)
    })
    if (cfg.fonts.href && !has(`link[href="${cfg.fonts.href}"]`)) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = cfg.fonts.href
      head.appendChild(l)
    }
  }

  function applyTheme (theme) {
    const t = Object.assign({}, theme)
    if (t.accent) {
      if (!t.accentDim) t.accentDim = alpha(t.accent, 0.38)
      if (!t.accentFaint) t.accentFaint = alpha(t.accent, 0.14)
      if (!t.accentWash) t.accentWash = alpha(t.accent, 0.05)
    }
    if (t.muted) {
      if (!t.mutedDim) t.mutedDim = alpha(t.muted, 0.45)
      if (!t.loadbarBg) t.loadbarBg = alpha(t.muted, 0.25)
    }
    const root = document.documentElement.style
    for (const k of Object.keys(t)) {
      if (t[k] == null) continue
      root.setProperty('--sv-' + kebab(k), String(t[k]))
    }
  }

  /* ---------------------------------------------------------------- panels */

  /* Block order inside a panel. The big `lines` sit above the explanatory
     `body` by default — statement first, reasoning second. Override per panel
     with `order: ['eyebrow','heading','body','lines','cta']`. */
  const BLOCKS = ['eyebrow', 'heading', 'lines', 'body', 'specs', 'cta', 'fine']

  function buildPanel (p, index) {
    const panel = el('section', 'sv-panel' + (p.align && p.align !== 'left' ? ' sv-panel-' + p.align : ''))
    if (p.id) panel.id = 'sv-' + p.id
    const inner = el('div', 'sv-inner')
    if (p.width) inner.style.maxWidth = typeof p.width === 'number' ? p.width + 'px' : p.width

    const block = {
      eyebrow () {
        if (p.eyebrow) inner.appendChild(el('div', 'sv-eyebrow', fmt(p.eyebrow)))
      },
      heading () {
        if (!p.heading) return
        const level = p.level || (index === 0 ? 1 : 2)
        inner.appendChild(el('h' + level, 'sv-heading', fmt(p.heading)))
      },
      body () {
        if (p.body == null) return
        ;[].concat(p.body).forEach((b) => inner.appendChild(el('p', 'sv-lede', fmt(b))))
      },
      specs () {
        if (!p.specs || !p.specs.length) return
        const grid = el('div', 'sv-specs')
        grid.style.gridTemplateColumns = `repeat(${p.specColumns || 2},1fr)`
        p.specs.forEach((s) => {
          const cell = el('div', 'sv-spec')
          cell.appendChild(el('div', 'sv-spec-k', fmt(s.k)))
          cell.appendChild(el('div', 'sv-spec-v', fmt(s.v)))
          grid.appendChild(cell)
        })
        inner.appendChild(grid)
      },
      /* Either ['a','b'] — a row each — or [['a','b'],['c']] to sit two
         phrases on the same baseline. */
      lines () {
        if (!p.lines || !p.lines.length) return
        p.lines.forEach((row) => {
          const wrap = el('div', 'sv-lines')
          ;[].concat(row).forEach((s) => wrap.appendChild(el('span', 'sv-line', fmt(s))))
          inner.appendChild(wrap)
        })
      },
      cta () {
        if (!p.cta || !p.cta.label) return
        const a = el('a', 'sv-cta')
        a.href = p.cta.href || '#'
        if (p.cta.target) a.target = p.cta.target
        a.innerHTML = fmt(p.cta.label)
        if (p.cta.arrow !== false) a.appendChild(el('span', 'sv-cta-arrow', p.cta.arrow || '\u21A7'))
        if (typeof p.cta.onClick === 'function') {
          a.addEventListener('click', (e) => { if (p.cta.onClick(e) === false) e.preventDefault() })
        }
        inner.appendChild(a)
      },
      fine () {
        if (p.fine) inner.appendChild(el('div', 'sv-fine', fmt(p.fine)))
      }
    }

    ;(p.order || BLOCKS).forEach((name) => { if (block[name]) block[name]() })

    panel.appendChild(inner)
    return panel
  }

  /* Panels without explicit `at` share the track evenly: a short fade in, a
     long hold, a short fade out. The first opens on load, the last stays. */
  function timings (panels) {
    const n = panels.length || 1
    return panels.map((p, i) => {
      if (Array.isArray(p.at) && p.at.length === 4) return p.at.slice()
      const s = i / n, span = 1 / n
      let a = s + span * 0.05, b = s + span * 0.24, c = s + span * 0.80, d = s + span * 0.97
      if (i === 0) { a = -0.01; b = 0 }
      if (i === n - 1) { c = 1; d = 1.01 }
      return [a, b, c, d]
    })
  }

  /* ----------------------------------------------------------------- mount */

  function mount (userConfig) {
    const cfg = merge(DEFAULTS, userConfig || {})
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    applyHead(cfg)
    applyTheme(cfg.theme)
    document.body.classList.add('sv-body')

    /* Everything this mount creates is tracked, so destroy() can put the page
       back exactly as it found it — the studio preview remounts in place on
       every edit and must not leak a HUD per keystroke. */
    const owned = []
    const listeners = []
    const add = (node) => { owned.push(node); document.body.appendChild(node); return node }
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts)
      listeners.push([target, type, fn, opts])
    }

    /* ---- stage ---- */
    const stage = el('div', 'sv-stage')
    stage.setAttribute('aria-hidden', 'true')
    const canvas = el('canvas', 'sv-film')
    const grade = el('div', 'sv-grade')
    grade.style.mixBlendMode = cfg.stage.gradeBlend
    stage.appendChild(canvas)
    stage.appendChild(grade)
    if (cfg.stage.vignette) stage.appendChild(el('div', 'sv-vignette'))
    add(stage)
    const ctx = canvas.getContext('2d')

    /* ---- HUD ---- */
    if (cfg.corners) {
      ;['tl', 'tr', 'bl', 'br'].forEach((c) =>
        add(el('div', 'sv-hud sv-corner sv-corner-' + c)))
    }

    if (cfg.brand.show && (cfg.brand.word || cfg.brand.logo)) {
      const b = el('div', 'sv-hud sv-brand')
      let mark
      if (cfg.brand.logo && cfg.brand.logo.src) {
        mark = el('img', 'sv-brand-logo')
        mark.src = cfg.brand.logo.src
        mark.alt = cfg.brand.logo.alt || cfg.brand.word || 'Logo'
        mark.style.height = (cfg.brand.logo.height || 22) + 'px'
      } else {
        mark = el('span', 'sv-brand-word', cfg.brand.word)
      }
      if (cfg.brand.href) {
        const a = el('a')
        a.href = cfg.brand.href
        a.style.cssText = 'pointer-events:auto;text-decoration:none;color:inherit;display:block'
        a.appendChild(mark)
        b.appendChild(a)
      } else {
        b.appendChild(mark)
      }
      if (cfg.brand.tagline) b.appendChild(el('span', 'sv-brand-tagline', fmt(cfg.brand.tagline)))
      add(b)
    }

    if (cfg.mission && cfg.mission.length) {
      add(el('div', 'sv-hud sv-mission', cfg.mission.map(fmt).join('<br>')))
    }

    /* Status rows keep a handle on every <b> so live values only touch text. */
    const liveCells = []
    if (cfg.status.show && cfg.status.rows.length) {
      const box = el('div', 'sv-hud sv-status')
      cfg.status.rows.forEach((row) => {
        const line = el('div')
        row.forEach((item, i) => {
          if (i) line.appendChild(document.createTextNode(' · '))
          if (item.k) line.appendChild(document.createTextNode(item.k + ' '))
          const b = el('b')
          if (typeof item.v === 'function') liveCells.push({ node: b, fn: item.v })
          else b.innerHTML = fmt(item.v)
          line.appendChild(b)
        })
        box.appendChild(line)
      })
      add(box)
    }

    let readoutValue = null, readoutZone = null
    if (cfg.readout.show) {
      const box = el('div', 'sv-hud sv-readout')
      readoutValue = el('div', 'sv-readout-value')
      box.appendChild(readoutValue)
      if (cfg.readout.showZone) {
        readoutZone = el('div', 'sv-readout-zone')
        box.appendChild(readoutZone)
      }
      add(box)
    }

    const railMin = cfg.rail.min == null ? cfg.readout.from : cfg.rail.min
    const railMax = cfg.rail.max == null ? cfg.readout.to : cfg.rail.max
    let railFill = null, railDot = null
    if (cfg.rail.show && railMax !== railMin) {
      const rail = el('div', 'sv-hud sv-rail sv-rail-' + (cfg.rail.side === 'left' ? 'left' : 'right'))
      railFill = el('div', 'sv-rail-fill')
      railDot = el('div', 'sv-rail-dot')
      let marks = cfg.rail.ticks
      if (!marks) {
        marks = []
        const step = cfg.rail.step || (railMax - railMin) / 8
        for (let v = railMin; v < railMax; v += step) marks.push(Math.round(v))
        marks.push(railMax)
      }
      const unit = cfg.rail.unit == null ? cfg.readout.unit : cfg.rail.unit
      marks.forEach((m) => {
        const major = cfg.rail.majorEvery ? (m % cfg.rail.majorEvery === 0 || m === railMax) : true
        const t = el('div', 'sv-tick' + (major ? ' sv-tick-major' : ''))
        t.style.top = ((m - railMin) / (railMax - railMin) * 100) + '%'
        if (major) t.appendChild(el('span', null, m.toLocaleString() + (unit ? ' ' + unit : '')))
        rail.appendChild(t)
      })
      rail.appendChild(railFill)
      rail.appendChild(railDot)
      add(rail)
    }

    let cue = null
    if (cfg.cue.show) {
      cue = el('div', 'sv-hud sv-cue', fmt(cfg.cue.text))
      cue.appendChild(el('div', 'sv-cue-line'))
      add(cue)
    }

    /* ---- panels ---- */
    const panelEls = cfg.panels.map((p, i) => {
      const node = buildPanel(p, i)
      add(node)
      return node
    })
    const panelAt = timings(cfg.panels)
    const panelInner = panelEls.map((n) => n.querySelector('.sv-inner'))

    /* ---- scroll track ---- */
    const track = el('div', 'sv-track')
    track.style.height = cfg.scroll.length
    add(track)

    /* ---- loader ---- */
    let loader = null, loadbar = null, loadmsg = null
    if (cfg.loader.show) {
      loader = el('div', 'sv-loader')
      loader.setAttribute('role', 'status')
      const logo = cfg.loader.logo || cfg.brand.logo
      const word = cfg.loader.word || cfg.brand.word
      if (logo && logo.src) {
        const im = el('img', 'sv-loader-logo')
        im.src = logo.src
        im.alt = logo.alt || word || ''
        loader.appendChild(im)
      } else if (word) {
        loader.appendChild(el('div', 'sv-loader-word', word))
      }
      loadbar = el('div', 'sv-loadbar')
      loadbar.appendChild(el('i'))
      loader.appendChild(loadbar)
      loadmsg = el('div', 'sv-loadmsg', cfg.loader.message + ' — 0%')
      loader.appendChild(loadmsg)
      add(loader)
    }
    const loadbarI = loadbar && loadbar.querySelector('i')
    function setLoad (p, msg) {
      if (loadbarI) loadbarI.style.transform = `scaleX(${clamp(p, 0, 1)})`
      if (msg && loadmsg) loadmsg.textContent = msg
    }
    let loaderDone = false
    function finishLoader () {
      if (loaderDone) return
      loaderDone = true
      setLoad(1, cfg.loader.ready)
      if (!loader) return
      setTimeout(() => {
        loader.classList.add('sv-done')
        setTimeout(() => loader.remove(), 1200)
      }, 450)
    }

    /* ================================================================ film */

    const TIERS = (cfg.media.tiers || []).map((t) => [].concat(t)).filter((t) => t.length)
    const KEYFRAMES = cfg.media.keyframes || []
    let clips = [], nClips = 0, tier = 0, anyReady = false, activeClip = 0, lastP = 0

    const stills = KEYFRAMES.map((u) => {
      const im = new Image()
      im.src = u
      im.onload = () => { if (!anyReady) drawCurrent() }
      return im
    })
    /* Clip N spans still N -> N+1, so the crossfade has one fewer span than
       there are stills. With no clips at all, span the whole set. */
    const stillSpans = Math.max(1, stills.length - 1)

    /* --- frame sequence: the good path ---------------------------------- */
    const seq = { urls: [], imgs: [], loaded: 0, ready: false }
    if (cfg.media.frames) {
      const f = cfg.media.frames
      if (Array.isArray(f)) seq.urls = f.slice()
      else if (Array.isArray(f.urls)) seq.urls = f.urls.slice()
      else if (f.pattern && f.count) {
        const from = f.from == null ? 0 : f.from
        for (let i = 0; i < f.count; i++) {
          seq.urls.push(f.pattern.replace('{i}', String(from + i).padStart(f.pad || 0, '0')))
        }
      }
      seq.imgs = new Array(seq.urls.length)
    }

    /* Coarse to fine: every 16th frame, then every 8th, and so on. The scrub is
       usable after the first pass and simply sharpens from there — far better
       than a progress bar that holds the whole page hostage. */
    function loadSequence () {
      const n = seq.urls.length
      if (!n) return
      const order = []
      const seen = new Set()
      for (let stride = Math.max(1, 1 << Math.floor(Math.log2(Math.max(2, n / 8)))); stride >= 1; stride >>= 1) {
        for (let i = 0; i < n; i += stride) if (!seen.has(i)) { seen.add(i); order.push(i) }
      }
      for (let i = 0; i < n; i++) if (!seen.has(i)) { seen.add(i); order.push(i) }

      let cursor = 0, inFlight = 0
      const CONCURRENCY = 6
      function pump () {
        while (inFlight < CONCURRENCY && cursor < order.length) {
          const i = order[cursor++]
          inFlight++
          const im = new Image()
          im.decoding = 'async'
          if (cfg.media.crossOrigin) im.crossOrigin = cfg.media.crossOrigin
          const done = () => {
            inFlight--
            seq.loaded++
            if (!seq.ready && seq.loaded >= Math.min(n, Math.ceil(n / 8) + 1)) {
              seq.ready = true
              finishLoader()
            }
            setLoad(seq.loaded / n, `${cfg.loader.message} — ${Math.round(seq.loaded / n * 100)}%`)
            if (seq.loaded === n) finishLoader()
            drawCurrent()
            pump()
          }
          im.onload = () => { seq.imgs[i] = im; done() }
          im.onerror = done
          im.src = seq.urls[i]
        }
      }
      pump()
    }

    /* Nearest frame that has actually arrived. During the coarse pass that may
       be a few frames off; it is never a blank screen. */
    function drawSequence (p) {
      const n = seq.urls.length
      if (!n) return false
      const want = Math.round(clamp(p, 0, 1) * (n - 1))
      for (let r = 0; r <= n; r++) {
        const a = seq.imgs[want - r], b = seq.imgs[want + r]
        if (a) return drawSrc(a)
        if (b) return drawSrc(b)
      }
      return false
    }

    function sizeCanvas () {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = innerWidth * dpr
      canvas.height = innerHeight * dpr
    }
    sizeCanvas()
    on(window, 'resize', () => { sizeCanvas(); drawCurrent() })

    function fitRect (sw, sh) {
      const cw = canvas.width, ch = canvas.height
      const s = cfg.stage.fit === 'contain' ? Math.min(cw / sw, ch / sh) : Math.max(cw / sw, ch / sh)
      return [(cw - sw * s) / 2, (ch - sh * s) / 2, sw * s, sh * s]
    }
    function drawSrc (src) {
      const sw = src.videoWidth || src.naturalWidth || src.width
      const sh = src.videoHeight || src.naturalHeight || src.height
      if (!sw || !sh) return false
      if (cfg.stage.fit === 'contain') ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(src, ...fitRect(sw, sh))
      return true
    }

    /* --- tier loading: best source that this browser can actually decode --- */
    function makeVideo (src, slot) {
      const v = el('video', 'sv-media')
      v.muted = true; v.playsInline = true; v.preload = 'auto'
      v.src = src
      v.addEventListener('loadedmetadata', () => { slot.dur = v.duration || slot.dur })
      v.addEventListener('seeked', () => {
        slot.seekFree = true; slot.everReady = true
        if (slot === clips[activeClip]) drawCurrent()
      })
      v.addEventListener('loadeddata', () => {
        slot.ready = true; slot.everReady = true
        if (!anyReady) { anyReady = true; try { v.currentTime = 0.001 } catch (e) {} }
        checkTier()
      })
      v.addEventListener('error', () => { slot.failed = true; checkTier() })
      v.addEventListener('progress', () => {
        try {
          if (v.buffered.length && v.duration) {
            const frac = v.buffered.end(v.buffered.length - 1) / v.duration
            setLoad(frac * 0.95, `${cfg.loader.message} — ${Math.min(99, Math.round(frac * 100))}%`)
          }
        } catch (e) {}
      })
      add(v)
      v.load()
      slot.video = v
      return v
    }
    function startTier (urls) {
      clips.forEach((c) => c.video && c.video.remove())   // a dead tier leaves nothing behind
      clips = urls.map(() => ({ video: null, ready: false, failed: false, dur: 10, seekFree: true }))
      nClips = clips.length
      urls.forEach((u, i) => makeVideo(u, clips[i]))
    }
    function checkTier () {
      if (clips.filter((c) => c.ready || c.failed).length < nClips) return
      if (!clips.some((c) => c.failed)) {
        finishLoader()
        const t = TIERS[tier]
        if (cfg.media.bake && t.length === 1 && !frames.done) startBake(t[0])
        return
      }
      if (tier < TIERS.length - 1) {
        tier++
        anyReady = false
        setLoad(0.05, 'Switching source')
        startTier(TIERS[tier])
      } else {
        reportNoVideo()
      }
    }
    function reportNoVideo () {
      const probe = document.createElement('video')
      const h264 = probe.canPlayType('video/mp4; codecs="avc1.640028"') || 'no'
      const hevc = probe.canPlayType('video/mp4; codecs="hvc1.1.6.L123.b0"') || 'no'
      const err = clips.map((c) => (c.video && c.video.error ? c.video.error.code : '-')).join(',')
      console.warn('[scroll-video] no tier decoded. h264:', h264, '| hevc:', hevc, '| MediaError:', err)
      setLoad(1, 'Keyframe mode')
      if (stills.length) {
        add(el('div', 'sv-hud sv-fallback-note', 'VIDEO FEED UNAVAILABLE — KEYFRAME MODE'))
      }
      setTimeout(finishLoader, 2000)
    }

    /* --- runtime frame bake: scrubbing baked stills beats seeking a video --- */
    const frames = { list: [], done: false }
    const frameCache = new Map()
    function startBake (url) {
      const v = el('video', 'sv-media')
      v.muted = true; v.playsInline = true; v.preload = 'auto'
      /* Baking reads pixels back out, so the film has to be CORS-clean. Without
         it the canvas is tainted and we quietly stay on seek-scrubbing. */
      if (cfg.media.crossOrigin) v.crossOrigin = cfg.media.crossOrigin
      v.src = url
      add(v)
      const off = document.createElement('canvas')
      const octx = off.getContext('2d')
      const step = 1 / Math.max(0.5, cfg.media.bakeFps)
      let lastCap = -1, lastProgress = Date.now(), aborted = false

      function cap () {
        if (!v.videoWidth || v.currentTime - lastCap < step) return
        lastCap = v.currentTime
        lastProgress = Date.now()
        off.width = cfg.media.bakeWidth
        off.height = Math.round(cfg.media.bakeWidth * v.videoHeight / v.videoWidth)
        try { octx.drawImage(v, 0, 0, off.width, off.height) } catch (e) { aborted = true; return }
        /* Reserve the slot now: toBlob is async and must not reorder frames. */
        const slot = frames.list.length
        frames.list.push(null)
        try {
          off.toBlob((b) => { if (b) frames.list[slot] = b }, 'image/jpeg', cfg.media.bakeQuality)
        } catch (e) {
          aborted = true   // tainted canvas: the film is not CORS-clean
          console.info('[scroll-video] frame bake skipped (cross-origin film):', e.message)
        }
      }
      function loop () {
        if (frames.done || aborted) { v.remove(); return }
        cap()
        if (v.ended || (v.duration && v.currentTime >= v.duration - 0.15)) {
          v.remove()
          /* Give the last toBlob calls a moment, then drop any that never landed. */
          setTimeout(() => {
            frames.list = frames.list.filter(Boolean)
            frames.done = frames.list.length > 10
            if (frames.done) console.info('[scroll-video] baked', frames.list.length, 'frames')
          }, 400)
          return
        }
        if (Date.now() - lastProgress > 10000) { v.remove(); return }   // stalled
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(loop)
        else setTimeout(loop, 60)
      }
      v.addEventListener('loadeddata', () => {
        v.playbackRate = 4
        const p = v.play()
        if (p && p.catch) p.catch(() => { aborted = true; v.remove() })  // autoplay refused
        loop()
      })
      v.addEventListener('error', () => { aborted = true; v.remove() })
    }
    function ensureFrame (i, current) {
      if (i < 0 || i >= frames.list.length || !frames.list[i]) return null
      let e = frameCache.get(i)
      if (e === undefined) {
        e = createImageBitmap(frames.list[i]).then((bm) => { frameCache.set(i, bm); return bm })
        frameCache.set(i, e)
        if (frameCache.size > 40) {
          /* Evict whatever is furthest from where the scroll actually is. */
          let far = null, dist = -1
          for (const k of frameCache.keys()) {
            const d = Math.abs(k - current)
            if (d > dist) { dist = d; far = k }
          }
          const old = frameCache.get(far)
          if (old && old.close) old.close()
          frameCache.delete(far)
        }
      }
      return e instanceof Promise ? null : e
    }
    function drawFrames (p) {
      const n = frames.list.length
      const f = clamp(p, 0, 0.999) * (n - 1)
      const i = Math.floor(f), t = f - i
      for (let k = -2; k <= 4; k++) ensureFrame(i + k, i)
      const a = ensureFrame(i, i), b = ensureFrame(i + 1, i)
      if (!a) return false
      drawSrc(a)
      if (b && t > 0) { ctx.globalAlpha = t; drawSrc(b); ctx.globalAlpha = 1 }
      return true
    }

    function drawStills (p) {
      if (!stills.length) return
      const f = clamp(p, 0, 0.999999) * stillSpans
      const i = Math.floor(f), t = f - i
      const a = stills[i], b = stills[i + 1]
      if (a && a.complete && a.naturalWidth) drawSrc(a)
      if (b && b.complete && b.naturalWidth && t > 0) {
        ctx.globalAlpha = t; drawSrc(b); ctx.globalAlpha = 1
      }
    }
    function drawCurrent () {
      if (seq.urls.length) { if (drawSequence(lastP)) return }
      if (frames.done && drawFrames(lastP)) return
      const slot = clips[activeClip]
      if (slot && slot.ready && (slot.video.readyState >= 2 || slot.everReady)) {
        if (drawSrc(slot.video)) return
      }
      drawStills(lastP)
    }

    if (cfg.media.poster) {
      const poster = new Image()
      poster.src = cfg.media.poster
      poster.onload = () => { if (!anyReady && !frames.done) drawSrc(poster) }
    }

    if (seq.urls.length) {
      loadSequence()
      setTimeout(finishLoader, cfg.loader.timeout)
    } else if (TIERS.length) {
      startTier(TIERS[0])
      setTimeout(finishLoader, cfg.loader.timeout)
    } else {
      setTimeout(finishLoader, 300)
    }

    /* ============================================================ readouts */

    const zones = (cfg.zones && cfg.zones.length ? cfg.zones : [[0, 1, cfg.readout.from, cfg.readout.to, '']])
      .map((z) => Array.isArray(z)
        ? { at: [z[0], z[1]], value: [z[2], z[3]], label: z[4] || '' }
        : { at: z.at, value: z.value, label: z.label || '' })

    function zoneAt (p) {
      for (const z of zones) if (p >= z.at[0] && p <= z.at[1]) return z
      return p < zones[0].at[0] ? zones[0] : zones[zones.length - 1]
    }
    function valueAt (p, z) {
      const span = (z.at[1] - z.at[0]) || 1
      return lerp(z.value[0], z.value[1], clamp((p - z.at[0]) / span, 0, 1))
    }
    function formatValue (v, p) {
      if (typeof cfg.readout.format === 'function') return cfg.readout.format(v, p)
      let s = cfg.readout.decimals ? v.toFixed(cfg.readout.decimals) : String(Math.round(v))
      if (cfg.readout.pad) {
        const neg = s.startsWith('-')
        if (neg) s = s.slice(1)
        const dot = s.indexOf('.')
        const int = dot < 0 ? s : s.slice(0, dot)
        s = (neg ? '-' : '') + int.padStart(cfg.readout.pad, '0') + (dot < 0 ? '' : s.slice(dot))
      }
      return s
    }

    const gradeStops = (cfg.stage.grade || []).map((g) => [g[0], toRgb(g[1]) || [0, 0, 0]])
    function gradeColor (p) {
      if (!gradeStops.length) return null
      for (let i = 0; i < gradeStops.length - 1; i++) {
        const a = gradeStops[i], b = gradeStops[i + 1]
        if (p >= a[0] && p <= b[0]) return mixRgb(a[1], b[1], (p - a[0]) / ((b[0] - a[0]) || 1))
      }
      return mixRgb(gradeStops[gradeStops.length - 1][1], gradeStops[gradeStops.length - 1][1], 0)
    }

    function hud (p) {
      const z = zoneAt(p)
      const value = valueAt(p, z)

      if (readoutValue) {
        readoutValue.innerHTML = formatValue(value, p) +
          (cfg.readout.unit ? ' <b>' + cfg.readout.unit + '</b>' : '')
      }
      if (readoutZone) readoutZone.textContent = z.label

      if (railFill) {
        const rp = clamp((value - railMin) / ((railMax - railMin) || 1), 0, 1) * 100
        railFill.style.height = rp + '%'
        railDot.style.top = `calc(${rp}% - 4px)`
      }

      if (gradeStops.length) {
        grade.style.background =
          `linear-gradient(${gradeColor(Math.max(0, p - 0.08))}, ${gradeColor(Math.min(1, p + 0.08))})`
        grade.style.opacity = cfg.stage.gradeOpacity
      }

      if (cue) cue.style.opacity = p < 0.02 ? 1 : 0

      liveCells.forEach((c) => {
        const next = c.fn(p, value, z)
        if (next !== c.last) { c.last = next; c.node.innerHTML = fmt(next) }
      })
    }

    function panels (p) {
      for (let i = 0; i < panelEls.length; i++) {
        const [a, b, c, d] = panelAt[i]
        let o = 0, y = 28
        if (p > a && p < d) {
          if (p < b) { const t = (p - a) / ((b - a) || 1); o = t; y = 28 * (1 - t) }
          else if (p <= c) { o = 1; y = 0 }
          else { const t = (p - c) / ((d - c) || 1); o = 1 - t; y = -20 * t }
        }
        if (cfg.panels[i].persist && p >= c) { o = 1; y = 0 }
        panelEls[i].style.opacity = o
        panelEls[i].style.visibility = o > 0.01 ? 'visible' : 'hidden'
        panelInner[i].style.transform = `translateY(${y}px)`
      }
    }

    /* ========================================================= scrub engine */

    function scrollP () {
      const max = document.documentElement.scrollHeight - innerHeight
      return max > 0 ? clamp(scrollY / max, 0, 1) : 0
    }
    let targetP = scrollP(), curP = targetP
    on(window, 'scroll', () => { targetP = scrollP() }, { passive: true })
    on(window, 'resize', () => { targetP = scrollP() })

    const ease = reduced ? 1 : clamp(cfg.scroll.smoothing, 0.01, 1)

    let raf = 0, dead = false
    function tick () {
      if (dead) return
      raf = requestAnimationFrame(tick)
      curP += (targetP - curP) * ease
      lastP = curP

      if (!seq.urls.length && !frames.done && nClips) {
        const f = clamp(curP, 0, 0.999999) * nClips
        const idx = Math.floor(f)
        activeClip = idx
        const slot = clips[idx]
        if (slot && slot.ready) {
          const local = (f - idx) * Math.max(0.05, slot.dur - 0.07)
          if (slot.seekFree && Math.abs(slot.video.currentTime - local) > 0.05) {
            slot.seekFree = false
            try { slot.video.currentTime = local } catch (e) { slot.seekFree = true }
          }
          /* Park the neighbours on their shared boundary frames, so a fast
             scroll into the next clip never flashes a stale frame. */
          const prev = clips[idx - 1], next = clips[idx + 1]
          if (next && next.ready && next.seekFree && next.video.currentTime > 0.05) {
            next.seekFree = false
            try { next.video.currentTime = 0.001 } catch (e) { next.seekFree = true }
          }
          if (prev && prev.ready && prev.seekFree && Math.abs(prev.video.currentTime - (prev.dur - 0.07)) > 0.1) {
            prev.seekFree = false
            try { prev.video.currentTime = prev.dur - 0.07 } catch (e) { prev.seekFree = true }
          }
        }
      }

      drawCurrent()
      hud(curP)
      panels(targetP)
    }

    hud(0)
    panels(0)
    drawCurrent()
    raf = requestAnimationFrame(tick)

    function destroy () {
      dead = true
      cancelAnimationFrame(raf)
      listeners.forEach(([t, type, fn, opts]) => t.removeEventListener(type, fn, opts))
      listeners.length = 0
      owned.forEach((n) => n.remove())
      owned.length = 0
      frameCache.forEach((v) => { if (v && v.close) v.close() })
      frameCache.clear()
      document.body.classList.remove('sv-body')
    }

    return { config: cfg, redraw: drawCurrent, progress: () => curP, destroy }
  }

  global.ScrollVideo = { mount, DEFAULTS, format: fmt }
  if (global.SCROLL_VIDEO_CONFIG) ready(() => mount(global.SCROLL_VIDEO_CONFIG))
})(window)
