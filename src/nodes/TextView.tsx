import { useLayoutEffect, useRef } from 'react'
import { actions } from '../store/store'
import type { TextNode } from '../types'
import { AutoTextarea } from './AutoTextarea'

export function TextView({ node, editing }: { node: TextNode; editing: boolean }) {
  const measure = useRef<HTMLDivElement>(null)

  // Text boxes grow with their content; only the width is user-controlled.
  useLayoutEffect(() => {
    const el = measure.current
    if (!el) return
    const h = Math.max(node.fontSize * 1.35, el.scrollHeight)
    if (Math.abs(h - node.h) > 1) actions.updateNode(node.id, { h }, {})
  })

  const style: React.CSSProperties = {
    fontSize: node.fontSize,
    color: node.color,
    fontWeight: node.weight,
    textAlign: node.align,
    fontFamily: node.mono ? 'var(--mono)' : 'inherit',
    lineHeight: 1.35,
  }

  return (
    <div ref={measure} style={{ width: '100%' }}>
      {editing ? (
        <AutoTextarea
          className="text-node-body"
          data-interactive="true"
          autoFocusSelect
          value={node.text}
          placeholder="Type something"
          style={style}
          onChange={(e) =>
            actions.updateNode(node.id, { text: e.target.value }, { history: 'Edit text', coalesce: `text-${node.id}` })
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
        <div className="text-node-body" style={style}>
          {node.text || <span style={{ opacity: 0.35 }}>Text</span>}
        </div>
      )}
    </div>
  )
}
