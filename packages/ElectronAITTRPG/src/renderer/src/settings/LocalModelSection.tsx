import { useEffect, useState } from 'react'
import type { LocalModelInstallProgress, LocalModelStatus } from '../../../shared/settings/localModelTypes.js'

type LocalModelSectionProps = {
  open: boolean
  busy: boolean
}

export function LocalModelSection(props: LocalModelSectionProps): JSX.Element {
  const state = useLocalModelState(props.open)
  const installing = state.status?.phase === 'installing' || state.installing

  return (
    <section className="settings-section">
      <h2>Local Qwen model</h2>
      <p className="settings-help">{localModelSummary(state.status)}</p>
      {state.progress === null ? null : <InstallProgressBar progress={state.progress} />}
      <div className="settings-intro-actions">
        <button
          type="button"
          disabled={props.busy || installing || state.status?.phase === 'ready'}
          onClick={() => void startInstall(state)}
        >
          {installLabel(state.status)}
        </button>
      </div>
      {state.error === null ? null : <p className="settings-status-error">{state.error}</p>}
    </section>
  )
}

type LocalModelState = {
  status: LocalModelStatus | null
  progress: LocalModelInstallProgress | null
  installing: boolean
  error: string | null
  setStatus: (status: LocalModelStatus | null) => void
  setProgress: (progress: LocalModelInstallProgress | null) => void
  setInstalling: (installing: boolean) => void
  setError: (error: string | null) => void
}

function useLocalModelState(open: boolean): LocalModelState {
  const [status, setStatus] = useState<LocalModelStatus | null>(null)
  const [progress, setProgress] = useState<LocalModelInstallProgress | null>(null)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void window.aiTtrpg.settings.getLocalModelStatus().then((loaded) => {
      if (!cancelled) setStatus(loaded)
    })
    const unsubscribe = window.aiTtrpg.settings.onLocalModelInstallProgress((event) => {
      setProgress(event)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [open])

  return { status, progress, installing, error, setStatus, setProgress, setInstalling, setError }
}

function InstallProgressBar(props: { progress: LocalModelInstallProgress }): JSX.Element {
  const percent = progressPercent(props.progress)
  return (
    <div className="settings-install-progress" aria-label="Model download progress">
      <div className="settings-install-progress-bar" style={{ width: `${percent}%` }} />
      <span className="settings-help">{percent}%</span>
    </div>
  )
}

function progressPercent(progress: LocalModelInstallProgress): number {
  if (progress.fraction !== null) {
    return Math.round(progress.fraction * 100)
  }
  if (progress.bytesTotal !== null && progress.bytesTotal > 0) {
    return Math.round((progress.bytesDownloaded / progress.bytesTotal) * 100)
  }
  return 0
}

async function startInstall(state: LocalModelState): Promise<void> {
  state.setInstalling(true)
  state.setError(null)
  state.setProgress(null)
  try {
    const next = await window.aiTtrpg.settings.installLocalModel()
    state.setStatus(next)
    state.setProgress(null)
  } catch (caught) {
    state.setError(caught instanceof Error ? caught.message : 'Model install failed.')
  } finally {
    state.setInstalling(false)
  }
}

function localModelSummary(status: LocalModelStatus | null): string {
  if (status === null) return 'Local model status is unavailable.'
  if (status.phase === 'ready') {
    return `${status.model.displayName} is ready on ${status.backend ?? 'local'} backend.`
  }
  if (status.phase === 'installing') return `Installing ${status.model.displayName}...`
  if (status.phase === 'error') return status.error ?? 'Local model install failed.'
  return `${status.model.displayName} is not installed yet.`
}

function installLabel(status: LocalModelStatus | null): string {
  if (status?.phase === 'ready') return 'Installed'
  if (status?.phase === 'installing') return 'Installing...'
  if (status?.phase === 'error') return 'Retry install'
  return 'Download model'
}
