import type { Doc, Id } from '../types'
import { pruneAssets } from './assets'

const DOC_KEY = 'loft.doc.v1'
const VIEW_KEY = 'loft.view.v1'

export interface ViewState {
  pageId: Id
  camera: { x: number; y: number; zoom: number }
}

export function loadDoc(): Doc | null {
  try {
    const raw = localStorage.getItem(DOC_KEY)
    if (!raw) return null
    const doc = JSON.parse(raw) as Doc
    if (!doc || doc.schema !== 1 || !Array.isArray(doc.pages) || doc.pages.length === 0) return null
    return doc
  } catch {
    return null
  }
}

export function loadView(): ViewState | null {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    return raw ? (JSON.parse(raw) as ViewState) : null
  } catch {
    return null
  }
}

export function saveView(view: ViewState): void {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view))
  } catch {
    /* view state is a convenience; never surface a failure for it */
  }
}

export function saveDoc(doc: Doc): 'ok' | 'quota' | 'error' {
  try {
    localStorage.setItem(DOC_KEY, JSON.stringify(doc))
    const referenced = new Set<Id>()
    for (const page of doc.pages) {
      for (const id of page.order) {
        const n = page.nodes[id]
        if (n?.type === 'image') referenced.add(n.assetId)
      }
    }
    void pruneAssets(referenced)
    return 'ok'
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) return 'quota'
    return 'error'
  }
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(DOC_KEY)
    localStorage.removeItem(VIEW_KEY)
  } catch {
    /* nothing to do */
  }
}

export function exportDoc(doc: Doc): string {
  return JSON.stringify({ format: 'loft', version: 1, exportedAt: new Date().toISOString(), doc }, null, 2)
}

export function importDoc(json: string): Doc | null {
  try {
    const parsed = JSON.parse(json) as { format?: string; doc?: Doc } | Doc
    const doc = 'doc' in parsed && parsed.doc ? parsed.doc : (parsed as Doc)
    if (!doc.pages || !Array.isArray(doc.pages) || doc.pages.length === 0) return null
    return doc
  } catch {
    return null
  }
}
