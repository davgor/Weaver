export interface WindowControlsProps {
  onMinimize?: (() => void) | undefined
  onMaximize?: (() => void) | undefined
  onClose?: (() => void) | undefined
  onOpenSettings?: (() => void) | undefined
  settingsButtonLabel?: string | undefined
}

export function WindowControls(props: WindowControlsProps): JSX.Element {
  return (
    <div className="titlebar-controls titlebar-no-drag">
      {props.onOpenSettings ? (
        <button
          type="button"
          aria-label={props.settingsButtonLabel ?? 'Open settings'}
          className="titlebar-button titlebar-settings-button"
          onClick={props.onOpenSettings}
        >
          Settings
        </button>
      ) : null}
      <ControlButton label="Minimize" symbol="-" onClick={props.onMinimize} />
      <ControlButton label="Maximize" symbol="[]" onClick={props.onMaximize} />
      <ControlButton label="Close" symbol="x" onClick={props.onClose} close={true} />
    </div>
  )
}

function ControlButton(props: {
  label: string
  symbol: string
  onClick?: (() => void) | undefined
  close?: boolean | undefined
}): JSX.Element {
  const className = props.close ? 'titlebar-button titlebar-button-close' : 'titlebar-button'

  return (
    <button
      type="button"
      aria-label={props.label}
      className={className}
      disabled={!props.onClick}
      onClick={props.onClick}
    >
      {props.symbol}
    </button>
  )
}
