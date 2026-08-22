import type { Card, Doc, Node, Page } from '../types'
import { makeBoard, makeCard, makeFrame, makeShape, makeSticky, makeText } from '../lib/factory'
import { uid } from '../lib/id'
import { SWATCHES } from '../lib/palette'
import { makeConnector } from '../lib/factory'

function place(nodes: Node[]): Page['nodes'] {
  const out: Page['nodes'] = {}
  for (const n of nodes) out[n.id] = n
  return out
}

function sticky(x: number, y: number, text: string, swatch = 0, w = 190, h = 150): Node {
  const n = makeSticky({ x, y }, SWATCHES[swatch].fill)
  n.text = text
  n.w = w
  n.h = h
  return n
}

function text(x: number, y: number, value: string, size = 24, weight = 600, w = 400): Node {
  const n = makeText({ x, y })
  n.text = value
  n.fontSize = size
  n.weight = weight
  n.w = w
  n.h = Math.max(32, size * 1.5)
  return n
}

function card(title: string, opts: Partial<Card> = {}): Card {
  return { ...makeCard(title), ...opts }
}

function checklist(items: Array<[string, boolean]>) {
  return items.map(([t, done]) => ({ id: uid('chk'), text: t, done }))
}

/**
 * The starter document. It is deliberately a real-looking project rather than
 * lorem ipsum: the fastest way to understand a canvas tool is to open one that
 * already has someone's actual thinking on it.
 */
