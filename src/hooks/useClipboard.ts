import { useEffect, useRef } from 'react'
import { actions, currentPage, store } from '../store/store'
import { addFilesToCanvas } from '../lib/files'
import { makeSticky } from '../lib/factory'
import { viewCenter } from '../canvas/viewportRef'
import type { Node } from '../types'
import { uid } from '../lib/id'

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

function describe(n: Node): string {
  switch (n.type) {
    case 'sticky':
      return n.text
    case 'text':
      return n.text
    case 'board':
      return `${n.title}\n${n.cards.map((c) => `- [${c.done ? 'x' : ' '}] ${c.title}`).join('\n')}`
    default:
      return n.type
  }
}

/** Copy/paste of nodes, plus paste of images and text straight from the OS. */
export function useClipboard() {
  const buffer = useRef<Node[]>([])

  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const state = store.getState()
      if (state.selection.length === 0) return
      const page = currentPage(state)
      buffer.current = state.selection
        .map((id) => page.nodes[id])
        .filter((n): n is Node => !!n && n.type !== 'connector')
        .map((n) => structuredClone(n))
      e.clipboardData?.setData('text/plain', buffer.current.map(describe).join('\n'))
      e.preventDefault()
      actions.toast(`Copied ${buffer.current.length} item${buffer.current.length === 1 ? '' : 's'}.`)
    }

    const onCut = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      onCopy(e)
      actions.deleteNodes(store.getState().selection)
    }

    const onPaste = async (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const files = [...(e.clipboardData?.items ?? [])]
        .filter((i) => i.kind === 'file')
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f)

      if (files.length > 0) {
        e.preventDefault()
        const c = viewCenter()
        await addFilesToCanvas(files, { x: c.x - 160, y: c.y - 120 })
        return
      }

      if (buffer.current.length > 0) {
        e.preventDefault()
        const clones = buffer.current.map((n) => {
          const copy = structuredClone(n)
          copy.id = uid('n')
          copy.x += 32
          copy.y += 32
          if (copy.type === 'board') {
            copy.cards = copy.cards.map((card) => ({
              ...card,
              id: uid('card'),
              checklist: card.checklist.map((i) => ({ ...i, id: uid('chk') })),
            }))
          }
          return copy
        })
        buffer.current = clones
        actions.addNodes(clones, 'Paste')
        return
      }

      const text = e.clipboardData?.getData('text/plain')
      if (text?.trim()) {
        e.preventDefault()
        const c = viewCenter()
        // Multi-line pastes become one sticky per line — the fastest way to get
        // a list of notes out of a document and onto a board.
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
        if (lines.length > 1 && lines.length <= 24) {
          const nodes = lines.map((line, i) => {
            const s = makeSticky({ x: c.x - 220 + (i % 4) * 215, y: c.y - 160 + Math.floor(i / 4) * 215 })
            s.text = line
            return s
          })
          actions.addNodes(nodes, `Paste ${nodes.length} notes`)
        } else {
          const s = makeSticky({ x: c.x - 100, y: c.y - 100 })
          s.text = text.slice(0, 2000)
          actions.addNode(s, { label: 'Paste text' })
        }
      }
    }

    window.addEventListener('copy', onCopy)
    window.addEventListener('cut', onCut)
    window.addEventListener('paste', onPaste as unknown as EventListener)
    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('cut', onCut)
      window.removeEventListener('paste', onPaste as unknown as EventListener)
    }
  }, [])
}
