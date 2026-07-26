import { resolvePreferredBackend } from './backend.js'
import {
  ensureRuntime,
  installModel,
  readInstallStatus,
  type InstallControllerOptions
} from './install.js'
import { wrapWithUsageMetering } from './meteredRuntime.js'
import { DEFAULT_MODEL } from './modelCatalog.js'
import { sharedUsageMeter } from './usageMeter.js'
import type { UsageEvent, UsageMeter, UsagePurposeAggregate, UsageTimeRange } from './usageTypes.js'
import type {
  ChatRequest,
  ChatResponse,
  CreateRuntime,
  EngineEndpoint,
  LlmRuntime,
  LlmStatus,
  InstallProgress,
  TextRequest,
  TextResponse
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
  completeText: (request: TextRequest) => Promise<TextResponse>
  /** @deprecated Use completeText({ prompt, context?, maxTokens? }). */
  complete: (request: ChatRequest) => Promise<ChatResponse>
  queryUsageByPurpose: (range?: UsageTimeRange) => UsagePurposeAggregate[]
  listUsageEvents: (range?: UsageTimeRange) => UsageEvent[]
  dispose: () => Promise<void>
}

type CreateLlmEngineOptions = InstallControllerOptions & {
  createRuntime: CreateRuntime
  meter?: UsageMeter
}

const PACKAGE_NAME = '@weaver/llm-engine'
const VERSION = '0.1.0'

export function createLlmEngine(options: CreateLlmEngineOptions): LlmEngineApi {
  const state: EngineState = { runtime: null, meter: options.meter ?? sharedUsageMeter }
  const api = buildEngineApi(options, state)
  return api
}

type EngineState = {
  runtime: LlmRuntime | null
  meter: UsageMeter
}

function buildEngineApi(options: CreateLlmEngineOptions, state: EngineState): LlmEngineApi {
  const api: LlmEngineApi = {
    id: 'LLMEngine',
    title: 'LLM Engine',
    description:
      'Local LLM controller for Qwen2.5 7B Instruct (Q4_K_M); Vulkan preferred, CPU fallback',
    health: () => ({ ok: true, package: PACKAGE_NAME, version: VERSION }),
    listEndpoints: () => buildEndpoints(api),
    call: (endpoint, payload) => invokeEndpoint(api, endpoint, payload),
    getModelSpec: () => options.model ?? DEFAULT_MODEL,
    getStatus: () => readInstallStatus(options),
    resolveBackend: () => resolvePreferredBackend(options.probe),
    install: (onProgress) => installModel(options, onProgress),
    completeText: (request) => completeTextWithMeter(options, state, request),
    complete: (request) => api.completeText(chatRequestToTextRequest(request)),
    queryUsageByPurpose: (range) => state.meter.aggregateByPurpose(range),
    listUsageEvents: (range) => state.meter.listEvents(range),
    dispose: () => disposeRuntime(state)
  }
  return api
}

async function invokeEndpoint(
  api: LlmEngineApi,
  endpoint: string,
  payload?: unknown
): Promise<unknown> {
  const match = buildEndpoints(api).find((entry) => entry.name === endpoint)
  if (!match) {
    throw new Error(`Unknown endpoint: ${endpoint}`)
  }
  return await match.invoke(payload)
}

async function completeTextWithMeter(
  options: CreateLlmEngineOptions,
  state: EngineState,
  request: TextRequest
): Promise<TextResponse> {
  const ensured = await ensureRuntime(options, options.createRuntime, state.runtime)
  state.runtime = ensured.runtime
  return meteredLocalRuntime(ensured.runtime, state.meter).completeText(request)
}

async function disposeRuntime(state: EngineState): Promise<void> {
  if (!state.runtime) return
  await state.runtime.dispose()
  state.runtime = null
}

function meteredLocalRuntime(runtime: LlmRuntime, meter: UsageMeter): LlmRuntime {
  return wrapWithUsageMetering(runtime, {
    meter,
    provider: 'local',
    model: DEFAULT_MODEL.id
  })
}

function buildEndpoints(api: LlmEngineApi): EngineEndpoint[] {
  return [...buildMetaEndpoints(api), ...buildRuntimeEndpoints(api), ...buildUsageEndpoints(api)]
}