export function createSampleDoc(): Doc {
  const members = [
    { id: 'm_you', name: 'You', email: 'you@studio.com', color: '#2dd4bf', role: 'owner' as const },
    { id: 'm_dana', name: 'Dana Whitfield', email: 'dana@oakhill.co', color: '#f0b429', role: 'editor' as const },
    { id: 'm_ivo', name: 'Ivo Marchetti', email: 'ivo@buildworks.io', color: '#a78bfa', role: 'commenter' as const },
  ]

  const labels = [
    { id: 'lb_blocked', name: 'Blocked', color: '#f2704f' },
    { id: 'lb_client', name: 'Needs client', color: '#f0b429' },
    { id: 'lb_perm', name: 'Permitting', color: '#a78bfa' },
    { id: 'lb_quick', name: 'Quick win', color: '#5bd07f' },
  ]

  // -- Page 1: the freeform workshop ---------------------------------------
  const brief = text(
    -20,
    -140,
    'Oak Hill Renovation — Discovery Workshop',
    36,
    700,
    920,
  )
  const subtitle = text(
    -20,
    -88,
    'Two hours with the client. Everything we heard, in their words, before we start solving.',
    16,
    400,
    720,
  )
  ;(subtitle as { color: string }).color = '#8b98a8'

  const s1 = makeFrame({ x: -40, y: -20 })
  s1.w = 620
  s1.h = 520
  s1.title = '1 · What we heard'

  const s2 = makeFrame({ x: 620, y: -20 })
  s2.w = 620
  s2.h = 520
  s2.title = '2 · What it means'

  const s3 = makeFrame({ x: 1280, y: -20 })
  s3.w = 480
  s3.h = 520
  s3.title = '3 · What we do'

  const heard = [
    sticky(-10, 60, 'The kitchen is unusable during dinner rush with the kids.', 1),
    sticky(200, 60, 'Budget is firm at 140k. She said it twice.', 0),
    sticky(-10, 230, 'Wants the original 1920s trim kept wherever possible.', 5),
    sticky(200, 230, 'Nervous about permits — last contractor stalled 4 months.', 3),
    sticky(410, 60, 'Both work from home. Noise windows matter.', 4),
    sticky(410, 230, '"I want to host Thanksgiving here."', 6, 190, 150),
  ]

  const means = [
    sticky(660, 60, 'Sequence work so the kitchen is never down more than 3 weeks.', 4, 250, 160),
    sticky(940, 60, 'Design to 125k so there is real contingency.', 0, 250, 160),
    sticky(660, 250, 'Trim survey before demo. Salvage plan in writing.', 5, 250, 160),
    sticky(940, 250, 'Permits filed week 1, before anything else starts.', 3, 250, 160),
  ]

  const bet = makeShape({ x: 1320, y: 70 }, 'rect')
  bet.w = 400
  bet.h = 150
  bet.text = 'The bet: certainty is worth more to her than square footage.'
  bet.fill = 'rgba(45,212,191,0.10)'
  bet.stroke = '#2dd4bf'
  bet.radius = 14

  const nextUp = sticky(1320, 250, 'Next: phased schedule + permit timeline, back to her Friday.', 6, 400, 130)

  const arrow1 = makeConnector(
    { kind: 'node', id: heard[3].id, anchor: 'auto' },
    { kind: 'node', id: means[3].id, anchor: 'auto' },
  )
  arrow1.color = '#f06595'
  arrow1.label = 'root fear'

  const arrow2 = makeConnector(
    { kind: 'node', id: means[0].id, anchor: 'auto' },
    { kind: 'node', id: bet.id, anchor: 'auto' },
  )
  arrow2.dashed = true

  const workshopNodes: Node[] = [
    s1,
    s2,
    s3,
    brief,
    subtitle,
    ...heard,
    ...means,
    bet,
    nextUp,
    arrow1,
    arrow2,
  ]

  const workshop: Page = {
    id: 'pg_workshop',
    name: 'Discovery workshop',
    nodes: place(workshopNodes),
    order: workshopNodes.map((n) => n.id),
    background: '#101215',
  }

  // -- Page 2: the same project, as work -----------------------------------
  const permits = makeBoard({ x: 0, y: 0 }, 'Permits & docs')
  permits.accent = '#a78bfa'
  permits.h = 340
  permits.cards = [
    card('Submit building permit', {
      done: true,
      labels: ['lb_perm'],
      assignees: ['m_ivo'],
      checklist: checklist([
        ['Stamped drawings', true],
        ['HOA sign-off letter', true],
      ]),
    }),
    card('Contractor agreements', { done: true, assignees: ['m_you'] }),
    card('Final inspection schedule', { labels: ['lb_perm'], due: '2026-10-14' }),
  ]

  const kitchen = makeBoard({ x: 340, y: 0 }, 'Kitchen')
  kitchen.accent = '#f0b429'
  kitchen.h = 430
  kitchen.cards = [
    card('Demo existing cabinets', { done: true, assignees: ['m_ivo'] }),
    card('Install new countertops', {
      labels: ['lb_client'],
      notes: 'Client still choosing between the honed quartz and the soapstone. Samples went out Tuesday.',
      checklist: checklist([
        ['Template after cabinet install', false],
        ['Confirm slab selection', false],
        ['Schedule fabricator', false],
      ]),
    }),
    card('Tile backsplash', { due: '2026-09-30' }),
    card('Appliance hookup', { labels: ['lb_blocked'] }),
  ]

  const bath = makeBoard({ x: 680, y: 0 }, 'Master bath')
  bath.accent = '#4dabf7'
  bath.h = 300
  bath.cards = [
    card('Replace vanity', { done: true }),
    card('Install walk-in shower', { assignees: ['m_ivo'], due: '2026-09-18' }),
    card('Heated floor tile', { labels: ['lb_quick'] }),
  ]

  const living = makeBoard({ x: 1020, y: 0 }, 'Living room')
  living.accent = '#5bd07f'
  living.h = 300
  living.cards = [
    card('Hardwood floor refinish', { done: true }),
    card('Crown molding install', { assignees: ['m_dana'] }),
    card('Repaint walls — Sage', { done: true }),
  ]

  const boardNote = sticky(
    1370,
    20,
    'Anything on this page can be dragged anywhere. Lists are objects on the canvas, not columns in a grid.',
    7,
    260,
    170,
  )

  const boardHeading = text(0, -120, 'Build phase', 32, 700, 500)
  const boardSub = text(0, -74, 'Drag cards between lists. Drag lists anywhere you want them.', 15, 400, 620)
  ;(boardSub as { color: string }).color = '#8b98a8'

  const boardNodes: Node[] = [boardHeading, boardSub, permits, kitchen, bath, living, boardNote]

  const boardPage: Page = {
    id: 'pg_build',
    name: 'Build phase',
    nodes: place(boardNodes),
    order: boardNodes.map((n) => n.id),
    background: '#101215',
  }

  return {
    id: uid('doc'),
    name: 'Oak Hill Renovation',
    pages: [workshop, boardPage],
    labels,
    members,
    schema: 1,
  }
}
