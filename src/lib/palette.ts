/**
 * One palette, used everywhere. Sticky colors, board accents, labels and member
 * chips all draw from the same ramp so a busy canvas still reads as one system.
 */
export interface Swatch {
  id: string
  name: string
  /** Surface fill — muted enough that dark text sits on it comfortably. */
  fill: string
  /** Saturated companion for accents, strokes and dots. */
  accent: string
}

export const SWATCHES: Swatch[] = [
  { id: 'amber', name: 'Amber', fill: '#3a2f16', accent: '#f0b429' },
  { id: 'coral', name: 'Coral', fill: '#3c211c', accent: '#f2704f' },
  { id: 'rose', name: 'Rose', fill: '#3a1d29', accent: '#f06595' },
  { id: 'violet', name: 'Violet', fill: '#2b2145', accent: '#a78bfa' },
  { id: 'blue', name: 'Blue', fill: '#152b40', accent: '#4dabf7' },
  { id: 'teal', name: 'Teal', fill: '#12302f', accent: '#2dd4bf' },
  { id: 'green', name: 'Green', fill: '#182f1f', accent: '#5bd07f' },
  { id: 'slate', name: 'Slate', fill: '#23272e', accent: '#8b98a8' },
]

export const ACCENTS = SWATCHES.map((s) => s.accent)

export function swatchByAccent(accent: string): Swatch {
  return SWATCHES.find((s) => s.accent === accent) ?? SWATCHES[0]
}

export const INK_COLORS = ['#f4f6fa', '#f0b429', '#f2704f', '#f06595', '#a78bfa', '#4dabf7', '#2dd4bf', '#5bd07f']

/** Deterministic color per member so avatars stay stable across sessions. */
export function colorForSeed(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
