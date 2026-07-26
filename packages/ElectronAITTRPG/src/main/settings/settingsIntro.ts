import type { InstallPhase } from '@weaver/llm-engine'
import type { SettingsIntroSnapshot } from '../../shared/settings/settingsIntroTypes.js'
import type { SettingsSnapshot } from '../../shared/settings/types.js'

type IntroInput = {
  dismissed: boolean
  snapshot: SettingsSnapshot
  localPhase: InstallPhase | null
}

export function evaluateSettingsIntro(input: IntroInput): SettingsIntroSnapshot {
  if (input.dismissed) {
    return { needed: false, dismissed: true, ready: true, reason: null }
  }
  const ready = isFirstRunReady(input.snapshot, input.localPhase)
  return {
    needed: !ready,
    dismissed: false,
    ready,
    reason: ready ? null : firstRunBlockerReason()
  }
}

export function canDismissSettingsIntro(ready: boolean): boolean {
  return ready
}

function isFirstRunReady(snapshot: SettingsSnapshot, localPhase: InstallPhase | null): boolean {
  if (localPhase === 'ready') return true
  return hasConfiguredCloudProvider(snapshot)
}

function hasConfiguredCloudProvider(snapshot: SettingsSnapshot): boolean {
  const provider = snapshot.text.provider
  if (provider === 'local' || provider === 'player2') return false
  return hasApiKey(snapshot.text.credentials[provider].apiKey)
}

function hasApiKey(value: string): boolean {
  return value.trim().length > 0
}

function firstRunBlockerReason(): string {
  return 'Configure a cloud provider API key or install the local Qwen model.'
}
