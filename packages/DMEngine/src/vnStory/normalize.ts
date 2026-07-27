import type { NpcRoleHint } from '@weaver/civilization-engine'
import type { ConstructNpcInput, NpcMemory } from '@weaver/npc-engine'
import type { CatalogSeedEntry } from '../persistence/campaignPersistence.js'
import { castSlotCount } from './skeletons.js'
import type {
  VnGenerationState,
  VnMainCharacterBrief,
  VnStoryActOverview,
  VnStoryCastMember,
  VnStoryGenerationStageId,
  VnStoryOverview
} from './types.js'

const ROLE_HINTS: readonly NpcRoleHint[] = [
  'resident',
  'merchant',
  'guard',
  'mayor',
  'lord'
]

export function stageText(filled: Record<string, string>, token: string): string {
  const value = filled[token]
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Validated stage is missing token ${token}`)
  }
  return value.trim()
}

export function stageSeed(
  baseSeed: string,
  stage: VnStoryGenerationStageId,
  attempt: number
): string {
  return `${baseSeed}:${stage}:${attempt + 1}`
}

export function factsForStage(state: VnGenerationState): Record<string, string> {
  const facts: Record<string, string> = {
    campaignId: state.input.campaignId,
    seed: state.seed,
    actCount: String(state.actCount),
    mainCharacterName: state.input.mainCharacter.name,
    mainCharacterPersonality: state.input.mainCharacter.personality,
    mainCharacterAppearance: state.input.mainCharacter.appearance,
    premise: state.input.premise
  }
  addFact(facts, 'premiseSummary', state.premiseSummary)
  addFact(facts, 'openingBeat', state.openingBeat)
  addFact(facts, 'overviewProse', state.overviewProse)
  if (state.acts.length > 0) {
    facts.acts = state.acts.map(formatActFact).join(' | ')
  }
  if (state.cast.length > 0) {
    facts.cast = state.cast.map((member) => `${member.displayName} (${member.role})`).join('; ')
  }
  return facts
}

export function parseActs(
  filled: Record<string, string>,
  actCount: number
): VnStoryActOverview[] {
  return Array.from({ length: actCount }, (_, index) => {
    const actIndex = index + 1
    const text = stageText(filled, `ACT_${actIndex}`)
    return {
      actIndex,
      title: readField(text, 'Title') ?? `Act ${actIndex}`,
      summary: readField(text, 'Summary') ?? text
    }
  })
}

export function castRoleHints(actCount: number): NpcRoleHint[] {
  const count = castSlotCount(actCount)
  return Array.from({ length: count }, (_, index) => ROLE_HINTS[index % ROLE_HINTS.length]!)
}

export function toNpcInput(args: {
  state: VnGenerationState
  slotId: string
  castIndex: number
  filled: Record<string, string>
}): ConstructNpcInput {
  const text = stageText(args.filled, `CAST_${args.castIndex + 1}`)
  return {
    campaignId: args.state.input.campaignId,
    worldId: args.state.worldId,
    npcId: `${args.state.input.campaignId}-vn-npc-${args.castIndex + 1}`,
    placeholderSlotId: args.slotId,
    raceId: readField(text, 'Race') ?? 'human',
    alignment: readField(text, 'Alignment') ?? 'neutral',
    temperament: readField(text, 'Temperament') ?? 'curious',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    displayName: readField(text, 'Name') ?? `Story NPC ${args.castIndex + 1}`,
    dialogueFlavor: readField(text, 'Bio') ?? text
  }
}

export function toCastMember(
  npcId: string,
  displayName: string | undefined,
  filledText: string
): VnStoryCastMember {
  return {
    npcId,
    displayName: displayName ?? readField(filledText, 'Name') ?? npcId,
    role: readField(filledText, 'Role') ?? 'supporting'
  }
}

export function toNpcMemory(npcId: string, seed: string, castIndex: number): NpcMemory {
  return {
    npcId,
    text: `Private VN seed memory ${castIndex + 1} for ${npcId}`,
    provenance: { eventId: `${seed}:cast-memory-${castIndex + 1}` }
  }
}

export function buildOverview(state: VnGenerationState): VnStoryOverview {
  return {
    campaignId: state.input.campaignId,
    premiseSummary: requireField(state.premiseSummary, 'premiseSummary'),
    mainCharacter: copyMainCharacter(state.input.mainCharacter),
    acts: [...state.acts],
    cast: [...state.cast],
    openingBeat: requireField(state.openingBeat, 'openingBeat'),
    overviewProse: requireField(state.overviewProse, 'overviewProse')
  }
}

export function catalogEntries(
  state: VnGenerationState,
  persistSummary: string
): CatalogSeedEntry[] {
  const overview = buildOverview(state)
  return [
    entry('brief', {
      premise: state.input.premise,
      mainCharacter: overview.mainCharacter,
      actCount: state.actCount
    }),
    entry('overview', { ...overview, persistSummary }),
    entry('acts', { acts: overview.acts }),
    entry('cast', { cast: overview.cast, npcIds: state.npcs.map((npc) => npc.npcId) })
  ]
}

function entry(id: string, payload: Record<string, unknown>): CatalogSeedEntry {
  return {
    catalog: 'vn_story',
    id,
    version: 1,
    payloadJson: JSON.stringify(payload)
  }
}

function copyMainCharacter(mc: VnMainCharacterBrief): VnMainCharacterBrief {
  return { name: mc.name, personality: mc.personality, appearance: mc.appearance }
}

function formatActFact(act: VnStoryActOverview): string {
  return `Act ${act.actIndex}: ${act.title} — ${act.summary}`
}

function readField(text: string, label: string): string | undefined {
  const pattern = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'im')
  return pattern.exec(text)?.[1]?.trim()
}

function requireField(value: string | undefined, label: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`VN story generation missing ${label}`)
  }
  return value
}

function addFact(facts: Record<string, string>, key: string, value: string | undefined): void {
  if (value !== undefined) {
    facts[key] = value
  }
}
