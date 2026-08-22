import { actions } from '../store/store'
import type { FrameNode } from '../types'

/**
 * Sections are visual, not structural. They never swallow what you drop on
 * them — the single most common source of "where did my thing go" in canvas
 * tools — so moving a section moves only the section.
 */
export function FrameView({ node, editing }: { node: FrameNode; editing: boolean }) {
  return (
    <>
      <input
        className="frame-title"
        data-interactive={editing ? 'true' : undefined}
        value={node.title}
        readOnly={!editing}
        onChange={(e) =>
          actions.updateNode(node.id, { title: e.target.value }, { history: 'Rename section', coalesce: `frame-${node.id}` })
        }
        onBlur={() => actions.setEditing(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
          e.stopPropagation()
        }}
        style={{ pointerEvents: editing ? 'auto' : 'none' }}
      />
      <div className="frame-node" style={{ background: node.fill, borderColor: node.stroke }} />
    </>
  )
}
