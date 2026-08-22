import { useState } from 'react'
import { actions, store } from '../store/store'
import { useStore } from '../store/useStore'
import { MOD } from '../lib/commands'
import { initials } from '../lib/palette'
import { backend } from '../auth'
import { config } from '../config'
import { Icon } from './Icons'
import { Mark } from './Mark'
import { Popover } from './Popover'

export function TopBar({
  onLeaveProject,
  onSignOut,
}: {
  onLeaveProject?: () => void
  onSignOut?: () => void
}) {
  const [accountAt, setAccountAt] = useState<{ x: number; y: number } | null>(null)
  const account = config.mode === 'supabase' ? backend.currentUser() : null
  const name = useStore((s) => s.doc.name)
  const members = useStore((s) => s.doc.members)
  const leftPanel = useStore((s) => s.leftPanel)
  const rightPanel = useStore((s) => s.rightPanel)
  const saveState = useStore((s) => s.saveState)
  const canUndo = useStore((s) => s.historyLabels.length > 0)
  const canRedo = useStore((s) => s.redoLabels.length > 0)
  const role = useStore((s) => s.role)
  const editable = role === 'owner' || role === 'editor'

  const active = members.filter((m) => !m.pending)

  return (
    <header className="topbar">
      <span className="topbar-mark">
        <Mark />
        Loft
      </span>

      {onLeaveProject && (
        <button className="btn" title="Back to your projects" onClick={onLeaveProject}>
          <Icon.chevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
          Projects
        </button>
      )}

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

      {config.mode === 'supabase' && !editable && (
        <span className="tag" title={`You have ${role} access to this project`}>
          {role === 'commenter' ? 'Comment only' : 'View only'}
        </span>
      )}

      <span className="save-chip" data-state={saveState}>
        {saveState === 'saving'
          ? 'Saving…'
          : saveState === 'saved'
            ? config.mode === 'demo'
              ? 'Saved to this browser'
              : 'Saved'
            : ''}
      </span>

      <span className="topbar-spacer" />

      <button
        className="btn btn-icon"
        disabled={!canUndo || !editable}
        title={`Undo${canUndo ? ` — ${store.getState().historyLabels.at(-1)}` : ''} (${MOD} Z)`}
        onClick={() => actions.undo()}
      >
        <Icon.undo size={15} />
      </button>
      <button
        className="btn btn-icon"
        disabled={!canRedo || !editable}
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

      {role === 'owner' && (
        <button className="btn btn-primary" onClick={() => actions.setInvite(true)}>
          Invite
        </button>
      )}

      {account && (
        <>
          <span className="topbar-divider" />
          <button
            title={`Signed in as ${account.email}`}
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setAccountAt({ x: r.right, y: r.bottom + 6 })
            }}
          >
            <span className="avatar" style={{ background: account.color }}>
              {initials(account.name)}
            </span>
          </button>

          {accountAt && (
            <Popover x={accountAt.x} y={accountAt.y} align="end" onClose={() => setAccountAt(null)}>
              <div style={{ padding: '8px 10px 10px' }}>
                <div className="member-name">{account.name}</div>
                <div className="member-email">{account.email}</div>
              </div>
              <div className="menu-sep" />
              {onLeaveProject && (
                <button
                  className="menu-item"
                  onClick={() => {
                    setAccountAt(null)
                    onLeaveProject()
                  }}
                >
                  <Icon.layers size={14} />
                  All projects
                </button>
              )}
              <button
                className="menu-item"
                onClick={() => {
                  setAccountAt(null)
                  onSignOut?.()
                }}
              >
                <Icon.lock size={14} />
                Sign out
              </button>
            </Popover>
          )}
        </>
      )}
    </header>
  )
}
