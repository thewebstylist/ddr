import { useState } from 'react'
import type { AuthUser, ProjectSummary } from '../../auth'
import { initials } from '../../lib/palette'
import { Icon } from '../Icons'
import { Mark } from '../Mark'

function when(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const ROLE_LABEL: Record<ProjectSummary['role'], string> = {
  owner: 'Owner',
  editor: 'Editor',
  commenter: 'Commenter',
  viewer: 'Viewer',
}

export function ProjectsScreen({
  user,
  projects,
  busy,
  error,
  onOpen,
  onCreate,
  onDelete,
  onSignOut,
}: {
  user: AuthUser
  projects: ProjectSummary[]
  busy: boolean
  error: string | null
  onOpen: (id: string) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
  onSignOut: () => void
}) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  return (
    <div className="gate">
      <div className="gate-inner gate-wide">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
          <div className="gate-mark" style={{ margin: 0 }}>
            <Mark />
            Loft
          </div>
          <span style={{ flex: 1 }} />
          <span className="avatar avatar-lg" style={{ background: user.color, marginRight: 9 }}>
            {initials(user.name)}
          </span>
          <div style={{ marginRight: 14 }}>
            <div className="member-name">{user.name}</div>
            <div className="member-email">{user.email}</div>
          </div>
          <button className="btn" onClick={onSignOut}>
            Sign out
          </button>
        </div>

        <div className="gate-header">
          <h1>Your projects</h1>
        </div>
        <p className="sub" style={{ color: 'var(--text-dim)', fontSize: 12.5, margin: '4px 0 0' }}>
          Only people invited to a project can open it.
        </p>

        {error && (
          <div className="notice" data-tone="error" style={{ marginTop: 16 }} role="alert">
            {error}
          </div>
        )}

        <div className="project-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card" style={{ position: 'relative' }}>
              <button
                onClick={() => onOpen(project.id)}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}
              >
                <h3>{project.name}</h3>
                <span className="meta">
                  <span className="tag">{ROLE_LABEL[project.role]}</span>
                  {when(project.updatedAt)}
                </span>
              </button>
              {project.role === 'owner' && (
                <button
                  className="layer-action"
                  style={{ position: 'absolute', top: 12, right: 12 }}
                  title={`Delete ${project.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete “${project.name}” for everyone? This cannot be undone.`)) {
                      onDelete(project.id)
                    }
                  }}
                >
                  <Icon.trash size={13} />
                </button>
              )}
            </div>
          ))}

          {naming ? (
            <form
              className="project-card"
              onSubmit={(e) => {
                e.preventDefault()
                onCreate(name.trim() || 'Untitled project')
                setName('')
                setNaming(false)
              }}
            >
              <input
                className="input"
                autoFocus
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => !name.trim() && setNaming(false)}
              />
              <button className="btn btn-primary" type="submit" style={{ marginTop: 'auto' }}>
                Create
              </button>
            </form>
          ) : (
            <button className="project-card project-new" disabled={busy} onClick={() => setNaming(true)}>
              <Icon.plus size={15} />
              New project
            </button>
          )}
        </div>

        {projects.length === 0 && !busy && (
          <p className="empty-note" style={{ marginTop: 18 }}>
            Nothing here yet. Create a project, then invite the people who should see it.
          </p>
        )}
      </div>
    </div>
  )
}
