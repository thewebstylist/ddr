import { actions, currentPage, selectedNodes, store } from '../store/store'
import { shallowArray, useStore } from '../store/useStore'
import type { Node, ShapeKind, TextAlign } from '../types'
import { INK_COLORS, SWATCHES, initials } from '../lib/palette'
import { Icon } from './Icons'
import { importImages } from '../lib/commands'

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  suffix?: string
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 10.5, color: 'var(--text-faint)', width: 12 }}>{label}</span>
      <input
        className="input"
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
      />
      {suffix && <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{suffix}</span>}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-section">
      <div className="panel-title">{title}</div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------

function GeometrySection({ nodes }: { nodes: Node[] }) {
  const first = nodes[0]
  const patch = (key: 'x' | 'y' | 'w' | 'h') => (n: number) => {
    for (const node of nodes) actions.updateNode(node.id, { [key]: n }, { history: 'Resize', coalesce: `geo-${key}` })
  }
  return (
    <Section title="Position & size">
      <div className="field-row">
        <NumberField label="X" value={first.x} onChange={patch('x')} />
        <NumberField label="Y" value={first.y} onChange={patch('y')} />
      </div>
      <div className="field-row">
        <NumberField label="W" value={first.w} onChange={patch('w')} />
        <NumberField label="H" value={first.h} onChange={patch('h')} />
      </div>
      <div className="field-row">
        <span className="field-label">Opacity</span>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round((first.opacity ?? 1) * 100)}
          style={{ flex: 1 }}
          onChange={(e) => {
            for (const n of nodes)
              actions.updateNode(n.id, { opacity: Number(e.target.value) / 100 }, { history: 'Opacity', coalesce: 'op' })
          }}
        />
        <span style={{ fontSize: 11, width: 30, textAlign: 'right', color: 'var(--text-faint)' }}>
          {Math.round((first.opacity ?? 1) * 100)}%
        </span>
      </div>
    </Section>
  )
}

function ArrangeSection({ ids }: { ids: string[] }) {
  const edges = [
    ['left', Icon.align.left],
    ['hcenter', Icon.align.hcenter],
    ['right', Icon.align.right],
    ['top', Icon.align.top],
    ['vcenter', Icon.align.vcenter],
    ['bottom', Icon.align.bottom],
  ] as const
  return (
    <Section title={`Align ${ids.length} items`}>
      <div style={{ display: 'flex', gap: 3 }}>
        {edges.map(([edge, Glyph]) => (
          <button
            key={edge}
            className="btn btn-icon"
            title={`Align ${edge}`}
            onClick={() => actions.align(ids, edge)}
          >
            <Glyph size={15} />
          </button>
        ))}
      </div>
      {ids.length > 2 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => actions.distribute(ids, 'h')}>
            Space across
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => actions.distribute(ids, 'v')}>
            Space down
          </button>
        </div>
      )}
    </Section>
  )
}

