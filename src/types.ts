/**
 * Loft document model.
 *
 * One rule drives the whole shape of this file: a *board* is a node on the
 * canvas, exactly like a sticky or an image. Trello-style structure and
 * Figma-style freeform placement are not two modes — they are the same
 * document, so anything you can do to a shape you can do to a column of work.
 */

export type Id = string

export interface Vec {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type NodeType =
  | 'frame'
  | 'board'
  | 'sticky'
  | 'text'
  | 'image'
  | 'shape'
  | 'ink'
  | 'connector'

export interface BaseNode extends Rect {
  id: Id
  type: NodeType
  /** User-facing name in the layers list. Falls back to a type-derived label. */
  name?: string
  locked?: boolean
  hidden?: boolean
  opacity?: number
}

/** A titled region used to group work. Purely visual — it does not capture children. */
export interface FrameNode extends BaseNode {
  type: 'frame'
  title: string
  fill: string
  stroke: string
}

export interface ChecklistItem {
  id: Id
  text: string
  done: boolean
}

export interface Card {
  id: Id
  title: string
  done: boolean
  notes: string
  checklist: ChecklistItem[]
  /** Label ids, resolved against `Doc.labels`. */
  labels: Id[]
  /** Member ids, resolved against `Doc.members`. */
  assignees: Id[]
  due: string | null
  /** Set when the card is expanded inline to show notes + checklist. */
  expanded?: boolean
}

/** A Trello-style column that lives at an arbitrary point on the canvas. */
export interface BoardNode extends BaseNode {
  type: 'board'
  title: string
  accent: string
  cards: Card[]
  collapsed: boolean
}

export interface StickyNode extends BaseNode {
  type: 'sticky'
  text: string
  fill: string
  fontSize: number
}

export type TextAlign = 'left' | 'center' | 'right'

export interface TextNode extends BaseNode {
  type: 'text'
  text: string
  fontSize: number
  color: string
  weight: number
  align: TextAlign
  /** Monospace is genuinely useful for spec work, so it ships as a first-class toggle. */
  mono?: boolean
}

export interface ImageNode extends BaseNode {
  type: 'image'
  assetId: Id
  alt: string
  radius: number
  /** Kept so "reset to natural size" always works, however far it has been scaled. */
  naturalW: number
  naturalH: number
}

export type ShapeKind = 'rect' | 'ellipse' | 'diamond' | 'triangle'

export interface ShapeNode extends BaseNode {
  type: 'shape'
  shape: ShapeKind
  fill: string
  stroke: string
  strokeWidth: number
  radius: number
  text: string
}

/** A freehand pen stroke. Points are stored local to the node's own box. */
export interface InkNode extends BaseNode {
  type: 'ink'
  points: number[]
  color: string
  size: number
  /** Highlighter strokes render multiplied and semi-transparent. */
  highlighter?: boolean
}

export type Anchor = 'auto' | 't' | 'r' | 'b' | 'l'

export type Endpoint =
  | { kind: 'node'; id: Id; anchor: Anchor }
  | { kind: 'point'; x: number; y: number }

export interface ConnectorNode extends BaseNode {
  type: 'connector'
  from: Endpoint
  to: Endpoint
  color: string
  strokeWidth: number
  dashed: boolean
  arrowStart: boolean
  arrowEnd: boolean
  label: string
}

export type Node =
  | FrameNode
  | BoardNode
  | StickyNode
  | TextNode
  | ImageNode
  | ShapeNode
  | InkNode
  | ConnectorNode

export interface Page {
  id: Id
  name: string
  nodes: Record<Id, Node>
  /** Back-to-front paint order. Also drives the layers panel (reversed). */
  order: Id[]
  background: string
}

export interface Member {
  id: Id
  name: string
  email: string
  color: string
  role: 'owner' | 'editor' | 'commenter' | 'viewer'
  /** Pending invites show differently and can be resent or revoked. */
  pending?: boolean
}

export interface Label {
  id: Id
  name: string
  color: string
}

export interface Doc {
  id: Id
  name: string
  pages: Page[]
  labels: Label[]
  members: Member[]
  /** Bumped when the persisted shape changes so old saves can be discarded safely. */
  schema: number
}

/** Images live outside the document so undo history never carries binary payloads. */
export interface Asset {
  id: Id
  name: string
  type: string
  dataUrl: string
  w: number
  h: number
}

export type Tool =
  | 'select'
  | 'hand'
  | 'board'
  | 'sticky'
  | 'text'
  | 'frame'
  | 'rect'
  | 'ellipse'
  | 'pen'
  | 'connector'
  | 'image'

export interface Camera {
  x: number
  y: number
  zoom: number
}
