import { DEFAULT_MODEL } from './modelCatalog.js'
import { wrapWithUsageMetering, type MeasuredTextResponse } from './meteredRuntime.js'
import type {
  CloudProviderId,
  Player2ProviderConfig,
  ResolvedProviderConfig
} from './providerConfig.js'
import {
  parseClaudeUsage,
  parseGeminiUsage,
  parseOpenAiUsage
} from './parseProviderUsage.js'
import { retryWithBackoff, type RetryOptions } from './retry.js'
import type { LlmRuntime, ProviderAdapter, TextRequest, TextResponse } from './types.js'
import { sharedUsageMeter } from './usageMeter.js'
import type { UsageMeter } from './usageTypes.js'

export type ProviderFetch = (url: string, init: RequestInit) => Promise<Response>

export type CreateProviderRuntimeOptions = {
  fetch?: ProviderFetch
  localRuntime?: LlmRuntime
  retry?: RetryOptions
  meter?: UsageMeter
}

type RequestBody = Record<string, unknown>

const CLAUDE_VERSION = '2023-06-01'
const CLAUDE_DEFAULT_MAX_TOKENS = 1_024

export function createProviderRuntime(
  config: ResolvedProviderConfig,
  options: CreateProviderRuntimeOptions = {}
): LlmRuntime {
  const inner = config.provider === 'local' ? localProviderRuntime(options) : cloudProviderRuntime(config, options)
  return wrapWithUsageMetering(inner, {
    meter: options.meter ?? sharedUsageMeter,
    provider: config.provider,
    model: modelForConfig(config)
  })
}

function cloudProviderRuntime(
  config: Exclude<ResolvedProviderConfig, { provider: 'local' }>,
  options: CreateProviderRuntimeOptions
): LlmRuntime {
  const adapter = cloudAdapter(config, options.fetch ?? defaultFetch)
  return retryingAdapter(adapter, mergedRetry(config.provider, options.retry))
}

function localProviderRuntime(options: CreateProviderRuntimeOptions): LlmRuntime {
  if (!options.localRuntime) {
    throw new Error('The local provider requires an injected localRuntime')
  }
  return retryingAdapter(options.localRuntime, mergedRetry('local', options.retry))
}

function modelForConfig(config: ResolvedProviderConfig): string {
  return config.provider === 'local' ? DEFAULT_MODEL.id : config.model
}

function cloudAdapter(
  config: Exclude<ResolvedProviderConfig, { provider: 'local' }>,
  fetchImpl: ProviderFetch
): ProviderAdapter {
  return {
    completeText: (request) => completeCloudText(config, fetchImpl, request),
    dispose: async () => undefined
  }
}

function retryingAdapter(adapter: ProviderAdapter, retry: RetryOptions): LlmRuntime {
  return {
    completeText: (request) => retryWithBackoff(() => adapter.completeText(request), retry),
    dispose: () => adapter.dispose()
  }
}

async function completeCloudText(
  config: Exclude<ResolvedProviderConfig, { provider: 'local' }>,
  fetchImpl: ProviderFetch,
  request: TextRequest
): Promise<TextResponse> {
  switch (config.provider) {
    case 'claude':
      return completeClaude(config, fetchImpl, request)
    case 'gemini':
      return completeGemini(config, fetchImpl, request)
    case 'openai':
    case 'grok':
    case 'player2':
      return completeOpenAiCompatible(config, fetchImpl, request)
  }
}

async function completeClaude(
  config: Exclude<ResolvedProviderConfig, { provider: 'local' | 'player2' }>,
  fetchImpl: ProviderFetch,
  request: TextRequest
): Promise<TextResponse> {
  const json = await postJson(fetchImpl, `${config.baseUrl}/messages`, claudeHeaders(config.apiKey), {
    model: config.model,
    ...(request.context === undefined ? {} : { system: request.context }),
    max_tokens: request.maxTokens ?? CLAUDE_DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content: request.prompt }]
  })
  return withUsage({ text: readClaudeText(json), backend: config.provider }, parseClaudeUsage(json))
}

