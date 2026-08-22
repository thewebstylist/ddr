import { actions } from '../store/store'
import { useStore } from '../store/useStore'
import { MOD } from '../lib/commands'
import { Icon } from './Icons'

const GROUPS: Array<[string, Array<[string, string[]]>]> = [
  [
    'Getting around',
    [
      ['Pan the canvas', ['Space', 'drag']],
      ['Zoom in / out', [MOD, 'scroll']],
      ['Zoom to fit', ['⇧', '1']],
      ['Zoom to selection', ['⇧', '2']],
      ['Actual size', [MOD, '0']],
    ],
  ],
  [
    'Tools',
    [
      ['Select', ['V']],
      ['Sticky note', ['S']],
      ['Text', ['T']],
      ['List with cards', ['L']],
      ['Section', ['F']],
      ['Shape', ['R']],
      ['Arrow', ['A']],
      ['Draw', ['P']],
      ['Upload image', [MOD, 'U']],
    ],
  ],
  [
    'Working',
    [
      ['Everything, searchable', [MOD, 'K']],
      ['Undo / redo', [MOD, 'Z']],
      ['Duplicate', [MOD, 'D']],
      ['Delete', ['Del']],
      ['Select all', [MOD, 'A']],
      ['Nudge / nudge far', ['←', '⇧←']],
      ['Bring forward / back', [']', '[']],
    ],
  ],
  [
    'Cards',
    [
      ['Open a card', ['click']],
      ['Next card', ['Enter']],
      ['Delete an empty card', ['⌫']],
      ['Move between lists', ['drag']],
      ['Check off', ['click box']],
    ],
  ],
]

export function ShortcutSheet() {
  const open = useStore((s) => s.shortcuts)
  if (!open) return null

  return (
    <div className="scrim" onPointerDown={() => actions.setShortcuts(false)}>
      <div className="dialog" style={{ maxWidth: 620 }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>Shortcuts</h2>
          <span style={{ flex: 1 }} />
          <button className="btn btn-icon" onClick={() => actions.setShortcuts(false)}>
            <Icon.close size={14} />
          </button>
        </div>
        <div className="dialog-body">
          <div className="shortcut-grid">
            {GROUPS.map(([title, rows]) => (
              <div key={title}>
                <div className="panel-title">{title}</div>
                {rows.map(([label, keys]) => (
                  <div className="shortcut-row" key={label}>
                    <span>{label}</span>
                    <span className="shortcut-keys">
                      {keys.map((k) => (
                        <kbd key={k}>{k}</kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="dialog-foot">
          <span style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>
            Nothing here is required — every one of these is also a button somewhere.
          </span>
        </div>
      </div>
    </div>
  )
}
