declare module 'node-llama-cpp' {
  export function getLlama(options?: {
    gpu?: 'vulkan' | 'cuda' | 'metal' | false
  }): Promise<{
    gpu: string | false
    loadModel: (options: { modelPath: string }) => Promise<{
      createContext: () => Promise<{
        getSequence: () => unknown
        dispose: () => Promise<void>
      }>
      dispose: () => Promise<void>
    }>
    dispose: () => Promise<void>
  }>

  export class LlamaChatSession {
    constructor(options: { contextSequence: unknown; systemPrompt?: string })
    prompt(text: string, options?: { maxTokens?: number }): Promise<string>
  }
}
