export type ImageProviderId = 'cloud' | 'player2' | 'local'
export type PortraitSubjectKind = 'npc' | 'enemy' | 'companion' | 'pc'
export type VnImageSubjectKind = 'vn_sprite' | 'vn_background'
export type VnImageKind = 'portrait' | 'vn_sprite' | 'vn_background'

export type PortraitSubjectFacts = {
  race?: string
  description?: string
  name?: string
}

export type ImageGenerationSettings = {
  provider: ImageProviderId
  generativeTokensEnabled: boolean
}

export type ProviderImageRequest = {
  provider: ImageProviderId
  subjectKind: PortraitSubjectKind | VnImageSubjectKind
  prompt: string
  subjectId: string
  campaignId?: string
  seed?: string
  imageKind?: VnImageKind
}

export type ImageProvider = {
  id: ImageProviderId
  generate: (request: ProviderImageRequest) => Promise<string | null>
}
