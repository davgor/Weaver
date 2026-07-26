import { Component, type ReactNode } from 'react'
import {
  createPlayErrorBoundaryState,
  playErrorBoundaryFallback,
  reducePlayErrorBoundary,
  type PlayErrorBoundaryState
} from './playErrorBoundaryState'

type PlayErrorBoundaryProps = {
  children: ReactNode
  onReset?: () => void
}

export class PlayErrorBoundary extends Component<PlayErrorBoundaryProps, PlayErrorBoundaryState> {
  override state: PlayErrorBoundaryState = createPlayErrorBoundaryState()

  static getDerivedStateFromError(): PlayErrorBoundaryState {
    return reducePlayErrorBoundary(createPlayErrorBoundaryState(), { type: 'catch' })
  }

  private reset = (): void => {
    this.setState(reducePlayErrorBoundary(this.state, { type: 'reset' }))
    this.props.onReset?.()
  }

  override render(): ReactNode {
    const fallback = playErrorBoundaryFallback(this.state)
    if (fallback !== null) {
      return (
        <main className="main-panel play-view play-app-error" role="alert">
          <h2>Play interrupted</h2>
          <p>{fallback.message}</p>
          <button type="button" onClick={this.reset}>
            Reset play view
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
