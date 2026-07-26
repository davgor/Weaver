import type { LlmBackend, LocalLlmBackend } from './backend.js'
import type { ModelSpec } from './modelCatalog.js'

export type InstallPhase = 'not_installed' | 'installing' | 'ready' | 'error'

export type LlmStatus = {
  phase: InstallPhase
  backend: LlmBackend | null
  model: ModelSpec
  modelPath: string | null
  error: string | null
  bytesDownloaded: number
  bytesTotal: number | null
}

export type InstallProgress = {
  phase: 'installing'
  bytesDownloaded: number
  bytesTotal: number | null
  fraction: number | null
}

type ChatRole = 'system' | 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type TextRequest = {
  prompt: string
  context?: string
  maxTokens?: number
}

export type TextResponse = {
  text: string
  backend: LlmBackend
}

/** @deprecated Use TextRequest / completeText for the public generation API. */
export type ChatRequest = {
  messages: ChatMessage[]
  maxTokens?: number
}

/** @deprecated Use TextResponse / completeText for the public generation API. */
export type ChatResponse = TextResponse

export type FileStore = {
  exists: (path: string) => boolean | Promise<boolean>
  ensureDir: (path: string) => void | Promise<void>
  join: (...parts: string[]) => string
}

export type Downloader = {
  download: (
    url: string,
    destPath: string,
    onProgress: (progress: InstallProgress) => void
  ) => Promise<void>
}

export type ProviderAdapter = {
  completeText: (request: TextRequest) => Promise<TextResponse>
  dispose: () => Promise<void>
}

export type LlmRuntime = ProviderAdapter

export type CreateRuntime = (options: {
  modelPath: string
  backend: LocalLlmBackend
}) => Promise<LlmRuntime>

export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}
