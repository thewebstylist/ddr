import { produce, setAutoFreeze } from 'immer'
import type {
  Anchor,
  Camera,
  Card,
  Doc,
  Id,
  Label,
  Member,
  Node,
  Page,
  Rect,
  ShapeKind,
  TextAlign,
  Tool,
  Vec,
} from '../types'
import { uid } from '../lib/id'
import { makeBoard, makeCard, makeChecklistItem, makeSticky } from '../lib/factory'
import { rectOf, unionRects } from '../lib/geometry'
import { colorForSeed } from '../lib/palette'

setAutoFreeze(false)

/** Transient creation state that must never enter undo history. */
export type Draft =
  | { kind: 'marquee'; start: Vec; current: Vec; additive: boolean }
  | { kind: 'insert'; tool: Tool; start: Vec; current: Vec }
  | { kind: 'ink'; nodeId: Id }
  | { kind: 'connector'; nodeId: Id }
  | {
      kind: 'card'
      cardId: Id
      fromBoard: Id
      title: string
      pointer: Vec
      /** Live drop target, recomputed on every pointer move. */
      overBoard: Id | null
      overIndex: number
    }

export type RightPanel = 'design' | 'members' | 'history' | null

export interface Toast {
  id: Id
  text: string
  action?: { label: string; run: () => void }
}

export interface AppState {
  doc: Doc
  pageId: Id
  camera: Camera
  /** Each page remembers where you were last looking. */
  cameras: Record<Id, Camera>
  tool: Tool
  /** When false (the default) a creation tool reverts to Select after one use. */
  toolLocked: boolean
  selection: Id[]
  editingId: Id | null
  focusedCardId: Id | null
  draft: Draft | null
  leftPanel: boolean
  rightPanel: RightPanel
  snap: boolean
  showGrid: boolean
  inkColor: string
  inkSize: number
  highlighter: boolean
  commandPalette: boolean
  shortcuts: boolean
  inviteOpen: boolean
  toasts: Toast[]
  /** Human-readable label of the last undoable action, shown in the history panel. */
  historyLabels: string[]
  redoLabels: string[]
  /** Set while the pointer is over the window during a file drag. */
  fileDropActive: boolean
  /** What this signed-in person is allowed to do with the open project. */
  role: Member['role']
  saveState: 'idle' | 'saving' | 'saved'
}

interface HistoryEntry {
  doc: Doc
  label: string
  selection: Id[]
  pageId: Id
}

interface CommitOptions {
  /** Omit or set false for pure UI changes that should not be undoable. */
  history?: boolean | string
  /** Successive commits sharing a key inside the coalesce window collapse into one. */
  coalesce?: string
}

const MAX_HISTORY = 200
const COALESCE_MS = 700

type Listener = () => void

class Store {
  private state: AppState
  private listeners = new Set<Listener>()
  private past: HistoryEntry[] = []
  private future: HistoryEntry[] = []
  private lastCoalesceKey: string | null = null
  private lastCommitAt = 0

  constructor(initial: AppState) {
    this.state = initial
  }

