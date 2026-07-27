import type { InstallProgress, InstallPhase, LlmStatus } from '@weaver/llm-engine'

export type UiLocalModelStatusPhase = 'missing' | 'installing' | 'ready' | 'error'

export type LocalModelInstallProgress = InstallProgress

export type LocalModelStatus = LlmStatus

export const LLM_INSTALL_PROGRESS_CHANNEL = 'llm:installProgress'
export const STARTUP_BOOT_PROGRESS_CHANNEL = 'startup:bootProgress'

/** Map LLMEngine install phases onto ElectronUi LocalModelStatusPhase. */
export function toUiStatusPhase(phase: InstallPhase): UiLocalModelStatusPhase {
  if (phase === 'not_installed') return 'missing'
  return phase
}

export function installProgressPercent(progress: InstallProgress): number {
  if (progress.fraction != null) return Math.round(progress.fraction * 100)
  if (progress.bytesTotal != null && progress.bytesTotal > 0) {
    return Math.round((progress.bytesDownloaded / progress.bytesTotal) * 100)
  }
  return 0
}
