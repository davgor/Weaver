import { useEffect, useState } from 'react'
import type { AutoUpdateState } from '../../../shared/autoUpdate/types'
import { formatAvailableCopy, formatDownloadingCopy } from './updateBannerCopy'
import './updateBanner.css'

const DEFAULT_STATE: AutoUpdateState = {
  phase: 'idle',
  currentVersion: '0.0.0'
}

function useAppUpdate(): AutoUpdateState {
  const [state, setState] = useState<AutoUpdateState>(DEFAULT_STATE)

  useEffect(() => {
    let active = true
    void window.autoUpdate.getState().then((initial) => {
      if (active) setState(initial)
    })
    const unsubscribe = window.autoUpdate.onEvent((event) => {
      setState(event)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return state
}

interface UpdateBannerViewProps {
  update: AutoUpdateState
  onRestart: () => void
  installing?: boolean
  installError?: string | null
}

function bannerText(children: string): JSX.Element {
  return <span className="update-banner-text">{children}</span>
}

function ReadyBanner(props: UpdateBannerViewProps): JSX.Element {
  const { update, onRestart, installing = false, installError = null } = props
  return (
    <div className="update-banner update-banner-ready" role="status">
      {bannerText(update.message ?? 'Restart and update')}
      <button
        type="button"
        className="update-banner-restart"
        onClick={onRestart}
        disabled={installing}
      >
        {installing ? 'Restarting…' : 'Restart and update'}
      </button>
      {installError ? <span className="update-banner-error">{installError}</span> : null}
    </div>
  )
}

function renderPhase(props: UpdateBannerViewProps): JSX.Element | null {
  const { update } = props
  if (update.phase === 'idle') return null
  if (update.phase === 'checking') {
    return (
      <div className="update-banner" role="status">
        {bannerText('Checking for updates…')}
      </div>
    )
  }
  if (update.phase === 'error') {
    return (
      <div className="update-banner update-banner-error" role="alert">
        {bannerText(`Update error: ${update.message ?? 'Unknown error'}`)}
      </div>
    )
  }
  if (update.phase === 'available') {
    return (
      <div className="update-banner" role="status">
        {bannerText(formatAvailableCopy(update.currentVersion, update.availableVersion))}
      </div>
    )
  }
  if (update.phase === 'downloading') {
    const percent = update.downloadPercent
    return (
      <div className="update-banner" role="status">
        {bannerText(formatDownloadingCopy(percent, update.availableVersion))}
        <div className="update-banner-progress" aria-hidden={percent === undefined}>
          <div className="update-banner-progress-bar" style={{ width: `${percent ?? 100}%` }} />
        </div>
      </div>
    )
  }
  return ReadyBanner(props)
}

function UpdateBannerView(props: UpdateBannerViewProps): JSX.Element | null {
  return renderPhase(props)
}

export function UpdateBanner(): JSX.Element | null {
  const update = useAppUpdate()
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  const onRestart = (): void => {
    setInstalling(true)
    setInstallError(null)
    void window.autoUpdate.quitAndInstall().catch((error: unknown) => {
      setInstallError(error instanceof Error ? error.message : 'Failed to install update')
      setInstalling(false)
    })
  }

  return (
    <UpdateBannerView
      update={update}
      onRestart={onRestart}
      installing={installing}
      installError={installError}
    />
  )
}
