import { actions } from '../store/store'
import type { StickyNode } from '../types'
import { AutoTextarea } from './AutoTextarea'

export function StickyView({ node, editing }: { node: StickyNode; editing: boolean }) {
  return (
    <div className="sticky" style={{ background: node.fill }}>
      {editing ? (
        <AutoTextarea
          className="sticky-text"
          data-interactive="true"
          autoFocusSelect
          value={node.text}
          placeholder="Type…"
          style={{ fontSize: node.fontSize, height: '100%' }}
          onChange={(e) =>
            actions.updateNode(node.id, { text: e.target.value }, { history: 'Edit sticky', coalesce: `sticky-${node.id}` })
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
        <div className="sticky-text" style={{ fontSize: node.fontSize }}>
          {node.text || <span style={{ opacity: 0.4 }}>Double-click to write</span>}
        </div>
      )}
    </div>
  )
}
