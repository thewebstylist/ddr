# Loft — design of the platform

*A working name. One space, freeform, where the thinking and the work live together.*

---

## 1. The problem, stated precisely

Two categories of tool exist, and neither finishes the job.

**Freeform canvases** (Figma, FigJam, Miro) are excellent at the messy half of a project: the
workshop, the wall of notes, the screenshots, the arrows between things. They are hopeless at the
part that comes next. There is no notion of *done*. A sticky that says "file the permit" is the
same object whether it was filed six weeks ago or never. So the work migrates to a second tool, the
canvas goes stale, and within a month it is a museum piece nobody opens.

**Board tools** (Trello, Asana, Linear) are excellent at the tidy half. They are also a grid you
cannot leave. Columns are equal-width and evenly spaced whether or not that reflects anything true.
You cannot put a floor plan next to a list, or draw a line from a client quote to the task it
caused, or sit two unrelated workstreams side by side at different scales. Everything that made the
workshop useful gets flattened into a card description.

Teams therefore run both, and pay the tax: the same information typed twice, two links in every
email, and a standing argument about which one is current.

**Loft's premise: a board is an object on a canvas.** Not a mode, not a linked view, not an
embed — the same document. Free placement and structured work are the same surface, so nothing has
to migrate anywhere.

---

## 2. What actually goes wrong in practice

From watching this happen on a real client project, the frustrations are specific and, importantly,
mostly *not* about missing features:

| What happens | Why it happens |
|---|---|
| "I can't find the thing that does X" | Icon-only toolbars; capabilities discoverable only by hover-and-hope |
| "I clicked once and now I'm drawing forever" | Modal tools that stay armed after use |
| "I dragged it into a frame and it disappeared" | Containers that silently capture whatever touches them |
| "It stopped dragging halfway" | Drag handlers bound to the element instead of the window |
| "Where did my note go?" | Infinite canvas with no map and no way back |
| "I don't know if that saved" | No visible save state, no history you can read |
| "The client can't figure out how to check something off" | Editing power and reviewing power modelled as one role |

Every one of those is a design decision, not a technical limit. So each gets an explicit answer
below.

---

## 3. Principles

**1. Never trap the user in a mode.**
Creation tools fire once and return to Select. If you genuinely want to place six stickies in a row,
double-click the tool or hit the padlock — but that is opt-in, and the padlock is visible while it
is on, so the state is never a mystery.

**2. Say what things are.**
Every tool carries its name and its key at 9px. The cost is a few pixels of chrome. The benefit is
that nobody has to learn an icon language before they can use the product.

**3. There is always one obvious next thing.**
A permanent hint line at the bottom of the window reads the current tool and selection and says what
you can do *right now*. It changes when the situation changes. It is the cheapest onboarding
possible and it never has to be dismissed.

**4. One searchable list of everything.**
`⌘K` searches every command in the product, including the ones with no button. Anything a power user
reaches by shortcut, a first-timer can reach by typing a word they already know.

**5. Containers never swallow.**
Sections are visual groupings, drawn behind everything, click-through in the middle, grabbed by
their title. Dropping a note "into" a section does not reparent it, so it cannot vanish, and moving
a section does not drag along things that merely overlap it. If you want grouping semantics you ask
for them; you never get them by accident.

**6. One gesture is one undo.**
Drawing a stroke, dragging four items, creating a list — each costs exactly one `⌘Z`, never two or
five. History is also a readable list in the right panel: named steps you can click to travel back
to. Undo is only trustworthy if you can see what it will do.

**7. Reviewing is not editing.**
A commenter can check a card off and leave a note but cannot restructure the canvas. This is the
role most collaboration tools omit, and it is the one clients actually need.

---

## 4. The object model

One page holds a flat, ordered list of nodes. Every node is a rectangle with a type. That is the
whole model, and its flatness is the point: anything true of a shape is true of a list.

