import type { InstallProgress, LlmStatus } from '@weaver/llm-engine'
import type { LocalLlmInstallPort } from './llmPorts.js'

export async function getLocalModelStatus(port: LocalLlmInstallPort): Promise<LlmStatus> {
  return port.getStatus()
}

export async function installLocalModel(
  port: LocalLlmInstallPort,
  onProgress?: (progress: InstallProgress) => void
): Promise<LlmStatus> {
  return port.install(onProgress)
}
