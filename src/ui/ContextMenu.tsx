import { actions, currentPage, selectedNodes, store } from '../store/store'
import { useStore } from '../store/useStore'
import { MOD, importImages, zoomToFit, zoomToSelection } from '../lib/commands'
import { makeSticky } from '../lib/factory'
import { clientToWorld } from '../canvas/viewportRef'
import { Icon } from './Icons'
import { Popover } from './Popover'

export function CanvasContextMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const selection = useStore((s) => s.selection)
  const allStickies = useStore((s) => {
    const nodes = selectedNodes(s)
    return nodes.length > 0 && nodes.every((n) => n.type === 'sticky')
  })
  const has = selection.length > 0
  const many = selection.length > 1

  const run = (fn: () => void) => () => {
    fn()
    onClose()
  }

  return (
    <Popover x={x} y={y} onClose={onClose}>
      {has ? (
        <>
          <button className="menu-item" onClick={run(() => actions.duplicateNodes(selection))}>
            <Icon.copy size={14} />
            Duplicate
            <span className="menu-shortcut">{MOD} D</span>
          </button>
          <button className="menu-item" onClick={run(() => actions.reorder(selection, 'front'))}>
            <Icon.layers size={14} />
            Bring to front
            <span className="menu-shortcut">]</span>
          </button>
          <button className="menu-item" onClick={run(() => actions.reorder(selection, 'back'))}>
            <Icon.layers size={14} />
            Send to back
            <span className="menu-shortcut">[</span>
          </button>

          {many && (
            <>
              <div className="menu-sep" />
              <div className="palette-group">Align {selection.length} items</div>
              <div style={{ display: 'flex', gap: 2, padding: '2px 6px 6px' }}>
                {(
                  [
                    ['left', Icon.align.left],
                    ['hcenter', Icon.align.hcenter],
                    ['right', Icon.align.right],
                    ['top', Icon.align.top],
                    ['vcenter', Icon.align.vcenter],
                    ['bottom', Icon.align.bottom],
                  ] as const
                ).map(([edge, Glyph]) => (
                  <button
                    key={edge}
                    className="btn btn-icon"
                    title={`Align ${edge}`}
                    onClick={run(() => actions.align(selection, edge))}
                  >
                    <Glyph size={15} />
                  </button>
                ))}
              </div>
            </>
          )}

          {allStickies && (
            <>
              <div className="menu-sep" />
              <button
                className="menu-item"
                onClick={run(() => {
                  const count = selection.length
                  actions.stickiesToList(selection)
                  actions.toast(`Turned ${count} note${count === 1 ? '' : 's'} into a list.`, {
                    label: 'Undo',
                    run: () => actions.undo(),
                  })
                })}
              >
                <Icon.board size={14} />
                Turn into a list of cards
              </button>
            </>
          )}

          <div className="menu-sep" />
          <button
            className="menu-item"
            onClick={run(() => {
              const page = currentPage(store.getState())
              const locked = selection.every((id) => page.nodes[id]?.locked)
              for (const id of selection) actions.updateNode(id, { locked: !locked }, { history: 'Lock' })
            })}
          >
            <Icon.lock size={14} />
            Lock / unlock
          </button>
          <button className="menu-item" onClick={run(zoomToSelection)}>
            <Icon.search size={14} />
            Zoom to selection
            <span className="menu-shortcut">⇧ 2</span>
          </button>
          <div className="menu-sep" />
          <button className="menu-item" data-danger="true" onClick={run(() => actions.deleteNodes(selection))}>
            <Icon.trash size={14} />
            Delete
            <span className="menu-shortcut">Del</span>
          </button>
        </>
      ) : (
        <>
          <button
            className="menu-item"
            onClick={run(() => {
              const world = clientToWorld(x, y)
              const node = makeSticky({ x: world.x - 100, y: world.y - 100 })
              actions.addNode(node)
              actions.setEditing(node.id)
            })}
          >
            <Icon.sticky size={14} />
            Add sticky here
            <span className="menu-shortcut">S</span>
          </button>
          <button className="menu-item" onClick={run(() => void importImages())}>
            <Icon.image size={14} />
            Upload image…
          </button>
          <button className="menu-item" onClick={run(() => actions.selectAll())}>
            <Icon.layers size={14} />
            Select all
            <span className="menu-shortcut">{MOD} A</span>
          </button>
          <div className="menu-sep" />
          <button className="menu-item" onClick={run(zoomToFit)}>
            <Icon.search size={14} />
            Zoom to fit
            <span className="menu-shortcut">⇧ 1</span>
          </button>
          <button className="menu-item" onClick={run(() => actions.toggleGrid())}>
            <Icon.grid size={14} />
            Toggle grid
          </button>
          <button className="menu-item" onClick={run(() => actions.setCommandPalette(true))}>
            <Icon.search size={14} />
            All commands…
            <span className="menu-shortcut">{MOD} K</span>
          </button>
        </>
      )}
    </Popover>
  )
}
