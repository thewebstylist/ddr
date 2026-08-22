import { useState } from 'react'
import { actions } from '../store/store'
import { useStore } from '../store/useStore'
import { initials } from '../lib/palette'
import type { Member } from '../types'
import { Icon } from './Icons'

const ROLE_HELP: Record<Member['role'], string> = {
  owner: 'Full control, including deleting the project.',
  editor: 'Can change anything on the canvas and in lists.',
  commenter: 'Can check off cards and leave notes, but not restructure.',
  viewer: 'Can look around. Nothing they do changes the project.',
}

export function InviteDialog() {
  const open = useStore((s) => s.inviteOpen)
  const members = useStore((s) => s.doc.members)
  const docName = useStore((s) => s.doc.name)
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState<Member['role']>('editor')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const close = () => {
    actions.setInvite(false)
    setEmails('')
    setCopied(false)
  }

  const parsed = emails
    .split(/[,\s;]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))

  const send = () => {
    if (parsed.length === 0) return
    for (const email of parsed) actions.inviteMember(email, role)
    actions.toast(`Invited ${parsed.length} ${parsed.length === 1 ? 'person' : 'people'} as ${role}.`)
    setEmails('')
    actions.setPanel('right', 'members')
    close()
  }

  return (
    <div className="scrim" onPointerDown={close}>
      <div className="dialog" onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <Icon.people size={16} />
          <h2>Invite to “{docName}”</h2>
          <span style={{ flex: 1 }} />
          <button className="btn btn-icon" onClick={close}>
            <Icon.close size={14} />
          </button>
        </div>

        <div className="dialog-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input
              className="input"
              style={{ height: 32 }}
              autoFocus
              placeholder="name@company.com, another@company.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
                e.stopPropagation()
              }}
            />
            <select
              className="role-select"
              style={{ height: 32 }}
              value={role}
              onChange={(e) => setRole(e.target.value as Member['role'])}
            >
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-faint)', margin: '0 0 16px' }}>{ROLE_HELP[role]}</p>

          <div className="panel-title">On this project</div>
          {members.map((m) => (
            <div className="member-row" key={m.id}>
              <span className="avatar avatar-lg" style={{ background: m.color }}>
                {initials(m.name)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="member-name">
                  {m.name}
                  {m.pending && <span className="tag">Invited</span>}
                </div>
                <div className="member-email">{m.email}</div>
              </div>
              {m.role === 'owner' ? (
                <span className="tag">Owner</span>
              ) : (
                <>
                  <select
                    className="role-select"
                    value={m.role}
                    onChange={(e) => actions.setMemberRole(m.id, e.target.value as Member['role'])}
                  >
                    <option value="editor">Editor</option>
                    <option value="commenter">Commenter</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    className="btn btn-icon btn-ghost-danger"
                    title={`Remove ${m.name}`}
                    onClick={() => actions.removeMember(m.id)}
                  >
                    <Icon.close size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="dialog-foot">
          <button
            className="btn"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href)
              setCopied(true)
            }}
          >
            <Icon.copy size={14} />
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={parsed.length === 0} onClick={send}>
            Send {parsed.length > 0 ? `${parsed.length} invite${parsed.length === 1 ? '' : 's'}` : 'invite'}
          </button>
        </div>
      </div>
    </div>
  )
}
