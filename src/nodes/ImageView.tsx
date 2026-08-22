import { useEffect, useState } from 'react'
import { cachedRemoteUrl, getAsset, resolveAssetUrl } from '../store/assets'
import { backend } from '../auth'
import { collab } from '../collab'
import type { ImageNode } from '../types'

/**
 * An image may live in this browser, in the project's shared storage, or — if
 * it was added before sharing was set up — nowhere this viewer can reach. All
 * three end somewhere sensible rather than a broken-image icon.
 */
function useImageSource(assetId: string): { url: string | null; loading: boolean } {
  const local = getAsset(assetId)
  const [url, setUrl] = useState<string | null>(local?.dataUrl ?? cachedRemoteUrl(assetId) ?? null)
  const [loading, setLoading] = useState(!url)

  useEffect(() => {
    if (url) return
    let live = true
    setLoading(true)
    void resolveAssetUrl(assetId, () =>
      collab.projectId ? backend.assetUrl(collab.projectId, assetId) : Promise.resolve(null),
    ).then((resolved) => {
      if (!live) return
      setUrl(resolved)
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [assetId, url])

  return { url, loading }
}

export function ImageView({ node }: { node: ImageNode }) {
  const { url, loading } = useImageSource(node.assetId)

  if (!url) {
    return (
      <div className="image-missing">
        {loading ? 'Loading…' : 'Image unavailable'}
        <br />
        <span style={{ fontSize: 11 }}>{node.alt}</span>
      </div>
    )
  }

  return (
    <img
      className="image-node"
      src={url}
      alt={node.alt}
      draggable={false}
      style={{ borderRadius: node.radius }}
    />
  )
}
