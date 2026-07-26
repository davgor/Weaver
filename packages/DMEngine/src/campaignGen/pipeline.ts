import { buildStageSkeleton } from './skeletons.js'
import { seedCampaignQuests } from './questSeed.js'
import { persistStage } from './stages.js'
import {
  assertInput,
  factsForStage,
  stageSeed
} from './normalize.js'
import type {
  CampaignGenerationDeps,
  CampaignGenerationInput,
  CampaignGenerationResult,
  CampaignGenerationStageId,
  GenerationState,
  StageOutput
} from './types.js'
import { CAMPAIGN_GENERATION_STAGES } from './types.js'

const DEFAULT_SEED_RETRIES = 5
const DEFAULT_STAGE_RETRIES = 3

export async function runCampaignGeneration(
  input: CampaignGenerationInput,
  deps: CampaignGenerationDeps
): Promise<CampaignGenerationResult> {
  assertInput(input)
  return runWithSeedRetries(input, deps)
}

async function runWithSeedRetries(
  input: CampaignGenerationInput,
  deps: CampaignGenerationDeps
): Promise<CampaignGenerationResult> {
  const maxRetries = input.maxSeedRetries ?? DEFAULT_SEED_RETRIES
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return finalize(await runSeedAttempt(input, deps, attempt))
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Campaign generation failed')
}

async function runSeedAttempt(
  input: CampaignGenerationInput,
  deps: CampaignGenerationDeps,
  seedAttempt: number
): Promise<GenerationState> {
  const state = initialState(input, seedAttempt)
  for (const stage of CAMPAIGN_GENERATION_STAGES) {
    const output = await runValidatedStage(stage, state, deps)
    state.stages.push(output)
    await persistStage(stage, state, deps, output)
  }
  seedCampaignQuests(state, deps)
  return state
}

async function runValidatedStage(
  stage: CampaignGenerationStageId,
  state: GenerationState,
  deps: CampaignGenerationDeps
): Promise<StageOutput> {
  const maxRetries = state.input.maxStageRetries ?? DEFAULT_STAGE_RETRIES
  let errors: string[] = []
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const result = await deps.narration.fillAndValidate({
      skeleton: buildStageSkeleton(stage, state),
      facts: factsForStage(state),
      stage,
      seed: stageSeed(state.seed, stage, attempt)
    }, deps.completer)
    if (result.ok) return stageOutput(stage, result.filled, result.filledText)
    errors = result.errors
  }
  throw new Error(`Campaign generation stage ${stage} failed validation: ${errors.join('; ')}`)
}

function initialState(input: CampaignGenerationInput, seedAttempt: number): GenerationState {
  const seed = input.seed === undefined ? `campaign:${input.campaignId}` : input.seed
  const attemptSeed = seedAttempt === 0 ? seed : `${seed}:retry-${seedAttempt + 1}`
  return {
    input,
    seed: attemptSeed,
    worldId: `${input.campaignId}-world-${seedAttempt + 1}`,
    stages: [],
    factions: [],
    regions: [],
    civilizations: [],
    placeholders: [],
    npcs: [],
    foes: [],
    quests: [],
    catalogEntries: []
  }
}

function stageOutput(
  stage: CampaignGenerationStageId,
  filled: Record<string, string>,
  filledText: string | undefined
): StageOutput {
  return { stage, filled, filledText: filledText ?? Object.values(filled).join('\n') }
}

function finalize(state: GenerationState): CampaignGenerationResult {
  return {
    campaignId: state.input.campaignId,
    seed: state.seed,
    worldId: state.worldId,
    stages: state.stages,
    canon: requireValue(state.canon, 'canon'),
    pantheon: requireValue(state.pantheon, 'pantheon'),
    worldSummary: requireValue(state.worldSummary, 'worldSummary'),
    factions: state.factions,
    regions: state.regions,
    civilizations: state.civilizations,
    npcs: state.npcs,
    foes: state.foes,
    bestiaryFlavor: requireValue(state.bestiaryFlavor, 'bestiaryFlavor'),
    storyPremise: requireValue(state.storyPremise, 'storyPremise'),
    quests: state.quests,
    campaign: requireValue(state.campaign, 'campaign'),
    catalogEntries: state.catalogEntries
  }
}

function requireValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Campaign generation missing ${label}`)
  }
  return value
}
