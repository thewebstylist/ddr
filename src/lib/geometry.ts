import type { Camera, Node, Rect, Vec } from '../types'

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function screenToWorld(p: Vec, cam: Camera): Vec {
  return { x: (p.x - cam.x) / cam.zoom, y: (p.y - cam.y) / cam.zoom }
}

export function worldToScreen(p: Vec, cam: Camera): Vec {
  return { x: p.x * cam.zoom + cam.x, y: p.y * cam.zoom + cam.y }
}

export function rectOf(n: Node): Rect {
  return { x: n.x, y: n.y, w: n.w, h: n.h }
}

export function normalizeRect(a: Vec, b: Vec): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}

export function pointInRect(p: Vec, r: Rect, pad = 0): boolean {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad
}

export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const r of rects) {
    x0 = Math.min(x0, r.x)
    y0 = Math.min(y0, r.y)
    x1 = Math.max(x1, r.x + r.w)
    y1 = Math.max(y1, r.y + r.h)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export function expand(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 }
}

export function center(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

/**
 * Where a connector should leave `r` when heading toward `toward`.
 * Picking the side by dominant axis keeps arrows readable while nodes move.
 */
export function anchorPoint(r: Rect, toward: Vec, anchor: string): Vec {
  const c = center(r)
  let side = anchor
  if (anchor === 'auto') {
    const dx = toward.x - c.x
    const dy = toward.y - c.y
    side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'b' : 't'
  }
  switch (side) {
    case 't':
      return { x: c.x, y: r.y }
    case 'b':
      return { x: c.x, y: r.y + r.h }
    case 'l':
      return { x: r.x, y: c.y }
    default:
      return { x: r.x + r.w, y: c.y }
  }
}

/** Douglas–Peucker, used to keep pen strokes light without visibly changing them. */
export function simplify(points: number[], tolerance = 1): number[] {
  const n = points.length / 2
  if (n < 3) return points.slice()
  const keep = new Uint8Array(n)
  keep[0] = 1
  keep[n - 1] = 1
  const stack: Array<[number, number]> = [[0, n - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()!
    let maxDist = 0
    let index = -1
    const ax = points[first * 2]
    const ay = points[first * 2 + 1]
    const bx = points[last * 2]
    const by = points[last * 2 + 1]
    for (let i = first + 1; i < last; i++) {
      const d = pointSegmentDistance(points[i * 2], points[i * 2 + 1], ax, ay, bx, by)
      if (d > maxDist) {
        maxDist = d
        index = i
      }
    }
    if (maxDist > tolerance && index > 0) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(points[i * 2], points[i * 2 + 1])
  }
  return out
}

export function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = clamp(t, 0, 1)
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

/** Catmull-Rom to cubic Bézier — pen strokes look hand-drawn instead of polygonal. */
export function smoothPath(points: number[]): string {
  const n = points.length / 2
  if (n === 0) return ''
  if (n === 1) return `M ${points[0]} ${points[1]} l 0.01 0`
  let d = `M ${points[0]} ${points[1]}`
  for (let i = 0; i < n - 1; i++) {
    const p0x = points[Math.max(0, i - 1) * 2]
    const p0y = points[Math.max(0, i - 1) * 2 + 1]
    const p1x = points[i * 2]
    const p1y = points[i * 2 + 1]
    const p2x = points[(i + 1) * 2]
    const p2y = points[(i + 1) * 2 + 1]
    const p3x = points[Math.min(n - 1, i + 2) * 2]
    const p3y = points[Math.min(n - 1, i + 2) * 2 + 1]
    const c1x = p1x + (p2x - p0x) / 6
    const c1y = p1y + (p2y - p0y) / 6
    const c2x = p2x - (p3x - p1x) / 6
    const c2y = p2y - (p3y - p1y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2x.toFixed(2)} ${p2y.toFixed(2)}`
  }
  return d
}

/** Snap `value` to the nearest of `targets` when within `threshold`. */
export function snapTo(value: number, targets: number[], threshold: number): number | null {
  let best: number | null = null
  let bestDelta = threshold
  for (const t of targets) {
    const delta = Math.abs(value - t)
    if (delta <= bestDelta) {
      bestDelta = delta
      best = t
    }
  }
  return best
}
