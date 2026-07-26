import { getAbilityModifier, listCampaignRaces, selectRace } from '@weaver/character-engine'
import { claimNpcPlaceholder } from '@weaver/civilization-engine'
import { assertText } from './errors.js'
import { requestNpcPortrait } from './portraitHook.js'
import { saveNpc } from './store.js'
import type { ConstructNpcInput, NpcIdentityBundle, NpcRecord, NpcSpeciesKind } from './types.js'

const CIVILIAN_HP = 10

export function constructNpc(input: ConstructNpcInput): NpcRecord {
  assertConstructInput(input)
  const placeholder = claimNpcPlaceholder(input.worldId, input.placeholderSlotId, input.npcId)
  const identity = buildIdentity(input)
  const npc = saveNpc({
    npcId: input.npcId,
    campaignId: input.campaignId,
    worldId: input.worldId,
    regionId: placeholder.regionId,
    civilizationId: placeholder.civilizationId,
    placeholder,
    identity,
    abilityScores: { ...input.abilityScores },
    abilityModifiers: abilityModifiers(input.abilityScores),
    speciesKind: input.speciesKind ?? 'person',
    combatStats: { kind: 'civilian', maxHp: CIVILIAN_HP, currentHp: CIVILIAN_HP },
    factionIds: [],
    ...optionalFlavor(input, identity.nonSpeaking),
    ...optionalSpeakingStyle(input, identity.nonSpeaking)
  })
  queuePortraitIfRequested(input, npc.npcId)
  return npc
}

function buildIdentity(input: ConstructNpcInput): NpcIdentityBundle {
  ensureRaceInRoster(input.campaignId, input.raceId)
  return {
    race: selectRace({
      campaignId: input.campaignId,
      characterId: input.npcId,
      raceId: input.raceId
    }),
    ...(input.background === undefined ? {} : { background: { ...input.background } }),
    alignment: input.alignment,
    temperament: input.temperament,
    nonSpeaking: isNonSpeaking(input)
  }
}

function abilityModifiers(scores: ConstructNpcInput['abilityScores']) {
  return {
    Body: getAbilityModifier(scores.Body),
    Agility: getAbilityModifier(scores.Agility),
    Mind: getAbilityModifier(scores.Mind),
    Presence: getAbilityModifier(scores.Presence)
  }
}

function ensureRaceInRoster(campaignId: string, raceId: string): void {
  const race = listCampaignRaces(campaignId).find((entry) => entry.raceId === raceId)
  if (race === undefined) {
    selectRace({ campaignId, characterId: '__npc-engine-race-check__', raceId })
  }
}

function isNonSpeaking(input: ConstructNpcInput): boolean {
  return input.nonSpeaking === true || isInherentlyNonSpeaking(input.speciesKind)
}

function isInherentlyNonSpeaking(speciesKind: NpcSpeciesKind | undefined): boolean {
  return speciesKind === 'animal' || speciesKind === 'construct'
}

function optionalFlavor(input: ConstructNpcInput, nonSpeaking: boolean) {
  return {
    ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
    ...(nonSpeaking || input.dialogueFlavor === undefined ? {} : { dialogueFlavor: input.dialogueFlavor })
  }
}

function optionalSpeakingStyle(input: ConstructNpcInput, nonSpeaking: boolean) {
  if (nonSpeaking || input.speakingStyle === undefined) {
    return {}
  }
  return {
    speakingStyle: {
      tone: input.speakingStyle.tone,
      vocabulary: [...input.speakingStyle.vocabulary]
    }
  }
}

function queuePortraitIfRequested(input: ConstructNpcInput, npcId: string): void {
  if (input.portraitPrompt === undefined || input.portraitSettings === undefined) {
    return
  }
  requestNpcPortrait({ npcId, prompt: input.portraitPrompt, settings: input.portraitSettings })
}

function assertConstructInput(input: ConstructNpcInput): void {
  assertText(input.campaignId, 'campaignId')
  assertText(input.worldId, 'worldId')
  assertText(input.npcId, 'npcId')
  assertText(input.placeholderSlotId, 'placeholderSlotId')
  assertText(input.raceId, 'raceId')
  assertText(input.alignment, 'alignment')
  assertText(input.temperament, 'temperament')
}
