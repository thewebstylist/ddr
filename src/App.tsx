import { useEffect } from 'react'
import { Canvas } from './canvas/Canvas'
import { useStore } from './store/useStore'
import { actions } from './store/store'
import { CommandPalette } from './ui/CommandPalette'
import { Inspector } from './ui/Inspector'
import { InviteDialog } from './ui/InviteDialog'
import { LeftPanel } from './ui/LeftPanel'
import { Minimap } from './ui/Minimap'
import { ShortcutSheet } from './ui/ShortcutSheet'
import { StatusBar } from './ui/StatusBar'
import { Toasts } from './ui/Toasts'
import { Toolbar } from './ui/Toolbar'
import { TopBar } from './ui/TopBar'
import { useClipboard } from './hooks/useClipboard'
import { useFileDrop } from './hooks/useFileDrop'
import { useHotkeys } from './hooks/useHotkeys'
import { usePersistence } from './hooks/usePersistence'
import { zoomToFit } from './lib/commands'

export interface AppProps {
  freshStart: boolean
  /** Present only when a backend is in play. */
  onLeaveProject?: () => void
  onSignOut?: () => void
}

export function App({ freshStart, onLeaveProject, onSignOut }: AppProps) {
  const leftPanel = useStore((s) => s.leftPanel)

  useHotkeys()
  useClipboard()
  useFileDrop()
  usePersistence()

  useEffect(() => {
    if (!freshStart) return
    // Give the canvas one frame to measure itself before framing the content.
    const id = requestAnimationFrame(() => {
      zoomToFit()
      actions.toast('Everything here is editable. Press ? for the short version.')
    })
    return () => cancelAnimationFrame(id)
  }, [freshStart])

  return (
    <div className="app">
      <TopBar onLeaveProject={onLeaveProject} onSignOut={onSignOut} />
      <div className="app-body">
        {leftPanel && <LeftPanel />}
        <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex' }}>
          <Canvas />
          <Toolbar />
          <Minimap />
        </div>
        <Inspector />
      </div>
      <StatusBar />

      <CommandPalette />
      <ShortcutSheet />
      <InviteDialog />
      <Toasts />
    </div>
  )
}
