import { currentPage } from '../store/store'
import { useStore } from '../store/useStore'
import type { ConnectorNode, Endpoint, Page, Vec } from '../types'
import { anchorPoint, center, rectOf } from '../lib/geometry'

function resolve(endpoint: Endpoint, page: Page, toward: Vec): Vec | null {
  if (endpoint.kind === 'point') return { x: endpoint.x, y: endpoint.y }
  const node = page.nodes[endpoint.id]
  if (!node || node.hidden) return null
  return anchorPoint(rectOf(node), toward, endpoint.anchor)
}

function endpointCenter(endpoint: Endpoint, page: Page): Vec | null {
  if (endpoint.kind === 'point') return { x: endpoint.x, y: endpoint.y }
  const node = page.nodes[endpoint.id]
  return node ? center(rectOf(node)) : null
}

/**
 * Connectors are painted above every other node. A predictable rule beats
 * per-connector z-fiddling: arrows exist to be followed, so they stay visible.
 */
export function ConnectorLayer() {
  const page = useStore(currentPage)
  const selection = useStore((s) => s.selection)

  const connectors = page.order
    .map((id) => page.nodes[id])
    .filter((n): n is ConnectorNode => n?.type === 'connector' && !n.hidden)

  if (connectors.length === 0) return null

  return (
    <svg className="overlay-svg">
      <defs>
        {connectors.map((c) => (
          <marker
            key={`m-${c.id}`}
            id={`arrow-${c.id}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L9,5 L0,9 z" fill={c.color} />
          </marker>
        ))}
      </defs>
      {connectors.map((c) => {
        const aTarget = endpointCenter(c.to, page)
        const bTarget = endpointCenter(c.from, page)
        if (!aTarget || !bTarget) return null
        const a = resolve(c.from, page, aTarget)
        const b = resolve(c.to, page, bTarget)
        if (!a || !b) return null

        // A gentle horizontal-first curve reads as intentional at any zoom.
        const dx = Math.abs(b.x - a.x)
        const dy = Math.abs(b.y - a.y)
        const bow = Math.max(28, Math.min(120, (dx + dy) * 0.22))
        const horizontal = dx > dy
        const c1 = horizontal ? { x: a.x + Math.sign(b.x - a.x) * bow, y: a.y } : { x: a.x, y: a.y + Math.sign(b.y - a.y) * bow }
        const c2 = horizontal ? { x: b.x - Math.sign(b.x - a.x) * bow, y: b.y } : { x: b.x, y: b.y - Math.sign(b.y - a.y) * bow }
        const d = `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`
        const selected = selection.includes(c.id)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

        return (
          <g key={c.id}>
            {/* Fat invisible stroke so the arrow is easy to click. */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              style={{ pointerEvents: 'stroke' }}
              data-node-id={c.id}
            />
            <path
              d={d}
              fill="none"
              stroke={selected ? '#4dabf7' : c.color}
              strokeWidth={c.strokeWidth}
              strokeDasharray={c.dashed ? '6 5' : undefined}
              markerEnd={c.arrowEnd ? `url(#arrow-${c.id})` : undefined}
              markerStart={c.arrowStart ? `url(#arrow-${c.id})` : undefined}
              style={{ pointerEvents: 'none' }}
            />
            {c.label && (
              <>
                <rect
                  x={mid.x - c.label.length * 3.4 - 6}
                  y={mid.y - 9}
                  width={c.label.length * 6.8 + 12}
                  height={18}
                  rx={5}
                  fill="#16181d"
                  stroke="rgba(255,255,255,0.1)"
                />
                <text
                  x={mid.x}
                  y={mid.y + 4}
                  textAnchor="middle"
                  fill="#9aa5b4"
                  fontSize={11}
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {c.label}
                </text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
