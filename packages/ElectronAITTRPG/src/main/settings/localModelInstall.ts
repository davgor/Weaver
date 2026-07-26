import type { InstallProgress, LlmStatus } from '@weaver/llm-engine'
import type { LocalLlmInstallPort } from './settingsPorts.js'

export async function getLocalModelStatus(
  port: LocalLlmInstallPort | undefined
): Promise<LlmStatus | null> {
  if (port === undefined) return null
  return port.getStatus()
}

export async function installLocalModel(
  port: LocalLlmInstallPort | undefined,
  onProgress?: (progress: InstallProgress) => void
): Promise<LlmStatus> {
  if (port === undefined) {
    throw new Error('Local LLM install API is unavailable.')
  }
  return port.install(onProgress)
}
