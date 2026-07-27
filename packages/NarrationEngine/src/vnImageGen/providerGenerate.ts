import type {
  ImageGenerationSettings,
  ImageProvider,
  ImageProviderId,
  PortraitSubjectKind,
  ProviderImageRequest,
  VnImageKind,
  VnImageSubjectKind
} from '../imageProviderTypes.js'

export type GenerateViaImageProviderInput = {
  settings: ImageGenerationSettings
  prompt: string
  subjectId: string
  subjectKind: PortraitSubjectKind | VnImageSubjectKind
  campaignId?: string
  seed?: string
}

export type GenerateViaImageProviderDeps = {
  providers?: Partial<Record<ImageProviderId, ImageProvider>>
}

export type GenerateViaImageProviderResult = {
  imagePath: string | null
  provider: ImageProviderId
  degraded: boolean
}

export async function generateViaImageProvider(
  input: GenerateViaImageProviderInput,
  deps: GenerateViaImageProviderDeps
): Promise<GenerateViaImageProviderResult> {
  const provider = input.settings.provider
  if (!input.settings.generativeTokensEnabled) {
    return degraded(provider)
  }

  const rail = deps.providers?.[provider]
  if (rail === undefined) {
    return degraded(provider)
  }

  try {
    const imagePath = await rail.generate(providerRequest(input))
    return hasText(imagePath) ? { imagePath, provider, degraded: false } : degraded(provider)
  } catch {
    return degraded(provider)
  }
}

function providerRequest(input: GenerateViaImageProviderInput): ProviderImageRequest {
  const base: ProviderImageRequest = {
    provider: input.settings.provider,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    prompt: input.prompt,
    imageKind: imageKindFor(input.subjectKind)
  }
  const withCampaign = input.campaignId === undefined ? base : { ...base, campaignId: input.campaignId }
  return input.seed === undefined ? withCampaign : { ...withCampaign, seed: input.seed }
}

function imageKindFor(subjectKind: PortraitSubjectKind | VnImageSubjectKind): VnImageKind {
  if (subjectKind === 'vn_sprite' || subjectKind === 'vn_background') {
    return subjectKind
  }
  return 'portrait'
}

function degraded(provider: ImageProviderId): GenerateViaImageProviderResult {
  return { imagePath: null, provider, degraded: true }
}

function hasText(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
