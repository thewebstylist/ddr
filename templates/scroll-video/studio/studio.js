/* ============================================================================
   SCROLL VIDEO STUDIO
   ----------------------------------------------------------------------------
   Ask a client the questions that matter, take what they already have, and hand
   back a deployable site. Nothing leaves the browser: the video is read as an
   object URL, the frames are cut on the machine you are sitting at, and the
   export is assembled into a zip in memory.
   ========================================================================== */
import { PROFESSIONS, PAIRINGS } from './lib/professions.js'
import { extractFrames, importSequence, releaseFrames, totalBytes, FORMATS, encoderFor } from './lib/frames.js'
import { samplePalette, buildTheme, buildGrade, contrast } from './lib/palette.js'
import { makeZip, download } from './lib/zip.js'

/* ------------------------------------------------------------- serialising */

/* Config is written as JavaScript source, not JSON, because a config may hold
   functions — a live HUD reading is one. The preview and the exported file go
   through this same function, so what you see is what ships. */
const raw = (src) => ({ __raw: src })
const ident = (k) => /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)

function ser (v, ind = '') {
  const pad = ind + '  '
  if (v === null || v === undefined) return 'null'
  if (v && v.__raw) return v.__raw
  if (typeof v === 'function') return v.toString()
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    if (!v.length) return '[]'
    const flat = v.every((x) => x === null || typeof x !== 'object' || x.__raw)
    if (flat && v.length <= 8) return '[' + v.map((x) => ser(x)).join(', ') + ']'
    return '[\n' + v.map((x) => pad + ser(x, pad)).join(',\n') + '\n' + ind + ']'
  }
  const keys = Object.keys(v).filter((k) => v[k] !== undefined)
  if (!keys.length) return '{}'
  return '{\n' + keys.map((k) => pad + ident(k) + ': ' + ser(v[k], pad)).join(',\n') + '\n' + ind + '}'
}

/* ------------------------------------------------------------------- model */

/* 475 is a correct eighth of 3,800 and a terrible number to write down a rail.
   Round to the nearest 1, 2 or 5 times a power of ten. */
