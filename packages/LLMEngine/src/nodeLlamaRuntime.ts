import type { LlmBackend } from './backend.js'
import type { ChatMessage, ChatRequest, CreateRuntime, LlmRuntime } from './types.js'

type LlamaModule = {
  getLlama: (options: { gpu: 'vulkan' | false }) => Promise<{
    gpu: string | false
    loadModel: (options: { modelPath: string }) => Promise<LlamaModel>
    dispose: () => Promise<void>
  }>
  LlamaChatSession: new (options: {
    contextSequence: unknown
    systemPrompt?: string
  }) => {
    prompt: (text: string, options?: { maxTokens?: number }) => Promise<string>
  }
}

type LlamaModel = {
  createContext: () => Promise<{
    getSequence: () => unknown
    dispose: () => Promise<void>
  }>
  dispose: () => Promise<void>
}

export const createNodeLlamaRuntime: CreateRuntime = async ({ modelPath, backend }) => {
  const llamaCpp = (await import('node-llama-cpp')) as unknown as LlamaModule
  const llama = await llamaCpp.getLlama({ gpu: gpuOption(backend) })
  const model = await llama.loadModel({ modelPath })
  const context = await model.createContext()
  return buildRuntime({ llamaCpp, llama, model, context, backend })
}

export async function probeVulkanWithNodeLlama(): Promise<boolean> {
  try {
    const llamaCpp = (await import('node-llama-cpp')) as unknown as LlamaModule
    const llama = await llamaCpp.getLlama({ gpu: 'vulkan' })
    const ok = llama.gpu === 'vulkan'
    await llama.dispose()
    return ok
  } catch {
    return false
  }
}

function gpuOption(backend: LlmBackend): 'vulkan' | false {
  return backend === 'vulkan' ? 'vulkan' : false
}

function buildRuntime(parts: {
  llamaCpp: LlamaModule
  llama: Awaited<ReturnType<LlamaModule['getLlama']>>
  model: LlamaModel
  context: Awaited<ReturnType<LlamaModel['createContext']>>
  backend: LlmBackend
}): LlmRuntime {
  const { llamaCpp, llama, model, context, backend } = parts
  return {
    complete: (request) => completeWithSession(llamaCpp, context, backend, request),
    dispose: async () => {
      await context.dispose()
      await model.dispose()
      await llama.dispose()
    }
  }
}

async function completeWithSession(
  llamaCpp: LlamaModule,
  context: Awaited<ReturnType<LlamaModel['createContext']>>,
  backend: LlmBackend,
  request: ChatRequest
): Promise<{ text: string; backend: LlmBackend }> {
  const user = lastUserMessage(request.messages)
  const systemPrompt = systemText(request.messages)
  const session = createSession(llamaCpp, context, systemPrompt)
  const text = await promptSession(session, user.content, request.maxTokens)
  return { text, backend }
}

function createSession(
  llamaCpp: LlamaModule,
  context: Awaited<ReturnType<LlamaModel['createContext']>>,
  systemPrompt: string | null
) {
  if (systemPrompt) {
    return new llamaCpp.LlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt
    })
  }
  return new llamaCpp.LlamaChatSession({
    contextSequence: context.getSequence()
  })
}

function promptSession(
  session: { prompt: (text: string, options?: { maxTokens?: number }) => Promise<string> },
  text: string,
  maxTokens: number | undefined
): Promise<string> {
  if (maxTokens === undefined) {
    return session.prompt(text)
  }
  return session.prompt(text, { maxTokens })
}

function lastUserMessage(messages: ChatMessage[]): ChatMessage {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === 'user') return message
  }
  throw new Error('Chat request requires a user message')
}

function systemText(messages: ChatMessage[]): string | null {
  const parts = messages.filter((m) => m.role === 'system').map((m) => m.content)
  if (parts.length === 0) return null
  return parts.join('\n')
}
