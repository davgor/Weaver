import { assertArchetypeLevel, type ArchetypeId } from './archetypes.js'
import { CharacterEngineError } from './errors.js'
import {
  detectEmergentDirection,
  markEmergentDirectionGranted
} from './emergentDirection.js'
import {
  computeFeatureFromTemplate,
  getFallbackTemplateId,
  listArchetypeFeatureTemplates,
  type ComputedFeature,
  type FeatureTemplateId
} from './featureTemplates.js'
import { learnKnownAction } from './records.js'
import { getCharacterProgression, setCharacterProgression } from './xp.js'

export type PerkFlavorProposal = {
  templateId: FeatureTemplateId
  flavorText: string
}

export type PerkFlavorProposer = (
  choices: readonly LevelUpChoice[]
) => Promise<readonly PerkFlavorProposal[]>

export type LevelUpChoice = ComputedFeature & {
  flavorText?: string
}

export type BeginLevelUpCeremonyInput = {
  characterId: string
  archetype: ArchetypeId
  currentLevel: number
  proposer?: PerkFlavorProposer
}

export type LevelUpCeremony = {
  characterId: string
  currentLevel: number
  nextLevel: number
  choices: LevelUpChoice[]
}

export type ApplyLevelUpChoiceInput = {
  characterId: string
  archetype: ArchetypeId
  currentLevel: number
  templateId: FeatureTemplateId
  flavorText?: string
}

export type LevelUpResult = {
  characterId: string
  level: number
  feature: ComputedFeature & { flavorText?: string }
}

export type CompleteLevelUpWithFallbackInput = {
  characterId: string
  archetype: ArchetypeId
  currentLevel: number
  proposer?: PerkFlavorProposer
}

export type CompleteLevelUpWithFallbackResult = LevelUpResult & {
  usedFallback: boolean
}

const grantedFeatures = new Map<string, ComputedFeature[]>()

export async function beginLevelUpCeremony(
  input: BeginLevelUpCeremonyInput
): Promise<LevelUpCeremony> {
  const currentLevel = assertArchetypeLevel(input.currentLevel)
  const nextLevel = currentLevel + 1
  assertCanLevelUp(input.characterId, currentLevel)
  const choices = buildChoices(input.characterId, input.archetype, nextLevel)
  const flavored = await applyFlavorProposals(choices, input.proposer)
  return {
    characterId: input.characterId,
    currentLevel,
    nextLevel,
    choices: flavored
  }
}

export function applyLevelUpChoice(input: ApplyLevelUpChoiceInput): LevelUpResult {
  const currentLevel = assertArchetypeLevel(input.currentLevel)
  assertCanLevelUp(input.characterId, currentLevel)
  const feature = finalizeFeature(input.templateId, currentLevel + 1, input.flavorText)
  return commitLevelUp(input.characterId, currentLevel, feature, input.templateId)
}

export async function completeLevelUpWithFallback(
  input: CompleteLevelUpWithFallbackInput
): Promise<CompleteLevelUpWithFallbackResult> {
  const ceremony = await beginLevelUpCeremony({
    characterId: input.characterId,
    archetype: input.archetype,
    currentLevel: input.currentLevel
  })
  const fallbackChoice = resolveFallbackChoice(input.archetype, ceremony.choices)
  if (input.proposer === undefined) {
    return finishLevelUp(input, fallbackChoice.templateId, false)
  }
  try {
    const templateId = await resolveProposedTemplate(input, ceremony.choices)
    if (templateId !== undefined) {
      return finishLevelUp(input, templateId, false)
    }
  } catch {
    return finishLevelUp(input, fallbackChoice.templateId, true, 'Engine fallback perk')
  }
  return finishLevelUp(input, fallbackChoice.templateId, false)
}

export function listGrantedFeatures(characterId: string): ComputedFeature[] {
  return (grantedFeatures.get(characterId) ?? []).map(copyFeature)
}

export function clearLevelUpStore(): void {
  grantedFeatures.clear()
}

function buildChoices(
  characterId: string,
  archetype: ArchetypeId,
  nextLevel: number
): LevelUpChoice[] {
  const templates = pickTemplates(archetype, nextLevel)
  const choices = templates.map((templateId) => computeFeatureFromTemplate(templateId, { level: nextLevel }))
  return appendEmergentChoice(characterId, archetype, nextLevel, choices)
}

function pickTemplates(archetype: ArchetypeId, nextLevel: number): FeatureTemplateId[] {
  const pool = listArchetypeFeatureTemplates(archetype)
  const primary = pool[(nextLevel - 2) % pool.length]
  const secondary = pool[(nextLevel - 1) % pool.length]
  if (primary === undefined || secondary === undefined) {
    throw new CharacterEngineError('LEVEL_UP_INVALID', `No templates for archetype ${archetype}`)
  }
  return uniqueTemplates([primary, secondary])
}

