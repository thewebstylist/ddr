import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { AppState } from './store'
import { store } from './store'

/**
 * Subscribe to a slice of app state. The equality function lets hot paths
 * (drag, pan) re-render only the components whose slice actually moved.
 */
export function useStore<T>(selector: (s: AppState) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const selectorRef = useRef(selector)
  selectorRef.current = selector
  const equalRef = useRef(isEqual)
  equalRef.current = isEqual
  const cache = useRef<{ value: T; primed: boolean }>({ value: undefined as unknown as T, primed: false })

  const getSnapshot = useCallback(() => {
    const next = selectorRef.current(store.getState())
    if (!cache.current.primed || !equalRef.current(cache.current.value, next)) {
      cache.current = { value: next, primed: true }
    }
    return cache.current.value
  }, [])

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export function shallowArray<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function shallowObject(a: object, b: object): boolean {
  if (a === b) return true
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const ka = Object.keys(left)
  if (ka.length !== Object.keys(right).length) return false
  for (const k of ka) if (left[k] !== right[k]) return false
  return true
}