function DesignTab() {
  const selection = useStore((s) => s.selection, shallowArray)
  const nodes = useStore(selectedNodes, shallowArray)
  const tool = useStore((s) => s.tool)
  const inkColor = useStore((s) => s.inkColor)
  const inkSize = useStore((s) => s.inkSize)
  const highlighter = useStore((s) => s.highlighter)

  if (tool === 'pen') {
    return (
      <>
        <Section title="Pen">
          <div className="swatch-grid" style={{ marginBottom: 10 }}>
            {INK_COLORS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                data-active={inkColor === c}
                onClick={() => actions.setInkStyle(c, inkSize, highlighter)}
              />
            ))}
          </div>
          <div className="field-row">
            <span className="field-label">Size</span>
            <input
              type="range"
              min={1}
              max={24}
              value={inkSize}
              style={{ flex: 1 }}
              onChange={(e) => actions.setInkStyle(inkColor, Number(e.target.value), highlighter)}
            />
            <span style={{ fontSize: 11, width: 22, textAlign: 'right' }}>{inkSize}</span>
          </div>
          <div className="seg">
            <button data-active={!highlighter} onClick={() => actions.setInkStyle(inkColor, inkSize, false)}>
              Pen
            </button>
            <button data-active={highlighter} onClick={() => actions.setInkStyle(inkColor, inkSize, true)}>
              Highlighter
            </button>
          </div>
        </Section>
        <p className="empty-note">Strokes are objects like anything else — select one later to recolour or delete it.</p>
      </>
    )
  }

  if (nodes.length === 0) {
    return (
      <>
        <Section title="Nothing selected">
          <p className="empty-note" style={{ padding: '0 0 6px' }}>
            Select something to style it. Or start with:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => actions.setTool('sticky')}>
              <Icon.sticky size={14} /> Sticky
            </button>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => actions.setTool('board')}>
              <Icon.board size={14} /> List
            </button>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => actions.setTool('frame')}>
              <Icon.frame size={14} /> Section
            </button>
            <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => void importImages()}>
              <Icon.image size={14} /> Image
            </button>
          </div>
        </Section>
        <Section title="Page">
          <div className="field-row">
            <span className="field-label">Backdrop</span>
            <div className="seg" style={{ flex: 1 }}>
              {[
                ['#101215', 'Dark'],
                ['#1b1e24', 'Slate'],
                ['#f5f4f0', 'Paper'],
              ].map(([color, label]) => (
                <button
                  key={color}
                  data-active={store.getState().doc.pages.find((p) => p.id === store.getState().pageId)?.background === color}
                  onClick={() => {
                    const s = store.getState()
                    const idx = s.doc.pages.findIndex((p) => p.id === s.pageId)
                    if (idx < 0) return
                    store.commit(
                      (d) => {
                        d.doc.pages[idx].background = color
                      },
                      { history: 'Page background' },
                    )
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Section>
      </>
    )
  }

  const first = nodes[0]
  const all = <T extends Node['type']>(type: T) => nodes.every((n) => n.type === type)

  return (
    <>
      {nodes.length > 1 && <ArrangeSection ids={selection} />}

      {all('sticky') && (
        <Section title="Sticky">
          <div className="swatch-grid" style={{ marginBottom: 10 }}>
            {SWATCHES.map((s) => (
              <button
                key={s.id}
                className="swatch"
                style={{ background: s.fill, boxShadow: `inset 0 0 0 2px ${s.accent}40` }}
                data-active={first.type === 'sticky' && first.fill === s.fill}
                title={s.name}
                onClick={() => {
                  for (const n of nodes) actions.updateNode(n.id, { fill: s.fill }, { history: 'Sticky colour' })
                }}
              />
            ))}
          </div>
          <div className="field-row">
            <span className="field-label">Text</span>
            <input
              className="input"
              type="number"
              min={10}
              max={64}
              value={first.type === 'sticky' ? first.fontSize : 16}
              onChange={(e) => {
                for (const n of nodes)
                  actions.updateNode(n.id, { fontSize: Number(e.target.value) }, { history: 'Text size' })
              }}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </Section>
      )}

      {all('text') && first.type === 'text' && (
        <Section title="Text">
          <div className="field-row">
            <span className="field-label">Size</span>
            <input
              className="input"
              type="number"
              min={8}
              max={160}
              value={first.fontSize}
              onChange={(e) => {
                for (const n of nodes)
                  actions.updateNode(n.id, { fontSize: Number(e.target.value) }, { history: 'Text size' })
              }}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <input
              className="input"
              type="number"
              step={100}
              min={300}
              max={800}
              value={first.weight}
              onChange={(e) => {
                for (const n of nodes) actions.updateNode(n.id, { weight: Number(e.target.value) }, { history: 'Weight' })
              }}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="field-row">
            <span className="field-label">Align</span>
            <div className="seg" style={{ flex: 1 }}>
              {(['left', 'center', 'right'] as TextAlign[]).map((a) => (
                <button key={a} data-active={first.align === a} onClick={() => actions.setTextAlign(selection, a)}>
                  {a[0].toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <span className="field-label">Face</span>
            <div className="seg" style={{ flex: 1 }}>
              <button
                data-active={!first.mono}
                onClick={() => {
                  for (const n of nodes) actions.updateNode(n.id, { mono: false }, { history: 'Font' })
                }}
              >
                Sans
              </button>
              <button
                data-active={!!first.mono}
                onClick={() => {
                  for (const n of nodes) actions.updateNode(n.id, { mono: true }, { history: 'Font' })
                }}
              >
                Mono
              </button>
            </div>
          </div>
          <div className="swatch-grid">
            {INK_COLORS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                data-active={first.color === c}
                onClick={() => {
                  for (const n of nodes) actions.updateNode(n.id, { color: c }, { history: 'Text colour' })
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {all('shape') && first.type === 'shape' && (
        <Section title="Shape">
          <div className="field-row">
            <div className="seg" style={{ flex: 1 }}>
              {(
                [
                  ['rect', Icon.square],
                  ['ellipse', Icon.circle],
                  ['diamond', Icon.diamond],
                  ['triangle', Icon.triangle],
                ] as Array<[ShapeKind, (p: { size?: number }) => React.ReactElement]>
              ).map(([kind, Glyph]) => (
                <button key={kind} data-active={first.shape === kind} onClick={() => actions.setShapeKind(selection, kind)}>
                  <Glyph size={14} />
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <span className="field-label">Stroke</span>
            <input
              className="input"
              type="number"
              min={0}
              max={16}
              value={first.strokeWidth}
              onChange={(e) => {
                for (const n of nodes)
                  actions.updateNode(n.id, { strokeWidth: Number(e.target.value) }, { history: 'Stroke' })
              }}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <span className="field-label" style={{ width: 40 }}>
              Corner
            </span>
            <input
              className="input"
              type="number"
              min={0}
              max={120}
              value={first.radius}
              onChange={(e) => {
                for (const n of nodes) actions.updateNode(n.id, { radius: Number(e.target.value) }, { history: 'Corner' })
              }}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="swatch-grid">
            {INK_COLORS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                data-active={first.stroke === c}
                onClick={() => {
                  for (const n of nodes)
                    actions.updateNode(
                      n.id,
                      { stroke: c, fill: `${c}22` },
                      { history: 'Shape colour' },
                    )
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {all('board') && first.type === 'board' && (
        <Section title="List">
          <div className="swatch-grid" style={{ marginBottom: 10 }}>
            {SWATCHES.map((s) => (
              <button
                key={s.id}
                className="swatch"
                style={{ background: s.accent }}
                data-active={first.accent === s.accent}
                onClick={() => {
                  for (const n of nodes) actions.updateNode(n.id, { accent: s.accent }, { history: 'List colour' })
                }}
              />
            ))}
          </div>
          <button className="btn" style={{ width: '100%' }} onClick={() => actions.addCard(first.id)}>
            <Icon.plus size={13} /> Add card
          </button>
          <button
            className="btn"
            style={{ width: '100%', marginTop: 6 }}
            onClick={() =>
              actions.updateNode(
                first.id,
                { cards: [...first.cards].sort((a, b) => Number(a.done) - Number(b.done)) },
                { history: 'Sort list' },
              )
            }
          >
            <Icon.list size={13} /> Move done to bottom
          </button>
        </Section>
      )}

      {all('connector') && first.type === 'connector' && (
        <Section title="Arrow">
          <div className="field-row">
            <span className="field-label">Label</span>
            <input
              className="input"
              value={first.label}
              placeholder="e.g. leads to"
              onChange={(e) =>
                actions.updateNode(first.id, { label: e.target.value }, { history: 'Arrow label', coalesce: 'arrow-label' })
              }
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="field-row">
            <span className="field-label">Style</span>
            <div className="seg" style={{ flex: 1 }}>
              <button
                data-active={!first.dashed}
                onClick={() => actions.updateNode(first.id, { dashed: false }, { history: 'Arrow style' })}
              >
                Solid
              </button>
              <button
                data-active={first.dashed}
                onClick={() => actions.updateNode(first.id, { dashed: true }, { history: 'Arrow style' })}
              >
                Dashed
              </button>
            </div>
          </div>
          <div className="field-row">
            <span className="field-label">Heads</span>
            <div className="seg" style={{ flex: 1 }}>
              <button
                data-active={first.arrowStart}
                onClick={() => actions.updateNode(first.id, { arrowStart: !first.arrowStart }, { history: 'Arrow head' })}
              >
                Start
              </button>
              <button
                data-active={first.arrowEnd}
                onClick={() => actions.updateNode(first.id, { arrowEnd: !first.arrowEnd }, { history: 'Arrow head' })}
              >
                End
              </button>
            </div>
          </div>
          <div className="swatch-grid">
            {INK_COLORS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                data-active={first.color === c}
                onClick={() => actions.updateNode(first.id, { color: c }, { history: 'Arrow colour' })}
              />
            ))}
          </div>
        </Section>
      )}

      {all('image') && first.type === 'image' && (
        <Section title="Image">
          <div className="field-row">
            <span className="field-label">Corner</span>
            <input
              className="input"
              type="number"
              min={0}
              max={80}
              value={first.radius}
              onChange={(e) => actions.updateNode(first.id, { radius: Number(e.target.value) }, { history: 'Corner' })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="field-row">
            <span className="field-label">Alt</span>
            <input
              className="input"
              value={first.alt}
              onChange={(e) =>
                actions.updateNode(first.id, { alt: e.target.value }, { history: 'Alt text', coalesce: 'alt' })
              }
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={() =>
              actions.updateNode(
                first.id,
                { w: first.naturalW, h: first.naturalH },
                { history: 'Reset image size' },
              )
            }
          >
            Reset to original size
          </button>
        </Section>
      )}

      {all('ink') && first.type === 'ink' && (
        <Section title="Drawing">
          <div className="swatch-grid">
            {INK_COLORS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                data-active={first.color === c}
                onClick={() => {
                  for (const n of nodes) actions.updateNode(n.id, { color: c }, { history: 'Ink colour' })
                }}
              />
            ))}
          </div>
        </Section>
      )}

      <GeometrySection nodes={nodes} />

      <Section title="Layer">
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => actions.reorder(selection, 'front')}>
            Front
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => actions.reorder(selection, 'back')}>
            Back
          </button>
          <button
            className="btn btn-icon btn-ghost-danger"
            title="Delete"
            onClick={() => actions.deleteNodes(selection)}
          >
            <Icon.trash size={14} />
          </button>
        </div>
      </Section>
    </>
  )
}

// ---------------------------------------------------------------------------

function MembersTab() {
  const members = useStore((s) => s.doc.members)
  const labels = useStore((s) => s.doc.labels)

  return (
    <>
      <Section title={`People · ${members.length}`}>
        {members.map((m) => (
          <div className="member-row" key={m.id}>
            <span className="avatar avatar-lg" style={{ background: m.color }}>
              {initials(m.name)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="member-name">
                {m.name}
                {m.pending && <span className="tag">Invited</span>}
              </div>
              <div className="member-email">{m.email}</div>
            </div>
            {m.role === 'owner' ? (
              <span className="tag">Owner</span>
            ) : (
              <select
                className="role-select"
                value={m.role}
                onChange={(e) => actions.setMemberRole(m.id, e.target.value as never)}
              >
                <option value="editor">Editor</option>
                <option value="commenter">Commenter</option>
                <option value="viewer">Viewer</option>
              </select>
            )}
          </div>
        ))}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => actions.setInvite(true)}>
          Invite people
        </button>
      </Section>

      <Section title="Labels">
        {labels.map((l) => (
          <div className="field-row" key={l.id}>
            <input
              type="color"
              value={l.color}
              style={{ width: 26, height: 26, padding: 0, border: 'none', background: 'none', borderRadius: 4 }}
              onChange={(e) => actions.updateLabel(l.id, { color: e.target.value })}
            />
            <input
              className="input"
              value={l.name}
              onChange={(e) => actions.updateLabel(l.id, { name: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        ))}
        <button className="btn" style={{ width: '100%' }} onClick={() => actions.addLabel('New label', '#8b98a8')}>
          <Icon.plus size={13} /> Add label
        </button>
      </Section>
    </>
  )
}

function HistoryTab() {
  const past = useStore((s) => s.historyLabels, shallowArray)
  const future = useStore((s) => s.redoLabels, shallowArray)

  return (
    <Section title="History">
      {past.length === 0 && future.length === 0 && (
        <p className="empty-note" style={{ padding: '4px 0' }}>
          Nothing yet. Every change you make lands here, and every one of them can be taken back.
        </p>
      )}
      {[...past].reverse().map((label, i) => (
        <button
          key={`p-${i}`}
          className="layer-row"
          style={{ width: '100%' }}
          title="Step back to here"
          onClick={() => {
            for (let n = 0; n <= i; n++) actions.undo()
          }}
        >
          <Icon.undo size={12} />
          <span className="layer-name">{label}</span>
        </button>
      ))}
      {future.map((label, i) => (
        <button
          key={`f-${i}`}
          className="layer-row"
          style={{ width: '100%', opacity: 0.5 }}
          title="Step forward to here"
          onClick={() => {
            for (let n = 0; n <= i; n++) actions.redo()
          }}
        >
          <Icon.redo size={12} />
          <span className="layer-name">{label}</span>
        </button>
      ))}
    </Section>
  )
}

// ---------------------------------------------------------------------------

export function Inspector() {
  const tab = useStore((s) => s.rightPanel)
  const count = useStore((s) => s.selection.length)
  const nodeType = useStore((s) => {
    const nodes = selectedNodes(s)
    return nodes.length === 1 ? nodes[0].type : null
  })

  if (tab === null) return null

  const heading =
    count === 0
      ? 'Canvas'
      : count === 1
        ? nodeType === 'board'
          ? 'List'
          : nodeType
            ? nodeType[0].toUpperCase() + nodeType.slice(1)
            : 'Selection'
        : `${count} selected`

  return (
    <aside className="panel panel-right" data-interactive="true">
      <div style={{ display: 'flex', gap: 2, padding: 6, borderBottom: '1px solid var(--line)' }}>
        {(
          [
            ['design', heading],
            ['members', 'People'],
            ['history', 'History'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className="btn"
            style={{ flex: 1, fontSize: 11.5 }}
            data-active={tab === id}
            onClick={() => actions.setPanel('right', id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="panel-scroll">
        {tab === 'design' && <DesignTab />}
        {tab === 'members' && <MembersTab />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </aside>
  )
}

export { currentPage }