function niceStep (span, divisions) {
  const rough = Math.abs(span) / divisions
  if (!isFinite(rough) || rough <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const n = rough / mag
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag
}

const slug = (s) => (s || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'

function zonesFromLabels (labels, from, to) {
  const n = labels.length
  /* An even split in scroll, but the value curve eases: the opening zone covers
     little ground and the middle covers most of it. That is what makes the
     readout feel like travel rather than a progress bar. */
  const curve = [0, 0.04, 0.30, 0.92, 1]
  return labels.map((label, i) => {
    const a = i / n, b = (i + 1) / n
    const va = from + (to - from) * (curve[Math.min(i, curve.length - 1)] ?? i / n)
    const vb = from + (to - from) * (curve[Math.min(i + 1, curve.length - 1)] ?? (i + 1) / n)
    return { atFrom: +a.toFixed(3), atTo: +b.toFixed(3), valueFrom: Math.round(va), valueTo: Math.round(vb), label }
  })
}

function starterPanels (prof) {
  const s = prof.story
  const panels = [{
    id: 'hero', align: 'left', eyebrow: s.mission[0].replace(/\*/g, ''),
    heading: s.hero[0], body: s.hero[1], specs: '', lines: '', ctaLabel: '', ctaHref: '',
    fine: '', persist: false, timing: 'auto', width: ''
  }]
  s.beats.forEach(([heading, body], i) => panels.push({
    id: 'beat-' + (i + 1), align: 'left',
    eyebrow: prof.zoneLabels[i + 1] || '', heading, body,
    specs: '', lines: '', ctaLabel: '', ctaHref: '', fine: '', persist: false, timing: 'auto', width: ''
  }))
  panels.push({
    id: 'offer', align: 'left', eyebrow: prof.zoneLabels[prof.zoneLabels.length - 1] || '',
    heading: '', body: '', specs: '',
    lines: s.offer.map((row) => [].concat(row).join(' | ')).join('\n'),
    ctaLabel: s.cta, ctaHref: '#enquire', fine: '', persist: true, timing: 'auto', width: ''
  })
  return panels
}

function newProject (id = 'deep-tech') {
  const prof = PROFESSIONS[id]
  const theme = buildTheme(prof.accent, { dark: prof.dark, groundHex: prof.ground })
  return {
    v: 1,
    name: 'Untitled site',
    profession: id,
    dark: prof.dark,
    brand: { word: 'BRAND', tagline: prof.story.tagline, href: '', logoHeight: 22 },
    seo: { title: '', description: '', siteName: '', ogImage: '' },
    fontPair: prof.fonts,
    theme,
    scroll: { length: 900, smoothing: 0.14 },
    readout: { show: true, ...prof.readout },
    rail: { show: true, side: 'right', step: niceStep(prof.readout.to - prof.readout.from, 8), majorEvery: niceStep(prof.readout.to - prof.readout.from, 4) },
    cue: { show: true, text: prof.cue },
    corners: true,
    loader: { message: prof.loader, ready: prof.ready },
    mission: prof.story.mission.slice(),
    status: [
      [{ k: 'STATUS', v: 'LIVE', live: '' }, { k: 'ZONE', v: '', live: 'zone' }]
    ],
    zones: zonesFromLabels(prof.zoneLabels, prof.readout.from, prof.readout.to),
    stage: { gradeBlend: prof.dark ? 'multiply' : 'normal', gradeOpacity: prof.dark ? 0.55 : 1, vignette: true, fit: 'cover' },
    grade: buildGrade(theme, prof.dark),
    film: { format: 'webp', count: 150, width: 1440, quality: 0.78, sourceName: '', videoUrl: '' },
    panels: starterPanels(prof)
  }
}

/* --------------------------------------------------------- project -> config */

const LIVE = {
  value: (unit) => raw(`(p, v) => Math.round(v)${unit ? ` + ' ${unit}'` : ''}`),
  percent: () => raw('(p) => Math.round(p * 100) + \'%\''),
  zone: () => raw('(p, v, z) => z.label')
}

function parseSpecs (text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf('::')
    return i < 0 ? { k: '', v: l } : { k: l.slice(0, i).trim(), v: l.slice(i + 2).trim() }
  })
}
function parseLines (text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => { const parts = l.split('|').map((s) => s.trim()).filter(Boolean); return parts.length > 1 ? parts : parts[0] })
}
function parseBody (text) {
  const paras = String(text || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  return paras.length === 0 ? undefined : paras.length === 1 ? paras[0] : paras
}

function buildConfig (p, mode, assets) {
  const pair = PAIRINGS[p.fontPair] || PAIRINGS.technical
  const ext = (FORMATS[p.film.format] || FORMATS.webp).ext
  const nFrames = assets.frames.length

  let frames = null
  if (nFrames) {
    frames = mode === 'preview'
      ? assets.frames.map((f) => f.url)
      : { pattern: `frames/f-{i}.${ext}`, count: nFrames, pad: 4, from: 1 }
  }

  const logo = assets.logoUrl
    ? { src: mode === 'preview' ? assets.logoUrl : 'logo.' + assets.logoExt, alt: p.brand.word, height: p.brand.logoHeight }
    : null

  const cfg = {
    seo: {
      title: p.seo.title || (p.brand.word + (p.brand.tagline ? ' — ' + p.brand.tagline : '')),
      description: p.seo.description || undefined,
      siteName: p.seo.siteName || p.brand.word || undefined,
      ogImage: p.seo.ogImage || undefined
    },
    fonts: { href: pair.href },
    theme: {
      ...p.theme,
      fontDisplay: pair.display, fontBody: pair.body, fontMono: pair.mono,
      weightHeading: pair.weightHeading, weightBody: pair.weightBody
    },
    scroll: { length: p.scroll.length + 'vh', smoothing: p.scroll.smoothing },
    brand: {
      word: logo ? undefined : p.brand.word,
      tagline: p.brand.tagline || undefined,
      href: p.brand.href || undefined,
      logo: logo || undefined
    },
    mission: p.mission.filter(Boolean),
    status: { show: p.status.length > 0, rows: p.status.map((row) => row.map((c) => ({
      k: c.k || undefined,
      v: c.live && LIVE[c.live] ? LIVE[c.live](p.readout.unit) : c.v
    }))) },
    readout: { show: p.readout.show, from: p.readout.from, to: p.readout.to, unit: p.readout.unit || '', pad: p.readout.pad },
    rail: { show: p.rail.show, side: p.rail.side, step: p.rail.step, majorEvery: p.rail.majorEvery },
    zones: p.zones.map((z) => ({ at: [z.atFrom, z.atTo], value: [z.valueFrom, z.valueTo], label: z.label })),
    cue: { show: p.cue.show, text: p.cue.text },
    corners: p.corners,
    stage: { ...p.stage, grade: p.grade },
    loader: { message: p.loader.message, ready: p.loader.ready },
    media: {},
    panels: p.panels.map((pn) => {
      const out = { id: pn.id || undefined, align: pn.align === 'left' ? undefined : pn.align }
      if (pn.width) out.width = +pn.width
      if (pn.timing !== 'auto' && Array.isArray(pn.at)) out.at = pn.at
      if (pn.persist) out.persist = true
      if (pn.eyebrow) out.eyebrow = pn.eyebrow
      if (pn.heading) out.heading = pn.heading
      const body = parseBody(pn.body); if (body) out.body = body
      const specs = parseSpecs(pn.specs); if (specs.length) out.specs = specs
      const lines = parseLines(pn.lines); if (lines.length) out.lines = lines
      if (pn.ctaLabel) out.cta = { label: pn.ctaLabel, href: pn.ctaHref || '#' }
      if (pn.fine) out.fine = pn.fine
      return out
    })
  }

  if (frames) cfg.media.frames = frames
  if (p.film.videoUrl) cfg.media.tiers = [p.film.videoUrl]
  if (nFrames && mode === 'preview') cfg.media.poster = assets.frames[0].url

  return cfg
}

/* ------------------------------------------------------- asset persistence */

const idb = (() => {
  let dbp
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('sv-studio', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('assets')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  }))
  const tx = async (mode, fn) => {
    const db = await open()
    return new Promise((res, rej) => {
      const t = db.transaction('assets', mode)
      const req = fn(t.objectStore('assets'))
      t.oncomplete = () => res(req && req.result)
      t.onerror = () => rej(t.error)
    })
  }
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
    del: (k) => tx('readwrite', (s) => s.delete(k))
  }
})()

/* -------------------------------------------------------------------- state */

const state = {
  project: newProject(),
  assets: { frames: [], logoBlob: null, logoUrl: '', logoExt: 'png' },
  open: new Set(['brand', 'look', 'film']),
  device: 'desktop',
  previewReady: false
}

/* ---------------------------------------------------------------- elements */

const $ = (s) => document.querySelector(s)
const form = $('#form')
const iframe = $('#preview')
const savedEl = $('#saved')

/* ----------------------------------------------------------- tiny hyperscript */

function h (tag, props, ...kids) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') n.className = v
    else if (k === 'html') n.innerHTML = v
    else if (k === 'value') n.value = v
    else if (k === 'checked') n.checked = !!v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v)
    else n.setAttribute(k, v === true ? '' : v)
  }
  kids.flat().forEach((k) => {
    if (k === null || k === undefined || k === false) return
    n.appendChild(typeof k === 'object' ? k : document.createTextNode(String(k)))
  })
  return n
}

/* Fields mutate the model in place and never re-render, so typing never steals
   your caret. Only structural edits — adding a panel, changing a profession —
   rebuild the form. */
