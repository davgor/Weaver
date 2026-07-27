import { join } from 'node:path'
import {
  createLlmEngine,
  createNodeLlamaRuntime,
  fetchDownloader,
  nodeFileStore,
  type LlmEngineApi,
  type LocalLlmBackend
} from '@weaver/llm-engine'

export type PreferredEngineOptions = {
  dataDir: string
  preferredBackend: LocalLlmBackend | null
}

/** Preference-aware engine: probe reports Vulkan only when user chose vulkan. */
export function createPreferredLlmEngine(options: PreferredEngineOptions): LlmEngineApi {
  const preferred = options.preferredBackend
  return createLlmEngine({
    dataDir: options.dataDir,
    files: nodeFileStore(),
    downloader: fetchDownloader(),
    probe: {
      supportsVulkan: async () => preferred === 'vulkan'
    },
    createRuntime: createNodeLlamaRuntime
  })
}

export function defaultAivnLlmDataDir(userDataPath: string): string {
  return join(userDataPath, 'llm')
}
