export interface LoadingScreenProps {
  brandTitle: string
  stageLabel: string
  statusText: string
  progress: number
  failureMessage?: string | null | undefined
  onRetry?: (() => void) | undefined
}

export function LoadingScreen(props: LoadingScreenProps): JSX.Element {
  const progress = clampProgress(props.progress)
  const failed = props.failureMessage != null
  const state = failed ? 'failed' : progress === 100 ? 'ready' : 'booting'

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen-panel" data-state={state}>
        <p className="loading-screen-eyebrow">{props.brandTitle}</p>
        <h1 className="loading-screen-title">{props.stageLabel}</h1>
        <p className="loading-screen-status">{props.statusText}</p>
        {failed ? (
          <LoadingFailure message={props.failureMessage} onRetry={props.onRetry} />
        ) : (
          <LoadingProgress progress={progress} />
        )}
      </div>
    </div>
  )
}

function LoadingProgress(props: { progress: number }): JSX.Element {
  return (
    <div
      className="loading-screen-progress-track"
      role="progressbar"
      aria-label="Startup progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={props.progress}
    >
      <div className="loading-screen-progress-fill" style={{ width: `${props.progress}%` }} />
    </div>
  )
}

function LoadingFailure(props: {
  message: string | null | undefined
  onRetry?: (() => void) | undefined
}): JSX.Element {
  return (
    <div className="loading-screen-failure">
      <p className="loading-screen-failure-hint">{props.message ?? 'Startup failed.'}</p>
      {props.onRetry ? (
        <button type="button" className="loading-screen-retry" onClick={props.onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}

function clampProgress(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}