  getState = (): AppState => this.state

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    for (const fn of this.listeners) fn()
  }

  /** Apply an immer recipe. Pass `history` to make the change undoable. */
  commit(recipe: (draft: AppState) => void, options: CommitOptions = {}) {
    const label = typeof options.history === 'string' ? options.history : 'Edit'
    const undoable = options.history !== undefined && options.history !== false
    const before = this.state

    const next = produce(before, recipe)
    if (next === before) return

    if (undoable && next.doc !== before.doc) {
      const now = Date.now()
      const canCoalesce =
        options.coalesce !== undefined &&
        options.coalesce === this.lastCoalesceKey &&
        now - this.lastCommitAt < COALESCE_MS &&
        this.past.length > 0

      if (!canCoalesce) {
        this.past.push({
          doc: before.doc,
          label,
          selection: before.selection,
          pageId: before.pageId,
        })
        if (this.past.length > MAX_HISTORY) this.past.shift()
      }
      this.future = []
      this.lastCoalesceKey = options.coalesce ?? null
      this.lastCommitAt = now
    }

    this.state = next
    this.syncHistoryLabels()
    this.emit()
  }

  private syncHistoryLabels() {
    const past = this.past.map((h) => h.label)
    const future = this.future.map((h) => h.label)
    if (
      past.length !== this.state.historyLabels.length ||
      future.length !== this.state.redoLabels.length ||
      past.some((l, i) => l !== this.state.historyLabels[i])
    ) {
      this.state = { ...this.state, historyLabels: past, redoLabels: future }
    }
  }

  canUndo = () => this.past.length > 0
  canRedo = () => this.future.length > 0

  undo() {
    const entry = this.past.pop()
    if (!entry) return
    this.future.unshift({
      doc: this.state.doc,
      label: entry.label,
      selection: this.state.selection,
      pageId: this.state.pageId,
    })
    this.lastCoalesceKey = null
    this.state = {
      ...this.state,
      doc: entry.doc,
      pageId: entry.pageId,
      selection: entry.selection,
      editingId: null,
      draft: null,
    }
    this.syncHistoryLabels()
    this.emit()
  }

  redo() {
    const entry = this.future.shift()
    if (!entry) return
    this.past.push({
      doc: this.state.doc,
      label: entry.label,
      selection: this.state.selection,
      pageId: this.state.pageId,
    })
    this.lastCoalesceKey = null
    this.state = {
      ...this.state,
      doc: entry.doc,
      pageId: entry.pageId,
      selection: entry.selection,
      editingId: null,
      draft: null,
    }
    this.syncHistoryLabels()
    this.emit()
  }

  /** Used after loading a saved document — history should not span the load. */
  resetHistory() {
    this.past = []
    this.future = []
    this.syncHistoryLabels()
    this.emit()
  }
}

export let store: Store