function buildMetaEndpoints(api: LlmEngineApi): EngineEndpoint[] {
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
        note: 'UI packages prompt model install; NarrationEngine/DMEngine consume completeText().'
      })
    },
    {
      name: 'getModelSpec',
      description: 'Return the pinned Qwen2.5 Q4_K_M model catalog entry',
      invoke: () => api.getModelSpec()
    }
  ]
}

function buildRuntimeEndpoints(api: LlmEngineApi): EngineEndpoint[] {
  return [
    {
      name: 'getStatus',
      description: 'Return install/runtime status for the pinned local model',
      invoke: () => api.getStatus()
    },
    {
      name: 'install',
      description: 'Download the pinned local model if it is missing',
      invoke: () => api.install()
    },
    {
      name: 'resolveBackend',
      description: 'Resolve preferred backend (vulkan, else cpu)',
      invoke: () => api.resolveBackend()
    },
    {
      name: 'completeText',
      description: 'Run raw text passthrough completion with prompt/context/maxTokens',
      invoke: (payload) => api.completeText(readTextRequest(payload))
    }
  ]
}

function buildUsageEndpoints(api: LlmEngineApi): EngineEndpoint[] {
  return [
    {
      name: 'queryUsageByPurpose',
      description: 'Aggregate recorded LLM usage by purpose (optional from/to time range)',
      invoke: (payload) => api.queryUsageByPurpose(readUsageRange(payload))
    },
    {
      name: 'listUsageEvents',
      description: 'List recorded LLM usage events (optional from/to time range)',
      invoke: (payload) => api.listUsageEvents(readUsageRange(payload))
    }
  ]
}

function chatRequestToTextRequest(request: ChatRequest): TextRequest {
  const user = lastUserMessage(request.messages)
  const context = systemText(request.messages)
  return withOptionalTextFields({ prompt: user.content }, context, request.maxTokens)
}

function lastUserMessage(messages: ChatRequest['messages']): ChatRequest['messages'][number] {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === 'user') return message
  }
  throw new Error('Chat request requires a user message')
}

function systemText(messages: ChatRequest['messages']): string | undefined {
  const parts = messages.filter((message) => message.role === 'system').map((message) => message.content)
  if (parts.length === 0) return undefined
  return parts.join('\n')
}

function readTextRequest(payload: unknown): TextRequest {
  if (!isRecord(payload)) {
    throw new Error('completeText payload must be an object')
  }
  rejectUnsupportedKeys(payload)
  if (typeof payload.prompt !== 'string') {
    throw new Error('completeText payload requires string prompt')
  }
  const context = optionalString(payload.context, 'context')
  const maxTokens = optionalNumber(payload.maxTokens, 'maxTokens')
  const purpose = optionalString(payload.purpose, 'purpose')
  return withOptionalTextFields({ prompt: payload.prompt }, context, maxTokens, purpose)
}

function withOptionalTextFields(
  base: { prompt: string },
  context: string | undefined,
  maxTokens: number | undefined,
  purpose?: string
): TextRequest {
  return {
    ...base,
    ...(context === undefined ? {} : { context }),
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(purpose === undefined ? {} : { purpose })
  }
}

function rejectUnsupportedKeys(payload: Record<string, unknown>): void {
  const allowed = new Set(['prompt', 'context', 'maxTokens', 'purpose'])
  const unsupported = Object.keys(payload).filter((key) => !allowed.has(key))
  if (unsupported.length > 0) {
    throw new Error(`completeText payload has unsupported fields: ${unsupported.join(', ')}`)
  }
}

function readUsageRange(payload: unknown): { from?: Date; to?: Date } | undefined {
  if (payload === undefined) return undefined
  if (!isRecord(payload)) {
    throw new Error('usage query payload must be an object')
  }
  return {
    ...(payload.from === undefined ? {} : { from: readDate(payload.from, 'from') }),
    ...(payload.to === undefined ? {} : { to: readDate(payload.to, 'to') })
  }
}

function readDate(value: unknown, name: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  throw new Error(`usage query field ${name} must be a Date or ISO timestamp`)
}

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'string') return value
  throw new Error(`completeText payload field ${name} must be a string`)
}

function optionalNumber(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  throw new Error(`completeText payload field ${name} must be a number`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
