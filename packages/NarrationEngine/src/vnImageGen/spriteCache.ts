import type { VnSpriteAsset, VnSpriteCacheKey } from './types.js'

export type VnSpriteCache = {
  get: (key: VnSpriteCacheKey) => VnSpriteAsset | undefined
  set: (key: VnSpriteCacheKey, asset: VnSpriteAsset) => void
  clear: () => void
}

export function vnSpriteCacheKey(key: VnSpriteCacheKey): string {
  return `${key.characterKey}::${key.stance}::${key.expression}`
}

export function createVnSpriteCache(): VnSpriteCache {
  const store = new Map<string, VnSpriteAsset>()
  return {
    get: (key) => store.get(vnSpriteCacheKey(key)),
    set: (key, asset) => {
      store.set(vnSpriteCacheKey(key), asset)
    },
    clear: () => {
      store.clear()
    }
  }
}

export const defaultVnSpriteCache: VnSpriteCache = createVnSpriteCache()

export function clearVnSpriteCache(): void {
  defaultVnSpriteCache.clear()
}
