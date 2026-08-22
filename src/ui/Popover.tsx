import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  x: number
  y: number
  onClose: () => void
  children: React.ReactNode
  /** Prefer opening upward when the anchor sits low in the window. */
  align?: 'start' | 'end'
}

/**
 * Fixed-position floating surface. Everything on the canvas lives inside a
 * scaled transform, so menus render to the body in screen space instead.
 */
export function Popover({ x, y, onClose, children, align = 'start' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 8
    let left = align === 'end' ? x - r.width : x
    let top = y
    if (left + r.width > window.innerWidth - pad) left = window.innerWidth - r.width - pad
    if (left < pad) left = pad
    if (top + r.height > window.innerHeight - pad) top = Math.max(pad, y - r.height)
    setPos({ left, top })
  }, [x, y, align])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    // Defer so the click that opened the popover does not immediately close it.
    const id = window.setTimeout(() => window.addEventListener('pointerdown', onDown, true), 0)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  return createPortal(
    <div ref={ref} className="menu" style={{ left: pos.left, top: pos.top }} data-interactive="true">
      {children}
    </div>,
    document.body,
  )
}
