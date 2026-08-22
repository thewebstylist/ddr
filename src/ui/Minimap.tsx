import { actions, currentPage } from '../store/store'
import { shallowArray, useStore } from '../store/useStore'
import { viewportSize } from '../canvas/viewportRef'
import { contentBounds } from '../canvas/viewportRef'

const W = 168
const H = 112
const PAD = 10

/** A small map of the page, mostly to answer "where am I and what else is out there". */
export function Minimap() {
  const page = useStore(currentPage)
  const order = useStore((s) => currentPage(s).order, shallowArray)
  const camera = useStore((s) => s.camera, (a, b) => a.x === b.x && a.y === b.y && a.zoom === b.zoom)

  const bounds = contentBounds()
  if (!bounds || order.length === 0) return null

  const vp = viewportSize()
  const view = {
    x: -camera.x / camera.zoom,
    y: -camera.y / camera.zoom,
    w: vp.w / camera.zoom,
    h: vp.h / camera.zoom,
  }

  // Fit content *and* the current viewport so the indicator never leaves the map.
  const x0 = Math.min(bounds.x, view.x)
  const y0 = Math.min(bounds.y, view.y)
  const x1 = Math.max(bounds.x + bounds.w, view.x + view.w)
  const y1 = Math.max(bounds.y + bounds.h, view.y + view.h)
  const scale = Math.min((W - PAD * 2) / Math.max(x1 - x0, 1), (H - PAD * 2) / Math.max(y1 - y0, 1))
  const ox = PAD + ((W - PAD * 2) - (x1 - x0) * scale) / 2
  const oy = PAD + ((H - PAD * 2) - (y1 - y0) * scale) / 2

  const toMap = (x: number, y: number) => ({ x: ox + (x - x0) * scale, y: oy + (y - y0) * scale })

  return (
    <div
      className="minimap"
      data-interactive="true"
      title="Click to jump there"
      onPointerDown={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const mx = e.clientX - r.left
        const my = e.clientY - r.top
        const worldX = (mx - ox) / scale + x0
        const worldY = (my - oy) / scale + y0
        actions.setCamera({
          x: vp.w / 2 - worldX * camera.zoom,
          y: vp.h / 2 - worldY * camera.zoom,
          zoom: camera.zoom,
        })
      }}
    >
      {order.map((id) => {
        const n = page.nodes[id]
        if (!n || n.type === 'connector' || n.hidden) return null
        const p = toMap(n.x, n.y)
        const color =
          n.type === 'board'
            ? n.accent
            : n.type === 'sticky'
              ? '#f0b429'
              : n.type === 'frame'
                ? 'rgba(255,255,255,0.18)'
                : 'rgba(255,255,255,0.4)'
        return (
          <div
            key={id}
            className="minimap-dot"
            style={{
              left: p.x,
              top: p.y,
              width: Math.max(1.5, n.w * scale),
              height: Math.max(1.5, n.h * scale),
              background: color,
              opacity: n.type === 'frame' ? 1 : 0.85,
            }}
          />
        )
      })}
      <div
        className="minimap-view"
        style={{
          left: toMap(view.x, view.y).x,
          top: toMap(view.x, view.y).y,
          width: view.w * scale,
          height: view.h * scale,
        }}
      />
    </div>
  )
}