async function completeGemini(
  config: Exclude<ResolvedProviderConfig, { provider: 'local' | 'player2' }>,
  fetchImpl: ProviderFetch,
  request: TextRequest
): Promise<TextResponse> {
  const url = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`
  const json = await postJson(fetchImpl, url, jsonHeaders(), geminiBody(request))
  return withUsage({ text: readGeminiText(json), backend: 'gemini' }, parseGeminiUsage(json))
}

async function completeOpenAiCompatible(
  config: Exclude<ResolvedProviderConfig, { provider: 'local' | 'claude' | 'gemini' }>,
  fetchImpl: ProviderFetch,
  request: TextRequest
): Promise<TextResponse> {
  const json = await postJson(
    fetchImpl,
    openAiCompatibleUrl(config),
    openAiCompatibleHeaders(config),
    openAiCompatibleBody(config.model, request)
  )
  return withUsage(
    { text: readOpenAiText(json), backend: config.provider },
    parseOpenAiUsage(json)
  )
}

function withUsage(
  response: TextResponse,
  usage: ReturnType<typeof parseOpenAiUsage>
): MeasuredTextResponse {
  return usage === undefined ? response : { ...response, usage }
}

async function postJson(
  fetchImpl: ProviderFetch,
  url: string,
  headers: Record<string, string>,
  body: RequestBody
): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const json = await responseJson(response)
  if (!response.ok) {
    throw new ProviderHttpError(response.status, errorMessage(json) ?? `HTTP ${response.status}`)
  }
  return json
}

function claudeHeaders(apiKey: string): Record<string, string> {
  return {
    ...jsonHeaders(),
    'x-api-key': apiKey,
    'anthropic-version': CLAUDE_VERSION
  }
}

function openAiCompatibleHeaders(
  config: Exclude<ResolvedProviderConfig, { provider: 'local' | 'claude' | 'gemini' }>
): Record<string, string> {
  const headers = jsonHeaders()
  if (config.provider !== 'player2' || config.apiKey) {
    return { ...headers, authorization: `Bearer ${config.apiKey}` }
  }
  return headers
}

function jsonHeaders(): Record<string, string> {
  return { 'content-type': 'application/json' }
}

function openAiCompatibleUrl(
  config:
    | Player2ProviderConfig
    | Exclude<ResolvedProviderConfig, { provider: 'local' | 'claude' | 'gemini' | 'player2' }>
): string {
  const baseUrl = config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl}/v1`
  return `${baseUrl}/chat/completions`
}

function openAiCompatibleBody(model: string, request: TextRequest): RequestBody {
  return {
    model,
    ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
    messages: [
      ...(request.context === undefined ? [] : [{ role: 'system', content: request.context }]),
      { role: 'user', content: request.prompt }
    ]
  }
}

function geminiBody(request: TextRequest): RequestBody {
  return {
    contents: [{ role: 'user', parts: [{ text: combinedPrompt(request) }] }],
    ...(request.maxTokens === undefined
      ? {}
      : { generationConfig: { maxOutputTokens: request.maxTokens } })
  }
}

function combinedPrompt(request: TextRequest): string {
  return request.context === undefined ? request.prompt : `${request.context}\n\n${request.prompt}`
}

function readClaudeText(json: unknown): string {
  const content = arrayField(record(json), 'content')
  const parts = content.flatMap((part) => {
    if (!isRecord(part) || part.type !== 'text' || typeof part.text !== 'string') return []
    return [part.text]
  })
  return joinedText(parts, 'Claude')
}

function readOpenAiText(json: unknown): string {
  const choices = arrayField(record(json), 'choices')
  for (const choice of choices) {
    const message = isRecord(choice) ? choice.message : undefined
    const content = isRecord(message) ? message.content : undefined
    if (typeof content === 'string' && content.length > 0) return content
  }
  throw new Error('OpenAI-compatible response did not include text')
}

function readGeminiText(json: unknown): string {
  const candidates = arrayField(record(json), 'candidates')
  const parts: string[] = []
  for (const candidate of candidates) {
    parts.push(...geminiCandidateText(candidate))
  }
  return joinedText(parts, 'Gemini')
}

function geminiCandidateText(candidate: unknown): string[] {
  const content = isRecord(candidate) ? candidate.content : undefined
  const parts = isRecord(content) ? content.parts : undefined
  if (!Array.isArray(parts)) return []
  return parts.flatMap((part) => {
    if (!isRecord(part) || typeof part.text !== 'string') return []
    return [part.text]
  })
}

function joinedText(parts: string[], provider: string): string {
  const text = parts.join('').trim()
  if (text.length === 0) {
    throw new Error(`${provider} response did not include text`)
  }
  return text
}

async function responseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim().length === 0) return {}
  return JSON.parse(text) as unknown
}

function errorMessage(json: unknown): string | undefined {
  const error = isRecord(json) ? json.error : undefined
  if (typeof error === 'string') return error
  const message = isRecord(error) ? error.message : undefined
  return typeof message === 'string' ? message : undefined
}

function arrayField(source: Record<string, unknown>, name: string): unknown[] {
  const value = source[name]
  if (!Array.isArray(value)) {
    throw new Error(`Provider response missing array field: ${name}`)
  }
  return value
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('Provider response must be an object')
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergedRetry(provider: CloudProviderId | 'local', retry: RetryOptions | undefined): RetryOptions {
  const defaults = provider === 'player2' || provider === 'local' ? coldStartRetry() : { maxAttempts: 1 }
  return {
    ...defaults,
    ...retry,
    shouldRetry: retry?.shouldRetry ?? isRetryableProviderError
  }
}

function coldStartRetry(): RetryOptions {
  return {
    maxAttempts: 3,
    initialDelayMs: 250,
    maxDelayMs: 2_000,
    factor: 2
  }
}

function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof ProviderHttpError) {
    return [408, 409, 425, 429, 500, 502, 503, 504].includes(error.status)
  }
  return error instanceof Error
}

async function defaultFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init)
}

class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ProviderHttpError'
  }
}
