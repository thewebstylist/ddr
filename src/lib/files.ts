import { actions } from '../store/store'
import { measureImage, putAsset, readFileAsDataUrl } from '../store/assets'
import { makeImage, makeSticky, makeText } from './factory'
import { uid } from './id'
import type { Node, Vec } from '../types'

const MAX_BYTES = 8 * 1024 * 1024

/**
 * Anything you can drop, paste, or pick lands as a node. Unsupported types
 * still land — as a labelled placeholder — rather than silently vanishing.
 */
export async function addFilesToCanvas(files: File[], at: Vec): Promise<void> {
  const created: Node[] = []
  let index = 0
  let skipped = 0

  for (const file of files) {
    const spot = { x: at.x + index * 32, y: at.y + index * 32 }
    if (file.size > MAX_BYTES) {
      skipped++
      continue
    }
    if (file.type.startsWith('image/')) {
      const dataUrl = await readFileAsDataUrl(file)
      const { w, h } = await measureImage(dataUrl)
      const assetId = uid('as')
      await putAsset({ id: assetId, name: file.name, type: file.type, dataUrl, w, h })
      created.push(makeImage(spot, assetId, w, h, file.name))
      index++
    } else if (file.type.startsWith('text/') || /\.(md|txt|csv|json)$/i.test(file.name)) {
      const text = await file.text()
      const node = makeSticky(spot)
      node.text = text.slice(0, 2000)
      node.w = 320
      node.h = 280
      created.push(node)
      index++
    } else {
      const node = makeText(spot)
      node.text = `📎 ${file.name}`
      node.fontSize = 16
      created.push(node)
      index++
    }
  }

  if (created.length > 0) actions.addNodes(created, `Add ${created.length} file${created.length === 1 ? '' : 's'}`)
  if (skipped > 0) actions.toast(`${skipped} file${skipped === 1 ? '' : 's'} skipped — over 8 MB.`)
}

export function pickFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = () => {
      resolve(input.files ? [...input.files] : [])
      input.remove()
    }
    // A cancelled picker never fires change; clean up on the next focus instead.
    window.addEventListener(
      'focus',
      () => window.setTimeout(() => input.isConnected && input.remove(), 400),
      { once: true },
    )
    input.click()
  })
}

/**
 * Minimal shape of the Artifact runtime. When this app is published as a
 * hosted page the browser's own download path is blocked, and the host hands
 * files to the viewer through this instead.
 */
interface ArtifactRuntime {
  use(name: 'downloads'): Promise<{ save(req: { filename: string; data: string }): Promise<unknown> } | null>
}

function artifactRuntime(): ArtifactRuntime | null {
  const runtime = (window as unknown as { claude?: ArtifactRuntime }).claude
  return typeof runtime?.use === 'function' ? runtime : null
}

/** Hand a generated file to the user, by whichever route this context allows. */
export async function offerFile(filename: string, text: string, type = 'application/json'): Promise<void> {
  const runtime = artifactRuntime()
  if (runtime) {
    try {
      const downloads = await runtime.use('downloads')
      if (downloads) {
        await downloads.save({ filename, data: text })
        actions.toast(`Saved ${filename}.`)
        return
      }
    } catch (err) {
      const code = (err as { code?: string })?.code
      // Declining the prompt is a normal answer, not something to report back.
      if (code === 'declined') return
      actions.toast('That download was blocked here. Copying the project to your clipboard instead.')
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        actions.toast('Could not export — this browser blocked both saving and copying.')
      }
      return
    }
  }

  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  actions.toast('Exported. Images are stored separately and are not included.')
}
