import type {
  CreateTextCompletionClientOptions,
  LlmEngineApi,
  LlmRuntime
} from '@weaver/llm-engine'

export type TextCompletionClientFactory = (
  options: CreateTextCompletionClientOptions
) => LlmRuntime

export type LocalLlmStatusPort = Pick<LlmEngineApi, 'health' | 'getStatus' | 'resolveBackend'>

export type RagDescriptionPort = {
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}
