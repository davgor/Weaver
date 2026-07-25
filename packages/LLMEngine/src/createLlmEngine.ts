import { resolvePreferredBackend } from './backend.js'
import {
  ensureRuntime,
  installModel,
  readInstallStatus,
  type InstallControllerOptions
} from './install.js'
import { DEFAULT_MODEL } from './modelCatalog.js'
import type {
  ChatRequest,
  ChatResponse,
  CreateRuntime,
  EngineEndpoint,
  LlmRuntime,
  LlmStatus,
  InstallProgress
} from './types.js'

export type LlmEngineApi = {
  id: 'LLMEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  getModelSpec: () => typeof DEFAULT_MODEL
  getStatus: () => Promise<LlmStatus>
  resolveBackend: () => Promise<'vulkan' | 'cpu'>
  install: (onProgress?: (progress: InstallProgress) => void) => Promise<LlmStatus>
  complete: (request: ChatRequest) => Promise<ChatResponse>
  dispose: () => Promise<void>
}

type CreateLlmEngineOptions = InstallControllerOptions & {
  createRuntime: CreateRuntime
}

const PACKAGE_NAME = '@weaver/llm-engine'
const VERSION = '0.1.0'

export function createLlmEngine(options: CreateLlmEngineOptions): LlmEngineApi {
  let runtime: LlmRuntime | null = null

  const api: LlmEngineApi = {
    id: 'LLMEngine',
    title: 'LLM Engine',
    description:
      'Local LLM controller for Qwen2.5 7B Instruct (Q4_K_M); Vulkan preferred, CPU fallback',
    health() {
      return { ok: true, package: PACKAGE_NAME, version: VERSION }
    },
    listEndpoints() {
      return buildEndpoints(api)
    },
    async call(endpoint: string, payload?: unknown) {
      const match = buildEndpoints(api).find((entry) => entry.name === endpoint)
      if (!match) {
        throw new Error(`Unknown endpoint: ${endpoint}`)
      }
      return await match.invoke(payload)
    },
    getModelSpec() {
      return options.model ?? DEFAULT_MODEL
    },
    getStatus() {
      return readInstallStatus(options)
    },
    resolveBackend() {
      return resolvePreferredBackend(options.probe)
    },
    install(onProgress) {
      return installModel(options, onProgress)
    },
    async complete(request) {
      const ensured = await ensureRuntime(options, options.createRuntime, runtime)
      runtime = ensured.runtime
      return ensured.runtime.complete(request)
    },
    async dispose() {
      if (!runtime) return
      await runtime.dispose()
      runtime = null
    }
  }

  return api
}

function buildEndpoints(api: LlmEngineApi): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => api.health()
    },
    {
      name: 'describeRole',
      description: 'Describe LLM runtime controller responsibilities',
      invoke: () => ({
        invents: false,
        orchestrates: false,
        controlsRuntime: true,
        model: DEFAULT_MODEL.id,
        backends: ['vulkan', 'cpu'],
        note: 'UI packages prompt model install; NarrationEngine/DMEngine consume complete().'
      })
    },
    {
      name: 'getStatus',
      description: 'Return install/runtime status for the pinned local model',
      invoke: () => api.getStatus()
    },
    {
      name: 'getModelSpec',
      description: 'Return the pinned Qwen2.5 Q4_K_M model catalog entry',
      invoke: () => api.getModelSpec()
    },
    {
      name: 'resolveBackend',
      description: 'Resolve preferred backend (vulkan, else cpu)',
      invoke: () => api.resolveBackend()
    }
  ]
}