```
Doc
├── pages[]            each with its own nodes, paint order, and remembered camera
├── members[]          name, email, colour, role (owner/editor/commenter/viewer)
└── labels[]           shared across every board on every page

Node = Frame | Board | Sticky | Text | Image | Shape | Ink | Connector
```

The interesting one:

```
Board  (a Trello list that happens to live at x, y)
├── title, accent colour, collapsed
└── cards[]
    ├── title, done, notes, due, labels[], assignees[]
    └── checklist[]    { text, done }
```

Three consequences fall straight out of that shape:

- A list can be **dragged, resized, collapsed and coloured** like any other object, because it is
  any other object.
- An **arrow can connect a client quote to the task it produced**, because connectors attach to
  node ids and do not care what type they point at.
- **Cards move between lists** by pointer, and lists move around the canvas by their header — two
  different gestures that never compete, because they start in different places.

**Images live outside the document.** They sit in IndexedDB, referenced by id. Undo history is a
stack of document snapshots, and a 4 MB screenshot has no business being copied into it on every
keystroke.

---

## 5. The hinge: notes become work

This is the feature that justifies building one product instead of using two.

A workshop ends with a wall of stickies. What everyone wants next is those stickies as tasks, and
what everyone actually does is retype them. So: select any set of notes, **Turn into a list of
cards**. The list appears beside them, one card per note, first line as the title and the rest as
the card's notes. It is one undo away if it was wrong.

The trip runs both ways. A card that turns out to need thinking rather than doing goes **back out to
the canvas** as a sticky, checklist and all, where it can have things drawn around it.

Neither direction is a copy or a sync. It is the same document changing shape, which is why it can
never drift.

---

## 6. Interaction decisions worth defending

**Pointer capture, always.** Every drag binds to the window, not the element. A drag that dies when
the cursor leaves the card is the single most common broken-feeling bug in board tools, and it is
entirely avoidable.

**Trackpad-native navigation.** Two-finger scroll pans, pinch zooms, `Space` grabs, and the wheel
does what the wheel does everywhere else. No modifier archaeology required.

**Snapping with visible guides.** Edges and centres, threshold measured in *screen* pixels so it
feels identical at 30% and 300%. Toggleable, because sometimes a wall of notes should look like a
wall of notes.

**Everything lands ready to type.** New sticky, new text, new list — the caret is already in it.
Creating something you then have to double-click is a wasted step repeated hundreds of times a day.

**Paste is smart.** Multi-line text becomes one sticky per line, laid out in a grid. Getting a
bulleted list out of a document and onto a wall should take one keystroke.

**Autosave you can see.** "Saving…" then "Saved to this browser", debounced, flushed on tab hide.
Silence is not reassurance.

---

## 7. What this prototype does and does not do

**Real and working:** infinite canvas with pan/zoom; stickies, text, shapes, sections, freehand pen
and highlighter, attached arrows; image upload by picker, drag-and-drop or paste; multi-select,
marquee, snapping, align and distribute; boards with cards, checklists, labels, assignees and due
dates; cards dragged between lists; sticky↔card conversion; pages; layers; named undo history;
command palette; member roles and invitations; autosave and JSON export/import.

**Modelled in the interface, not yet real:** collaboration. Members, roles, invitations and presence
are designed and rendered, but there is no server, so nothing is shared between browsers yet. This
is deliberate — the interaction design is the part worth settling first, and it is the part that
determines what the backend has to do.

**Next, in order:**

1. **Real-time multiplayer.** The document is already a flat, id-addressed node map with per-node
   updates, which is the shape a CRDT wants. Presence cursors and per-node selection locks follow.
2. **Comments as first-class nodes.** Pinned to a point or a card, resolvable, with an inbox. The
   commenter role is only half useful without them.
3. **Views over the same nodes.** A timeline and a calendar reading the same cards, since due dates
   and assignees are already in the model.
4. **Templates.** A workshop board, a delivery board, a client review — the sample project in this
   repo is really the first one of these.
5. **Export that looks like the canvas.** PNG and PDF of a section or a selection, for the deck that
   always gets asked for.
