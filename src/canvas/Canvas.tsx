import { useCallback, useEffect, useRef, useState } from 'react'
import { actions, currentPage, selectionBounds, store } from '../store/store'
import { shallowArray, shallowObject, useStore } from '../store/useStore'
import type { Id, Node, Rect, Tool, Vec } from '../types'
import { NodeView } from '../nodes/NodeView'
import { ConnectorLayer } from './ConnectorLayer'
import { SelectionLayer, type HandleId } from './SelectionLayer'
import { computeSnap, type Guide } from './snapping'
import { normalizeRect, rectsIntersect, screenToWorld, simplify, smoothPath } from '../lib/geometry'
import {
  makeBoard,
  makeConnector,
  makeFrame,
  makeInk,
  makeShape,
  makeSticky,
  makeText,
} from '../lib/factory'
import { viewport } from './viewportRef'
import { CanvasContextMenu } from '../ui/ContextMenu'

type Gesture =
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'drag'; ids: Id[]; origins: Map<Id, Vec>; start: Vec; moved: boolean }
  | {
      kind: 'resize'
      handle: HandleId
      ids: Id[]
      startBounds: Rect
      origins: Map<Id, Rect>
      start: Vec
      moved: boolean
    }
  | { kind: 'marquee'; start: Vec; base: Id[]; additive: boolean }
  | { kind: 'insert'; tool: Tool; start: Vec }
  | { kind: 'ink'; id: Id; origin: Vec; points: number[] }
  | { kind: 'connector'; id: Id; start: Vec }

const MIN_SIZE = 16
const CLICK_SLOP = 4

const INSERT_TOOLS: Tool[] = ['sticky', 'text', 'board', 'frame', 'rect', 'ellipse']

