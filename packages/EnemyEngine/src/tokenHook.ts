import { generatePortrait as narrationGeneratePortrait } from '@weaver/narration-engine'
import type { GeneratePortraitDeps } from '@weaver/narration-engine'
import { getBestiaryEntry } from './bestiary.js'
import {
  getCachedCombatToken,
  requireGeneratedFoe,
  setCachedCombatToken,
  updateGeneratedFoeToken
} from './store.js'
import type {
  BestiaryEntry,
  CombatTokenDeps,
  CombatTokenRequest,
  CombatTokenResult,
  EnemyCombatToken,
  GeneratedFoeRef
} from './types.js'

export function requestCombatToken(
  input: CombatTokenRequest,
  deps: CombatTokenDeps = {}
): CombatTokenResult {
  const foe = requireGeneratedFoe(input.foeId)
  if (!input.settings.generativeTokensEnabled) {
    return result(false, input.foeId, false)
  }

  const cached = input.visuallyUnique === true ? undefined : getCachedCombatToken(foe.bestiaryId)
  if (cached !== undefined) {
    updateGeneratedFoeToken(foe.foeId, cached)
    return result(false, input.foeId, true)
  }

  queueTokenGeneration(foe, input, deps)
  return result(true, input.foeId, false)
}

function queueTokenGeneration(
  foe: GeneratedFoeRef,
  input: CombatTokenRequest,
  deps: CombatTokenDeps
): void {
  const entry = requireBestiaryEntry(foe.bestiaryId)
  const generate = deps.generatePortrait ?? narrationGeneratePortrait
  void generate(portraitRequest(foe, entry, input), portraitDeps(deps)).then((image) => {
    if (image.imagePath !== null) {
      persistToken(foe, { imagePath: image.imagePath, provider: image.provider }, input)
    }
  }).catch(() => undefined)
}

function portraitDeps(deps: CombatTokenDeps): GeneratePortraitDeps {
  return deps.providers === undefined ? {} : { providers: deps.providers }
}

function persistToken(
  foe: GeneratedFoeRef,
  token: EnemyCombatToken,
  input: CombatTokenRequest
): void {
  updateGeneratedFoeToken(foe.foeId, token)
  if (input.visuallyUnique !== true) {
    setCachedCombatToken(foe.bestiaryId, token)
  }
}

function portraitRequest(
  foe: GeneratedFoeRef,
  entry: BestiaryEntry,
  input: CombatTokenRequest
) {
  return {
    subjectKind: 'enemy' as const,
    subjectId: input.visuallyUnique === true ? foe.foeId : foe.bestiaryId,
    prompt: input.prompt,
    settings: input.settings,
    subjectFacts: {
      race: entry.speciesName,
      description: `${entry.variantName}: ${entry.description}`,
      name: entry.displayName
    },
    ...(input.campaignId === undefined ? {} : { campaignId: input.campaignId })
  }
}

function requireBestiaryEntry(bestiaryId: string): BestiaryEntry {
  const entry = getBestiaryEntry(bestiaryId)
  if (entry === undefined) {
    throw new Error(`Unknown bestiary id: ${bestiaryId}`)
  }
  return entry
}

function result(queued: boolean, foeId: string, fromCache: boolean): CombatTokenResult {
  return { queued, foeId, fromCache }
}
