import type { CloudProviderId } from './providerConfig.js'

export type LocalLlmBackend = 'vulkan' | 'cpu'
export type LlmBackend = LocalLlmBackend | CloudProviderId

export type BackendProbe = {
  supportsVulkan: () => boolean | Promise<boolean>
}

/** Prefer Vulkan GPU; fall back to CPU when Vulkan is unavailable. */
export async function resolvePreferredBackend(probe: BackendProbe): Promise<LocalLlmBackend> {
  if (await probe.supportsVulkan()) {
    return 'vulkan'
  }
  return 'cpu'
}
