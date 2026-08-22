import { useEffect, useRef, useState } from 'react'
import { backend, ConflictError } from '../auth'
import { actions, canComment, store } from '../store/store'
import type { Doc, Id } from '../types'

const DEBOUNCE_MS = 900

export interface ConflictState {
  remote: { doc: Doc; version: number }
}

/**
 * Autosave against the server.
 *
 * Saves carry the version they were based on, so a save that would clobber
 * someone else's work is refused by the database rather than silently winning.
 * When that happens we stop saving and ask — losing work quietly is worse than
 * an interruption.
 */
export function useRemoteSave(projectId: Id, startingVersion: number) {
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const version = useRef(startingVersion)
  const timer = useRef(0)
  const lastDoc = useRef(store.getState().doc)
  const paused = useRef(false)
  const inFlight = useRef(false)
  const dirty = useRef(false)

  useEffect(() => {
    version.current = startingVersion
    paused.current = false
    setConflict(null)
  }, [projectId, startingVersion])

  useEffect(() => {
    const flush = async () => {
      if (paused.current || inFlight.current) return
      // Viewers cannot write, and the database would refuse anyway.
      if (!canComment(store.getState())) return
      const doc = store.getState().doc
      inFlight.current = true
      dirty.current = false
      try {
        version.current = await backend.saveProject(projectId, doc, version.current)
        actions.setSaveState('saved')
      } catch (err) {
        if (err instanceof ConflictError) {
          paused.current = true
          setConflict({ remote: err.remote })
          actions.setSaveState('idle')
        } else {
          actions.setSaveState('idle')
          actions.toast(err instanceof Error ? err.message : 'Could not save. Retrying shortly.')
          // Leave it dirty; the next edit or the retry below tries again.
          dirty.current = true
          window.setTimeout(() => void flush(), 5000)
        }
      } finally {
        inFlight.current = false
        if (dirty.current && !paused.current) {
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS)
        }
      }
    }

    const unsubscribe = store.subscribe(() => {
      const doc = store.getState().doc
      if (doc === lastDoc.current) return
      lastDoc.current = doc
      if (paused.current) return
      dirty.current = true
      actions.setSaveState('saving')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS)
    })

    const onHide = () => {
      window.clearTimeout(timer.current)
      if (dirty.current) void flush()
    }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      unsubscribe()
      window.clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [projectId])

  const resolve = async (choice: 'mine' | 'theirs') => {
    const state = conflict
    if (!state) return
    if (choice === 'theirs') {
      actions.replaceDoc(state.remote.doc)
      version.current = state.remote.version
    } else {
      const mine = store.getState().doc
      version.current = await backend.saveProject(projectId, mine, state.remote.version)
    }
    paused.current = false
    setConflict(null)
    actions.setSaveState('saved')
  }

  return { conflict, resolve }
}
