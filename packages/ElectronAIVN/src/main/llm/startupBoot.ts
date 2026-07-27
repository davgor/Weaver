import type { InstallPhase } from '@weaver/llm-engine'
import type { BootProgressUpdate, StartupBootSnapshot } from '../../shared/gameApi.js'

export type EngineHealthCheck = {
  ready: boolean
  label: string
}

export type StartupBootPorts = {
  checkEngines: () => EngineHealthCheck
  getLocalPhase: () => Promise<InstallPhase>
  warmRuntime: () => Promise<void>
}

type ReportProgress = (update: BootProgressUpdate) => void

export async function runStartupBoot(
  ports: StartupBootPorts,
  onProgress: ReportProgress = () => undefined
): Promise<StartupBootSnapshot> {
  report(onProgress, 15, 'Starting', 'Checking Weaver engines…')
  const health = ports.checkEngines()
  if (!health.ready) {
    return failedBoot('Startup Interrupted', health.label, health.label)
  }

  report(onProgress, 40, 'Engines ready', health.label)
  const phase = await ports.getLocalPhase()
  if (phase !== 'ready') {
    report(onProgress, 100, 'Ready', health.label)
    return enginesReadyBoot(health.label)
  }

  return warmReturningUser(ports, health.label, onProgress)
}

async function warmReturningUser(
  ports: StartupBootPorts,
  engineLabel: string,
  onProgress: ReportProgress
): Promise<StartupBootSnapshot> {
  report(onProgress, 55, 'Loading local model…', 'Starting selected LLM runtime')
  try {
    report(onProgress, 75, 'Loading local model…', 'Warming runtime…')
    await ports.warmRuntime()
    report(onProgress, 100, 'Ready', 'Local model ready')
    return {
      phase: 'ready',
      progress: 100,
      stageLabel: 'Ready',
      statusText: 'Local model ready',
      engineLabel,
      failureMessage: null
    }
  } catch (error) {
    return failedBoot('Loading local model…', errorMessage(error), engineLabel)
  }
}

function enginesReadyBoot(engineLabel: string): StartupBootSnapshot {
  return {
    phase: 'ready',
    progress: 100,
    stageLabel: 'Ready',
    statusText: engineLabel,
    engineLabel,
    failureMessage: null
  }
}

function failedBoot(
  stageLabel: string,
  failureMessage: string,
  engineLabel: string
): StartupBootSnapshot {
  return {
    phase: 'failed',
    progress: 100,
    stageLabel,
    statusText: failureMessage,
    engineLabel,
    failureMessage
  }
}

function report(
  onProgress: ReportProgress,
  progress: number,
  stageLabel: string,
  statusText: string
): void {
  onProgress({ progress, stageLabel, statusText })
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Local model failed to start'
}
