import type { ImageProvider, ImageProviderId } from '../imageProviderTypes.js'
import { buildVnBackgroundPrompt } from '../vnImagePrompt/index.js'
import {
  defaultVnBackgroundCache,
  vnBackgroundCacheKey,
  type VnBackgroundCache
} from './backgroundCache.js'
import { generateViaImageProvider } from './providerGenerate.js'
import type { VnBackgroundGenerateRequest, VnBackgroundGenerateResult } from './types.js'

export type GenerateVnBackgroundDeps = {
  providers?: Partial<Record<ImageProviderId, ImageProvider>>
  cache?: VnBackgroundCache
}

export async function generateVnBackground(
  request: VnBackgroundGenerateRequest,
  deps: GenerateVnBackgroundDeps = {}
): Promise<VnBackgroundGenerateResult> {
  const prompt = buildVnBackgroundPrompt(request.background)
  const provider = request.settings.provider
  const cache = deps.cache ?? defaultVnBackgroundCache
  const key = vnBackgroundCacheKey(request.background)

  const cached = cache.get(key)
  if (cached !== undefined) {
    return {
      status: 'ready',
      imagePath: cached.imagePath,
      prompt: cached.prompt,
      fromCache: true,
      provider: cached.provider
    }
  }

  const result = await generateViaImageProvider(
    {
      settings: request.settings,
      prompt: prompt.fullPrompt,
      subjectId: key,
      subjectKind: 'vn_background',
      ...(request.seed === undefined ? {} : { seed: request.seed }),
      ...(request.campaignId === undefined ? {} : { campaignId: request.campaignId })
    },
    deps.providers === undefined ? {} : { providers: deps.providers }
  )

  if (result.degraded || result.imagePath === null) {
    return { status: 'degraded', prompt, provider }
  }

  cache.set(key, { imagePath: result.imagePath, prompt, provider })
  return { status: 'ready', imagePath: result.imagePath, prompt, fromCache: false, provider }
}
