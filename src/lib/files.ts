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

export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
