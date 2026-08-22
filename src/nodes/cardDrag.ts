import type { Id } from '../types'
import { actions, store } from '../store/store'

/**
 * Card dragging is pointer-driven rather than HTML5 drag-and-drop: the canvas
 * is a scaled transform, and native drag images do not survive that. Listeners
 * bind to the window so the gesture keeps working past the list's edge — the
 * exact failure that makes most board tools feel broken.
 */

interface Session {
  cardId: Id
  fromBoard: Id
  title: string
  startX: number
  startY: number
  started: boolean
  pointerId: number
}

let session: Session | null = null

const DRAG_THRESHOLD = 4

function resolveDrop(clientX: number, clientY: number): { board: Id | null; index: number } {
  const el = document.elementFromPoint(clientX, clientY)
  if (!el) return { board: null, index: 0 }

  const overCard = (el as HTMLElement).closest<HTMLElement>('[data-card-id]')
  if (overCard) {
    const boardId = overCard.dataset.boardId
    const index = Number(overCard.dataset.cardIndex ?? 0)
    const rect = overCard.getBoundingClientRect()
    const after = clientY > rect.top + rect.height / 2
    if (boardId) return { board: boardId, index: after ? index + 1 : index }
  }

  const list = (el as HTMLElement).closest<HTMLElement>('[data-card-list]')
  if (list?.dataset.boardId) {
    const state = store.getState()
    const page = state.doc.pages.find((p) => p.id === state.pageId)
    const board = page?.nodes[list.dataset.boardId]
    return { board: list.dataset.boardId, index: board?.type === 'board' ? board.cards.length : 0 }
  }

  return { board: null, index: 0 }
}

function onMove(e: PointerEvent) {
  if (!session) return
  if (!session.started) {
    if (Math.hypot(e.clientX - session.startX, e.clientY - session.startY) < DRAG_THRESHOLD) return
    session.started = true
  }
  const drop = resolveDrop(e.clientX, e.clientY)
  actions.setDraft({
    kind: 'card',
    cardId: session.cardId,
    fromBoard: session.fromBoard,
    title: session.title,
    pointer: { x: e.clientX, y: e.clientY },
    overBoard: drop.board,
    overIndex: drop.index,
  })
}

function onUp() {
  const active = session
  session = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
  if (!active?.started) {
    actions.setDraft(null)
    return
  }
  const draft = store.getState().draft
  if (draft?.kind === 'card' && draft.overBoard) {
    actions.moveCard(draft.cardId, draft.overBoard, draft.overIndex)
  }
  actions.setDraft(null)
}

export function beginCardDrag(e: React.PointerEvent, cardId: Id, fromBoard: Id, title: string) {
  if (e.button !== 0) return
  session = {
    cardId,
    fromBoard,
    title,
    startX: e.clientX,
    startY: e.clientY,
    started: false,
    pointerId: e.pointerId,
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

export function isDraggingCard(): boolean {
  return session?.started === true
}
