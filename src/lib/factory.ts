import type {
  BoardNode,
  Card,
  ChecklistItem,
  ConnectorNode,
  FrameNode,
  ImageNode,
  InkNode,
  Node,
  ShapeKind,
  ShapeNode,
  StickyNode,
  TextNode,
  Vec,
} from '../types'
import { uid } from './id'
import { SWATCHES } from './palette'

export const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  sticky: { w: 200, h: 200 },
  text: { w: 320, h: 48 },
  board: { w: 300, h: 320 },
  frame: { w: 900, h: 600 },
  shape: { w: 220, h: 160 },
  image: { w: 320, h: 240 },
}

export function makeChecklistItem(text = ''): ChecklistItem {
  return { id: uid('chk'), text, done: false }
}

export function makeCard(title = ''): Card {
  return {
    id: uid('card'),
    title,
    done: false,
    notes: '',
    checklist: [],
    labels: [],
    assignees: [],
    due: null,
  }
}

export function makeSticky(at: Vec, fill = SWATCHES[0].fill): StickyNode {
  const { w, h } = DEFAULT_SIZES.sticky
  return { id: uid('n'), type: 'sticky', x: at.x, y: at.y, w, h, text: '', fill, fontSize: 16 }
}

export function makeText(at: Vec): TextNode {
  const { w, h } = DEFAULT_SIZES.text
  return {
    id: uid('n'),
    type: 'text',
    x: at.x,
    y: at.y,
    w,
    h,
    text: '',
    fontSize: 24,
    color: '#e9edf4',
    weight: 500,
    align: 'left',
  }
}

export function makeFrame(at: Vec, w?: number, h?: number): FrameNode {
  return {
    id: uid('n'),
    type: 'frame',
    x: at.x,
    y: at.y,
    w: w ?? DEFAULT_SIZES.frame.w,
    h: h ?? DEFAULT_SIZES.frame.h,
    title: 'Section',
    fill: 'rgba(255,255,255,0.02)',
    stroke: 'rgba(255,255,255,0.14)',
  }
}

export function makeShape(at: Vec, shape: ShapeKind, w?: number, h?: number): ShapeNode {
  return {
    id: uid('n'),
    type: 'shape',
    x: at.x,
    y: at.y,
    w: w ?? DEFAULT_SIZES.shape.w,
    h: h ?? DEFAULT_SIZES.shape.h,
    shape,
    fill: 'rgba(77,171,247,0.14)',
    stroke: '#4dabf7',
    strokeWidth: 2,
    radius: 10,
    text: '',
  }
}

export function makeBoard(at: Vec, title = 'New list'): BoardNode {
  const { w, h } = DEFAULT_SIZES.board
  return {
    id: uid('n'),
    type: 'board',
    x: at.x,
    y: at.y,
    w,
    h,
    title,
    accent: SWATCHES[4].accent,
    // A list with no cards is a dead end; ship it ready to type into.
    cards: [makeCard('')],
    collapsed: false,
  }
}

export function makeImage(at: Vec, assetId: string, naturalW: number, naturalH: number, alt: string): ImageNode {
  // Land large uploads at a workable size rather than a wall of pixels.
  const maxSide = 520
  const scale = Math.min(1, maxSide / Math.max(naturalW, naturalH))
  return {
    id: uid('n'),
    type: 'image',
    x: at.x,
    y: at.y,
    w: Math.round(naturalW * scale),
    h: Math.round(naturalH * scale),
    assetId,
    alt,
    radius: 8,
    naturalW,
    naturalH,
  }
}

export function makeInk(color: string, size: number, highlighter: boolean): InkNode {
  return {
    id: uid('n'),
    type: 'ink',
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    points: [],
    color,
    size,
    highlighter,
  }
}

export function makeConnector(from: ConnectorNode['from'], to: ConnectorNode['to']): ConnectorNode {
  return {
    id: uid('n'),
    type: 'connector',
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    from,
    to,
    color: '#8b98a8',
    strokeWidth: 2,
    dashed: false,
    arrowStart: false,
    arrowEnd: true,
    label: '',
  }
}

export function displayName(n: Node): string {
  if (n.name) return n.name
  switch (n.type) {
    case 'board':
      return n.title || 'List'
    case 'frame':
      return n.title || 'Section'
    case 'sticky':
      return n.text.split('\n')[0].slice(0, 28) || 'Sticky'
    case 'text':
      return n.text.split('\n')[0].slice(0, 28) || 'Text'
    case 'image':
      return n.alt || 'Image'
    case 'shape':
      return n.text.split('\n')[0].slice(0, 28) || capitalize(n.shape)
    case 'ink':
      return n.highlighter ? 'Highlight' : 'Drawing'
    case 'connector':
      return n.label || 'Connector'
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Cards done / cards total, counting checklist items when a card has them. */
export function boardProgress(board: BoardNode): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const card of board.cards) {
    if (card.checklist.length > 0) {
      total += card.checklist.length
      done += card.checklist.filter((i) => i.done).length
    } else {
      total += 1
      if (card.done) done += 1
    }
  }
  return { done, total }
}
