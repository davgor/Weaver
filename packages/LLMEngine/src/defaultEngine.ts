import { join } from 'node:path'
import { createLlmEngine, type LlmEngineApi } from './createLlmEngine.js'
import { fetchDownloader, nodeFileStore } from './nodeIo.js'
import { createNodeLlamaRuntime, probeVulkanWithNodeLlama } from './nodeLlamaRuntime.js'

export function defaultLlmDataDir(cwd = process.cwd()): string {
  return process.env.WEAVER_LLM_DATA_DIR ?? join(cwd, '.weaver-llm')
}

/** Production engine: Node fs/fetch + node-llama-cpp (Vulkan then CPU). */
export function createDefaultLlmEngine(dataDir = defaultLlmDataDir()): LlmEngineApi {
  return createLlmEngine({
    dataDir,
    files: nodeFileStore(),
    downloader: fetchDownloader(),
    probe: { supportsVulkan: () => probeVulkanWithNodeLlama() },
    createRuntime: createNodeLlamaRuntime
  })
}
