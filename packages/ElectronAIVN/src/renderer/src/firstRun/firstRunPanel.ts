import type { LocalModelBackend, LocalModelStatusPhase } from '@weaver/electron-ui'
import type { AivnInstallProgress, FirstRunSnapshot } from '../../../shared/gameApi'
import { installProgressPercent, toUiStatusPhase } from '../../../shared/llmTypes'

export type FirstRunPanelState = {
  intro: FirstRunSnapshot | null
  statusPhase: LocalModelStatusPhase
  statusText: string
  progressPercent: number
  backend: LocalModelBackend
  installing: boolean
  busy: boolean
}

export function initialPanelState(): FirstRunPanelState {
  return {
    intro: null,
    statusPhase: 'missing',
    statusText: 'Checking local model…',
    progressPercent: 0,
    backend: 'vulkan',
    installing: false,
    busy: false
  }
}

export async function loadFirstRunPanel(): Promise<Partial<FirstRunPanelState>> {
  const [intro, status, savedBackend] = await Promise.all([
    window.aivn.firstRun.get(),
    window.aivn.llm.getStatus(),
    window.aivn.llm.getBackend()
  ])
  return {
    intro,
    statusPhase: toUiStatusPhase(status.phase),
    statusText: statusLabel(status.phase, status.error),
    progressPercent: status.phase === 'ready' ? 100 : 0,
    ...(savedBackend === null ? {} : { backend: savedBackend })
  }
}

export function panelFromInstallProgress(progress: AivnInstallProgress): Partial<FirstRunPanelState> {
  return {
    statusPhase: 'installing',
    progressPercent: installProgressPercent(progress),
    statusText: `Downloading local model… ${installProgressPercent(progress)}%`
  }
}

export async function chooseBackend(backend: LocalModelBackend): Promise<Partial<FirstRunPanelState>> {
  await window.aivn.llm.setBackend(backend)
  return { backend, intro: await window.aivn.firstRun.get() }
}

export async function runInstall(backend: LocalModelBackend): Promise<Partial<FirstRunPanelState>> {
  await window.aivn.llm.setBackend(backend)
  const status = await window.aivn.llm.install()
  return {
    statusPhase: toUiStatusPhase(status.phase),
    statusText: statusLabel(status.phase, status.error),
    progressPercent: status.phase === 'ready' ? 100 : 0,
    intro: await window.aivn.firstRun.get(),
    installing: false
  }
}

export async function dismissFirstRun(): Promise<FirstRunSnapshot> {
  return window.aivn.firstRun.dismiss()
}

function statusLabel(
  phase: 'not_installed' | 'installing' | 'ready' | 'error',
  error: string | null
): string {
  if (phase === 'ready') return 'Local model installed'
  if (phase === 'installing') return 'Downloading local model…'
  if (phase === 'error') return error ?? 'Install failed'
  return 'Local model not installed'
}