function field (label, obj, key, opts = {}) {
  const { type = 'text', hint, placeholder, options, min, max, step, rows } = opts
  const commit = (v) => { obj[key] = v; touch(opts.restructure) }
  let input

  if (type === 'textarea') {
    input = h('textarea', { class: 'in', rows: rows || 3, placeholder, oninput: (e) => commit(e.target.value) })
    input.value = obj[key] ?? ''
  } else if (type === 'select') {
    input = h('select', {
      class: 'in',
      onchange: (e) => {
        const opt = options.find((o) => String(o[0]) === e.target.value)
        commit(opt ? opt[0] : e.target.value)
      }
    },
      options.map(([v, l]) => h('option', { value: v, selected: String(obj[key]) === String(v) }, l)))
  } else if (type === 'checkbox') {
    return h('label', { class: 'f-inline' },
      h('input', { type: 'checkbox', checked: !!obj[key], onchange: (e) => commit(e.target.checked) }),
      h('span', {}, label))
  } else if (type === 'color') {
    input = h('input', { type: 'color', value: obj[key] || '#000000', oninput: (e) => commit(e.target.value) })
  } else {
    input = h('input', {
      class: 'in', type, placeholder, min, max, step,
      oninput: (e) => commit(type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value)
    })
    input.value = obj[key] ?? ''
  }
  return h('div', { class: 'f' },
    label && h('label', { class: 'f-label' }, label),
    input,
    hint && h('div', { class: 'f-hint' }, hint))
}

const row = (...kids) => h('div', { class: 'row' }, kids)

function section (id, title, hint, build) {
  const isOpen = state.open.has(id)
  const body = h('div', { class: 'sec-body' })
  const sec = h('section', { class: 'sec' + (isOpen ? ' is-open' : '') },
    h('button', {
      class: 'sec-head',
      onclick: () => {
        state.open.has(id) ? state.open.delete(id) : state.open.add(id)
        sec.classList.toggle('is-open')
      }
    }, h('span', { class: 'sec-caret' }, '▶'), h('span', { class: 'sec-title' }, title),
       hint && h('span', { class: 'sec-hint' }, hint)),
    body)
  build(body)
  return sec
}

/* --------------------------------------------------------------- sections */

function secBrand () {
  const p = state.project
  return section('brand', 'Brand', null, (b) => {
    b.appendChild(h('p', { class: 'note' },
      'Start with the trade — it sets a scheme, a type pairing, the units on the readout and a story skeleton. Everything after this is yours to overwrite.'))
    b.appendChild(field('What does the client do?', p, 'profession', {
      type: 'select',
      options: Object.entries(PROFESSIONS).map(([k, v]) => [k, v.label]),
      restructure: true
    }))
    b.appendChild(h('div', { class: 'row' },
      h('button', { class: 'btn btn-mini', onclick: () => applyProfession(false) }, 'Apply its look'),
      h('button', { class: 'btn btn-mini', onclick: () => applyProfession(true) }, 'Apply look + starter copy')))
    b.appendChild(h('div', { style: 'height:14px' }))

    b.appendChild(field('Brand name', p.brand, 'word', { placeholder: 'ABYSSAL' }))
    b.appendChild(field('Tagline', p.brand, 'tagline', { placeholder: 'Deep-sea expeditions' }))
    b.appendChild(field('Wordmark links to', p.brand, 'href', { placeholder: 'https:// (optional)' }))

    b.appendChild(h('label', { class: 'f-label' }, 'Logo'))
    if (state.assets.logoUrl) {
      b.appendChild(h('img', { class: 'logo-prev', src: state.assets.logoUrl, alt: '' }))
      b.appendChild(row(
        field('Height (px)', p.brand, 'logoHeight', { type: 'number', min: 10, max: 80 }),
        h('div', { class: 'f' }, h('label', { class: 'f-label' }, ' '),
          h('button', { class: 'btn btn-mini btn-danger', onclick: clearLogo }, 'Remove logo'))))
    }
    b.appendChild(dropZone('Drop a logo, or click to choose', 'PNG or SVG, transparent ground', 'image/*', (files) => setLogo(files[0])))
    b.appendChild(h('div', { class: 'f-hint' }, 'With a logo set, the wordmark is replaced by the image.'))

    b.appendChild(h('div', { style: 'height:14px' }))
    b.appendChild(field('Page title', p.seo, 'title', { placeholder: 'defaults to brand — tagline' }))
    b.appendChild(field('Meta description', p.seo, 'description', { type: 'textarea', rows: 2 }))
    b.appendChild(field('Social share image URL', p.seo, 'ogImage', { placeholder: 'https://…/share.jpg' }))
  })
}

