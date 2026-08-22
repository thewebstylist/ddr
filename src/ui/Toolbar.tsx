import { actions } from '../store/store'
import { useStore } from '../store/useStore'
import type { Tool } from '../types'
import { importImages } from '../lib/commands'
import { Icon } from './Icons'

interface ToolDef {
  tool: Tool
  label: string
  key: string
  glyph: (p: { size?: number }) => React.ReactElement
}

/**
 * Labels, not just icons. Every tool shows its name and its key, because the
 * cost of a 9px caption is far lower than the cost of a tool nobody finds.
 */
const TOOLS: ToolDef[] = [
  { tool: 'select', label: 'Select', key: 'V', glyph: Icon.cursor },
  { tool: 'hand', label: 'Pan', key: 'H', glyph: Icon.hand },
  { tool: 'sticky', label: 'Sticky', key: 'S', glyph: Icon.sticky },
  { tool: 'text', label: 'Text', key: 'T', glyph: Icon.text },
  { tool: 'board', label: 'List', key: 'L', glyph: Icon.board },
  { tool: 'frame', label: 'Section', key: 'F', glyph: Icon.frame },
  { tool: 'rect', label: 'Shape', key: 'R', glyph: Icon.square },
  { tool: 'connector', label: 'Arrow', key: 'A', glyph: Icon.arrow },
  { tool: 'pen', label: 'Draw', key: 'P', glyph: Icon.pen },
]

export function Toolbar() {
  const tool = useStore((s) => s.tool)
  const locked = useStore((s) => s.toolLocked)

  return (
    <div className="toolbar" data-interactive="true">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          className="tool"
          data-active={tool === t.tool}
          title={`${t.label} — ${t.key}`}
          onClick={() => actions.setTool(t.tool)}
          onDoubleClick={() => {
            actions.setTool(t.tool)
            if (!locked) actions.toggleToolLock()
          }}
        >
          <span className="tool-key">{t.key}</span>
          <t.glyph size={17} />
          <span className="tool-label">{t.label}</span>
        </button>
      ))}

      <button className="tool" title="Upload an image — you can also drag files straight onto the canvas" onClick={() => void importImages()}>
        <span className="tool-key">U</span>
        <Icon.image size={17} />
        <span className="tool-label">Image</span>
      </button>

      <div className="toolbar-sep" />

      <button
        className="lock-toggle"
        data-active={locked}
        title={
          locked
            ? 'Tool stays selected after each use. Click to go back to Select automatically.'
            : 'Tools return to Select after one use. Click to keep the tool active.'
        }
        onClick={() => actions.toggleToolLock()}
      >
        {locked ? <Icon.lock size={15} /> : <Icon.unlock size={15} />}
      </button>
    </div>
  )
}
