import { useCallback, useEffect, useState } from 'react'
import { App } from './App'
import { backend, type AuthUser, type ProjectSummary } from './auth'
import { collab } from './collab'
import { forgetRemoteUrls } from './store/assets'
import { config } from './config'
import { actions, store } from './store/store'
import { createSampleDoc } from './store/sampleDoc'
import { AuthScreen } from './ui/auth/AuthScreen'
import { ProjectsScreen } from './ui/auth/ProjectsScreen'
import { SetupScreen } from './ui/auth/SetupScreen'
import { useRemoteSave } from './hooks/useRemoteSave'
import { zoomToFit } from './lib/commands'
import type { Doc } from './types'

type Stage =
  | { name: 'booting' }
  | { name: 'auth' }
  | { name: 'projects' }
  | { name: 'opening' }
  | { name: 'open'; projectId: string; version: number }

/** The signed-in app, wired to a project on the server. */
function RemoteWorkspace({
  projectId,
  version,
  onLeave,
  onSignOut,
}: {
  projectId: string
  version: number
  onLeave: () => void
  onSignOut: () => void
}) {
  const { conflict, resolve } = useRemoteSave(projectId, version)

  return (
    <>
      <App freshStart onLeaveProject={onLeave} onSignOut={onSignOut} />
      {conflict && (
        <div className="scrim">
          <div className="dialog" style={{ maxWidth: 440 }}>
            <div className="dialog-head">
              <h2>Someone else saved this project</h2>
            </div>
            <div className="dialog-body">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-dim)' }}>
                Your changes and theirs were made at the same time, so one version has to win. Nothing has
                been saved over yet — choose which copy to keep.
              </p>
            </div>
            <div className="dialog-foot">
              <button className="btn" onClick={() => void resolve('theirs')}>
                Use their version
              </button>
              <span style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => void resolve('mine')}>
                Keep mine
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function Shell({ freshStart }: { freshStart: boolean }) {
  const [stage, setStage] = useState<Stage>({ name: 'booting' })
  const [user, setUser] = useState<AuthUser | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refreshProjects = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setProjects(await backend.listProjects())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your projects.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (config.mode !== 'supabase') return
    let live = true

    void (async () => {
      await backend.init()
      if (!live) return
      const current = backend.currentUser()
      setUser(current)
      setStage(current && !backend.pendingAction() ? { name: 'projects' } : { name: 'auth' })
    })()

    return backend.onAuthChange((next) => {
      setUser(next)
      setStage((prev) => {
        if (!next) return { name: 'auth' }
        if (backend.pendingAction()) return { name: 'auth' }
        // Already inside a project: an ordinary token refresh, not a new sign-in.
        return prev.name === 'open' || prev.name === 'opening' ? prev : { name: 'projects' }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stage.name === 'projects') void refreshProjects()
  }, [stage.name, refreshProjects])

  const openProject = async (id: string) => {
    setStage({ name: 'opening' })
    setError(null)
    try {
      const { doc, version } = await backend.loadProject(id)
      collab.projectId = id
      actions.replaceDoc(doc)
      await collab.refresh()

      // What this person may do is decided by the roster, not by the button
      // they happened to click.
      const me = backend.currentUser()?.id
      const roster = store.getState().doc.members
      const mine = roster.find((m) => m.id === me)
      actions.setRole(mine?.role ?? projects.find((p) => p.id === id)?.role ?? 'viewer')

      setStage({ name: 'open', projectId: id, version })
      requestAnimationFrame(zoomToFit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that project.')
      setStage({ name: 'projects' })
    }
  }

  const createProject = async (name: string) => {
    setBusy(true)
    setError(null)
    try {
      const doc: Doc = { ...createSampleDoc(), name }
      const id = await backend.createProject(name, doc)
      await openProject(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that project.')
      setBusy(false)
    }
  }

  const deleteProject = async (id: string) => {
    try {
      await backend.deleteProject(id)
      await refreshProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that project.')
    }
  }

  const signOut = async () => {
    await backend.signOut()
    collab.projectId = null
    forgetRemoteUrls()
    setProjects([])
    setStage({ name: 'auth' })
  }

  // -- sandbox build: no accounts, straight into the canvas ----------------
  if (config.mode === 'demo') return <App freshStart={freshStart} />
  if (config.mode === 'setup') return <SetupScreen />

  if (stage.name === 'booting' || stage.name === 'opening') {
    return (
      <div className="gate">
        <div className="gate-inner" style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          {stage.name === 'opening' ? 'Opening project…' : 'Loading…'}
        </div>
      </div>
    )
  }

  if (stage.name === 'auth' || !user) {
    return <AuthScreen pending={backend.pendingAction()} signedIn={!!user} />
  }

  if (stage.name === 'projects') {
    return (
      <ProjectsScreen
        user={user}
        projects={projects}
        busy={busy}
        error={error}
        onOpen={(id) => void openProject(id)}
        onCreate={(name) => void createProject(name)}
        onDelete={(id) => void deleteProject(id)}
        onSignOut={() => void signOut()}
      />
    )
  }

  return (
    <RemoteWorkspace
      projectId={stage.projectId}
      version={stage.version}
      onLeave={() => {
        collab.projectId = null
        forgetRemoteUrls()
        setStage({ name: 'projects' })
      }}
      onSignOut={() => void signOut()}
    />
  )
}