function secLook () {
  const p = state.project
  return section('look', 'Colour and type', null, (b) => {
    b.appendChild(h('p', { class: 'note' },
      'Four colours carry the whole page. The engine derives every translucent variant — rules, spec cells, the CTA wash — from the accent.'))

    b.appendChild(h('div', { class: 'swatches' },
      [['bg', 'Ground'], ['ink', 'Text'], ['muted', 'Secondary'], ['accent', 'Accent'], ['ctaInk', 'On accent']]
        .map(([k, l]) => h('label', { class: 'well' },
          h('input', { type: 'color', value: p.theme[k], oninput: (e) => { p.theme[k] = e.target.value; touch(); paintContrast() } }),
          h('span', {}, l)))))

    const c = h('div', { class: 'contrast', id: 'contrast' })
    b.appendChild(c)

    b.appendChild(h('div', { class: 'row', style: 'margin-bottom:12px' },
      h('button', { class: 'btn btn-mini', onclick: () => paletteFrom('logo') }, 'Take colours from logo'),
      h('button', { class: 'btn btn-mini', onclick: () => paletteFrom('film') }, 'Take colours from film')))

    b.appendChild(field('Light or dark', p, 'dark', {
      type: 'select', options: [[true, 'Dark ground'], [false, 'Light ground']], restructure: true
    }))
    b.appendChild(field('Type pairing', p, 'fontPair', {
      type: 'select', options: Object.entries(PAIRINGS).map(([k, v]) => [k, v.label])
    }))

    b.appendChild(h('div', { style: 'height:6px' }))
    b.appendChild(field('Colour grade over the film', p.stage, 'gradeBlend', {
      type: 'select',
      options: [['multiply', 'Multiply — deepens dark footage'], ['screen', 'Screen — lifts light footage'], ['normal', 'Paint over — for no footage']],
      hint: 'The grade travels between the stops below as you scroll.'
    }))
    b.appendChild(field('Grade strength', p.stage, 'gradeOpacity', { type: 'number', min: 0, max: 1, step: 0.05 }))
    b.appendChild(h('label', { class: 'f-label' }, 'Grade stops'))
    p.grade.forEach((stop, i) => b.appendChild(h('div', { class: 'row', style: 'margin-bottom:6px' },
      h('input', { class: 'in', type: 'number', min: 0, max: 1, step: 0.05, value: stop[0], oninput: (e) => { stop[0] = +e.target.value; touch() } }),
      h('input', { type: 'color', style: 'flex:0 0 46px;height:32px', value: stop[1], oninput: (e) => { stop[1] = e.target.value; touch() } }),
      h('button', { class: 'btn btn-mini btn-danger', onclick: () => { p.grade.splice(i, 1); render() } }, '×'))))
    b.appendChild(h('button', { class: 'add', onclick: () => { p.grade.push([1, p.theme.bg]); render() } }, 'Add a grade stop'))
    b.appendChild(h('div', { style: 'height:10px' }))
    b.appendChild(h('button', { class: 'btn btn-mini', onclick: () => { p.grade = buildGrade(p.theme, p.dark); render() } }, 'Rebuild grade from accent'))
    b.appendChild(field('Vignette', p.stage, 'vignette', { type: 'checkbox' }))
    b.appendChild(field('Corner brackets', p, 'corners', { type: 'checkbox' }))
  })
}

function secFilm () {
  const p = state.project
  const n = state.assets.frames.length
  const bytes = totalBytes(state.assets.frames)
  return section('film', 'The film', n ? n + ' frames' : 'empty', (b) => {
    b.appendChild(h('p', { class: 'note' },
      h('strong', {}, 'Frames, not video.'), ' A frame sequence scrubs exactly, needs no codec, and never fights an autoplay policy. Drop a video here and the studio cuts it into frames on this machine — nothing is uploaded.'))

    b.appendChild(dropZone('Drop a video, or click to choose', 'MP4 (H.264) or WebM · cut to frames here', 'video/*', (files) => cutVideo(files[0])))
    b.appendChild(h('div', { style: 'height:8px' }))
    b.appendChild(dropZone('…or drop a frame sequence you already have', 'PNG / JPG / WebP, numbered', 'image/*', (files) => loadSequence(files), true))

    b.appendChild(h('div', { style: 'height:12px' }))
    b.appendChild(row(
      field('Frames', p.film, 'count', { type: 'number', min: 24, max: 400, hint: '120–200 is the sweet spot' }),
      field('Width (px)', p.film, 'width', { type: 'number', min: 640, max: 2560, step: 80 })))
    b.appendChild(row(
      field('Format', p.film, 'format', {
        type: 'select',
        options: [['webp', encoderFor('webp') === 'webp' ? 'WebP — smaller' : 'WebP — not available here'],
                  ['jpeg', 'JPEG — universal']]
      }),
      field('Quality', p.film, 'quality', { type: 'number', min: 0.4, max: 0.95, step: 0.02 })))
    b.appendChild(h('div', { class: 'f-hint' }, 'Re-cut the video after changing these.'))

    if (n) {
      const mb = bytes / 1048576
      const cls = mb < 8 ? 'weight-ok' : mb < 16 ? 'weight-warn' : 'weight-bad'
      b.appendChild(h('div', { class: 'stat' }, h('span', {}, p.film.sourceName || 'sequence'),
        h('b', { class: cls }, mb.toFixed(1) + ' MB')))
      b.appendChild(h('div', { class: 'f-hint' },
        mb < 8 ? 'Comfortable on a phone connection.'
          : mb < 16 ? 'Fine on broadband. Consider fewer frames or a narrower width for mobile.'
            : 'Heavy. Drop the frame count or the width — this downloads before anything moves.'))
      b.appendChild(h('div', { class: 'strip' },
        state.assets.frames.filter((_, i) => i % Math.ceil(n / 24) === 0)
          .map((f) => h('img', { src: f.url, alt: '' }))))
      b.appendChild(h('button', { class: 'btn btn-mini btn-danger', onclick: clearFrames }, 'Remove the film'))
    }

    b.appendChild(h('div', { style: 'height:12px' }))
    b.appendChild(field('Video URL fallback', p.film, 'videoUrl', {
      placeholder: 'https://…/film.mp4 (optional)',
      hint: 'Used only when no frame sequence is present — for when you would rather host one MP4 than 150 images.'
    }))
    b.appendChild(field('Fit', p.stage, 'fit', { type: 'select', options: [['cover', 'Cover — fill the screen'], ['contain', 'Contain — show the whole frame']] }))
  })
}

