import type { BuildVnBackgroundPromptInput } from '../vnImagePrompt/index.js'
import { stableHash } from '../vnImagePrompt/index.js'
import type { VnBackgroundAsset } from './types.js'

export type VnBackgroundCache = {
  get: (key: string) => VnBackgroundAsset | undefined
  set: (key: string, asset: VnBackgroundAsset) => void
  clear: () => void
}

export function vnBackgroundCacheKey(input: BuildVnBackgroundPromptInput): string {
  if (input.kind === 'preset') {
    return `preset:${input.presetId}`
  }
  const descriptors = input.sceneDescriptors.join('|')
  return `adaptive:${stableHash(`${input.locationLabel}|${descriptors}`)}`
}

export function createVnBackgroundCache(): VnBackgroundCache {
  const store = new Map<string, VnBackgroundAsset>()
  return {
    get: (key) => store.get(key),
    set: (key, asset) => {
      store.set(key, asset)
    },
    clear: () => {
      store.clear()
    }
  }
}

export const defaultVnBackgroundCache: VnBackgroundCache = createVnBackgroundCache()

export function clearVnBackgroundCache(): void {
  defaultVnBackgroundCache.clear()
}
