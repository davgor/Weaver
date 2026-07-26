import { useEffect, useState } from 'react'
import { AppBrandLockup } from '../components/AppBrandMark'
import './titlebar.css'

function TitlebarBrand(): JSX.Element {
  const [version, setVersion] = useState('…')

  useEffect(() => {
    void window.aiTtrpg.app.getVersion().then(setVersion)
  }, [])

  return (
    <div className="titlebar-drag-region">
      <AppBrandLockup markSize={16} nameClassName="titlebar-app-name" />
      <span className="app-version-label">v{version}</span>
    </div>
  )
}

type TitlebarProps = {
  onOpenSettings: () => void
}

function TitlebarWindowControls({ onOpenSettings }: TitlebarProps): JSX.Element {
  return (
    <div className="titlebar-controls">
      <button
        type="button"
        aria-label="Open settings"
        className="titlebar-button titlebar-settings-button"
        onClick={onOpenSettings}
      >
        Settings
      </button>
      <button
        type="button"
        aria-label="Minimize"
        className="titlebar-button"
        onClick={() => window.aiTtrpg.windowControls.minimize()}
      >
        &#8211;
      </button>
      <button
        type="button"
        aria-label="Maximize"
        className="titlebar-button"
        onClick={() => window.aiTtrpg.windowControls.maximize()}
      >
        &#9633;
      </button>
      <button
        type="button"
        aria-label="Close"
        className="titlebar-button titlebar-button-close"
        onClick={() => window.aiTtrpg.windowControls.close()}
      >
        &#10005;
      </button>
    </div>
  )
}

export function Titlebar({ onOpenSettings }: TitlebarProps): JSX.Element {
  return (
    <div className="titlebar">
      <TitlebarBrand />
      <TitlebarWindowControls onOpenSettings={onOpenSettings} />
    </div>
  )
}
