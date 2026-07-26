import type {
  CharacterIdentitySelection,
  CharacterIdentityGroundingApi,
  CharacterStartingLoadoutFact,
  CompanionFact
} from './types.js'

export function buildCharacterFacts(
  characterId: string,
  characterApi: CharacterIdentityGroundingApi
): Record<string, string> {
  const identity = characterApi.getCharacterIdentity(characterId)
  const loadout = characterApi.getCharacterStartingLoadout(characterId)
  const facts = {
    ...identityFacts(identity),
    ...archetypeFacts(characterId, characterApi),
    ...loadoutFacts(loadout),
    ...companionFacts(characterId, characterApi)
  }
  return pruneEmptyFacts(facts)
}

function identityFacts(
  identity: CharacterIdentitySelection | undefined
): Record<string, string> {
  if (identity === undefined) {
    return {}
  }
  return {
    ...raceFacts(identity.race),
    ...backgroundFacts(identity.background)
  }
}

function raceFacts(race: CharacterIdentitySelection['race']): Record<string, string> {
  if (race === undefined) {
    return {}
  }
  return { race: race.name, raceLore: race.lore ?? '' }
}

function backgroundFacts(background: CharacterIdentitySelection['background']): Record<string, string> {
  if (background === undefined) {
    return {}
  }
  return {
    background: background.name,
    backgroundDescription: background.description ?? '',
    personalStory: background.personalStory ?? ''
  }
}

function archetypeFacts(
  characterId: string,
  characterApi: CharacterIdentityGroundingApi
): Record<string, string> {
  return { archetype: characterApi.getCharacterArchetype(characterId) ?? '' }
}

function loadoutFacts(loadout: CharacterStartingLoadoutFact | undefined): Record<string, string> {
  if (loadout === undefined) {
    return {}
  }
  return {
    gear: loadout.items.map(formatItem).filter(hasText).join(', '),
    knownActions: loadout.actionIds.join(', ')
  }
}

function companionFacts(
  characterId: string,
  characterApi: CharacterIdentityGroundingApi
): Record<string, string> {
  return {
    companionStatus: characterApi.getCompanionOnboardingStatus(characterId) ?? '',
    companions: characterApi.listCompanions(characterId).map(formatCompanion).join(', ')
  }
}

function formatItem(item: CharacterStartingLoadoutFact['items'][number]): string {
  const label = item.name ?? item.templateId ?? ''
  if (!hasText(label)) {
    return ''
  }
  return item.quantity === undefined || item.quantity <= 1 ? label : `${label} x${item.quantity}`
}

function formatCompanion(companion: CompanionFact): string {
  return companion.archetype === undefined
    ? companion.name
    : `${companion.name} the ${companion.archetype}`
}

function pruneEmptyFacts(facts: Record<string, string>): Record<string, string> {
  const pruned: Record<string, string> = {}
  for (const [key, value] of Object.entries(facts)) {
    if (hasText(value)) {
      pruned[key] = value
    }
  }
  return pruned
}

function hasText(value: string): boolean {
  return value.trim().length > 0
}
