import type {
  AddNpcToFactionInput,
  ConstructNpcInput,
  CreateFactionInput
} from '@weaver/npc-engine'
import type { CatalogSeedEntry } from '../persistence/campaignPersistence.js'
import type {
  CampaignGenerationInput,
  CampaignGenerationStageId,
  GenerationState
} from './types.js'

const ROLE_HINTS = ['resident', 'farmer', 'guard', 'merchant', 'lord', 'mayor'] as const

export function assertInput(input: CampaignGenerationInput): void {
  assertText(input.campaignId, 'campaignId')
  assertText(input.dataRoot, 'dataRoot')
  assertText(input.campaignFilePath, 'campaignFilePath')
  assertRange(input.regionCount, 0, 5, 'regionCount')
  assertRange(input.npcsPerRegion, 0, 10, 'npcsPerRegion')
}

export function stageText(filled: Record<string, string>, token: string): string {
  const value = filled[token]
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Validated stage is missing token ${token}`)
  }
  return value.trim()
}

export function toNumericSeed(seed: string): number {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

export function stageSeed(baseSeed: string, stage: CampaignGenerationStageId, attempt: number): string {
  return `${baseSeed}:${stage}:${attempt + 1}`
}

export function toFactionInput(state: GenerationState, filled: Record<string, string>): CreateFactionInput {
  return {
    factionId: `${state.input.campaignId}-faction-1`,
    name: stageText(filled, 'FACTION_NAME')
  }
}

export function toNpcInput(args: {
  state: GenerationState
  slotId: string
  npcIndex: number
  filled: Record<string, string>
}): ConstructNpcInput {
  const style = stageText(args.filled, 'NPC_STYLE')
  return {
    campaignId: args.state.input.campaignId,
    worldId: args.state.worldId,
    npcId: `${args.state.input.campaignId}-npc-${args.npcIndex + 1}`,
    placeholderSlotId: args.slotId,
    raceId: readField(style, 'Race') ?? 'human',
    alignment: readField(style, 'Alignment') ?? 'neutral',
    temperament: readField(style, 'Temperament') ?? 'curious',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    displayName: npcDisplayName(style, args.npcIndex),
    dialogueFlavor: style
  }
}

export function toFactionMembership(factionId: string, npcId: string): AddNpcToFactionInput {
  return { factionId, npcId, role: 'campaign seed' }
}

export function roleHints(count: number): typeof ROLE_HINTS[number][] {
  return Array.from({ length: count }, (_, index) => ROLE_HINTS[index % ROLE_HINTS.length] ?? 'resident')
}

export function catalogEntries(state: GenerationState, persistSummary: string): CatalogSeedEntry[] {
  return [
    catalogEntry('campaign_generation', 'summary', 1, summaryPayload(state, persistSummary)),
    catalogEntry('campaign_generation', 'canon', 1, { text: state.canon ?? '' }),
    catalogEntry('campaign_generation', 'story', 1, { text: state.storyPremise ?? '' }),
    catalogEntry('campaign_generation', 'bestiary', 1, { text: state.bestiaryFlavor ?? '' })
  ]
}

export function factsForStage(state: GenerationState): Record<string, string> {
  const facts: Record<string, string> = {
    campaignId: state.input.campaignId,
    seed: state.seed,
    regionCount: String(state.input.regionCount),
    npcsPerRegion: String(state.input.npcsPerRegion)
  }
  addFact(facts, 'canon', state.canon)
  addFact(facts, 'pantheon', state.pantheon)
  addFact(facts, 'worldId', state.worldId)
  addFact(facts, 'worldSummary', state.worldSummary)
  return facts
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
}

function assertRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}`)
  }
}

function readField(text: string, label: string): string | undefined {
  const pattern = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'im')
  return pattern.exec(text)?.[1]?.trim()
}

function npcDisplayName(style: string, npcIndex: number): string {
  return readField(style, 'Name') ?? `Campaign NPC ${npcIndex + 1}`
}

function catalogEntry(
  catalog: string,
  id: string,
  version: number,
  payload: Record<string, unknown>
): CatalogSeedEntry {
  return { catalog, id, version, payloadJson: JSON.stringify(payload) }
}

function summaryPayload(state: GenerationState, persistSummary: string): Record<string, unknown> {
  return {
    campaignId: state.input.campaignId,
    worldId: state.worldId,
    seed: state.seed,
    persistSummary,
    stages: state.stages.map((entry) => entry.stage),
    regions: state.regions.map((region) => region.regionId),
    npcs: state.npcs.map((npc) => npc.npcId)
  }
}

function addFact(facts: Record<string, string>, key: string, value: string | undefined): void {
  if (value !== undefined) {
    facts[key] = value
  }
}
