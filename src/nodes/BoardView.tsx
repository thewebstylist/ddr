import { useState } from 'react'
import { actions, store } from '../store/store'
import { useStore } from '../store/useStore'
import type { BoardNode, Card, Id, Label, Member } from '../types'
import { boardProgress } from '../lib/factory'
import { SWATCHES, initials } from '../lib/palette'
import { Icon } from '../ui/Icons'
import { Popover } from '../ui/Popover'
import { AutoTextarea } from './AutoTextarea'
import { beginCardDrag, isDraggingCard } from './cardDrag'

function formatDue(due: string): { text: string; overdue: boolean } {
  const date = new Date(`${due}T12:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = date.getTime() < today.getTime()
  return {
    text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overdue,
  }
}

// ---------------------------------------------------------------------------

function CardMenu({
  card,
  boardId,
  at,
  labels,
  members,
  onClose,
}: {
  card: Card
  boardId: Id
  at: { x: number; y: number }
  labels: Label[]
  members: Member[]
  onClose: () => void
}) {
  return (
    <Popover x={at.x} y={at.y} onClose={onClose} align="end">
      <div className="palette-group">Labels</div>
      {labels.map((l) => (
        <button key={l.id} className="menu-item" onClick={() => actions.toggleCardLabel(card.id, l.id)}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, flexShrink: 0 }} />
          {l.name}
          {card.labels.includes(l.id) && (
            <span className="menu-shortcut" style={{ color: 'var(--accent)' }}>
              <Icon.check size={11} />
            </span>
          )}
        </button>
      ))}

      <div className="menu-sep" />
      <div className="palette-group">Assign</div>
      {members.map((m) => (
        <button key={m.id} className="menu-item" onClick={() => actions.toggleCardAssignee(card.id, m.id)}>
          <span className="avatar" style={{ background: m.color }}>
            {initials(m.name)}
          </span>
          {m.name}
          {card.assignees.includes(m.id) && (
            <span className="menu-shortcut" style={{ color: 'var(--accent)' }}>
              <Icon.check size={11} />
            </span>
          )}
        </button>
      ))}

      <div className="menu-sep" />
      <div style={{ padding: '4px 8px 8px' }}>
        <div className="field-row">
          <span className="field-label">Due</span>
          <input
            className="input"
            type="date"
            value={card.due ?? ''}
            onChange={(e) => actions.updateCard(card.id, { due: e.target.value || null })}
          />
        </div>
      </div>

      <div className="menu-sep" />
      <button
        className="menu-item"
        onClick={() => {
          actions.addChecklistItem(card.id)
          onClose()
        }}
      >
        <Icon.list size={14} />
        Add checklist item
      </button>
      <button
        className="menu-item"
        onClick={() => {
          const copy = { ...card, title: `${card.title} copy` }
          const state = store.getState()
          const page = state.doc.pages.find((p) => p.id === state.pageId)
          const board = page?.nodes[boardId]
          const index = board?.type === 'board' ? board.cards.findIndex((c) => c.id === card.id) + 1 : undefined
          const newId = actions.addCard(boardId, copy.title, index)
          actions.updateCard(newId, {
            notes: card.notes,
            labels: [...card.labels],
            assignees: [...card.assignees],
            due: card.due,
          })
          onClose()
        }}
      >
        <Icon.copy size={14} />
        Duplicate card
      </button>
      <button
        className="menu-item"
        onClick={() => {
          actions.cardToSticky(card.id)
          onClose()
        }}
      >
        <Icon.sticky size={14} />
        Move out to the canvas
      </button>
      <button
        className="menu-item"
        data-danger="true"
        onClick={() => {
          actions.deleteCard(card.id)
          onClose()
        }}
      >
        <Icon.trash size={14} />
        Delete card
      </button>
    </Popover>
  )
}

// ---------------------------------------------------------------------------

function CardView({
  card,
  boardId,
  index,
  labels,
  members,
  dragging,
}: {
  card: Card
  boardId: Id
  index: number
  labels: Label[]
  members: Member[]
  dragging: boolean
}) {
  const focused = useStore((s) => s.focusedCardId === card.id)
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)

  const cardLabels = card.labels.map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[]
  const assigned = card.assignees.map((id) => members.find((m) => m.id === id)).filter(Boolean) as Member[]
  const checkDone = card.checklist.filter((i) => i.done).length
  const expanded = card.expanded || focused
  const due = card.due ? formatDue(card.due) : null

  return (
    <div
      className="card"
      data-card-id={card.id}
      data-board-id={boardId}
      data-card-index={index}
      data-focused={focused}
      data-dragging={dragging}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-no-drag]')) return
        beginCardDrag(e, card.id, boardId, card.title)
      }}
      onClick={(e) => {
        if (isDraggingCard()) return
        if ((e.target as HTMLElement).closest('[data-no-drag]')) return
        actions.setFocusedCard(card.id)
      }}
    >
      {cardLabels.length > 0 && (
        <div className="card-labels">
          {cardLabels.map((l) => (
            <span key={l.id} className="card-label" style={{ background: l.color }} title={l.name} />
          ))}
        </div>
      )}

      <div className="card-main">
        <button
          className="checkbox"
          data-no-drag="true"
          data-done={card.done}
          aria-label={card.done ? 'Mark not done' : 'Mark done'}
          onClick={(e) => {
            e.stopPropagation()
            actions.toggleCardDone(card.id)
          }}
        >
          {card.done && <Icon.check size={10} />}
        </button>

        {focused ? (
          <AutoTextarea
            className="card-title"
            data-no-drag="true"
            autoFocusSelect
            value={card.title}
            placeholder="What needs doing?"
            onChange={(e) =>
              actions.updateCard(card.id, { title: e.target.value }, { history: 'Edit card', coalesce: `card-${card.id}` })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!card.title.trim()) actions.deleteCard(card.id)
                else actions.addCard(boardId, '', index + 1)
              }
              if (e.key === 'Escape') {
                if (!card.title.trim()) actions.deleteCard(card.id)
                else actions.setFocusedCard(null)
              }
              if (e.key === 'Backspace' && card.title === '') {
                e.preventDefault()
                actions.deleteCard(card.id)
              }
              e.stopPropagation()
            }}
          />
        ) : (
          <div className="card-title" data-done={card.done}>
            {card.title || <span style={{ opacity: 0.4 }}>Untitled</span>}
          </div>
        )}

        <button
          className="layer-action"
          data-no-drag="true"
          data-forced={focused ? 'true' : undefined}
          aria-label="Card options"
          onClick={(e) => {
            e.stopPropagation()
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setMenuAt({ x: r.right, y: r.bottom + 4 })
          }}
        >
          <Icon.chevronDown size={13} />
        </button>
      </div>

      {(card.checklist.length > 0 || assigned.length > 0 || due || card.notes) && (
        <div className="card-meta">
          {card.checklist.length > 0 && (
            <button
              className="meta-chip"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation()
                actions.updateCard(card.id, { expanded: !card.expanded }, { history: 'Toggle checklist' })
              }}
              title={card.expanded ? 'Hide checklist' : 'Show checklist'}
            >
              <Icon.list size={11} />
              {checkDone}/{card.checklist.length}
            </button>
          )}
          {card.notes && (
            <span className="meta-chip" title="Has notes">
              <Icon.note size={11} />
            </span>
          )}
          {due && (
            <span className="meta-chip" data-overdue={due.overdue}>
              <Icon.clock size={11} />
              {due.text}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {assigned.length > 0 && (
            <span className="avatar-stack">
              {assigned.map((m) => (
                <span key={m.id} className="avatar" style={{ background: m.color }} title={m.name}>
                  {initials(m.name)}
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      {expanded && (card.checklist.length > 0 || focused) && (
        <div className="card-expand" data-no-drag="true">
          {focused && (
            <AutoTextarea
              className="card-notes"
              value={card.notes}
              placeholder="Notes…"
              onChange={(e) =>
                actions.updateCard(card.id, { notes: e.target.value }, { history: 'Edit notes', coalesce: `notes-${card.id}` })
              }
              onKeyDown={(e) => e.stopPropagation()}
            />
          )}

          {card.checklist.map((item) => (
            <div className="check-row" key={item.id}>
              <button
                className="check-box-sm"
                data-done={item.done}
                onClick={(e) => {
                  e.stopPropagation()
                  actions.updateChecklistItem(card.id, item.id, { done: !item.done })
                }}
              >
                {item.done && <Icon.check size={9} />}
              </button>
              <AutoTextarea
                className="check-text"
                data-done={item.done}
                value={item.text}
                placeholder="Step…"
                onChange={(e) =>
                  actions.updateChecklistItem(
                    card.id,
                    item.id,
                    { text: e.target.value },
                    { history: 'Edit checklist', coalesce: `chk-${item.id}` },
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!item.text.trim()) actions.deleteChecklistItem(card.id, item.id)
                    else actions.addChecklistItem(card.id)
                  }
                  if (e.key === 'Backspace' && item.text === '') {
                    e.preventDefault()
                    actions.deleteChecklistItem(card.id, item.id)
                  }
                  e.stopPropagation()
                }}
              />
            </div>
          ))}

          {focused && (
            <button
              className="add-card"
              style={{ padding: '3px 0', fontSize: 11 }}
              onClick={(e) => {
                e.stopPropagation()
                actions.addChecklistItem(card.id)
              }}
            >
              <Icon.plus size={11} />
              Add step
            </button>
          )}
        </div>
      )}

      {menuAt && (
        <CardMenu
          card={card}
          boardId={boardId}
          at={menuAt}
          labels={labels}
          members={members}
          onClose={() => setMenuAt(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function BoardMenu({ node, at, onClose }: { node: BoardNode; at: { x: number; y: number }; onClose: () => void }) {
  return (
    <Popover x={at.x} y={at.y} onClose={onClose} align="end">
      <div className="palette-group">List color</div>
      <div style={{ padding: '2px 8px 8px' }}>
        <div className="swatch-grid">
          {SWATCHES.map((s) => (
            <button
              key={s.id}
              className="swatch"
              style={{ background: s.accent }}
              data-active={node.accent === s.accent}
              title={s.name}
              onClick={() => actions.updateNode(node.id, { accent: s.accent }, { history: 'List color' })}
            />
          ))}
        </div>
      </div>
      <div className="menu-sep" />
      <button
        className="menu-item"
        onClick={() => {
          actions.addCard(node.id)
          onClose()
        }}
      >
        <Icon.plus size={14} />
        Add card
      </button>
      <button
        className="menu-item"
        onClick={() => {
          const sorted = [...node.cards].sort((a, b) => Number(a.done) - Number(b.done))
          actions.updateNode(node.id, { cards: sorted }, { history: 'Sort list' })
          onClose()
        }}
      >
        <Icon.list size={14} />
        Move done to bottom
      </button>
      <button
        className="menu-item"
        onClick={() => {
          const done = node.cards.filter((c) => c.done).length
          if (done === 0) {
            actions.toast('Nothing is checked off in this list yet.')
            onClose()
            return
          }
          actions.updateNode(node.id, { cards: node.cards.filter((c) => !c.done) }, { history: 'Archive done' })
          actions.toast(`Archived ${done} done card${done === 1 ? '' : 's'}.`, {
            label: 'Undo',
            run: () => actions.undo(),
          })
          onClose()
        }}
      >
        <Icon.check size={14} />
        Archive done cards
      </button>
      <div className="menu-sep" />
      <button
        className="menu-item"
        onClick={() => {
          actions.duplicateNodes([node.id])
          onClose()
        }}
      >
        <Icon.copy size={14} />
        Duplicate list
      </button>
      <button
        className="menu-item"
        data-danger="true"
        onClick={() => {
          actions.deleteNodes([node.id])
          onClose()
        }}
      >
        <Icon.trash size={14} />
        Delete list
      </button>
    </Popover>
  )
}

// ---------------------------------------------------------------------------

export function BoardView({ node, editing, selected }: { node: BoardNode; editing: boolean; selected: boolean }) {
  const labels = useStore((s) => s.doc.labels)
  const members = useStore((s) => s.doc.members)
  const draft = useStore((s) => (s.draft?.kind === 'card' ? s.draft : null))
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)

  const progress = boardProgress(node)
  const pct = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)
  const dropIndex = draft?.overBoard === node.id ? draft.overIndex : -1

  return (
    <div className="board" data-selected={selected}>
      <div className="board-head">
        <span className="board-dot" style={{ background: node.accent }} />
        <input
          className="board-title"
          data-interactive={editing ? 'true' : undefined}
          value={node.title}
          readOnly={!editing}
          style={{ pointerEvents: editing ? 'auto' : 'none' }}
          onChange={(e) =>
            actions.updateNode(node.id, { title: e.target.value }, { history: 'Rename list', coalesce: `board-${node.id}` })
          }
          onBlur={() => actions.setEditing(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
            e.stopPropagation()
          }}
        />
        <span className="board-count">
          {progress.done}/{progress.total}
        </span>
        <button
          className="layer-action"
          data-interactive="true"
          data-forced="true"
          aria-label={node.collapsed ? 'Expand list' : 'Collapse list'}
          onClick={() => actions.updateNode(node.id, { collapsed: !node.collapsed }, { history: 'Collapse list' })}
        >
          {node.collapsed ? <Icon.chevronRight size={13} /> : <Icon.chevronDown size={13} />}
        </button>
        <button
          className="layer-action"
          data-interactive="true"
          data-forced="true"
          aria-label="List options"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setMenuAt({ x: r.right, y: r.bottom + 4 })
          }}
        >
          <Icon.plus size={13} style={{ transform: 'rotate(45deg)' }} />
        </button>
      </div>

      <div className="board-progress">
        <div style={{ width: `${pct}%`, background: node.accent }} />
      </div>

      {!node.collapsed && (
        <>
          <div className="board-cards" data-interactive="true" data-card-list="true" data-board-id={node.id}>
            {node.cards.map((card, i) => (
              <div key={card.id}>
                {dropIndex === i && <div className="card-slot-line" />}
                <CardView
                  card={card}
                  boardId={node.id}
                  index={i}
                  labels={labels}
                  members={members}
                  dragging={draft?.cardId === card.id}
                />
              </div>
            ))}
            {dropIndex >= node.cards.length && <div className="card-slot-line" />}
            {node.cards.length === 0 && dropIndex < 0 && (
              <div style={{ padding: '10px 4px', fontSize: 11.5, color: 'var(--text-faint)' }}>
                No cards yet.
              </div>
            )}
          </div>

          <div className="board-foot" data-interactive="true">
            <button className="add-card" onClick={() => actions.addCard(node.id)}>
              <Icon.plus size={12} />
              Add card
            </button>
          </div>
        </>
      )}

      {menuAt && <BoardMenu node={node} at={menuAt} onClose={() => setMenuAt(null)} />}
    </div>
  )
}