function secInstrument () {
  const p = state.project
  return section('hud', 'The instrument', p.readout.unit || '—', (b) => {
    b.appendChild(h('p', { class: 'note' },
      'The readout is what makes the page feel like travel rather than a slideshow. Give it a unit the client actually uses — metres, km/h, floors, days, looks.'))
    b.appendChild(field('Show the readout', p.readout, 'show', { type: 'checkbox' }))
    b.appendChild(row(
      field('From', p.readout, 'from', { type: 'number' }),
      field('To', p.readout, 'to', { type: 'number' }),
      field('Unit', p.readout, 'unit', { placeholder: 'M' })))
    b.appendChild(field('Zero-pad to', p.readout, 'pad', { type: 'number', min: 0, max: 6, hint: '4 shows 0120 rather than 120' }))

    b.appendChild(h('div', { style: 'height:8px' }))
    b.appendChild(field('Show the rail', p.rail, 'show', { type: 'checkbox' }))
    b.appendChild(row(
      field('Side', p.rail, 'side', { type: 'select', options: [['right', 'Right'], ['left', 'Left']] }),
      field('Tick every', p.rail, 'step', { type: 'number' }),
      field('Label every', p.rail, 'majorEvery', { type: 'number' })))

    b.appendChild(h('div', { style: 'height:8px' }))
    b.appendChild(field('Scroll cue', p.cue, 'text', { placeholder: 'SCROLL TO DIVE' }))
    b.appendChild(row(
      field('Loader message', p.loader, 'message'),
      field('Loader done', p.loader, 'ready')))

    b.appendChild(h('div', { style: 'height:8px' }))
    b.appendChild(h('label', { class: 'f-label' }, 'Top-right block'))
    p.mission.forEach((line, i) => b.appendChild(h('div', { class: 'row', style: 'margin-bottom:6px' },
      h('input', { class: 'in', value: line, oninput: (e) => { p.mission[i] = e.target.value; touch() } }),
      h('button', { class: 'btn btn-mini btn-danger', onclick: () => { p.mission.splice(i, 1); render() } }, '×'))))
    b.appendChild(h('button', { class: 'add', onclick: () => { p.mission.push(''); render() } }, 'Add a line'))

    b.appendChild(h('div', { style: 'height:14px' }))
    b.appendChild(h('label', { class: 'f-label' }, 'Bottom-left instrument rows'))
    p.status.forEach((r, ri) => {
      const card = h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'item-n' }, 'ROW ' + (ri + 1)),
          h('span', { class: 'item-title' }, ''),
          h('div', { class: 'item-tools' },
            h('button', { class: 'btn btn-mini', onclick: () => { r.push({ k: '', v: '', live: '' }); render() } }, '+ cell'),
            h('button', { class: 'btn btn-mini btn-danger', onclick: () => { p.status.splice(ri, 1); render() } }, '×'))))
      r.forEach((cell, ci) => card.appendChild(h('div', { class: 'row', style: 'margin-bottom:6px' },
        h('input', { class: 'in', placeholder: 'LABEL', value: cell.k, oninput: (e) => { cell.k = e.target.value; touch() } }),
        cell.live
          ? h('input', { class: 'in', value: 'live: ' + cell.live, disabled: true })
          : h('input', { class: 'in', placeholder: 'value', value: cell.v, oninput: (e) => { cell.v = e.target.value; touch() } }),
        h('select', { class: 'in', style: 'flex:0 0 92px', onchange: (e) => { cell.live = e.target.value; render() } },
          [['', 'static'], ['value', 'the value'], ['percent', 'percent'], ['zone', 'zone name']]
            .map(([v, l]) => h('option', { value: v, selected: cell.live === v }, l))),
        h('button', { class: 'btn btn-mini btn-danger', onclick: () => { r.splice(ci, 1); render() } }, '×'))))
      b.appendChild(card)
    })
    b.appendChild(h('button', { class: 'add', onclick: () => { p.status.push([{ k: '', v: '', live: '' }]); render() } }, 'Add a row'))
  })
}

function secZones () {
  const p = state.project
  return section('zones', 'The journey', p.zones.length + ' zones', (b) => {
    b.appendChild(h('p', { class: 'note' },
      'How scroll position maps to the number. It need not be linear — spending the first fifth of the page barely moving, then covering most of the range in the fourth, is what sells the sense of descent.'))
    p.zones.forEach((z, i) => b.appendChild(h('div', { class: 'item' },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-n' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'item-title' }, z.label || 'unnamed'),
        h('button', { class: 'btn btn-mini btn-danger', onclick: () => { p.zones.splice(i, 1); render() } }, '×')),
      field('Label', z, 'label', { restructure: false }),
      row(field('Scroll from', z, 'atFrom', { type: 'number', min: 0, max: 1, step: 0.01 }),
          field('to', z, 'atTo', { type: 'number', min: 0, max: 1, step: 0.01 })),
      row(field('Value from', z, 'valueFrom', { type: 'number' }),
          field('to', z, 'valueTo', { type: 'number' })))))
    b.appendChild(h('button', { class: 'add', onclick: () => { p.zones.push({ atFrom: 0, atTo: 1, valueFrom: p.readout.from, valueTo: p.readout.to, label: '' }); render() } }, 'Add a zone'))
    b.appendChild(h('div', { style: 'height:8px' }))
    b.appendChild(h('button', {
      class: 'btn btn-mini',
      onclick: () => {
        p.zones = zonesFromLabels(p.zones.map((z) => z.label), p.readout.from, p.readout.to)
        render()
      }
    }, 'Re-space these zones evenly'))
  })
}

