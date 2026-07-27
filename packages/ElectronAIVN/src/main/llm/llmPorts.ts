import type { LlmEngineApi } from '@weaver/llm-engine'

export type LocalLlmInstallPort = Pick<LlmEngineApi, 'getStatus' | 'install'>

export type LocalLlmWarmPort = Pick<LlmEngineApi, 'completeText'>

export type LocalLlmEnginePort = Pick<
  LlmEngineApi,
  'getStatus' | 'install' | 'completeText' | 'resolveBackend'
>
