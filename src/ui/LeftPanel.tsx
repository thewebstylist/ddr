import { useState } from 'react'
import { actions, currentPage, store } from '../store/store'
import { shallowArray, useStore } from '../store/useStore'
import { displayName } from '../lib/factory'
import type { Id } from '../types'
import { Icon } from './Icons'
import { goToPage, zoomToSelection } from '../lib/commands'

const TYPE_ICON: Record<string, (p: { size?: number }) => React.ReactElement> = {
  sticky: Icon.sticky,
  text: Icon.text,
  board: Icon.board,
  frame: Icon.frame,
  shape: Icon.square,
  image: Icon.image,
  ink: Icon.pen,
  connector: Icon.arrow,
}

function LayerRow({ id }: { id: Id }) {
  const node = useStore((s) => currentPage(s).nodes[id])
  const selected = useStore((s) => s.selection.includes(id))
  if (!node) return null
  const Glyph = TYPE_ICON[node.type] ?? Icon.square

  return (
    <div
      className="layer-row"
      data-selected={selected}
      onClick={(e) => actions.select([id], e.shiftKey)}
      onDoubleClick={() => {
        actions.select([id])
        zoomToSelection()
      }}
    >
      <Glyph size={13} />
      <span className="layer-name" style={node.hidden ? { opacity: 0.4 } : undefined}>
        {displayName(node)}
      </span>
      <button
        className="layer-action"
        data-forced={node.locked ? 'true' : undefined}
        title={node.locked ? 'Unlock' : 'Lock'}
        onClick={(e) => {
          e.stopPropagation()
          actions.updateNode(id, { locked: !node.locked }, { history: 'Lock' })
        }}
      >
        {node.locked ? <Icon.lock size={12} /> : <Icon.unlock size={12} />}
      </button>
      <button
        className="layer-action"
        data-forced={node.hidden ? 'true' : undefined}
        title={node.hidden ? 'Show' : 'Hide'}
        onClick={(e) => {
          e.stopPropagation()
          actions.updateNode(id, { hidden: !node.hidden }, { history: 'Hide' })
        }}
      >
        {node.hidden ? <Icon.eyeOff size={12} /> : <Icon.eye size={12} />}
      </button>
    </div>
  )
}

export function LeftPanel() {
  const pages = useStore((s) => s.doc.pages.map((p) => ({ id: p.id, name: p.name })), (a, b) =>
    a.length === b.length && a.every((p, i) => p.id === b[i].id && p.name === b[i].name),
  )
  const pageId = useStore((s) => s.pageId)
  const order = useStore((s) => currentPage(s).order, shallowArray)
  const [renaming, setRenaming] = useState<Id | null>(null)

  return (
    <aside className="panel panel-left" data-interactive="true">
      <div className="panel-section">
        <div className="panel-title">
          Pages
          <button className="layer-action" data-forced="true" title="New page" onClick={() => actions.addPage()}>
            <Icon.plus size={13} />
          </button>
        </div>
        {pages.map((p) => (
          <div
            key={p.id}
            className="page-row"
            data-active={p.id === pageId}
            onClick={() => goToPage(p.id)}
            onDoubleClick={() => setRenaming(p.id)}
          >
            {renaming === p.id ? (
              <input
                className="input"
                style={{ height: 22 }}
                autoFocus
                defaultValue={p.name}
                onBlur={(e) => {
                  actions.renamePage(p.id, e.target.value || 'Untitled')
                  setRenaming(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setRenaming(null)
                  e.stopPropagation()
                }}
              />
            ) : (
              <>
                <span className="layer-name">{p.name}</span>
                {pages.length > 1 && (
                  <button
                    className="layer-action"
                    title="Delete page"
                    onClick={(e) => {
                      e.stopPropagation()
                      const count = store.getState().doc.pages.find((x) => x.id === p.id)?.order.length ?? 0
                      if (count > 0 && !window.confirm(`Delete “${p.name}” and its ${count} objects?`)) return
                      actions.deletePage(p.id)
                    }}
                  >
                    <Icon.trash size={12} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="panel-section" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="panel-title">Layers</div>
        <div className="panel-scroll">
          {order.length === 0 && (
            <p className="empty-note">
              Nothing on this page yet. Pick a tool below, or just double-click the canvas.
            </p>
          )}
          {[...order].reverse().map((id) => (
            <LayerRow key={id} id={id} />
          ))}
        </div>
      </div>
    </aside>
  )
}
