import type { Asset, Id } from '../types'

/**
 * Images live in IndexedDB, not in the document. Undo history stays cheap and
 * a 4 MB screenshot never has to survive a JSON round-trip on every keystroke.
 */
const DB_NAME = 'loft-assets'
const STORE = 'assets'

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

/** Mirror of what's on disk, so rendering never waits on a transaction. */
const memory = new Map<Id, Asset>()

export function getAsset(id: Id): Asset | undefined {
  return memory.get(id)
}

export async function putAsset(asset: Asset): Promise<void> {
  memory.set(asset.id, asset)
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(asset)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

export async function loadAssets(): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      for (const a of req.result as Asset[]) memory.set(a.id, a)
      resolve()
    }
    req.onerror = () => resolve()
  })
}

/** Assets no longer referenced by any node are dropped on save. */
export async function pruneAssets(keep: Set<Id>): Promise<void> {
  const db = await openDb()
  const dead = [...memory.keys()].filter((id) => !keep.has(id))
  for (const id of dead) memory.delete(id)
  if (!db || dead.length === 0) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    for (const id of dead) tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function measureImage(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 320, h: 240 })
    img.src = dataUrl
  })
}
