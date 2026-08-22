import { actions, currentPage, selectionBounds, store, type AppState } from '../store/store'
import { contentBounds, dropPoint, viewCenter, viewportSize } from '../canvas/viewportRef'
import { makeBoard, makeFrame, makeShape, makeSticky, makeText } from './factory'
import { addFilesToCanvas, downloadText, pickFiles } from './files'
import { clearSaved, exportDoc, importDoc } from '../store/persistence'
import { createSampleDoc } from '../store/sampleDoc'

export interface Command {
  id: string
  title: string
  group: string
  /** Display-only key hint, e.g. ['⌘', 'K']. */
  keys?: string[]
  /** Hidden from the palette when this returns false. */
  when?: (s: AppState) => boolean
  run: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = isMac ? '⌘' : 'Ctrl'

const hasSelection = (s: AppState) => s.selection.length > 0
const hasMulti = (s: AppState) => s.selection.length > 1

function place(make: (at: { x: number; y: number }) => ReturnType<typeof makeSticky>) {
  const node = make(dropPoint())
  node.x -= node.w / 2
  node.y -= node.h / 2
  actions.addNode(node)
  return node
}

export function zoomToFit() {
  const bounds = contentBounds()
  if (!bounds) {
    actions.setCamera({ x: 0, y: 0, zoom: 1 })
    return
  }
  actions.zoomToRect(bounds, viewportSize())
}

/** Switch pages, framing the new one the first time you land on it. */
export function goToPage(id: string) {
  const hadCamera = actions.setPage(id)
  if (!hadCamera) requestAnimationFrame(zoomToFit)
}

export function zoomToSelection() {
  const bounds = selectionBounds(store.getState())
  if (!bounds) {
    zoomToFit()
    return
  }
  actions.zoomToRect(bounds, viewportSize(), 140)
}

export async function importImages() {
  const files = await pickFiles('image/*')
  if (files.length === 0) return
  const c = viewCenter()
  await addFilesToCanvas(files, { x: c.x - 160, y: c.y - 120 })
}

export function buildCommands(): Command[] {
  return [
    // -- Create ------------------------------------------------------------
    {
      id: 'add.sticky',
      title: 'Add sticky note',
      group: 'Create',
      keys: ['S'],
      run: () => {
        const n = place((at) => makeSticky(at))
        actions.setEditing(n.id)
      },
    },
    {
      id: 'add.text',
      title: 'Add text',
      group: 'Create',
      keys: ['T'],
      run: () => {
        const n = place((at) => makeText(at) as never)
        actions.setEditing(n.id)
      },
    },
    {
      id: 'add.board',
      title: 'Add list (cards & checklists)',
      group: 'Create',
      keys: ['L'],
      run: () => {
        const n = place((at) => makeBoard(at) as never)
        actions.setEditing(n.id)
      },
    },
    {
      id: 'add.frame',
      title: 'Add section',
      group: 'Create',
      keys: ['F'],
      run: () => {
        place((at) => makeFrame(at) as never)
      },
    },
    {
      id: 'add.rect',
      title: 'Add rectangle',
      group: 'Create',
      keys: ['R'],
      run: () => {
        place((at) => makeShape(at, 'rect') as never)
      },
    },
    {
      id: 'add.ellipse',
      title: 'Add ellipse',
      group: 'Create',
      keys: ['O'],
      run: () => {
        place((at) => makeShape(at, 'ellipse') as never)
      },
    },
    { id: 'add.image', title: 'Upload image…', group: 'Create', keys: [MOD, 'U'], run: () => void importImages() },

    // -- Edit --------------------------------------------------------------
    { id: 'edit.undo', title: 'Undo', group: 'Edit', keys: [MOD, 'Z'], run: () => actions.undo() },
    { id: 'edit.redo', title: 'Redo', group: 'Edit', keys: [MOD, '⇧', 'Z'], run: () => actions.redo() },
    {
      id: 'edit.duplicate',
      title: 'Duplicate selection',
      group: 'Edit',
      keys: [MOD, 'D'],
      when: hasSelection,
      run: () => actions.duplicateNodes(store.getState().selection),
    },
    {
      id: 'edit.delete',
      title: 'Delete selection',
      group: 'Edit',
      keys: ['Del'],
      when: hasSelection,
      run: () => actions.deleteNodes(store.getState().selection),
    },
    {
      id: 'edit.selectAll',
      title: 'Select everything on this page',
      group: 'Edit',
      keys: [MOD, 'A'],
      run: () => actions.selectAll(),
    },

    // -- Arrange -----------------------------------------------------------
    {
      id: 'arrange.front',
      title: 'Bring to front',
      group: 'Arrange',
      keys: [']'],
      when: hasSelection,
      run: () => actions.reorder(store.getState().selection, 'front'),
    },
    {
      id: 'arrange.back',
      title: 'Send to back',
      group: 'Arrange',
      keys: ['['],
      when: hasSelection,
      run: () => actions.reorder(store.getState().selection, 'back'),
    },
    {
      id: 'arrange.alignLeft',
      title: 'Align left',
      group: 'Arrange',
      when: hasMulti,
      run: () => actions.align(store.getState().selection, 'left'),
    },
    {
      id: 'arrange.alignTop',
      title: 'Align top',
      group: 'Arrange',
      when: hasMulti,
      run: () => actions.align(store.getState().selection, 'top'),
    },
    {
      id: 'arrange.distributeH',
      title: 'Space evenly across',
      group: 'Arrange',
      when: (s) => s.selection.length > 2,
      run: () => actions.distribute(store.getState().selection, 'h'),
    },
    {
      id: 'arrange.distributeV',
      title: 'Space evenly down',
      group: 'Arrange',
      when: (s) => s.selection.length > 2,
      run: () => actions.distribute(store.getState().selection, 'v'),
    },

    {
      id: 'convert.stickiesToList',
      title: 'Turn selected notes into a list of cards',
      group: 'Arrange',
      when: (s) => {
        const page = s.doc.pages.find((p) => p.id === s.pageId)
        return (
          s.selection.length > 0 && s.selection.every((id) => page?.nodes[id]?.type === 'sticky')
        )
      },
      run: () => {
        const ids = store.getState().selection
        actions.stickiesToList(ids)
        actions.toast(`Turned ${ids.length} note${ids.length === 1 ? '' : 's'} into a list.`, {
          label: 'Undo',
          run: () => actions.undo(),
        })
      },
    },

    // -- View --------------------------------------------------------------
    { id: 'view.fit', title: 'Zoom to fit everything', group: 'View', keys: ['⇧', '1'], run: zoomToFit },
    {
      id: 'view.selection',
      title: 'Zoom to selection',
      group: 'View',
      keys: ['⇧', '2'],
      when: hasSelection,
      run: zoomToSelection,
    },
    {
      id: 'view.reset',
      title: 'Reset zoom to 100%',
      group: 'View',
      keys: [MOD, '0'],
      run: () => {
        const c = viewCenter()
        const { w, h } = viewportSize()
        actions.setCamera({ x: w / 2 - c.x, y: h / 2 - c.y, zoom: 1 })
      },
    },
    {
      id: 'view.grid',
      title: 'Toggle grid',
      group: 'View',
      keys: [MOD, "'"],
      run: () => actions.toggleGrid(),
    },
    {
      id: 'view.snap',
      title: 'Toggle snapping',
      group: 'View',
      run: () => actions.toggleSnap(),
    },
    {
      id: 'view.layers',
      title: 'Toggle layers panel',
      group: 'View',
      keys: [MOD, '\\'],
      run: () => actions.setPanel('left', !store.getState().leftPanel),
    },

    // -- Pages -------------------------------------------------------------
    { id: 'page.new', title: 'New page', group: 'Pages', run: () => actions.addPage() },
    {
      id: 'page.duplicate',
      title: 'Duplicate this page',
      group: 'Pages',
      run: () => {
        const s = store.getState()
        const src = currentPage(s)
        const id = actions.addPage(`${src.name} copy`)
        const clone = structuredClone({ nodes: src.nodes, order: src.order })
        actions.select([])
        // Re-add each node so ids stay unique across pages.
        const mapping = new Map<string, string>()
        const nodes = clone.order.map((oldId) => {
          const n = clone.nodes[oldId]
          const fresh = { ...n, id: `${n.id}x${Math.random().toString(36).slice(2, 6)}` }
          mapping.set(oldId, fresh.id)
          return fresh
        })
        for (const n of nodes) {
          if (n.type === 'connector') {
            if (n.from.kind === 'node') n.from = { ...n.from, id: mapping.get(n.from.id) ?? n.from.id }
            if (n.to.kind === 'node') n.to = { ...n.to, id: mapping.get(n.to.id) ?? n.to.id }
          }
        }
        actions.setPage(id)
        actions.addNodes(nodes, 'Duplicate page')
        actions.select([])
      },
    },

    // -- Collaborators -----------------------------------------------------
    { id: 'people.invite', title: 'Invite people…', group: 'People', run: () => actions.setInvite(true) },
    {
      id: 'people.panel',
      title: 'Show members panel',
      group: 'People',
      run: () => actions.setPanel('right', 'members'),
    },

    // -- File --------------------------------------------------------------
    {
      id: 'file.export',
      title: 'Export project as JSON',
      group: 'File',
      run: () => {
        const doc = store.getState().doc
        downloadText(`${doc.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'project'}.loft.json`, exportDoc(doc))
        actions.toast('Exported. Images are stored separately and are not included.')
      },
    },
    {
      id: 'file.import',
      title: 'Import project from JSON…',
      group: 'File',
      run: async () => {
        const [file] = await pickFiles('application/json,.json', false)
        if (!file) return
        const doc = importDoc(await file.text())
        if (!doc) {
          actions.toast('That file could not be read as a Loft project.')
          return
        }
        actions.replaceDoc(doc)
        actions.toast(`Opened “${doc.name}”.`)
      },
    },
    {
      id: 'file.reset',
      title: 'Reset to the sample project',
      group: 'File',
      run: () => {
        clearSaved()
        actions.replaceDoc(createSampleDoc())
        zoomToFit()
        actions.toast('Loaded the sample project.')
      },
    },
    {
      id: 'help.shortcuts',
      title: 'Keyboard shortcuts',
      group: 'Help',
      keys: ['?'],
      run: () => actions.setShortcuts(true),
    },
  ]
}
