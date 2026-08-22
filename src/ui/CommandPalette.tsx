import { useEffect, useMemo, useRef, useState } from 'react'
import { actions, store } from '../store/store'
import { buildCommands, type Command } from '../lib/commands'
import { useStore } from '../store/useStore'

function score(command: Command, query: string): number {
  if (!query) return 1
  const haystack = `${command.title} ${command.group}`.toLowerCase()
  const q = query.toLowerCase()
  if (haystack.includes(q)) return 100 - haystack.indexOf(q)
  // Loose subsequence match so "adl" finds "Add list".
  let i = 0
  for (const ch of q) {
    i = haystack.indexOf(ch, i)
    if (i === -1) return 0
    i++
  }
  return 1
}

/**
 * One searchable list of everything the app can do. This is the answer to
 * "I know it can do this, I just can't find it".
 */
export function CommandPalette() {
  const open = useStore((s) => s.commandPalette)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo(() => buildCommands(), [])

  const results = useMemo(() => {
    const state = store.getState()
    return commands
      .filter((c) => !c.when || c.when(state))
      .map((c) => ({ c, s: score(c, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((r) => r.c)
  }, [commands, query, open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const close = () => actions.setCommandPalette(false)

  let lastGroup = ''

  return (
    <div className="scrim" style={{ alignItems: 'flex-start' }} onPointerDown={close}>
      <div className="palette" onPointerDown={(e) => e.stopPropagation()}>
        <input
          className="palette-input"
          autoFocus
          placeholder="Search commands — try “list”, “align”, “invite”"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(results.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const command = results[active]
              if (command) {
                close()
                command.run()
              }
            } else if (e.key === 'Escape') {
              close()
            }
            e.stopPropagation()
          }}
        />
        <div className="palette-list" ref={listRef}>
          {results.length === 0 && (
            <div className="empty-note" style={{ padding: 16 }}>
              Nothing matches “{query}”.
            </div>
          )}
          {results.map((c, i) => {
            const header = c.group !== lastGroup && !query ? c.group : null
            lastGroup = c.group
            return (
              <div key={c.id}>
                {header && <div className="palette-group">{header}</div>}
                <button
                  className="palette-item"
                  data-active={i === active}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => {
                    close()
                    c.run()
                  }}
                >
                  <span style={{ flex: 1 }}>{c.title}</span>
                  {query && <span className="menu-shortcut">{c.group}</span>}
                  {c.keys && (
                    <span className="shortcut-keys">
                      {c.keys.map((k, n) => (
                        <kbd key={n}>{k}</kbd>
                      ))}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
