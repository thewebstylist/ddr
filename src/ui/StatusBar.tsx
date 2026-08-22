import { actions, canComment, canEdit, currentPage, store } from '../store/store'
import { useStore } from '../store/useStore'
import { MOD, zoomToFit } from '../lib/commands'
import { viewCenter, viewportSize } from '../canvas/viewportRef'
import { Icon } from './Icons'

/**
 * A permanent, context-aware hint line. Discoverability is a design problem,
 * and the cheapest fix is telling people what they can do at this exact moment.
 */
function hintFor(tool: string, selectionCount: number, editing: boolean): React.ReactNode {
  if (editing) return <>Typing — <kbd>Esc</kbd> when you're done</>
  switch (tool) {
    case 'hand':
      return <>Drag to move around. Hold <kbd>Space</kbd> with any tool to do the same.</>
    case 'pen':
      return <>Drag to draw. Pick a colour and size on the right.</>
    case 'connector':
      return <>Drag from one object to another. Arrows follow whatever they're attached to.</>
    case 'sticky':
    case 'text':
    case 'board':
    case 'frame':
    case 'rect':
    case 'ellipse':
      return <>Click to place, or drag to set the size. Tools snap back to Select unless you lock them.</>
    default:
      if (selectionCount > 1)
        return (
          <>
            {selectionCount} selected — right-click to align, <kbd>{MOD}</kbd> <kbd>D</kbd> to duplicate
          </>
        )
      if (selectionCount === 1) return <>Double-click to edit. Drag the handles to resize.</>
      return (
        <>
          Drag to select. Double-click anywhere for a sticky. <kbd>{MOD}</kbd> <kbd>K</kbd> for everything else.
        </>
      )
  }
}

export function StatusBar() {
  const tool = useStore((s) => s.tool)
  const selectionCount = useStore((s) => s.selection.length)
  const editing = useStore((s) => s.editingId !== null)
  const zoom = useStore((s) => s.camera.zoom)
  const snap = useStore((s) => s.snap)
  const grid = useStore((s) => s.showGrid)
  const nodeCount = useStore((s) => currentPage(s).order.length)
  const editable = useStore(canEdit)
  const commentable = useStore(canComment)

  const setZoom = (next: number) => {
    const c = viewCenter()
    const { w, h } = viewportSize()
    actions.setCamera({ x: w / 2 - c.x * next, y: h / 2 - c.y * next, zoom: next })
  }

  return (
    <div className="statusbar">
      <span className="status-hint">
        {editable
          ? hintFor(tool, selectionCount, editing)
          : commentable
            ? 'You can tick things off and leave notes here, but not change the canvas.'
            : 'View only — you can look around and search, but nothing you do is saved.'}
      </span>
      <span style={{ flex: 1 }} />

      <span>{nodeCount} objects</span>

      <button
        className="btn btn-icon"
        data-active={snap}
        title="Snap to other objects while dragging"
        onClick={() => actions.toggleSnap()}
      >
        <Icon.magnet size={14} />
      </button>
      <button className="btn btn-icon" data-active={grid} title="Show grid" onClick={() => actions.toggleGrid()}>
        <Icon.grid size={14} />
      </button>

      <div className="zoom-control">
        <button className="btn btn-icon" title="Zoom out" onClick={() => setZoom(Math.max(0.05, zoom / 1.25))}>
          −
        </button>
        <button
          className="zoom-value"
          title="Zoom to fit everything (⇧1)"
          onClick={() => {
            if (Math.abs(zoom - 1) < 0.001) zoomToFit()
            else setZoom(1)
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className="btn btn-icon" title="Zoom in" onClick={() => setZoom(Math.min(6, zoom * 1.25))}>
          +
        </button>
      </div>

      <button className="btn" title="Keyboard shortcuts" onClick={() => actions.setShortcuts(true)}>
        ?
      </button>
    </div>
  )
}

export { store }
