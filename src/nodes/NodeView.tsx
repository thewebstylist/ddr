import { memo } from 'react'
import { currentPage } from '../store/store'
import { useStore } from '../store/useStore'
import type { Id } from '../types'
import { BoardView } from './BoardView'
import { FrameView } from './FrameView'
import { ImageView } from './ImageView'
import { InkView } from './InkView'
import { ShapeView } from './ShapeView'
import { StickyView } from './StickyView'
import { TextView } from './TextView'

export const NodeView = memo(function NodeView({ id }: { id: Id }) {
  const node = useStore((s) => currentPage(s).nodes[id])
  const editing = useStore((s) => s.editingId === id)
  const selected = useStore((s) => s.selection.includes(id))

  if (!node || node.hidden || node.type === 'connector') return null

  const style: React.CSSProperties = {
    left: node.x,
    top: node.y,
    width: node.w,
    height: node.h,
    opacity: node.opacity ?? 1,
  }

  return (
    <div
      className="node"
      data-node-id={node.id}
      data-node-type={node.type}
      data-locked={node.locked || undefined}
      style={style}
    >
      {node.type === 'sticky' && <StickyView node={node} editing={editing} />}
      {node.type === 'text' && <TextView node={node} editing={editing} />}
      {node.type === 'image' && <ImageView node={node} />}
      {node.type === 'shape' && <ShapeView node={node} editing={editing} />}
      {node.type === 'frame' && <FrameView node={node} editing={editing} />}
      {node.type === 'ink' && <InkView node={node} />}
      {node.type === 'board' && <BoardView node={node} editing={editing} selected={selected} />}
    </div>
  )
})
