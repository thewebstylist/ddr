import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'
import { initStore, type AppState } from './store/store'
import { loadAssets } from './store/assets'
import { loadDoc, loadView } from './store/persistence'
import { createSampleDoc } from './store/sampleDoc'
import { INK_COLORS } from './lib/palette'

async function bootstrap() {
  // Images must be in memory before the first paint, or nodes flash empty.
  await loadAssets()

  const saved = loadDoc()
  const doc = saved ?? createSampleDoc()
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
    saveState: 'idle',
  }

  initStore(initial)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App freshStart={!view} />
    </StrictMode>,
  )
}

void bootstrap()
