import { actions, store } from '../store/store'
import { useStore } from '../store/useStore'
import { MOD } from '../lib/commands'
import { initials } from '../lib/palette'
import { Icon } from './Icons'

function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1" y="1" width="7.2" height="16" rx="2" fill="#4dabf7" />
      <rect x="9.8" y="1" width="7.2" height="9" rx="2" fill="#2dd4bf" />
      <rect x="9.8" y="11.6" width="7.2" height="5.4" rx="2" fill="#a78bfa" />
    </svg>
  )
}

export function TopBar() {
  const name = useStore((s) => s.doc.name)
  const members = useStore((s) => s.doc.members)
  const leftPanel = useStore((s) => s.leftPanel)
  const rightPanel = useStore((s) => s.rightPanel)
  const saveState = useStore((s) => s.saveState)
  const canUndo = useStore((s) => s.historyLabels.length > 0)
  const canRedo = useStore((s) => s.redoLabels.length > 0)

  const active = members.filter((m) => !m.pending)

  return (
    <header className="topbar">
      <span className="topbar-mark">
        <Mark />
        Loft
      </span>

      <span className="topbar-divider" />

      <button
        className="btn btn-icon"
        data-active={leftPanel}
        title={`Pages and layers (${MOD} \\)`}
        onClick={() => actions.setPanel('left', !leftPanel)}
      >
        <Icon.layers size={15} />
      </button>

      <input
        className="doc-name"
        value={name}
        aria-label="Project name"
        onChange={(e) => actions.renameDoc(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          e.stopPropagation()
        }}
      />

      <span className="save-chip" data-state={saveState}>
        {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved to this browser' : ''}
      </span>

      <span className="topbar-spacer" />

      <button
        className="btn btn-icon"
        disabled={!canUndo}
        title={`Undo${canUndo ? ` — ${store.getState().historyLabels.at(-1)}` : ''} (${MOD} Z)`}
        onClick={() => actions.undo()}
      >
        <Icon.undo size={15} />
      </button>
      <button
        className="btn btn-icon"
        disabled={!canRedo}
        title={`Redo (${MOD} ⇧ Z)`}
        onClick={() => actions.redo()}
      >
        <Icon.redo size={15} />
      </button>

      <span className="topbar-divider" />

      <button className="btn" title="Search every command" onClick={() => actions.setCommandPalette(true)}>
        <Icon.search size={14} />
        <span style={{ fontSize: 11.5 }}>{MOD} K</span>
      </button>

      <span className="topbar-divider" />

      <button
        className="presence"
        title="Who's on this project"
        onClick={() => actions.setPanel('right', rightPanel === 'members' ? 'design' : 'members')}
      >
        {active.slice(0, 4).map((m) => (
          <span key={m.id} className="avatar" style={{ background: m.color }}>
            {initials(m.name)}
          </span>
        ))}
        {active.length > 4 && (
          <span className="avatar" style={{ background: 'var(--bg-active)', color: 'var(--text-dim)' }}>
            +{active.length - 4}
          </span>
        )}
      </button>

      <button className="btn btn-primary" onClick={() => actions.setInvite(true)}>
        Invite
      </button>
    </header>
  )
}
