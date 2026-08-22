import { useEffect } from 'react'
import { actions, canEdit, currentPage, store } from '../store/store'
import { buildCommands, importImages, zoomToFit, zoomToSelection } from '../lib/commands'
import type { Tool } from '../types'
import { viewCenter, viewportSize } from '../canvas/viewportRef'

const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  h: 'hand',
  s: 'sticky',
  t: 'text',
  l: 'board',
  f: 'frame',
  r: 'rect',
  o: 'ellipse',
  a: 'connector',
  p: 'pen',
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

export function useHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const state = store.getState()

      // Escape always works, including out of a text field. A floating menu
      // owns its own dismissal, so step aside while one is open.
      if (e.key === 'Escape') {
        if (document.querySelector('.menu')) return
        if (state.commandPalette) return actions.setCommandPalette(false)
        if (state.shortcuts) return actions.setShortcuts(false)
        if (state.inviteOpen) return actions.setInvite(false)
        if (state.editingId) return actions.setEditing(null)
        if (state.focusedCardId) return actions.setFocusedCard(null)
        if (state.tool !== 'select') return actions.setTool('select')
        if (state.selection.length > 0) return actions.clearSelection()
        return
      }

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        actions.setCommandPalette(!state.commandPalette)
        return
      }

      if (isTyping(e.target)) return

      // Read-only sessions keep navigation and selection; everything that would
      // change the document is simply not wired up.
      const editable = canEdit(state)

      // -- modified ---------------------------------------------------------
      if (mod) {
        const key = e.key.toLowerCase()
        if (key === 'z') {
          e.preventDefault()
          if (e.shiftKey) actions.redo()
          else actions.undo()
          return
        }
        if (key === 'y') {
          e.preventDefault()
          actions.redo()
          return
        }
        if (key === 'a') {
          e.preventDefault()
          actions.selectAll()
          return
        }
        if (key === 'z' || key === 'y' || key === 'd' || key === 'u') {
          if (!editable) return
        }
        if (key === 'd') {
          e.preventDefault()
          actions.duplicateNodes(state.selection)
          return
        }
        if (key === 'u') {
          e.preventDefault()
          void importImages()
          return
        }
        if (key === '0') {
          e.preventDefault()
          const c = viewCenter()
          const { w, h } = viewportSize()
          actions.setCamera({ x: w / 2 - c.x, y: h / 2 - c.y, zoom: 1 })
          return
        }
        if (key === '\\') {
          e.preventDefault()
          actions.setPanel('left', !state.leftPanel)
          return
        }
        if (key === "'") {
          e.preventDefault()
          actions.toggleGrid()
          return
        }
        return
      }

      // -- plain ------------------------------------------------------------
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        actions.setShortcuts(true)
        return
      }

      // Keyboard layouts disagree about whether Shift+1 arrives as '!' or '1'.
      if (e.shiftKey && (e.key === '!' || e.key === '1')) {
        e.preventDefault()
        zoomToFit()
        return
      }
      if (e.shiftKey && (e.key === '@' || e.key === '2')) {
        e.preventDefault()
        zoomToSelection()
        return
      }

      if (!editable && (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Enter' || e.key.startsWith('Arrow') || e.key === '[' || e.key === ']')) {
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selection.length > 0) {
          e.preventDefault()
          actions.deleteNodes(state.selection)
        }
        return
      }

      if (e.key === 'Enter') {
        if (state.selection.length === 1) {
          const n = currentPage(state).nodes[state.selection[0]]
          if (n && n.type !== 'ink' && n.type !== 'image') {
            e.preventDefault()
            actions.setEditing(state.selection[0])
          }
        }
        return
      }

      if (e.key === ']' || e.key === '[') {
        if (state.selection.length > 0) {
          e.preventDefault()
          actions.reorder(state.selection, e.key === ']' ? 'front' : 'back')
        }
        return
      }

      if (e.key.startsWith('Arrow')) {
        if (state.selection.length === 0) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        const page = currentPage(state)
        actions.beginTransform('Nudge', 'nudge')
        actions.transformNodes(
          state.selection
            .map((id) => {
              const n = page.nodes[id]
              return n && n.type !== 'connector' ? { id, rect: { x: n.x + dx, y: n.y + dy } } : null
            })
            .filter(Boolean) as Array<{ id: string; rect: { x: number; y: number } }>,
        )
        return
      }

      const tool = TOOL_KEYS[e.key.toLowerCase()]
      if (tool && !e.altKey && (editable || tool === 'select' || tool === 'hand')) {
        e.preventDefault()
        actions.setTool(tool)
      }
    }

    // Capture phase: fields legitimately stop propagation for their own keys,
    // and Escape must never be one of the casualties.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}

/** Exported so the palette and menus stay in sync with what the keys do. */
export { buildCommands }
