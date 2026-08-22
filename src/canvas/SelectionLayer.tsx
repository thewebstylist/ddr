import { currentPage, selectionBounds } from '../store/store'
import { useStore, shallowObject } from '../store/useStore'
import type { Rect } from '../types'

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
export type HandleId = (typeof HANDLES)[number]

const CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

function handleRect(box: Rect, id: HandleId, size: number): Rect {
  const half = size / 2
  const map: Record<HandleId, [number, number]> = {
    nw: [box.x, box.y],
    n: [box.x + box.w / 2, box.y],
    ne: [box.x + box.w, box.y],
    e: [box.x + box.w, box.y + box.h / 2],
    se: [box.x + box.w, box.y + box.h],
    s: [box.x + box.w / 2, box.y + box.h],
    sw: [box.x, box.y + box.h],
    w: [box.x, box.y + box.h / 2],
  }
  const [cx, cy] = map[id]
  return { x: cx - half, y: cy - half, w: size, h: size }
}

export function SelectionLayer({ hoverId }: { hoverId: string | null }) {
  const zoom = useStore((s) => s.camera.zoom)
  const bounds = useStore(selectionBounds, (a, b) =>
    a === b ? true : !a || !b ? false : shallowObject(a as never, b as never),
  )
  const selection = useStore((s) => s.selection)
  const page = useStore(currentPage)
  const editing = useStore((s) => s.editingId)

  const hovered = hoverId && !selection.includes(hoverId) ? page.nodes[hoverId] : null
  const handleSize = 8 / zoom
  const outline = 1 / zoom

  // Individual outlines make a multi-selection legible; the group box makes it
  // resizable. Both are needed, neither is enough alone.
  const individuals =
    selection.length > 1
      ? (selection.map((id) => page.nodes[id]).filter((n) => n && n.type !== 'connector') as Array<Rect>)
      : []

  return (
    <>
      {hovered && hovered.type !== 'connector' && (
        <div
          className="hover-outline"
          style={{
            left: hovered.x,
            top: hovered.y,
            width: hovered.w,
            height: hovered.h,
            borderWidth: outline,
          }}
        />
      )}

      {individuals.map((r, i) => (
        <div
          key={i}
          className="hover-outline"
          style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderWidth: outline }}
        />
      ))}

      {bounds && !editing && (
        <>
          <div
            className="selection-box"
            style={{
              left: bounds.x,
              top: bounds.y,
              width: bounds.w,
              height: bounds.h,
              borderWidth: outline,
            }}
          />
          {HANDLES.map((id) => {
            const r = handleRect(bounds, id, handleSize)
            return (
              <div
                key={id}
                className="handle"
                data-handle={id}
                style={{
                  position: 'absolute',
                  left: r.x,
                  top: r.y,
                  width: r.w,
                  height: r.h,
                  borderWidth: outline,
                  cursor: CURSORS[id],
                }}
              />
            )
          })}
        </>
      )}
    </>
  )
}