function appendEmergentChoice(
  characterId: string,
  archetype: ArchetypeId,
  nextLevel: number,
  choices: LevelUpChoice[]
): LevelUpChoice[] {
  const emergent = detectEmergentDirection(characterId, archetype)
  if (emergent === undefined) {
    return choices
  }
  const feature = computeFeatureFromTemplate(emergent.templateId, { level: nextLevel })
  return [...choices, feature]
}

async function applyFlavorProposals(
  choices: LevelUpChoice[],
  proposer?: PerkFlavorProposer
): Promise<LevelUpChoice[]> {
  if (proposer === undefined) {
    return choices
  }
  const proposals = await proposer(choices)
  return choices.map((choice) => {
    const flavorText = proposals.find((proposal) => proposal.templateId === choice.templateId)
      ?.flavorText
    return flavorText === undefined ? choice : { ...choice, flavorText }
  })
}

function finalizeFeature(
  templateId: FeatureTemplateId,
  level: number,
  flavorText?: string
): ComputedFeature & { flavorText?: string } {
  const feature = computeFeatureFromTemplate(templateId, { level })
  return flavorText === undefined ? feature : { ...feature, flavorText }
}

function commitLevelUp(
  characterId: string,
  currentLevel: number,
  feature: ComputedFeature & { flavorText?: string },
  templateId: FeatureTemplateId
): LevelUpResult {
  for (const actionId of feature.grantedActionIds) {
    learnKnownAction(characterId, actionId)
  }
  if (templateId === 'emergent.custom_passive') {
    markEmergentDirectionGranted(characterId)
  }
  recordFeature(characterId, feature)
  const nextLevel = currentLevel + 1
  const progression = getCharacterProgression(characterId)
  setCharacterProgression(characterId, nextLevel, progression.xp)
  return { characterId, level: nextLevel, feature }
}

function recordFeature(characterId: string, feature: ComputedFeature): void {
  const existing = grantedFeatures.get(characterId) ?? []
  grantedFeatures.set(characterId, [...existing, feature])
}

function assertCanLevelUp(characterId: string, currentLevel: number): void {
  const progression = getCharacterProgression(characterId)
  if (progression.level !== currentLevel) {
    throw new CharacterEngineError(
      'LEVEL_UP_INVALID',
      `Character level ${progression.level} does not match requested level ${currentLevel}`
    )
  }
}

function resolveFallbackChoice(
  archetype: ArchetypeId,
  choices: readonly LevelUpChoice[]
): LevelUpChoice {
  const fallbackTemplateId = getFallbackTemplateId(archetype)
  const fallbackChoice =
    choices.find((choice) => choice.templateId === fallbackTemplateId) ?? choices[0]
  if (fallbackChoice === undefined) {
    throw new CharacterEngineError('LEVEL_UP_INVALID', 'No level-up choices available')
  }
  return fallbackChoice
}

async function resolveProposedTemplate(
  input: CompleteLevelUpWithFallbackInput,
  choices: readonly LevelUpChoice[]
): Promise<FeatureTemplateId | undefined> {
  if (input.proposer === undefined) {
    return undefined
  }
  const proposals = await input.proposer(choices)
  return choices.find((choice) =>
    proposals.some((proposal) => proposal.templateId === choice.templateId)
  )?.templateId
}

function finishLevelUp(
  input: CompleteLevelUpWithFallbackInput,
  templateId: FeatureTemplateId,
  usedFallback: boolean,
  flavorText?: string
): CompleteLevelUpWithFallbackResult {
  const applyInput = buildApplyInput({
    characterId: input.characterId,
    archetype: input.archetype,
    currentLevel: input.currentLevel,
    templateId,
    flavorText
  })
  return { ...applyLevelUpChoice(applyInput), usedFallback }
}

function uniqueTemplates(templateIds: FeatureTemplateId[]): FeatureTemplateId[] {
  return [...new Set(templateIds)]
}

type ApplyInputDraft = {
  characterId: string
  archetype: ArchetypeId
  currentLevel: number
  templateId: FeatureTemplateId
  flavorText?: string | undefined
}

function buildApplyInput(input: ApplyInputDraft): ApplyLevelUpChoiceInput {
  const { flavorText, ...base } = input
  return flavorText === undefined ? base : { ...base, flavorText }
}

function copyFeature(feature: ComputedFeature): ComputedFeature {
  return {
    ...feature,
    mechanicalEffects: { ...feature.mechanicalEffects },
    grantedActionIds: [...feature.grantedActionIds]
  }
}
