import type { Rect, Vec } from '../types'
import { screenToWorld } from '../lib/geometry'
import { store } from '../store/store'

/**
 * The canvas element's live geometry, shared with commands that live outside
 * the canvas (menus, shortcuts, the command palette) and need to zoom or place
 * something relative to what the user can currently see.
 */
export const viewport = {
  el: null as HTMLDivElement | null,
  w: 0,
  h: 0,
}

export function viewportSize(): { w: number; h: number } {
  return { w: viewport.w || window.innerWidth, h: viewport.h || window.innerHeight }
}

export function clientToWorld(clientX: number, clientY: number): Vec {
  const rect = viewport.el?.getBoundingClientRect()
  const x = clientX - (rect?.left ?? 0)
  const y = clientY - (rect?.top ?? 0)
  return screenToWorld({ x, y }, store.getState().camera)
}

/** World point at the centre of the visible canvas — where new things land. */
export function viewCenter(): Vec {
  const { w, h } = viewportSize()
  return screenToWorld({ x: w / 2, y: h / 2 }, store.getState().camera)
}

/** A point near the top-left of the view, offset so successive drops cascade. */
export function dropPoint(index = 0): Vec {
  const c = viewCenter()
  return { x: c.x + index * 28, y: c.y + index * 28 }
}

export function contentBounds(): Rect | null {
  const s = store.getState()
  const page = s.doc.pages.find((p) => p.id === s.pageId)
  if (!page) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  let any = false
  for (const id of page.order) {
    const n = page.nodes[id]
    if (!n || n.type === 'connector' || n.hidden) continue
    any = true
    x0 = Math.min(x0, n.x)
    y0 = Math.min(y0, n.y)
    x1 = Math.max(x1, n.x + n.w)
    y1 = Math.max(y1, n.y + n.h)
  }
  return any ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null
}
