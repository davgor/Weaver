export type LlmBackend = 'vulkan' | 'cpu'

export type BackendProbe = {
  supportsVulkan: () => boolean | Promise<boolean>
}

/** Prefer Vulkan GPU; fall back to CPU when Vulkan is unavailable. */
export async function resolvePreferredBackend(probe: BackendProbe): Promise<LlmBackend> {
  if (await probe.supportsVulkan()) {
    return 'vulkan'
  }
  return 'cpu'
}
