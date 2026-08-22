import type { InkNode } from '../types'
import { smoothPath } from '../lib/geometry'

export function InkView({ node }: { node: InkNode }) {
  if (node.points.length < 2) return null
  const pad = node.size
  return (
    <svg
      width={node.w + pad * 2}
      height={node.h + pad * 2}
      style={{ display: 'block', overflow: 'visible', marginLeft: -pad, marginTop: -pad }}
    >
      <path
        d={smoothPath(node.points)}
        transform={`translate(${pad} ${pad})`}
        fill="none"
        stroke={node.color}
        strokeWidth={node.size}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={node.highlighter ? 0.4 : 1}
        style={node.highlighter ? { mixBlendMode: 'screen' } : undefined}
      />
    </svg>
  )
}
