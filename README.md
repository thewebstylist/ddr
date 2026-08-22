# Loft

A freeform project canvas with real boards on it — the Figma half and the Trello half in one
document, so nothing has to be kept in sync between two tools.

**[DESIGN.md](./DESIGN.md) is the design of the platform**: the problem, the principles, the object
model, and what comes next. This file covers running the code.

![The delivery board — Trello-style lists as objects on the canvas](./docs/board.png)

![The discovery workshop — the same project, before it was work](./docs/workshop.png)

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck    # strict TypeScript, no emit
npm run build        # production build into dist/
npm run bundle       # build, then flatten to a single self-contained bundle/loft.html
```

It opens on a sample project — a home renovation with a discovery workshop on one page and the
delivery board on another — because the fastest way to understand a canvas tool is to open one that
already has someone's thinking on it. **Reset to the sample project** in the command palette gets it
back at any time.

## Try these first

| | |
|---|---|
| Double-click anywhere | New sticky, caret already in it |
| Drag a card between lists | Works across lists, and past the edge of one |
| Drag a list by its header | Lists are canvas objects, not grid columns |
| Select some notes → right-click → **Turn into a list of cards** | The hinge between the two halves |
| `⌘K` / `Ctrl K` | Every command in the product, searchable |
| Drop a screenshot on the window | Lands where you dropped it |
| `?` | Shortcuts |

## Storage

Everything is local to your browser. The document lives in `localStorage`; uploaded images live in
IndexedDB, referenced by id, so undo history never carries binary payloads. **Export project as
JSON** in the command palette takes a portable copy — note that it carries the document, not the
image bytes.

There is no server. Members, roles and invitations are modelled and rendered, but nothing is shared
between browsers yet; see the roadmap at the end of `DESIGN.md`.

## Layout

```
src/
├── types.ts              the whole document model, in one file
├── store/
│   ├── store.ts          state, actions, undo history with coalescing
│   ├── useStore.ts       selector-based React binding
│   ├── persistence.ts    autosave, export, import
│   ├── assets.ts         IndexedDB image store
│   └── sampleDoc.ts      the starter project
├── canvas/
│   ├── Canvas.tsx        viewport, every pointer gesture, tool dispatch
│   ├── SelectionLayer    selection box, resize handles, hover outlines
│   ├── ConnectorLayer    attached arrows, painted above everything
│   ├── snapping.ts       edge/centre alignment with visible guides
│   └── viewportRef.ts    live canvas geometry, shared with menus and commands
├── nodes/                one component per node type; BoardView is the Trello half
├── ui/                   chrome: toolbar, panels, palette, dialogs, minimap
├── hooks/                hotkeys, clipboard, file drop, autosave
└── lib/                  geometry, factories, palette, command registry
```

Two conventions worth knowing before editing:

- **Gestures bind to the window, never to the element.** A drag must survive the pointer leaving
  whatever started it.
- **One gesture is one undo.** Live updates during a drag commit without history; `beginTransform`
  snapshots the document once at the start of the gesture.

## Stack

React 19, TypeScript (strict), Vite, Immer. No canvas library, no drag library, no UI kit — the
interaction model is the product, so it is written out rather than configured.