function secPanels () {
  const p = state.project
  return section('panels', 'Panels', p.panels.length + '', (b) => {
    b.appendChild(h('p', { class: 'note' },
      'One claim per panel. ', h('code', {}, '**bold**'), ' ', h('code', {}, '*accent*'), ' ', h('code', {}, '`stat`'), ' work in every field here.'))
    p.panels.forEach((pn, i) => {
      const card = h('div', { class: 'item' })
      card.appendChild(h('div', { class: 'item-head' },
        h('span', { class: 'item-n' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'item-title' }, pn.heading || pn.lines || pn.eyebrow || 'panel'),
        h('div', { class: 'item-tools' },
          i > 0 && h('button', { class: 'btn btn-mini', onclick: () => { p.panels.splice(i - 1, 0, p.panels.splice(i, 1)[0]); render() } }, '↑'),
          i < p.panels.length - 1 && h('button', { class: 'btn btn-mini', onclick: () => { p.panels.splice(i + 1, 0, p.panels.splice(i, 1)[0]); render() } }, '↓'),
          h('button', { class: 'btn btn-mini btn-danger', onclick: () => { p.panels.splice(i, 1); render() } }, '×'))))
      card.appendChild(field('Eyebrow', pn, 'eyebrow', { placeholder: 'Zone 01 · Sunlit · 0–200 m' }))
      card.appendChild(field('Heading', pn, 'heading', { type: 'textarea', rows: 2, placeholder: 'One line, or two with <br>' }))
      card.appendChild(field('Body', pn, 'body', { type: 'textarea', rows: 3, hint: 'A blank line starts a new paragraph.' }))
      card.appendChild(field('Big lines', pn, 'lines', { type: 'textarea', rows: 2, placeholder: '*8* seats. | $250,000.', hint: 'One row per line; | puts two phrases on the same baseline.' }))
      card.appendChild(field('Spec grid', pn, 'specs', { type: 'textarea', rows: 3, placeholder: 'Depth rating :: *4,000 m* operational', hint: 'key :: value, one per line.' }))
      card.appendChild(row(field('Button', pn, 'ctaLabel', { placeholder: 'Join the manifest' }),
                           field('Links to', pn, 'ctaHref', { placeholder: '#enquire' })))
      card.appendChild(field('Fine print', pn, 'fine'))
      card.appendChild(row(
        field('Align', pn, 'align', { type: 'select', options: [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']] }),
        field('Max width', pn, 'width', { type: 'number', placeholder: '660' })))
      card.appendChild(field('Stays visible to the end', pn, 'persist', { type: 'checkbox' }))
      card.appendChild(field('Timing', pn, 'timing', {
        type: 'select',
        options: [['auto', 'Automatic — share the track evenly'], ['manual', 'Pin to the film']],
        restructure: true,
        hint: pn.timing === 'auto' ? null : 'Scroll progress, 0 to 1: fade in, fully on, hold until, gone.'
      }))
      if (pn.timing !== 'auto') {
        if (!Array.isArray(pn.at)) {
          const n = p.panels.length, sl = i / n, sp = 1 / n
          pn.at = [+(sl + sp * 0.05).toFixed(2), +(sl + sp * 0.24).toFixed(2),
                   +(sl + sp * 0.80).toFixed(2), +(sl + sp * 0.97).toFixed(2)]
        }
        card.appendChild(h('div', { class: 'row' }, ['in', 'full', 'hold to', 'out'].map((lab, k) =>
          h('div', { class: 'f' },
            h('label', { class: 'f-label' }, lab),
            h('input', {
              class: 'in', type: 'number', min: -0.05, max: 1.05, step: 0.01, value: pn.at[k],
              oninput: (e) => { pn.at[k] = +e.target.value; touch() }
            })))))
        card.appendChild(h('button', {
          class: 'btn btn-mini',
          onclick: () => {
            /* Read the moment straight off the preview, so a panel can be pinned
               to the frame it is actually about. */
            const frac = document.getElementById('scrub').value / 1000
            pn.at = [+(frac - 0.05).toFixed(3), +frac.toFixed(3), +(frac + 0.08).toFixed(3), +(frac + 0.13).toFixed(3)]
            render()
          }
        }, 'Pin to where the preview is now'))
      }
      b.appendChild(card)
    })
    b.appendChild(h('button', {
      class: 'add',
      onclick: () => {
        p.panels.push({ id: 'panel-' + (p.panels.length + 1), align: 'left', eyebrow: '', heading: '', body: '', specs: '', lines: '', ctaLabel: '', ctaHref: '', fine: '', persist: false, timing: 'auto', width: '' })
        render()
      }
    }, 'Add a panel'))
    b.appendChild(h('div', { style: 'height:12px' }))
    b.appendChild(row(
      field('Scroll length (vh)', p.scroll, 'length', { type: 'number', min: 200, max: 2000, step: 100, hint: 'Longer is a slower scrub.' }),
      field('Easing', p.scroll, 'smoothing', { type: 'number', min: 0.02, max: 1, step: 0.02 })))
  })
}

function secExport () {
  return section('export', 'Export', null, (b) => {
    b.appendChild(h('p', { class: 'note' },
      'The zip is a folder you can drop on any static host — Netlify, Bunny, S3, a subdirectory. One HTML file with the styles, the engine and the config inlined, plus the frames beside it.'))
    b.appendChild(h('button', { class: 'btn btn-go', style: 'width:100%;margin-bottom:8px', onclick: exportSite }, 'Download the site (.zip)'))
    b.appendChild(h('button', { class: 'btn', style: 'width:100%;margin-bottom:8px', onclick: exportPreset }, 'Download the config only (.js)'))
    b.appendChild(h('button', { class: 'btn', style: 'width:100%', onclick: copyPreset }, 'Copy the config to the clipboard'))
    b.appendChild(h('div', { class: 'f-hint', style: 'margin-top:10px' },
      'The config alone drops into templates/scroll-video/presets/ and runs against the shared engine — the right choice when you are building several sites off one copy of the template.'))
  })
}

/* -------------------------------------------------------------- rendering */

function render () {
  const keepScroll = form.scrollTop
  form.textContent = ''
  form.append(secBrand(), secLook(), secFilm(), secInstrument(), secZones(), secPanels(), secExport())
  form.scrollTop = keepScroll
  paintContrast()
  touch()
}

function paintContrast () {
  const el = document.getElementById('contrast')
  if (!el) return
  const p = state.project
  const pairs = [['Text on ground', contrast(p.theme.ink, p.theme.bg)],
                 ['Secondary on ground', contrast(p.theme.muted, p.theme.bg)],
                 ['Accent on ground', contrast(p.theme.accent, p.theme.bg)]]
  el.textContent = ''
  pairs.forEach(([label, ratio]) => {
    const cls = ratio >= 4.5 ? 'ok' : ratio >= 3 ? 'warn' : 'bad'
    el.append(h('div', {}, label + ' ', h('b', { class: cls }, ratio.toFixed(1) + ':1')))
  })
}

/* ------------------------------------------------------------------ actions */

function applyProfession (withCopy) {
  const p = state.project
  const prof = PROFESSIONS[p.profession]
  p.dark = prof.dark
  p.theme = buildTheme(prof.accent, { dark: prof.dark, groundHex: prof.ground })
  p.fontPair = prof.fonts
  p.grade = buildGrade(p.theme, prof.dark)
  p.stage.gradeBlend = prof.dark ? 'multiply' : 'normal'
  p.stage.gradeOpacity = prof.dark ? 0.55 : 1
  p.readout = { show: p.readout.show, ...prof.readout }
  p.rail.step = niceStep(prof.readout.to - prof.readout.from, 8)
  p.rail.majorEvery = niceStep(prof.readout.to - prof.readout.from, 4)
  p.cue.text = prof.cue
  p.loader = { message: prof.loader, ready: prof.ready }
  p.zones = zonesFromLabels(prof.zoneLabels, prof.readout.from, prof.readout.to)
  if (withCopy) {
    p.brand.tagline = prof.story.tagline
    p.mission = prof.story.mission.slice()
    p.panels = starterPanels(prof)
  }
  render()
}

function dropZone (title, sub, accept, onFiles, multiple = false) {
  const input = h('input', {
    type: 'file', accept, multiple, hidden: true,
    onchange: (e) => { if (e.target.files.length) onFiles(e.target.files); e.target.value = '' }
  })
  const z = h('div', {
    class: 'drop',
    onclick: () => input.click(),
    ondragover: (e) => { e.preventDefault(); z.classList.add('is-over') },
    ondragleave: () => z.classList.remove('is-over'),
    ondrop: (e) => { e.preventDefault(); z.classList.remove('is-over'); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files) }
  }, h('b', {}, title), h('small', {}, sub))
  z.appendChild(input)
  return z
}

const busy = { el: $('#busy'), title: $('#busy-title'), fill: $('#busy-fill'), note: $('#busy-note') }
function showBusy (title, note = '') {
  busy.title.textContent = title
  busy.note.textContent = note
  busy.fill.style.width = '0%'
  busy.el.hidden = false
}
const setBusy = (frac, note) => {
  busy.fill.style.width = (frac * 100).toFixed(1) + '%'
  if (note) busy.note.textContent = note
}
const hideBusy = () => { busy.el.hidden = true }

async function cutVideo (file) {
  const p = state.project
  showBusy('Cutting frames', 'reading the file')
  try {
    const { frames, format } = await extractFrames(file, {
      count: p.film.count, width: p.film.width, format: p.film.format, quality: p.film.quality,
      onProgress: (f, i, n) => setBusy(f, `frame ${i} of ${n}`)
    })
    clearFrames(false)
    state.assets.frames = frames
    /* If the browser could not encode what was asked for, the files really are
       the other format — record that so the export names them correctly. */
    p.film.format = format
    p.film.sourceName = file.name
    await saveAssets()
    render()
  } catch (err) {
    alert(err.message || String(err))
  } finally {
    hideBusy()
  }
}

async function loadSequence (files) {
  const frames = await importSequence(files)
  if (!frames.length) return alert('No images in that drop.')
  clearFrames(false)
  state.assets.frames = frames
  state.project.film.sourceName = frames.length + ' imported images'
  await saveAssets()
  render()
}

function clearFrames (rerender = true) {
  releaseFrames(state.assets.frames)
  state.assets.frames = []
  if (rerender) { state.project.film.sourceName = ''; idb.del('frames'); render() }
}

async function setLogo (file) {
  if (!file) return
  if (state.assets.logoUrl) URL.revokeObjectURL(state.assets.logoUrl)
  state.assets.logoBlob = file
  state.assets.logoUrl = URL.createObjectURL(file)
  state.assets.logoExt = (file.name.split('.').pop() || 'png').toLowerCase()
  await idb.set('logo', { blob: file, ext: state.assets.logoExt })
  render()
}
function clearLogo () {
  if (state.assets.logoUrl) URL.revokeObjectURL(state.assets.logoUrl)
  state.assets.logoBlob = null
  state.assets.logoUrl = ''
  idb.del('logo')
  render()
}

function paletteFrom (which) {
  const p = state.project
  const src = which === 'logo' ? state.assets.logoUrl : (state.assets.frames[Math.floor(state.assets.frames.length / 2)] || {}).url
  if (!src) return alert(which === 'logo' ? 'No logo loaded yet.' : 'No film loaded yet.')
  const im = new Image()
  im.onload = () => {
    const pal = samplePalette(im)
    if (!pal || !pal.accent) return alert('Could not find a usable colour in that image.')
    p.dark = which === 'film' ? pal.darkGround : p.dark
    p.theme = buildTheme(pal.accent, { dark: p.dark, groundHex: which === 'film' ? pal.dark : null })
    p.grade = buildGrade(p.theme, p.dark)
    render()
  }
  im.onerror = () => alert('Could not read that image.')
  im.src = src
}

/* ---------------------------------------------------------------- preview */

let previewTimer = 0
function touch (restructure) {
  scheduleSave()
  clearTimeout(previewTimer)
  previewTimer = setTimeout(pushPreview, 260)
  if (restructure) render()
}
function pushPreview () {
  if (!state.previewReady) return
  const cfg = buildConfig(state.project, 'preview', state.assets)
  iframe.contentWindow.postMessage({ type: 'config', source: ser(cfg) }, '*')
}

addEventListener('message', (e) => {
  const m = e.data || {}
  if (m.type === 'preview-ready') { state.previewReady = true; pushPreview() }
  if (m.type === 'preview-scroll') {
    const s = $('#scrub')
    if (document.activeElement !== s) { s.value = Math.round(m.frac * 1000); $('#scrub-out').value = Math.round(m.frac * 100) + '%' }
  }
  if (m.type === 'preview-error') console.warn('[studio] preview refused the config:', m.message)
})

/* ----------------------------------------------------------- persistence */

let saveTimer = 0
function scheduleSave () {
  clearTimeout(saveTimer)
  savedEl.textContent = ''
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem('sv-studio.project', JSON.stringify(state.project))
      savedEl.textContent = 'saved'
    } catch (e) { savedEl.textContent = 'not saved' }
  }, 600)
}
async function saveAssets () {
  try {
    await idb.set('frames', { blobs: state.assets.frames.map((f) => f.blob) })
  } catch (e) { console.warn('[studio] frames not cached:', e) }
}
async function restore () {
  try {
    const stored = localStorage.getItem('sv-studio.project')
    if (stored) state.project = { ...newProject(), ...JSON.parse(stored) }
  } catch (e) {}
  try {
    const f = await idb.get('frames')
    if (f && f.blobs) state.assets.frames = f.blobs.map((b) => ({ blob: b, url: URL.createObjectURL(b) }))
    const l = await idb.get('logo')
    if (l && l.blob) { state.assets.logoBlob = l.blob; state.assets.logoUrl = URL.createObjectURL(l.blob); state.assets.logoExt = l.ext }
  } catch (e) {}
}

