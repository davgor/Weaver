import type { LocalLlmWarmPort } from './llmPorts.js'

/** Tiny completion forces ensureRuntime for returning-user headless boot. */
export async function warmLocalRuntime(port: LocalLlmWarmPort): Promise<void> {
  await port.completeText({ prompt: 'ok', maxTokens: 1 })
}
