import type { ReactNode } from 'react'
import { WindowControls } from './WindowControls.js'
import type { WindowControlsProps } from './WindowControls.js'
import { TITLEBAR_DRAG_REGION_CLASS } from './titlebarRegions.js'

export interface TitlebarProps extends WindowControlsProps {
  brandTitle?: string
  children?: ReactNode
}

export function Titlebar(props: TitlebarProps): JSX.Element {
  const brand = props.children ?? props.brandTitle ?? null

  return (
    <div className="titlebar">
      <div className={TITLEBAR_DRAG_REGION_CLASS}>{brand}</div>
      <WindowControls
        onMinimize={props.onMinimize}
        onMaximize={props.onMaximize}
        onClose={props.onClose}
        onOpenSettings={props.onOpenSettings}
        settingsButtonLabel={props.settingsButtonLabel}
      />
    </div>
  )
}
