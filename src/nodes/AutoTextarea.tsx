import { useEffect, useLayoutEffect, useRef } from 'react'

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Focus and select-all on mount — used when a node enters edit mode. */
  autoFocusSelect?: boolean
}

/** A textarea that always matches its content height. */
export function AutoTextarea({ autoFocusSelect, value, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Every render, not just every value change: React rewrites the style
  // attribute from props on re-render, which wipes the height we set here.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  })

  useEffect(() => {
    if (!autoFocusSelect) return
    const el = ref.current
    if (!el) return
    el.focus()
    el.select()
  }, [autoFocusSelect])

  return <textarea ref={ref} value={value} rows={1} {...rest} />
}