export function initStore(initial: AppState) {
  store = new Store(initial)
  return store
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Owners and editors may change the canvas itself. */
export function canEdit(s: AppState): boolean {
  return s.role === 'owner' || s.role === 'editor'
}

/** Commenters may also tick things off and leave notes, but not restructure. */
export function canComment(s: AppState): boolean {
  return s.role !== 'viewer'
}

export function currentPage(s: AppState): Page {
  return s.doc.pages.find((p) => p.id === s.pageId) ?? s.doc.pages[0]
}

export function nodeById(s: AppState, id: Id): Node | undefined {
  return currentPage(s).nodes[id]
}

export function selectedNodes(s: AppState): Node[] {
  const page = currentPage(s)
  return s.selection.map((id) => page.nodes[id]).filter(Boolean) as Node[]
}

export function selectionBounds(s: AppState): Rect | null {
  const nodes = selectedNodes(s).filter((n) => n.type !== 'connector')
  return unionRects(nodes.map(rectOf))
}

export function findCard(page: Page, cardId: Id): { board: Id; index: number; card: Card } | null {
  for (const id of page.order) {
    const n = page.nodes[id]
    if (n?.type !== 'board') continue
    const index = n.cards.findIndex((c) => c.id === cardId)
    if (index >= 0) return { board: id, index, card: n.cards[index] }
  }
  return null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function page(draft: AppState): Page {
  return draft.doc.pages.find((p) => p.id === draft.pageId) ?? draft.doc.pages[0]
}

let toastTimer: Record<string, number> = {}

export const actions = {
  // -- shell -------------------------------------------------------------
  setTool(tool: Tool) {
    store.commit((d) => {
      d.tool = tool
      d.editingId = null
      if (tool !== 'select') d.selection = []
    })
  },

  toggleToolLock() {
    store.commit((d) => {
      d.toolLocked = !d.toolLocked
    })
  },

  /** Called after a creation gesture completes; honours the tool lock. */
  finishToolUse() {
    store.commit((d) => {
      if (!d.toolLocked && d.tool !== 'select' && d.tool !== 'hand') d.tool = 'select'
    })
  },

  setPanel(side: 'left' | 'right', value: boolean | RightPanel) {
    store.commit((d) => {
      if (side === 'left') d.leftPanel = value as boolean
      else d.rightPanel = value as RightPanel
    })
  },

  toggleSnap() {
    store.commit((d) => {
      d.snap = !d.snap
    })
  },

  toggleGrid() {
    store.commit((d) => {
      d.showGrid = !d.showGrid
    })
  },

  setCommandPalette(open: boolean) {
    store.commit((d) => {
      d.commandPalette = open
    })
  },

  setShortcuts(open: boolean) {
    store.commit((d) => {
      d.shortcuts = open
    })
  },

  setInvite(open: boolean) {
    store.commit((d) => {
      d.inviteOpen = open
    })
  },

  setFileDropActive(active: boolean) {
    store.commit((d) => {
      d.fileDropActive = active
    })
  },

  setSaveState(v: AppState['saveState']) {
    store.commit((d) => {
      d.saveState = v
    })
  },

  toast(text: string, action?: Toast['action']) {
    const id = uid('t')
    store.commit((d) => {
      d.toasts.push({ id, text, action })
      if (d.toasts.length > 3) d.toasts.shift()
    })
    toastTimer[id] = window.setTimeout(() => actions.dismissToast(id), action ? 7000 : 3200)
  },

  dismissToast(id: Id) {
    window.clearTimeout(toastTimer[id])
    delete toastTimer[id]
    store.commit((d) => {
      d.toasts = d.toasts.filter((t) => t.id !== id)
    })
  },

  setRole(role: Member['role']) {
    store.commit((d) => {
      d.role = role
      if (role === 'viewer' || role === 'commenter') {
        d.tool = 'select'
        d.editingId = null
      }
    })
  },

  // -- camera ------------------------------------------------------------
  setCamera(cam: Camera) {
    store.commit((d) => {
      d.camera = cam
    })
  },

  panBy(dx: number, dy: number) {
    store.commit((d) => {
      d.camera.x -= dx
      d.camera.y -= dy
    })
  },

  zoomAt(point: Vec, factor: number) {
    store.commit((d) => {
      const nextZoom = Math.min(6, Math.max(0.05, d.camera.zoom * factor))
      const k = nextZoom / d.camera.zoom
      d.camera.x = point.x - (point.x - d.camera.x) * k
      d.camera.y = point.y - (point.y - d.camera.y) * k
      d.camera.zoom = nextZoom
    })
  },

  zoomToRect(rect: Rect, viewport: { w: number; h: number }, padding = 64) {
    store.commit((d) => {
      const zoom = Math.min(
        3,
        Math.max(
          0.05,
          Math.min((viewport.w - padding * 2) / Math.max(rect.w, 1), (viewport.h - padding * 2) / Math.max(rect.h, 1)),
        ),
      )
      d.camera.zoom = zoom
      d.camera.x = viewport.w / 2 - (rect.x + rect.w / 2) * zoom
      d.camera.y = viewport.h / 2 - (rect.y + rect.h / 2) * zoom
    })
  },

  // -- selection ---------------------------------------------------------
  select(ids: Id[], additive = false) {
    store.commit((d) => {
      if (additive) {
        const set = new Set(d.selection)
        for (const id of ids) {
          if (set.has(id)) set.delete(id)
          else set.add(id)
        }
        d.selection = [...set]
      } else {
        d.selection = ids
      }
      if (d.editingId && !d.selection.includes(d.editingId)) d.editingId = null
    })
  },

  selectAll() {
    store.commit((d) => {
      d.selection = page(d).order.filter((id) => !page(d).nodes[id]?.locked)
    })
  },

  clearSelection() {
    store.commit((d) => {
      d.selection = []
      d.editingId = null
      d.focusedCardId = null
    })
  },

  setEditing(id: Id | null) {
    store.commit((d) => {
      d.editingId = id
      if (id && !d.selection.includes(id)) d.selection = [id]
    })
  },

  setFocusedCard(id: Id | null) {
    store.commit((d) => {
      d.focusedCardId = id
    })
  },

  setDraft(draft: Draft | null) {
    store.commit((d) => {
      d.draft = draft
    })
  },

  // -- nodes -------------------------------------------------------------
  addNode(node: Node, options: { select?: boolean; label?: string } = {}) {
    store.commit(
      (d) => {
        const p = page(d)
        p.nodes[node.id] = node
        p.order.push(node.id)
        if (options.select !== false) d.selection = [node.id]
      },
      { history: options.label ?? `Add ${node.type}` },
    )
  },

  addNodes(nodes: Node[], label = 'Add items') {
    if (nodes.length === 0) return
    store.commit(
      (d) => {
        const p = page(d)
        for (const n of nodes) {
          p.nodes[n.id] = n
          p.order.push(n.id)
        }
        d.selection = nodes.map((n) => n.id)
      },
      { history: label },
    )
  },

  updateNode(id: Id, patch: Partial<Node>, options: CommitOptions = { history: 'Edit' }) {
    store.commit((d) => {
      const n = page(d).nodes[id]
      if (!n) return
      Object.assign(n, patch)
    }, options)
  },

  /** Live drag/resize updates: not committed to history until `endTransform`. */
  transformNodes(updates: Array<{ id: Id; rect: Partial<Rect> }>) {
    store.commit((d) => {
      const p = page(d)
      for (const u of updates) {
        const n = p.nodes[u.id]
        if (!n) continue
        Object.assign(n, u.rect)
      }
    })
  },

  /** Snapshots the pre-drag document so one gesture is one undo step. */
  beginTransform(label: string, coalesce?: string) {
    store.commit(
      (d) => {
        // Touch the document so the history entry records the pre-gesture state.
        d.doc = { ...d.doc }
      },
      { history: label, coalesce },
    )
  },

  deleteNodes(ids: Id[]) {
    if (ids.length === 0) return
    store.commit(
      (d) => {
        const p = page(d)
        const dead = new Set(ids)
        for (const id of ids) delete p.nodes[id]
        // Connectors dangling off a deleted node go with it.
        for (const id of [...p.order]) {
          const n = p.nodes[id]
          if (n?.type === 'connector') {
            const a = n.from.kind === 'node' && dead.has(n.from.id)
            const b = n.to.kind === 'node' && dead.has(n.to.id)
            if (a || b) {
              delete p.nodes[id]
              dead.add(id)
            }
          }
        }
        p.order = p.order.filter((id) => !dead.has(id))
        d.selection = d.selection.filter((id) => !dead.has(id))
        d.editingId = null
      },
      { history: ids.length > 1 ? `Delete ${ids.length} items` : 'Delete' },
    )
  },

  duplicateNodes(ids: Id[], offset = 24) {
    if (ids.length === 0) return
    const newIds: Id[] = []
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of ids) {
          const src = p.nodes[id]
          if (!src || src.type === 'connector') continue
          const copy = structuredClone(src) as Node
          copy.id = uid('n')
          copy.x += offset
          copy.y += offset
          if (copy.type === 'board') {
            copy.cards = copy.cards.map((c) => ({
              ...c,
              id: uid('card'),
              checklist: c.checklist.map((i) => ({ ...i, id: uid('chk') })),
            }))
          }
          p.nodes[copy.id] = copy
          p.order.push(copy.id)
          newIds.push(copy.id)
        }
        d.selection = newIds
      },
      { history: 'Duplicate' },
    )
  },

  reorder(ids: Id[], where: 'front' | 'back' | 'forward' | 'backward') {
    store.commit(
      (d) => {
        const p = page(d)
        const set = new Set(ids)
        const moving = p.order.filter((id) => set.has(id))
        const rest = p.order.filter((id) => !set.has(id))
        if (where === 'front') p.order = [...rest, ...moving]
        else if (where === 'back') p.order = [...moving, ...rest]
        else {
          const dir = where === 'forward' ? 1 : -1
          const next = [...p.order]
          const indices = ids.map((id) => next.indexOf(id)).sort((a, b) => (dir > 0 ? b - a : a - b))
          for (const i of indices) {
            const j = i + dir
            if (j < 0 || j >= next.length || set.has(next[j])) continue
            ;[next[i], next[j]] = [next[j], next[i]]
          }
          p.order = next
        }
      },
      { history: 'Reorder' },
    )
  },

  align(ids: Id[], edge: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') {
    if (ids.length < 2) return
    store.commit(
      (d) => {
        const p = page(d)
        const nodes = ids.map((id) => p.nodes[id]).filter((n) => n && n.type !== 'connector') as Node[]
        const bounds = unionRects(nodes.map(rectOf))
        if (!bounds) return
        for (const n of nodes) {
          switch (edge) {
            case 'left':
              n.x = bounds.x
              break
            case 'right':
              n.x = bounds.x + bounds.w - n.w
              break
            case 'hcenter':
              n.x = bounds.x + (bounds.w - n.w) / 2
              break
            case 'top':
              n.y = bounds.y
              break
            case 'bottom':
              n.y = bounds.y + bounds.h - n.h
              break
            case 'vcenter':
              n.y = bounds.y + (bounds.h - n.h) / 2
              break
          }
        }
      },
      { history: 'Align' },
    )
  },

  distribute(ids: Id[], axis: 'h' | 'v') {
    if (ids.length < 3) return
    store.commit(
      (d) => {
        const p = page(d)
        const nodes = (ids.map((id) => p.nodes[id]).filter((n) => n && n.type !== 'connector') as Node[]).sort((a, b) =>
          axis === 'h' ? a.x - b.x : a.y - b.y,
        )
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const span =
          axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y
        const totalSize = nodes.reduce((sum, n) => sum + (axis === 'h' ? n.w : n.h), 0)
        const gap = (span - totalSize) / (nodes.length - 1)
        let cursor = axis === 'h' ? first.x : first.y
        for (const n of nodes) {
          if (axis === 'h') {
            n.x = cursor
            cursor += n.w + gap
          } else {
            n.y = cursor
            cursor += n.h + gap
          }
        }
      },
      { history: 'Distribute' },
    )
  },

  setTextAlign(ids: Id[], align: TextAlign) {
    store.commit(
      (d) => {
        for (const id of ids) {
          const n = page(d).nodes[id]
          if (n?.type === 'text') n.align = align
        }
      },
      { history: 'Align text' },
    )
  },

  setShapeKind(ids: Id[], shape: ShapeKind) {
    store.commit(
      (d) => {
        for (const id of ids) {
          const n = page(d).nodes[id]
          if (n?.type === 'shape') n.shape = shape
        }
      },
      { history: 'Change shape' },
    )
  },

  setInkStyle(color: string, size: number, highlighter: boolean) {
    store.commit((d) => {
      d.inkColor = color
      d.inkSize = size
      d.highlighter = highlighter
    })
  },

  // -- boards ------------------------------------------------------------
  addCard(boardId: Id, title = '', index?: number) {
    const card = makeCard(title)
    store.commit(
      (d) => {
        const n = page(d).nodes[boardId]
        if (n?.type !== 'board') return
        if (index === undefined) n.cards.push(card)
        else n.cards.splice(index, 0, card)
        d.focusedCardId = card.id
      },
      { history: 'Add card' },
    )
    return card.id
  },

  updateCard(cardId: Id, patch: Partial<Card>, options: CommitOptions = { history: 'Edit card' }) {
    store.commit((d) => {
      const p = page(d)
      for (const id of p.order) {
        const n = p.nodes[id]
        if (n?.type !== 'board') continue
        const card = n.cards.find((c) => c.id === cardId)
        if (card) {
          Object.assign(card, patch)
          return
        }
      }
    }, options)
  },

  deleteCard(cardId: Id) {
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const i = n.cards.findIndex((c) => c.id === cardId)
          if (i >= 0) {
            n.cards.splice(i, 1)
            if (d.focusedCardId === cardId) d.focusedCardId = null
            return
          }
        }
      },
      { history: 'Delete card' },
    )
  },

  moveCard(cardId: Id, toBoard: Id, toIndex: number) {
    store.commit(
      (d) => {
        const p = page(d)
        let moved: Card | null = null
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const i = n.cards.findIndex((c) => c.id === cardId)
          if (i >= 0) {
            moved = n.cards.splice(i, 1)[0]
            // Removing from earlier in the same list shifts the target index.
            if (id === toBoard && i < toIndex) toIndex -= 1
            break
          }
        }
        if (!moved) return
        const target = p.nodes[toBoard]
        if (target?.type !== 'board') return
        target.cards.splice(Math.max(0, Math.min(toIndex, target.cards.length)), 0, moved)
      },
      { history: 'Move card' },
    )
  },

  toggleCardDone(cardId: Id) {
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const card = n.cards.find((c) => c.id === cardId)
          if (!card) continue
          card.done = !card.done
          // Checking off a card checks off everything under it, which is what
          // people expect and is a single undo away if it was not.
          if (card.done) for (const item of card.checklist) item.done = true
          return
        }
      },
      { history: 'Toggle card' },
    )
  },

  addChecklistItem(cardId: Id, text = '') {
    const item = makeChecklistItem(text)
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const card = n.cards.find((c) => c.id === cardId)
          if (card) {
            card.checklist.push(item)
            card.expanded = true
            return
          }
        }
      },
      { history: 'Add checklist item' },
    )
    return item.id
  },

  updateChecklistItem(cardId: Id, itemId: Id, patch: Partial<{ text: string; done: boolean }>, options?: CommitOptions) {
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const card = n.cards.find((c) => c.id === cardId)
          if (!card) continue
          const item = card.checklist.find((i) => i.id === itemId)
          if (!item) continue
          Object.assign(item, patch)
          // A card whose every item is checked is itself done.
          card.done = card.checklist.length > 0 && card.checklist.every((i) => i.done)
          return
        }
      },
      options ?? { history: 'Edit checklist' },
    )
  },

  deleteChecklistItem(cardId: Id, itemId: Id) {
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const card = n.cards.find((c) => c.id === cardId)
          if (!card) continue
          card.checklist = card.checklist.filter((i) => i.id !== itemId)
          return
        }
      },
      { history: 'Delete checklist item' },
    )
  },

  toggleCardLabel(cardId: Id, labelId: Id) {
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const card = n.cards.find((c) => c.id === cardId)
          if (!card) continue
          card.labels = card.labels.includes(labelId)
            ? card.labels.filter((l) => l !== labelId)
            : [...card.labels, labelId]
          return
        }
      },
      { history: 'Toggle label' },
    )
  },

  toggleCardAssignee(cardId: Id, memberId: Id) {
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const card = n.cards.find((c) => c.id === cardId)
          if (!card) continue
          card.assignees = card.assignees.includes(memberId)
            ? card.assignees.filter((m) => m !== memberId)
            : [...card.assignees, memberId]
          return
        }
      },
      { history: 'Assign' },
    )
  },

  /**
   * Promote loose notes into a list of work. This is the hinge between the two
   * halves of the product: a workshop ends with stickies, and the next thing
   * anyone wants is those stickies as tasks, without retyping them.
   */
  stickiesToList(ids: Id[]) {
    store.commit(
      (d) => {
        const p = page(d)
        const notes = ids
          .map((id) => p.nodes[id])
          .filter((n): n is Extract<Node, { type: 'sticky' }> => n?.type === 'sticky')
          .sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x))
        if (notes.length === 0) return

        let right = -Infinity
        let top = Infinity
        for (const n of notes) {
          right = Math.max(right, n.x + n.w)
          top = Math.min(top, n.y)
        }

        const board = makeBoard({ x: right + 48, y: top }, 'From the wall')
        board.h = Math.max(240, 92 + notes.length * 46)
        board.cards = notes.map((n) => {
          const lines = n.text.split('\n')
          const card = makeCard(lines[0].trim() || 'Untitled')
          card.notes = lines.slice(1).join('\n').trim()
          return card
        })

        p.nodes[board.id] = board
        p.order.push(board.id)

        const dead = new Set(ids)
        for (const id of dead) delete p.nodes[id]
        p.order = p.order.filter((id) => !dead.has(id))
        d.selection = [board.id]
      },
      { history: `Turn ${ids.length} notes into a list` },
    )
  },

  /** The reverse trip: pull one card back out onto the canvas to think about it. */
  cardToSticky(cardId: Id) {
    store.commit(
      (d) => {
        const p = page(d)
        for (const id of p.order) {
          const n = p.nodes[id]
          if (n?.type !== 'board') continue
          const index = n.cards.findIndex((c) => c.id === cardId)
          if (index < 0) continue
          const card = n.cards[index]
          const sticky = makeSticky({ x: n.x + n.w + 40, y: n.y + index * 24 })
          sticky.text = [card.title, card.notes, ...card.checklist.map((i) => `• ${i.text}`)]
            .filter(Boolean)
            .join('\n')
          p.nodes[sticky.id] = sticky
          p.order.push(sticky.id)
          n.cards.splice(index, 1)
          d.selection = [sticky.id]
          return
        }
      },
      { history: 'Move card to the canvas' },
    )
  },

  // -- document ----------------------------------------------------------
  renameDoc(name: string) {
    store.commit(
      (d) => {
        d.doc.name = name
      },
      { history: 'Rename project', coalesce: 'rename-doc' },
    )
  },

  addPage(name = 'Untitled page') {
    const p: Page = { id: uid('pg'), name, nodes: {}, order: [], background: '#101215' }
    store.commit(
      (d) => {
        d.doc.pages.push(p)
        d.cameras[d.pageId] = d.camera
        d.pageId = p.id
        d.selection = []
        d.camera = { x: 0, y: 0, zoom: 1 }
      },
      { history: 'Add page' },
    )
    return p.id
  },

  renamePage(id: Id, name: string) {
    store.commit(
      (d) => {
        const p = d.doc.pages.find((x) => x.id === id)
        if (p) p.name = name
      },
      { history: 'Rename page', coalesce: `rename-page-${id}` },
    )
  },

  deletePage(id: Id) {
    store.commit(
      (d) => {
        if (d.doc.pages.length <= 1) return
        d.doc.pages = d.doc.pages.filter((p) => p.id !== id)
        if (d.pageId === id) {
          d.pageId = d.doc.pages[0].id
          d.selection = []
        }
      },
      { history: 'Delete page' },
    )
  },

  /**
   * Returns false when the target page has never been visited, so the caller
   * can frame its contents instead of dropping the user into empty space.
   */
  setPage(id: Id): boolean {
    const remembered = store.getState().cameras[id]
    store.commit((d) => {
      d.cameras[d.pageId] = d.camera
      d.pageId = id
      d.selection = []
      d.editingId = null
      d.focusedCardId = null
      if (remembered) d.camera = { ...remembered }
    })
    return !!remembered
  },

  addLabel(name: string, color: string) {
    const label: Label = { id: uid('lb'), name, color }
    store.commit(
      (d) => {
        d.doc.labels.push(label)
      },
      { history: 'Add label' },
    )
    return label.id
  },

  updateLabel(id: Id, patch: Partial<Label>) {
    store.commit(
      (d) => {
        const l = d.doc.labels.find((x) => x.id === id)
        if (l) Object.assign(l, patch)
      },
      { history: 'Edit label', coalesce: `label-${id}` },
    )
  },

  inviteMember(email: string, role: Member['role']) {
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const member: Member = {
      id: uid('m'),
      name,
      email,
      role,
      color: colorForSeed(email),
      pending: true,
    }
    store.commit(
      (d) => {
        if (d.doc.members.some((m) => m.email.toLowerCase() === email.toLowerCase())) return
        d.doc.members.push(member)
      },
      { history: 'Invite member' },
    )
    return member.id
  },

  /** Replaces the roster wholesale — used when it arrives from the server. */
  setMembers(members: Member[]) {
    store.commit((d) => {
      d.doc.members = members
    })
  },

  setMemberRole(id: Id, role: Member['role']) {
    store.commit(
      (d) => {
        const m = d.doc.members.find((x) => x.id === id)
        if (m) m.role = role
      },
      { history: 'Change role' },
    )
  },

  removeMember(id: Id) {
    store.commit(
      (d) => {
        d.doc.members = d.doc.members.filter((m) => m.id !== id)
        for (const p of d.doc.pages) {
          for (const nodeId of p.order) {
            const n = p.nodes[nodeId]
            if (n?.type === 'board') {
              for (const c of n.cards) c.assignees = c.assignees.filter((a) => a !== id)
            }
          }
        }
      },
      { history: 'Remove member' },
    )
  },

  replaceDoc(doc: Doc, pageId?: Id) {
    store.commit((d) => {
      d.doc = doc
      d.pageId = pageId && doc.pages.some((p) => p.id === pageId) ? pageId : doc.pages[0].id
      d.selection = []
      d.editingId = null
    })
    store.resetHistory()
  },

  undo() {
    store.undo()
  },

  redo() {
    store.redo()
  },
}

export type Anchors = Anchor
