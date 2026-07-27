import type { InstallPhase } from '@weaver/llm-engine'

export type FirstRunGateInput = {
  localPhase: InstallPhase | null
  backendChosen: boolean
  dismissed: boolean
}

export type FirstRunGateSnapshot = {
  needed: boolean
  dismissed: boolean
  ready: boolean
  canDismiss: boolean
  reason: string | null
}

/** Local-only: ready requires installed model + persisted backend preference. */
export function evaluateFirstRunGate(input: FirstRunGateInput): FirstRunGateSnapshot {
  if (input.dismissed) {
    return dismissedSnapshot()
  }
  const ready = isLocalFirstRunReady(input.localPhase, input.backendChosen)
  return {
    needed: true,
    dismissed: false,
    ready,
    canDismiss: ready,
    reason: ready ? null : firstRunBlockerReason()
  }
}

export function canDismissFirstRun(ready: boolean): boolean {
  return ready
}

function isLocalFirstRunReady(
  localPhase: InstallPhase | null,
  backendChosen: boolean
): boolean {
  return localPhase === 'ready' && backendChosen
}

function dismissedSnapshot(): FirstRunGateSnapshot {
  return {
    needed: false,
    dismissed: true,
    ready: true,
    canDismiss: true,
    reason: null
  }
}

function firstRunBlockerReason(): string {
  return 'Install the local Qwen model and choose GPU (Vulkan) or CPU.'
}
