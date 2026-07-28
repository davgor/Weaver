import type { ImageGenerationSettings, ImageProviderId } from '../imageProviderTypes.js'
import type {
  BuildVnBackgroundPromptInput,
  VnCharacterIdentitySeed,
  VnExpression,
  VnImagePrompt,
  VnStance
} from '../vnImagePrompt/index.js'

export type VnSpriteCacheKey = {
  characterKey: string
  stance: VnStance
  expression: VnExpression
}

export type VnSpriteAsset = {
  cacheKey: VnSpriteCacheKey
  imagePath: string
  provider: ImageProviderId
  prompt: VnImagePrompt
}

export type VnSpriteGenerateRequest = {
  identity: VnCharacterIdentitySeed
  stance: VnStance
  expression: VnExpression
  settings: ImageGenerationSettings
  campaignId?: string
  seed?: string
}

export type VnSpriteGenerateResult =
  | { status: 'ready'; asset: VnSpriteAsset; fromCache: boolean }
  | { status: 'degraded'; prompt: VnImagePrompt; provider: ImageProviderId }

export type VnBackgroundAsset = {
  imagePath: string
  prompt: VnImagePrompt
  provider: ImageProviderId
}

export type VnBackgroundGenerateRequest = {
  background: BuildVnBackgroundPromptInput
  settings: ImageGenerationSettings
  campaignId?: string
  seed?: string
}

export type VnBackgroundGenerateResult =
  | { status: 'ready'; imagePath: string; prompt: VnImagePrompt; fromCache: boolean; provider: ImageProviderId }
  | { status: 'degraded'; prompt: VnImagePrompt; provider: ImageProviderId }
