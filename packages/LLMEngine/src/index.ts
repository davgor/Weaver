import { createLlmEngine, type LlmEngineApi } from './createLlmEngine.js'
import { createDefaultLlmEngine, defaultLlmDataDir } from './defaultEngine.js'
import { resolvePreferredBackend, type BackendProbe, type LlmBackend } from './backend.js'
import { DEFAULT_MODEL, QWEN_2_5_7B_INSTRUCT_Q4_K_M, type ModelSpec } from './modelCatalog.js'
import { createNodeLlamaRuntime, probeVulkanWithNodeLlama } from './nodeLlamaRuntime.js'
import { fetchDownloader, nodeFileStore } from './nodeIo.js'
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  CreateRuntime,
  Downloader,
  EngineEndpoint,
  FileStore,
  InstallProgress,
  LlmRuntime,
  LlmStatus,
  InstallPhase
} from './types.js'

export type {
  BackendProbe,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  CreateRuntime,
  Downloader,
  EngineEndpoint,
  FileStore,
  InstallPhase,
  InstallProgress,
  LlmBackend,
  LlmEngineApi,
  LlmRuntime,
  LlmStatus,
  ModelSpec
}

export {
  createLlmEngine,
  createDefaultLlmEngine,
  createNodeLlamaRuntime,
  defaultLlmDataDir,
  DEFAULT_MODEL,
  fetchDownloader,
  nodeFileStore,
  probeVulkanWithNodeLlama,
  QWEN_2_5_7B_INSTRUCT_Q4_K_M,
  resolvePreferredBackend
}

/** Default singleton for Electron admin endpoint exercise (data under `.weaver-llm`). */
export const llmEngine: LlmEngineApi = createDefaultLlmEngine()
