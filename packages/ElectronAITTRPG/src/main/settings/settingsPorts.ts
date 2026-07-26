import type {
  CreateTextCompletionClientOptions,
  LlmEngineApi,
  LlmRuntime
} from '@weaver/llm-engine'

export type TextCompletionClientFactory = (
  options: CreateTextCompletionClientOptions
) => LlmRuntime

export type LocalLlmInstallPort = Pick<LlmEngineApi, 'getStatus' | 'install'>

export type LocalLlmCompletePort = Pick<LlmEngineApi, 'completeText'>

export type LocalLlmStatusPort = Pick<
  LlmEngineApi,
  'health' | 'getStatus' | 'resolveBackend' | 'install'
>

export type RagDescriptionPort = {
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}
