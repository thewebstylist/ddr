import { useEffect, useRef } from 'react'
import { actions, store } from '../store/store'
import { saveDoc, saveView } from '../store/persistence'

const DEBOUNCE_MS = 600

/** Autosave to this browser. Never blocks a keystroke; never loses the last edit. */
export function usePersistence() {
  const timer = useRef<number>(0)
  const lastDoc = useRef(store.getState().doc)

  useEffect(() => {
    const flush = () => {
      const state = store.getState()
      const result = saveDoc(state.doc)
      saveView({ pageId: state.pageId, camera: state.camera })
      if (result === 'quota') {
        actions.toast('This browser is out of storage — export the project to keep a copy.')
        actions.setSaveState('idle')
        return
      }
      actions.setSaveState('saved')
    }

    const unsubscribe = store.subscribe(() => {
      const state = store.getState()
      if (state.doc === lastDoc.current) return
      lastDoc.current = state.doc
      if (state.saveState !== 'saving') actions.setSaveState('saving')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, DEBOUNCE_MS)
    })

    const onHide = () => {
      window.clearTimeout(timer.current)
      flush()
    }
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onHide)

    return () => {
      unsubscribe()
      window.clearTimeout(timer.current)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])
}
