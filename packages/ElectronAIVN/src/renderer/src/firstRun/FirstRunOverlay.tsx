import { useEffect, useState } from 'react'
import { FirstRunIntroShell, LocalModelInstallPanel } from '@weaver/electron-ui'
import type { LocalModelBackend } from '@weaver/electron-ui'
import {
  chooseBackend,
  dismissFirstRun,
  initialPanelState,
  loadFirstRunPanel,
  panelFromInstallProgress,
  runInstall,
  type FirstRunPanelState
} from './firstRunPanel'

type FirstRunOverlayProps = {
  onComplete: () => void
}

export function FirstRunOverlay(props: FirstRunOverlayProps): JSX.Element | null {
  const [state, setState] = useState<FirstRunPanelState>(initialPanelState)

  useEffect(() => {
    void loadFirstRunPanel().then((patch) => setState((prev) => ({ ...prev, ...patch })))
    return window.aivn.llm.onInstallProgress((progress) => {
      setState((prev) => ({ ...prev, ...panelFromInstallProgress(progress) }))
    })
  }, [])

  if (state.intro === null || !state.intro.needed) return null

  return (
    <FirstRunIntroShell
      title="Set up local play"
      lead="Choose GPU or CPU, install the pinned Qwen model, then continue."
      stepContent={
        <LocalModelInstallPanel
          statusPhase={state.statusPhase}
          statusText={state.statusText}
          progressPercent={state.progressPercent}
          backend={state.backend}
          onBackendChange={(next) => void onBackendChange(next, setState)}
          onInstall={() => void onInstall(state.backend, setState)}
          installing={state.installing}
        />
      }
      primaryAction={{
        label: 'Continue',
        disabled: !state.intro.canDismiss || state.busy,
        onClick: () => void onDismiss(setState, props.onComplete)
      }}
    />
  )
}

async function onBackendChange(
  backend: LocalModelBackend,
  setState: (fn: (prev: FirstRunPanelState) => FirstRunPanelState) => void
): Promise<void> {
  const patch = await chooseBackend(backend)
  setState((prev) => ({ ...prev, ...patch }))
}

async function onInstall(
  backend: LocalModelBackend,
  setState: (fn: (prev: FirstRunPanelState) => FirstRunPanelState) => void
): Promise<void> {
  setState((prev) => ({ ...prev, installing: true }))
  try {
    const patch = await runInstall(backend)
    setState((prev) => ({ ...prev, ...patch }))
  } catch {
    setState((prev) => ({
      ...prev,
      installing: false,
      statusPhase: 'error',
      statusText: 'Install failed'
    }))
  }
}

async function onDismiss(
  setState: (fn: (prev: FirstRunPanelState) => FirstRunPanelState) => void,
  onComplete: () => void
): Promise<void> {
  setState((prev) => ({ ...prev, busy: true }))
  try {
    const intro = await dismissFirstRun()
    setState((prev) => ({ ...prev, intro, busy: false }))
    if (!intro.needed) onComplete()
  } catch {
    setState((prev) => ({ ...prev, busy: false }))
  }
}
