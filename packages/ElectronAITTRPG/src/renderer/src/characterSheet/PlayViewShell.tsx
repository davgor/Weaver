import type { ReactNode } from 'react'
import './characterSheet.css'

interface PlayViewShellProps {
  children: ReactNode
  onOpenCharacterSheet: () => void
}

export function PlayViewShell(props: PlayViewShellProps): JSX.Element {
  return (
    <div className="play-view-shell">
      <div className="player-sheet-rail">
        <button
          type="button"
          className="player-sheet-rail-toggle"
          onClick={props.onOpenCharacterSheet}
          aria-label="Open character sheet"
        >
          Character Sheet
        </button>
      </div>
      {props.children}
    </div>
  )
}
