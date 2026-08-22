import { getAsset } from '../store/assets'
import type { ImageNode } from '../types'

export function ImageView({ node }: { node: ImageNode }) {
  const asset = getAsset(node.assetId)
  if (!asset) {
    return (
      <div className="image-missing">
        Image unavailable
        <br />
        <span style={{ fontSize: 11 }}>{node.alt}</span>
      </div>
    )
  }
  return (
    <img
      className="image-node"
      src={asset.dataUrl}
      alt={node.alt}
      draggable={false}
      style={{ borderRadius: node.radius }}
    />
  )
}
