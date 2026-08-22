import { actions } from '../store/store'
import type { ShapeNode } from '../types'
import { AutoTextarea } from './AutoTextarea'

function shapeElement(node: ShapeNode) {
  const { w, h, strokeWidth: sw } = node
  const inset = sw / 2
  const common = { fill: node.fill, stroke: node.stroke, strokeWidth: sw, vectorEffect: 'non-scaling-stroke' as const }
  switch (node.shape) {
    case 'ellipse':
      return <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - inset)} ry={Math.max(0, h / 2 - inset)} {...common} />
    case 'diamond':
      return <polygon points={`${w / 2},${inset} ${w - inset},${h / 2} ${w / 2},${h - inset} ${inset},${h / 2}`} {...common} />
    case 'triangle':
      return <polygon points={`${w / 2},${inset} ${w - inset},${h - inset} ${inset},${h - inset}`} {...common} />
    default:
      return (
        <rect
          x={inset}
          y={inset}
          width={Math.max(0, w - sw)}
          height={Math.max(0, h - sw)}
          rx={node.radius}
          {...common}
        />
      )
  }
}

export function ShapeView({ node, editing }: { node: ShapeNode; editing: boolean }) {
  return (
    <div className="shape-wrap">
      <svg width={node.w} height={node.h} style={{ display: 'block', overflow: 'visible' }}>
        {shapeElement(node)}
      </svg>
      <div className="shape-text-wrap">
        {editing ? (
          <AutoTextarea
            className="shape-text"
            data-interactive="true"
            autoFocusSelect
            value={node.text}
            placeholder="Label"
            style={{ textAlign: 'center' }}
            onChange={(e) =>
              actions.updateNode(node.id, { text: e.target.value }, { history: 'Edit label', coalesce: `shape-${node.id}` })
            }
            onBlur={() => actions.setEditing(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.currentTarget.blur()
                e.stopPropagation()
              }
            }}
          />
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{node.text}</div>
        )}
      </div>
    </div>
  )
}
