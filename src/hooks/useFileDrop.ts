import { useEffect } from 'react'
import { actions } from '../store/store'
import { addFilesToCanvas } from '../lib/files'
import { clientToWorld } from '../canvas/viewportRef'

/** Drop anything, anywhere in the window. */
export function useFileDrop() {
  useEffect(() => {
    let depth = 0

    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return
      depth++
      actions.setFileDropActive(true)
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) actions.setFileDropActive(false)
    }
    const onOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    const onDrop = async (e: DragEvent) => {
      depth = 0
      actions.setFileDropActive(false)
      const files = [...(e.dataTransfer?.files ?? [])]
      if (files.length === 0) return
      e.preventDefault()
      const at = clientToWorld(e.clientX, e.clientY)
      await addFilesToCanvas(files, { x: at.x - 160, y: at.y - 120 })
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop as unknown as EventListener)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop as unknown as EventListener)
    }
  }, [])
}
