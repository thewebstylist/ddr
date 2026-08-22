import type { Node, Rect } from '../types'

export interface Guide {
  axis: 'x' | 'y'
  at: number
  from: number
  to: number
}

export interface SnapResult {
  dx: number
  dy: number
  guides: Guide[]
}

/**
 * Edge- and centre-alignment snapping against everything else on the page.
 * Threshold is expressed in screen pixels so snapping feels the same at any zoom.
 */
export function computeSnap(moving: Rect, others: Node[], zoom: number, thresholdPx = 6): SnapResult {
  const threshold = thresholdPx / zoom
  const movingX = [moving.x, moving.x + moving.w / 2, moving.x + moving.w]
  const movingY = [moving.y, moving.y + moving.h / 2, moving.y + moving.h]

  let bestX: { delta: number; at: number; other: Rect } | null = null
  let bestY: { delta: number; at: number; other: Rect } | null = null

  for (const other of others) {
    if (other.type === 'connector') continue
    const ox = [other.x, other.x + other.w / 2, other.x + other.w]
    const oy = [other.y, other.y + other.h / 2, other.y + other.h]

    for (const m of movingX) {
      for (const o of ox) {
        const delta = o - m
        if (Math.abs(delta) <= threshold && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
          bestX = { delta, at: o, other }
        }
      }
    }
    for (const m of movingY) {
      for (const o of oy) {
        const delta = o - m
        if (Math.abs(delta) <= threshold && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
          bestY = { delta, at: o, other }
        }
      }
    }
  }

  const guides: Guide[] = []
  if (bestX) {
    const a = bestX.other
    guides.push({
      axis: 'x',
      at: bestX.at,
      from: Math.min(a.y, moving.y + (bestY?.delta ?? 0)) - 20,
      to: Math.max(a.y + a.h, moving.y + moving.h) + 20,
    })
  }
  if (bestY) {
    const a = bestY.other
    guides.push({
      axis: 'y',
      at: bestY.at,
      from: Math.min(a.x, moving.x) - 20,
      to: Math.max(a.x + a.w, moving.x + moving.w) + 20,
    })
  }

  return { dx: bestX?.delta ?? 0, dy: bestY?.delta ?? 0, guides }
}
