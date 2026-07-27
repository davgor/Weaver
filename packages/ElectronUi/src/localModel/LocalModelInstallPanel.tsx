import { BackendChoice } from './BackendChoice.js'
import type { LocalModelBackend, LocalModelStatusPhase } from './backendChoice.js'

export interface LocalModelInstallPanelProps {
  statusPhase: LocalModelStatusPhase
  statusText: string
  progressPercent: number
  backend: LocalModelBackend
  onBackendChange: (backend: LocalModelBackend) => void
  onInstall: () => void
  installing?: boolean | undefined
  disabled?: boolean | undefined
}

export function LocalModelInstallPanel(props: LocalModelInstallPanelProps): JSX.Element {
  const progress = clampPercent(props.progressPercent)
  const installing = props.installing ?? false
  const installDisabled = isInstallButtonDisabled(props.statusPhase, installing, props.disabled)

  return (
    <section className="local-model-panel" data-phase={props.statusPhase}>
      <header className="local-model-header">
        <p className="local-model-eyebrow">Local model</p>
        <h2>Runtime install</h2>
      </header>
      <p className="local-model-status">{props.statusText}</p>
      <InstallProgress progress={progress} />
      <BackendChoice
        backend={props.backend}
        statusPhase={props.statusPhase}
        installing={installing}
        onBackendChange={props.onBackendChange}
      />
      <div className="local-model-actions">
        <button type="button" disabled={installDisabled} onClick={props.onInstall}>
          {installButtonLabel(props.statusPhase, installing)}
        </button>
      </div>
    </section>
  )
}

function InstallProgress(props: { progress: number }): JSX.Element {
  return (
    <div className="local-model-progress">
      <div
        className="local-model-progress-track"
        role="progressbar"
        aria-label="Model install progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={props.progress}
      >
        <div className="local-model-progress-fill" style={{ width: `${props.progress}%` }} />
      </div>
      <span className="local-model-progress-label">{props.progress}%</span>
    </div>
  )
}

function installButtonLabel(phase: LocalModelStatusPhase, installing: boolean): string {
  if (installing || phase === 'installing') return 'Installing...'
  if (phase === 'ready') return 'Installed'
  if (phase === 'error') return 'Retry install'
  return 'Download model'
}

function isInstallButtonDisabled(
  phase: LocalModelStatusPhase,
  installing: boolean,
  disabled: boolean | undefined
): boolean {
  return disabled === true || installing || phase === 'installing' || phase === 'ready'
}

function clampPercent(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return Math.round(value)
}
