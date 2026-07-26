import { ensureNpcPlaceholders } from '@weaver/civilization-engine'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { constructNpc } from './construction.js'
import { replaceNpc } from './store.js'
import type { AbilityScores } from '@weaver/character-engine'
import type { NpcRecord, NpcSpeciesKind, SpeakingStyle } from './types.js'

type SeedNpcInput = {
  npcId: string
  campaignId?: string
  worldId?: string
  civilizationId?: string
  regionId?: string
  raceId?: string
  alignment?: string
  temperament?: string
  speciesKind?: NpcSpeciesKind
  abilityScores?: AbilityScores
  speakingStyle?: SpeakingStyle
  factionIds?: readonly string[]
}

export function seedNpc(input: SeedNpcInput): NpcRecord {
  const values = defaults(input)
  setCampaignRaceRoster(values.campaignId, [{ raceId: values.raceId, name: 'Human' }])
  const [slot] = ensureNpcPlaceholders({
    worldId: values.worldId,
    civilizationId: values.civilizationId,
    regionId: values.regionId,
    roleHints: ['resident']
  })
  if (slot === undefined) {
    throw new Error('Failed to ensure NPC placeholder for seedNpc')
  }
  const npc = constructNpc({
    ...values,
    placeholderSlotId: slot.slotId
  })
  if (input.factionIds === undefined) {
    return npc
  }
  return replaceNpc({ ...npc, factionIds: [...input.factionIds] })
}

function defaults(input: SeedNpcInput) {
  return applyOptionalSeedFields(input, {
    campaignId: input.campaignId ?? `campaign-${input.npcId}`,
    worldId: input.worldId ?? `world-${input.npcId}`,
    civilizationId: input.civilizationId ?? `civ-${input.npcId}`,
    regionId: input.regionId ?? 'region-default',
    raceId: input.raceId ?? 'human',
    npcId: input.npcId,
    alignment: input.alignment ?? 'neutral',
    temperament: input.temperament ?? 'steady',
    abilityScores: input.abilityScores ?? defaultScores()
  })
}

function applyOptionalSeedFields<T extends Record<string, unknown>>(
  input: SeedNpcInput,
  base: T
): T & Pick<SeedNpcInput, 'speciesKind' | 'speakingStyle'> {
  return {
    ...base,
    ...(input.speciesKind === undefined ? {} : { speciesKind: input.speciesKind }),
    ...(input.speakingStyle === undefined ? {} : { speakingStyle: input.speakingStyle })
  }
}

function defaultScores(): AbilityScores {
  return { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
}
