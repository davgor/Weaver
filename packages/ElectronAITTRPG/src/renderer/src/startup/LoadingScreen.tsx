import type { StartupBootSnapshot } from '../../../shared/gameApi'
import { AppBrandLockup } from '../components/AppBrandMark'
import './loadingScreen.css'

interface LoadingScreenProps {
  boot: StartupBootSnapshot
}

export function LoadingScreen(props: LoadingScreenProps): JSX.Element {
  const { boot } = props
  const failed = boot.phase === 'failed'

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen-panel">
        <p className="loading-screen-eyebrow">
          <AppBrandLockup markSize={22} nameClassName="loading-screen-brand-name" />
        </p>
        <h1 className="loading-screen-title">{boot.stageLabel}</h1>
        <p className="loading-screen-status">{boot.statusText}</p>
        {!failed ? (
          <div className="loading-screen-progress-track" aria-hidden="true">
            <div className="loading-screen-progress-fill" style={{ width: `${boot.progress}%` }} />
          </div>
        ) : (
          <p className="loading-screen-failure-hint">{boot.failureMessage}</p>
        )}
      </div>
    </div>
  )
}