/* -------------------------------------------------------------------- export */

function presetSource () {
  return '/* Generated by Scroll Video Studio */\nwindow.SCROLL_VIDEO_CONFIG = ' +
    ser(buildConfig(state.project, 'export', state.assets)) + '\n'
}

function standalone (cfgSrc, css, js) {
  const p = state.project
  const pair = PAIRINGS[p.fontPair]
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const title = p.seo.title || (p.brand.word + (p.brand.tagline ? ' — ' + p.brand.tagline : ''))
  const safe = (s) => s.replace(/<\/script/gi, '<\\/script')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
${p.seo.description ? `<meta name="description" content="${esc(p.seo.description)}">` : ''}
<meta name="theme-color" content="${esc(p.theme.bg)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(p.seo.siteName || p.brand.word)}">
<meta property="og:title" content="${esc(title)}">
${p.seo.description ? `<meta property="og:description" content="${esc(p.seo.description)}">` : ''}
${p.seo.ogImage ? `<meta property="og:image" content="${esc(p.seo.ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${esc(pair.href)}" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<noscript><div style="padding:14vh 8vw;font:300 18px/1.7 system-ui,sans-serif;color:${esc(p.theme.ink)};background:${esc(p.theme.bg)}">This page is a scroll-driven film. It needs JavaScript to run.</div></noscript>
<script>
${safe(cfgSrc)}
</script>
<script>
${safe(js)}
</script>
</body>
</html>
`
}

async function exportSite () {
  showBusy('Packing the site', 'reading the engine')
  try {
    const [css, js] = await Promise.all([
      fetch('../template.css').then((r) => r.text()),
      fetch('../template.js').then((r) => r.text())
    ])
    const p = state.project
    const ext = (FORMATS[p.film.format] || FORMATS.webp).ext
    const files = [{ name: 'index.html', data: standalone(presetSource(), css, js) }]
    state.assets.frames.forEach((f, i) => {
      files.push({ name: `frames/f-${String(i + 1).padStart(4, '0')}.${ext}`, data: f.blob })
      setBusy((i + 1) / (state.assets.frames.length || 1), `frame ${i + 1}`)
    })
    if (state.assets.logoBlob) files.push({ name: 'logo.' + state.assets.logoExt, data: state.assets.logoBlob })
    files.push({
      name: 'README.txt',
      data: `${p.name}\n\nUpload the whole folder to any static host. index.html carries the styles,\nthe engine and the configuration inline; frames/ must sit beside it.\n\nFrames: ${state.assets.frames.length}\nBuilt with Scroll Video Studio.\n`
    })
    setBusy(1, 'zipping')
    download(await makeZip(files), slug(p.name) + '.zip')
  } catch (err) {
    alert('Export failed: ' + (err.message || err))
  } finally {
    hideBusy()
  }
}

function exportPreset () {
  download(new Blob([presetSource()], { type: 'text/javascript' }), slug(state.project.name) + '.js')
}
async function copyPreset () {
  try {
    await navigator.clipboard.writeText(presetSource())
    savedEl.textContent = 'copied'
  } catch (e) { alert('Clipboard refused. Use the download instead.') }
}

/* ------------------------------------------------------------------ chrome */

$('#project-name').addEventListener('input', (e) => { state.project.name = e.target.value; scheduleSave() })
$('#btn-new').addEventListener('click', () => {
  if (!confirm('Start a new project? The current one is replaced.')) return
  clearFrames(false); clearLogo()
  state.project = newProject(state.project.profession)
  $('#project-name').value = state.project.name
  render()
})
$('#btn-save').addEventListener('click', () => {
  download(new Blob([JSON.stringify(state.project, null, 2)], { type: 'application/json' }), slug(state.project.name) + '.json')
})
$('#btn-open').addEventListener('click', () => $('#file-open').click())
$('#file-open').addEventListener('change', async (e) => {
  const f = e.target.files[0]
  if (!f) return
  try {
    state.project = { ...newProject(), ...JSON.parse(await f.text()) }
    $('#project-name').value = state.project.name
    render()
  } catch (err) { alert('That file is not a studio project.') }
  e.target.value = ''
})
$('#btn-export').addEventListener('click', exportSite)
$('#btn-reload').addEventListener('click', () => { iframe.src = iframe.src; state.previewReady = false })

document.querySelectorAll('.seg-b').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.seg-b').forEach((x) => x.classList.toggle('is-on', x === b))
  $('#frame-wrap').classList.toggle('is-phone', b.dataset.device === 'phone')
}))

$('#scrub').addEventListener('input', (e) => {
  const frac = e.target.value / 1000
  $('#scrub-out').value = Math.round(frac * 100) + '%'
  iframe.contentWindow.postMessage({ type: 'scrollTo', frac }, '*')
})

/* -------------------------------------------------------------------- boot */

await restore()
$('#project-name').value = state.project.name
render()
