import { useState } from 'react'
import { actions } from '../store/store'
import { collab } from '../collab'
import { config } from '../config'
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

  const [sending, setSending] = useState(false)

  const send = async () => {
    if (parsed.length === 0 || sending) return
    setSending(true)
    const failures: string[] = []
    for (const address of parsed) {
      try {
        await collab.invite(address, role)
      } catch (err) {
        failures.push(`${address}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }
    setSending(false)

    const sent = parsed.length - failures.length
    if (sent > 0) {
      actions.toast(
        config.mode === 'supabase'
          ? `Invitation email sent to ${sent} ${sent === 1 ? 'person' : 'people'}.`
          : `Added ${sent} ${sent === 1 ? 'person' : 'people'} as ${role}.`,
      )
    }
    for (const failure of failures) actions.toast(failure)

    if (failures.length === 0) {
      setEmails('')
      actions.setPanel('right', 'members')
      close()
    }
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
                if (e.key === 'Enter') void send()
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
                    onChange={(e) =>
                      collab.run(collab.setRole(m.id, e.target.value as Member['role']), 'Could not change that role.')
                    }
                  >
                    <option value="editor">Editor</option>
                    <option value="commenter">Commenter</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    className="btn btn-icon btn-ghost-danger"
                    title={`Remove ${m.name}`}
                    onClick={() => collab.run(collab.remove(m.id), 'Could not remove that person.')}
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
          <button className="btn btn-primary" disabled={parsed.length === 0 || sending} onClick={() => void send()}>
            {sending
              ? 'Sending…'
              : `Send ${parsed.length > 0 ? `${parsed.length} invite${parsed.length === 1 ? '' : 's'}` : 'invite'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
