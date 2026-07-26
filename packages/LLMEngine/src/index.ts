import { createLlmEngine, type LlmEngineApi } from './createLlmEngine.js'
import {
  createTextCompletionClient,
  type CreateTextCompletionClientOptions
} from './createTextCompletionClient.js'
import { createDefaultLlmEngine, defaultLlmDataDir } from './defaultEngine.js'
import {
  resolvePreferredBackend,
  type BackendProbe,
  type LlmBackend,
  type LocalLlmBackend
} from './backend.js'
import { DEFAULT_MODEL, QWEN_2_5_7B_INSTRUCT_Q4_K_M, type ModelSpec } from './modelCatalog.js'
import { createNodeLlamaRuntime, probeVulkanWithNodeLlama } from './nodeLlamaRuntime.js'
import { fetchDownloader, nodeFileStore } from './nodeIo.js'
import {
  createProviderRuntime,
  type CreateProviderRuntimeOptions,
  type ProviderFetch
} from './providerRuntime.js'
import {
  resolveProviderConfig,
  type ApiProviderConfig,
  type CloudProviderId,
  type LocalProviderConfig,
  type Player2ProviderConfig,
  type ProviderEnv,
  type ProviderId,
  type ProviderSettings,
  type ResolvedProviderConfig
} from './providerConfig.js'
import { retryWithBackoff, type RetryClassifier, type RetryOptions, type Sleep } from './retry.js'
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
  InstallPhase,
  ProviderAdapter,
  TextRequest,
  TextResponse
} from './types.js'

export type {
  BackendProbe,
  ApiProviderConfig,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  CloudProviderId,
  CreateRuntime,
  CreateProviderRuntimeOptions,
  CreateTextCompletionClientOptions,
  Downloader,
  EngineEndpoint,
  FileStore,
  InstallPhase,
  InstallProgress,
  LocalLlmBackend,
  LocalProviderConfig,
  LlmBackend,
  LlmEngineApi,
  LlmRuntime,
  LlmStatus,
  ModelSpec,
  Player2ProviderConfig,
  ProviderAdapter,
  ProviderEnv,
  ProviderFetch,
  ProviderId,
  ProviderSettings,
  ResolvedProviderConfig,
  RetryClassifier,
  RetryOptions,
  Sleep,
  TextRequest,
  TextResponse
}

export {
  createTextCompletionClient,
  createLlmEngine,
  createDefaultLlmEngine,
  createProviderRuntime,
  createNodeLlamaRuntime,
  defaultLlmDataDir,
  DEFAULT_MODEL,
  fetchDownloader,
  nodeFileStore,
  probeVulkanWithNodeLlama,
  QWEN_2_5_7B_INSTRUCT_Q4_K_M,
  resolveProviderConfig,
  retryWithBackoff,
  resolvePreferredBackend
}

/** Default singleton for Electron admin endpoint exercise (data under `.weaver-llm`). */
export const llmEngine: LlmEngineApi = createDefaultLlmEngine()
