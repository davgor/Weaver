export const DEATH_MODES = ['legendary', 'standard', 'respawn'] as const

export type DeathMode = (typeof DEATH_MODES)[number]

export type CampaignCreateDraft = {
  premise: string
  name?: string
  deathMode: DeathMode
  regionCount: number
  npcsPerRegion: number
  generativeTokensEnabled: boolean
}

export type CampaignReviewStatus = 'idle' | 'generating' | 'ready' | 'error'

export type CampaignReviewRegion = {
  regionId: string
  displayName: string
  summary: string
}

export type CampaignReviewNpc = {
  npcId: string
  regionId: string
  displayName: string
  summary: string
}

export type CampaignReviewFaction = {
  factionId: string
  name: string
  purpose: string
}

export type CampaignReviewSnapshot = {
  campaignId: string
  campaignName: string
  deathMode: DeathMode
  generativeTokensEnabled: boolean
  confirmed: boolean
  status: CampaignReviewStatus
  errorMessage?: string
  canon: string
  pantheon: string
  worldSummary: string
  bestiaryFlavor: string
  storyPremise: string
  regions: CampaignReviewRegion[]
  npcs: CampaignReviewNpc[]
  factions: CampaignReviewFaction[]
}

export type CampaignReviewSection =
  | 'world'
  | 'pantheon'
  | 'regions'
  | 'npcs'
  | 'factions'
  | 'bestiary'

export type UpdateReviewFieldRequest = {
  section: CampaignReviewSection
  field: string
  value: string
  entityId?: string
}

export type RegenerateSectionRequest = {
  section: CampaignReviewSection
}

export type GenerateRegionNpcRequest = {
  regionId: string
}

export type CampaignCreateApi = {
  startGeneration: (draft: CampaignCreateDraft) => Promise<CampaignReviewSnapshot>
  getReview: () => Promise<CampaignReviewSnapshot | null>
  updateReviewField: (request: UpdateReviewFieldRequest) => Promise<CampaignReviewSnapshot>
  regenerateSection: (request: RegenerateSectionRequest) => Promise<CampaignReviewSnapshot>
  generateRegionNpc: (request: GenerateRegionNpcRequest) => Promise<CampaignReviewSnapshot>
  confirmReview: () => Promise<CampaignReviewSnapshot>
  assertCanContinue: () => Promise<void>
}

type DeathModeOption = {
  id: DeathMode
  label: string
  description: string
}

export const deathModeOptions: readonly DeathModeOption[] = [
  option('legendary', 'Legendary', 'Permanent death with an AI obituary.'),
  option('standard', 'Standard', 'Restore the last auto-save snapshot after defeat.'),
  option('respawn', 'Respawn', 'Return under world rules with relocation and cost.')
] as const

export function buildDefaultCampaignCreateDraft(): CampaignCreateDraft {
  return {
    premise: '',
    deathMode: 'standard',
    regionCount: 2,
    npcsPerRegion: 2,
    generativeTokensEnabled: true
  }
}

export function validateCampaignCreateDraft(draft: CampaignCreateDraft): void {
  if (draft.premise.trim().length === 0) {
    throw new Error('Campaign premise is required')
  }
  if (!isDeathMode(draft.deathMode)) {
    throw new Error(`Unsupported death mode: ${draft.deathMode}`)
  }
  if (!isCountInRange(draft.regionCount, 0, 5)) {
    throw new Error('Region count must be between 0 and 5')
  }
  if (!isCountInRange(draft.npcsPerRegion, 0, 10)) {
    throw new Error('NPCs per region must be between 0 and 10')
  }
}

export function isDeathMode(value: unknown): value is DeathMode {
  return typeof value === 'string' && DEATH_MODES.includes(value as DeathMode)
}

function option(id: DeathMode, label: string, description: string): DeathModeOption {
  return { id, label, description }
}

function isCountInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}
