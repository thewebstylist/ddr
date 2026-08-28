/* Pulling a scheme out of whatever the client sent — a logo, or the film itself. */

const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')

export function hexToRgb (h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim())
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

export const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

function hsl ([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToRgb (h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}

/** Reads an <img>, <canvas> or <video> and returns the colours worth using. */
export function samplePalette (source, size = 48) {
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0, size, size)
  let px
  try { px = ctx.getImageData(0, 0, size, size).data } catch (e) { return null }

  /* Bucket to 5 bits per channel so near-identical pixels count as one colour. */
  const bins = new Map()
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue                       // transparent logo ground
    const key = (px[i] >> 3) << 10 | (px[i + 1] >> 3) << 5 | (px[i + 2] >> 3)
    const b = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 }
    b.n++; b.r += px[i]; b.g += px[i + 1]; b.b += px[i + 2]
    bins.set(key, b)
  }
  if (!bins.size) return null

  const colours = [...bins.values()]
    .map((b) => ({ n: b.n, rgb: [b.r / b.n, b.g / b.n, b.b / b.n] }))
    .map((c) => ({ ...c, hsl: hsl(c.rgb), lum: luminance(c.rgb) }))
    .sort((a, b) => b.n - a.n)

  const ground = colours[0]

  /* Accent: the most present colour that is actually a colour. Weight by how
     much of the picture it covers and how saturated it is, and refuse anything
     too close to the ground colour to read against it. */
  const accent = colours
    .map((c) => ({ c, score: Math.sqrt(c.n) * Math.pow(c.hsl[1], 1.6) * (Math.abs(c.lum - ground.lum) + 0.15) }))
    .sort((a, b) => b.score - a.score)[0]

  return {
    ground: rgbToHex(...ground.rgb),
    accent: accent && accent.c.hsl[1] > 0.12 ? rgbToHex(...accent.c.rgb) : null,
    dark: rgbToHex(...(colours.slice().sort((a, b) => a.lum - b.lum)[0].rgb)),
    light: rgbToHex(...(colours.slice().sort((a, b) => b.lum - a.lum)[0].rgb)),
    darkGround: ground.lum < 0.45
  }
}

/**
 * One seed colour and a light/dark choice is enough to build the whole scheme.
 * The engine derives the translucent variants itself, so five values is all it
 * ever needs.
 */
export function buildTheme (accentHex, { dark = true, groundHex = null } = {}) {
  const [h, s] = hsl(hexToRgb(accentHex))
  const accent = accentHex

  if (dark) {
    const bg = groundHex || rgbToHex(...hslToRgb(h, Math.min(0.55, s * 0.55), 0.03))
    return {
      bg,
      ink: rgbToHex(...hslToRgb(h, 0.16, 0.94)),
      muted: rgbToHex(...hslToRgb(h, 0.18, 0.60)),
      accent,
      ctaInk: rgbToHex(...hslToRgb(h, 0.85, 0.06)),
      panelBg: 'rgba(0,0,0,.72)',
      vignette: 'rgba(0,0,0,.55)'
    }
  }
  const bg = groundHex || rgbToHex(...hslToRgb(h, Math.min(0.30, s * 0.30), 0.94))
  return {
    bg,
    ink: rgbToHex(...hslToRgb(h, 0.30, 0.08)),
    muted: rgbToHex(...hslToRgb(h, 0.14, 0.40)),
    accent,
    ctaInk: rgbToHex(...hslToRgb(h, 0.20, 0.97)),
    panelBg: 'rgba(255,255,255,.80)',
    vignette: 'rgba(20,18,15,.12)'
  }
}

/** Grade stops that travel from the top of the film to the bottom of it. */
export function buildGrade (theme, dark = true) {
  const [h, s] = hsl(hexToRgb(theme.accent))
  return dark
    ? [[0, rgbToHex(...hslToRgb(h, Math.min(0.5, s * 0.5), 0.12))],
       [0.4, rgbToHex(...hslToRgb(h, Math.min(0.6, s * 0.6), 0.06))],
       [1, theme.bg]]
    : [[0, theme.bg],
       [0.5, rgbToHex(...hslToRgb(h, Math.min(0.2, s * 0.2), 0.90))],
       [1, rgbToHex(...hslToRgb(h + 0.5, 0.10, 0.86))]]
}

/* WCAG contrast, so the studio can say when a scheme will not read. */
export function contrast (a, b) {
  const lin = (hex) => hexToRgb(hex).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  const L = (hex) => { const [r, g, bl] = lin(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * bl }
  const la = L(a), lb = L(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
