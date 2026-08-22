import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { Shell } from './Shell'
import { initStore, type AppState } from './store/store'
import { loadAssets } from './store/assets'
import { loadDoc, loadView } from './store/persistence'
import { createSampleDoc } from './store/sampleDoc'
import { INK_COLORS } from './lib/palette'
import { config } from './config'
import { uid } from './lib/id'
import type { Doc } from './types'

/** A blank document to hold the store until a real project is opened. */
function emptyDoc(): Doc {
  return {
    id: uid('doc'),
    name: 'Loading…',
    pages: [{ id: uid('pg'), name: 'Page 1', nodes: {}, order: [], background: '#101215' }],
    labels: [],
    members: [],
    schema: 1,
  }
}

async function bootstrap() {
  // Images must be in memory before the first paint, or nodes flash empty.
  await loadAssets()

  const local = config.mode === 'demo'
  const saved = local ? loadDoc() : null
  const doc = local ? (saved ?? createSampleDoc()) : emptyDoc()
  const view = saved ? loadView() : null

  const initial: AppState = {
    doc,
    pageId: view && doc.pages.some((p) => p.id === view.pageId) ? view.pageId : doc.pages[0].id,
    camera: view?.camera ?? { x: 0, y: 0, zoom: 1 },
    cameras: {},
    tool: 'select',
    toolLocked: false,
    selection: [],
    editingId: null,
    focusedCardId: null,
    draft: null,
    leftPanel: true,
    rightPanel: 'design',
    snap: true,
    showGrid: true,
    inkColor: INK_COLORS[1],
    inkSize: 4,
    highlighter: false,
    commandPalette: false,
    shortcuts: false,
    inviteOpen: false,
    toasts: [],
    historyLabels: [],
    redoLabels: [],
    fileDropActive: false,
    role: 'owner',
    saveState: 'idle',
  }

  initStore(initial)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Shell freshStart={!view} />
    </StrictMode>,
  )
}

void bootstrap()
