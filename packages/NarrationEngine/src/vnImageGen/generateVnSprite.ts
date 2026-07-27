import type { ImageProvider, ImageProviderId } from '../imageProviderTypes.js'
import { buildVnCharacterPrompt, type VnImagePrompt } from '../vnImagePrompt/index.js'
import {
  DEFAULT_VN_CONSISTENCY_POLICY,
  generateWithConsistency,
  vnSeedFromIdentity,
  type VnConsistencyPolicy
} from './consistency.js'
import { generateViaImageProvider } from './providerGenerate.js'
import { defaultVnSpriteCache, type VnSpriteCache } from './spriteCache.js'
import type { VnSpriteAsset, VnSpriteCacheKey, VnSpriteGenerateRequest, VnSpriteGenerateResult } from './types.js'

export type GenerateVnSpriteDeps = {
  providers?: Partial<Record<ImageProviderId, ImageProvider>>
  cache?: VnSpriteCache
  policy?: VnConsistencyPolicy
}

export async function generateVnSprite(
  request: VnSpriteGenerateRequest,
  deps: GenerateVnSpriteDeps = {}
): Promise<VnSpriteGenerateResult> {
  const prompt = buildVnCharacterPrompt({
    identity: request.identity,
    stance: request.stance,
    expression: request.expression
  })
  const provider = request.settings.provider
  const cache = deps.cache ?? defaultVnSpriteCache
  const cacheKey: VnSpriteCacheKey = {
    characterKey: request.identity.characterKey,
    stance: request.stance,
    expression: request.expression
  }

  const cached = cache.get(cacheKey)
  if (cached !== undefined) {
    return { status: 'ready', asset: cached, fromCache: true }
  }

  const outcome = await generateWithConsistency(
    () => generateSpriteOnce(request, prompt, deps.providers),
    deps.policy ?? DEFAULT_VN_CONSISTENCY_POLICY
  )
  if ('degraded' in outcome) {
    return { status: 'degraded', prompt, provider }
  }

  const asset: VnSpriteAsset = { cacheKey, imagePath: outcome.imagePath, provider, prompt }
  cache.set(cacheKey, asset)
  return { status: 'ready', asset, fromCache: false }
}

async function generateSpriteOnce(
  request: VnSpriteGenerateRequest,
  prompt: VnImagePrompt,
  providers: GenerateVnSpriteDeps['providers']
): Promise<string | null> {
  const result = await generateViaImageProvider(
    {
      settings: request.settings,
      prompt: prompt.fullPrompt,
      subjectId: request.identity.characterKey,
      subjectKind: 'vn_sprite',
      seed: request.seed ?? vnSeedFromIdentity(request.identity),
      ...(request.campaignId === undefined ? {} : { campaignId: request.campaignId })
    },
    providers === undefined ? {} : { providers }
  )
  return result.imagePath
}