export function Canvas() {
  const ref = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const spaceDown = useRef(false)

  const camera = useStore((s) => s.camera, shallowObject)
  const tool = useStore((s) => s.tool)
  const order = useStore((s) => currentPage(s).order, shallowArray)
  const background = useStore((s) => currentPage(s).background)
  const showGrid = useStore((s) => s.showGrid)
  const cardDraft = useStore((s) => (s.draft?.kind === 'card' ? s.draft : null))
  const fileDropActive = useStore((s) => s.fileDropActive)

  const [panning, setPanning] = useState(false)
  const [marquee, setMarquee] = useState<Rect | null>(null)
  const [insertRect, setInsertRect] = useState<Rect | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)

  // -- geometry ------------------------------------------------------------
  const toWorld = useCallback((clientX: number, clientY: number): Vec => {
    const rect = ref.current!.getBoundingClientRect()
    return screenToWorld({ x: clientX - rect.left, y: clientY - rect.top }, store.getState().camera)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    viewport.el = el
    const ro = new ResizeObserver(() => {
      viewport.w = el.clientWidth
      viewport.h = el.clientHeight
    })
    ro.observe(el)
    viewport.w = el.clientWidth
    viewport.h = el.clientHeight
    return () => ro.disconnect()
  }, [])

  // -- wheel: pan by default, zoom with ctrl/cmd (and trackpad pinch) -------
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (e.ctrlKey || e.metaKey) {
        actions.zoomAt(point, Math.exp(-e.deltaY * 0.01))
      } else {
        actions.panBy(e.deltaX, e.deltaY)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // -- space to pan --------------------------------------------------------
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        spaceDown.current = true
        setPanning(true)
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false
        if (gesture.current?.kind !== 'pan') setPanning(false)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // -- pointer down --------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const state = store.getState()
    const target = e.target as HTMLElement

    // Clicking away from an open card closes it, the way every list app behaves.
    if (state.focusedCardId && !target.closest(`[data-card-id="${state.focusedCardId}"]`)) {
      actions.setFocusedCard(null)
    }

    // Board internals, popovers and live text fields own their own pointer
    // handling. Select the node so the inspector follows, then stand back.
    if (target.closest('[data-interactive="true"]')) {
      const nodeEl = target.closest<HTMLElement>('[data-node-id]')
      const id = nodeEl?.dataset.nodeId
      if (id && !state.selection.includes(id)) actions.select([id])
      return
    }

    if (e.button === 2) return
    if (e.button !== 0 && e.button !== 1) return

    el.setPointerCapture(e.pointerId)
    e.preventDefault()

    const world = toWorld(e.clientX, e.clientY)

    if (e.button === 1 || spaceDown.current || state.tool === 'hand') {
      gesture.current = { kind: 'pan', lastX: e.clientX, lastY: e.clientY }
      setPanning(true)
      return
    }

    if (state.tool === 'pen') {
      const ink = makeInk(state.inkColor, state.inkSize, state.highlighter)
      ink.x = world.x
      ink.y = world.y
      ink.points = [0, 0]
      actions.addNode(ink, { select: false, label: 'Draw' })
      gesture.current = { kind: 'ink', id: ink.id, origin: world, points: [0, 0] }
      return
    }

    if (state.tool === 'connector') {
      const nodeEl = target.closest<HTMLElement>('[data-node-id]')
      const fromId = nodeEl?.dataset.nodeId
      const conn = makeConnector(
        fromId ? { kind: 'node', id: fromId, anchor: 'auto' } : { kind: 'point', x: world.x, y: world.y },
        { kind: 'point', x: world.x, y: world.y },
      )
      actions.addNode(conn, { select: false, label: 'Add connector' })
      gesture.current = { kind: 'connector', id: conn.id, start: world }
      return
    }

    if (INSERT_TOOLS.includes(state.tool)) {
      gesture.current = { kind: 'insert', tool: state.tool, start: world }
      setInsertRect({ x: world.x, y: world.y, w: 0, h: 0 })
      return
    }

    // -- select tool -------------------------------------------------------
    const handleEl = target.closest<HTMLElement>('[data-handle]')
    if (handleEl && state.selection.length > 0) {
      const bounds = selectionBounds(state)
      if (bounds) {
        const page = currentPage(state)
        const origins = new Map<Id, Rect>()
        for (const id of state.selection) {
          const n = page.nodes[id]
          if (n && n.type !== 'connector') origins.set(id, { x: n.x, y: n.y, w: n.w, h: n.h })
        }
        gesture.current = {
          kind: 'resize',
          handle: handleEl.dataset.handle as HandleId,
          ids: [...origins.keys()],
          startBounds: bounds,
          origins,
          start: world,
          moved: false,
        }
        return
      }
    }

    const nodeEl = target.closest<HTMLElement>('[data-node-id]')
    const id = nodeEl?.dataset.nodeId
    if (id) {
      const page = currentPage(state)
      if (page.nodes[id]?.locked) return
      let selection = state.selection
      if (e.shiftKey) {
        actions.select([id], true)
        selection = store.getState().selection
      } else if (!selection.includes(id)) {
        actions.select([id])
        selection = [id]
      }
      const origins = new Map<Id, Vec>()
      for (const sid of selection) {
        const n = page.nodes[sid]
        if (n && n.type !== 'connector') origins.set(sid, { x: n.x, y: n.y })
      }
      gesture.current = { kind: 'drag', ids: [...origins.keys()], origins, start: world, moved: false }
      return
    }

    gesture.current = {
      kind: 'marquee',
      start: world,
      base: e.shiftKey ? state.selection : [],
      additive: e.shiftKey,
    }
    if (!e.shiftKey) actions.clearSelection()
    setMarquee({ x: world.x, y: world.y, w: 0, h: 0 })
  }

  // -- pointer move --------------------------------------------------------
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) {
      const target = e.target as HTMLElement
      const nodeEl = target.closest<HTMLElement>('[data-node-id]')
      const next = nodeEl?.dataset.nodeId ?? null
      if (next !== hoverId) setHoverId(next)
      return
    }

    const world = toWorld(e.clientX, e.clientY)

    switch (g.kind) {
      case 'pan': {
        actions.panBy(g.lastX - e.clientX, g.lastY - e.clientY)
        g.lastX = e.clientX
        g.lastY = e.clientY
        break
      }

      case 'drag': {
        let dx = world.x - g.start.x
        let dy = world.y - g.start.y
        if (!g.moved) {
          if (Math.hypot(dx, dy) * store.getState().camera.zoom < CLICK_SLOP) break
          g.moved = true
          actions.beginTransform(g.ids.length > 1 ? `Move ${g.ids.length} items` : 'Move')
        }
        if (e.shiftKey) {
          // Axis lock: commit to whichever direction the gesture started in.
          if (Math.abs(dx) > Math.abs(dy)) dy = 0
          else dx = 0
        }

        const state = store.getState()
        const page = currentPage(state)
        if (state.snap && g.ids.length > 0) {
          const moving = g.ids
            .map((id) => {
              const o = g.origins.get(id)!
              const n = page.nodes[id]!
              return { x: o.x + dx, y: o.y + dy, w: n.w, h: n.h }
            })
            .reduce<Rect | null>((acc, r) => {
              if (!acc) return { ...r }
              const x0 = Math.min(acc.x, r.x)
              const y0 = Math.min(acc.y, r.y)
              const x1 = Math.max(acc.x + acc.w, r.x + r.w)
              const y1 = Math.max(acc.y + acc.h, r.y + r.h)
              return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
            }, null)

          if (moving) {
            const others = page.order
              .filter((oid) => !g.ids.includes(oid))
              .map((oid) => page.nodes[oid])
              .filter(Boolean) as Node[]
            const snap = computeSnap(moving, others, state.camera.zoom)
            dx += snap.dx
            dy += snap.dy
            setGuides(snap.guides)
          }
        }

        actions.transformNodes(
          g.ids.map((id) => {
            const o = g.origins.get(id)!
            return { id, rect: { x: o.x + dx, y: o.y + dy } }
          }),
        )
        break
      }

      case 'resize': {
        const dx = world.x - g.start.x
        const dy = world.y - g.start.y
        if (!g.moved) {
          if (Math.hypot(dx, dy) * store.getState().camera.zoom < CLICK_SLOP) break
          g.moved = true
          actions.beginTransform('Resize')
        }
        const b = g.startBounds
        let x = b.x
        let y = b.y
        let w = b.w
        let h = b.h
        if (g.handle.includes('w')) {
          x = b.x + dx
          w = b.w - dx
        }
        if (g.handle.includes('e')) w = b.w + dx
        if (g.handle.includes('n')) {
          y = b.y + dy
          h = b.h - dy
        }
        if (g.handle.includes('s')) h = b.h + dy

        w = Math.max(MIN_SIZE, w)
        h = Math.max(MIN_SIZE, h)

        if (e.shiftKey && b.w > 0 && b.h > 0) {
          const ratio = b.w / b.h
          if (w / h > ratio) w = h * ratio
          else h = w / ratio
          if (g.handle.includes('w')) x = b.x + b.w - w
          if (g.handle.includes('n')) y = b.y + b.h - h
        }

        const sx = b.w === 0 ? 1 : w / b.w
        const sy = b.h === 0 ? 1 : h / b.h
        actions.transformNodes(
          g.ids.map((id) => {
            const o = g.origins.get(id)!
            return {
              id,
              rect: {
                x: x + (o.x - b.x) * sx,
                y: y + (o.y - b.y) * sy,
                w: Math.max(MIN_SIZE, o.w * sx),
                h: Math.max(MIN_SIZE, o.h * sy),
              },
            }
          }),
        )
        break
      }

      case 'marquee': {
        const r = normalizeRect(g.start, world)
        setMarquee(r)
        const page = currentPage(store.getState())
        const hits = page.order.filter((id) => {
          const n = page.nodes[id]
          if (!n || n.locked || n.hidden || n.type === 'connector') return false
          return rectsIntersect(r, n)
        })
        actions.select(g.additive ? [...new Set([...g.base, ...hits])] : hits)
        break
      }

      case 'insert': {
        setInsertRect(normalizeRect(g.start, world))
        break
      }

      case 'ink': {
        const px = world.x - g.origin.x
        const py = world.y - g.origin.y
        const last = g.points.length
        const dist = Math.hypot(px - g.points[last - 2], py - g.points[last - 1])
        if (dist < 1.2) break
        g.points.push(px, py)
        actions.updateNode(g.id, { points: [...g.points] }, {})
        break
      }

      case 'connector': {
        const target = e.target as HTMLElement
        const nodeEl = target.closest<HTMLElement>('[data-node-id]')
        const overId = nodeEl?.dataset.nodeId
        actions.updateNode(
          g.id,
          {
            to:
              overId && overId !== g.id
                ? { kind: 'node', id: overId, anchor: 'auto' }
                : { kind: 'point', x: world.x, y: world.y },
          },
          {},
        )
        break
      }
    }
  }

  // -- pointer up ----------------------------------------------------------
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    setGuides([])
    setMarquee(null)
    setInsertRect(null)
    if (!spaceDown.current) setPanning(false)
    try {
      ref.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* capture may already be gone on touch cancel */
    }
    if (!g) return

    const world = toWorld(e.clientX, e.clientY)

    if (g.kind === 'insert') {
      const dragged = normalizeRect(g.start, world)
      const sized = dragged.w > 12 && dragged.h > 12
      const at = sized ? { x: dragged.x, y: dragged.y } : g.start
      let node: Node
      switch (g.tool) {
        case 'sticky':
          node = makeSticky(at, store.getState().doc.pages.length ? undefined : undefined)
          break
        case 'text':
          node = makeText(at)
          break
        case 'board':
          node = makeBoard(at)
          break
        case 'frame':
          node = makeFrame(at, sized ? dragged.w : undefined, sized ? dragged.h : undefined)
          break
        case 'rect':
          node = makeShape(at, 'rect', sized ? dragged.w : undefined, sized ? dragged.h : undefined)
          break
        case 'ellipse':
          node = makeShape(at, 'ellipse', sized ? dragged.w : undefined, sized ? dragged.h : undefined)
          break
        default:
          return
      }
      if (sized && (g.tool === 'sticky' || g.tool === 'board')) {
        node.w = Math.max(120, dragged.w)
        node.h = Math.max(100, dragged.h)
      }
      actions.addNode(node)
      // Land straight in edit mode: creating a sticky you then have to
      // double-click is the single most common wasted step in canvas tools.
      if (node.type === 'sticky' || node.type === 'text' || node.type === 'board') {
        actions.setEditing(node.id)
      }
      actions.finishToolUse()
      return
    }

    if (g.kind === 'ink') {
      const state = store.getState()
      const node = currentPage(state).nodes[g.id]
      if (!node || node.type !== 'ink' || g.points.length < 4) {
        actions.deleteNodes([g.id])
        actions.finishToolUse()
        return
      }
      const pts = simplify(g.points, 0.8)
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i])
        maxX = Math.max(maxX, pts[i])
        minY = Math.min(minY, pts[i + 1])
        maxY = Math.max(maxY, pts[i + 1])
      }
      const shifted: number[] = []
      for (let i = 0; i < pts.length; i += 2) shifted.push(pts[i] - minX, pts[i + 1] - minY)
      actions.updateNode(
        g.id,
        {
          x: node.x + minX,
          y: node.y + minY,
          w: maxX - minX,
          h: maxY - minY,
          points: shifted,
        },
        {},
      )
      actions.finishToolUse()
      return
    }

    if (g.kind === 'connector') {
      const state = store.getState()
      const conn = currentPage(state).nodes[g.id]
      if (conn?.type === 'connector') {
        const isStub =
          conn.to.kind === 'point' && Math.hypot(conn.to.x - g.start.x, conn.to.y - g.start.y) < 12
        if (isStub) actions.deleteNodes([g.id])
        else actions.select([g.id])
      }
      actions.finishToolUse()
      return
    }

    if (g.kind === 'drag' && !g.moved && !e.shiftKey) {
      // A click that never became a drag is just a selection; already applied.
    }
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-interactive="true"]')) return
    const nodeEl = target.closest<HTMLElement>('[data-node-id]')
    const id = nodeEl?.dataset.nodeId
    if (id) {
      const n = currentPage(store.getState()).nodes[id]
      if (n && n.type !== 'ink' && n.type !== 'image') actions.setEditing(id)
      return
    }
    const world = toWorld(e.clientX, e.clientY)
    const sticky = makeSticky({ x: world.x - 100, y: world.y - 100 })
    actions.addNode(sticky)
    actions.setEditing(sticky.id)
  }

  // -- render --------------------------------------------------------------
  const gridSize = 24 * camera.zoom
  const gridStyle: React.CSSProperties =
    showGrid && gridSize > 6
      ? {
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${camera.x % gridSize}px ${camera.y % gridSize}px`,
        }
      : {}

  return (
    <div
      ref={ref}
      className="canvas-viewport"
      data-tool={panning ? 'hand' : tool}
      data-panning={panning || undefined}
      style={{ background }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault()
        const target = e.target as HTMLElement
        const nodeEl = target.closest<HTMLElement>('[data-node-id]')
        const id = nodeEl?.dataset.nodeId
        if (id && !store.getState().selection.includes(id)) actions.select([id])
        if (!id && !target.closest('[data-interactive="true"]')) actions.clearSelection()
        setMenuAt({ x: e.clientX, y: e.clientY })
      }}
    >
      <div className="canvas-grid" style={gridStyle} />

      <div
        className="canvas-world"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
      >
        {order.map((id) => (
          <NodeView key={id} id={id} />
        ))}

        <ConnectorLayer />

        {guides.map((g, i) => (
          <div
            key={i}
            className="snap-line"
            style={
              g.axis === 'x'
                ? { left: g.at, top: g.from, width: 1 / camera.zoom, height: g.to - g.from }
                : { left: g.from, top: g.at, height: 1 / camera.zoom, width: g.to - g.from }
            }
          />
        ))}

        {insertRect && (
          <div
            style={{
              position: 'absolute',
              left: insertRect.x,
              top: insertRect.y,
              width: insertRect.w,
              height: insertRect.h,
              border: `${1 / camera.zoom}px dashed var(--accent)`,
              background: 'rgba(77,171,247,0.06)',
              pointerEvents: 'none',
            }}
          />
        )}

        <SelectionLayer hoverId={hoverId} />
      </div>

      {marquee && (
        <div
          className="marquee"
          style={{
            left: marquee.x * camera.zoom + camera.x,
            top: marquee.y * camera.zoom + camera.y,
            width: marquee.w * camera.zoom,
            height: marquee.h * camera.zoom,
          }}
        />
      )}

      {cardDraft && (
        <div
          className="card-drag-ghost"
          style={{ left: cardDraft.pointer.x + 10, top: cardDraft.pointer.y - 14 }}
        >
          {cardDraft.title || 'Untitled'}
        </div>
      )}

      {fileDropActive && <div className="drop-veil">Drop to add to the canvas</div>}

      {menuAt && <CanvasContextMenu x={menuAt.x} y={menuAt.y} onClose={() => setMenuAt(null)} />}
    </div>
  )
}

/** Exported for the minimap, which paints the same strokes at a tiny scale. */
export { smoothPath }
