import { assertVnStoryGenerationInput } from './assertBrief.js'
import { buildVnStageSkeleton } from './skeletons.js'
import { persistVnStage } from './stages.js'
import { buildOverview, factsForStage, stageSeed } from './normalize.js'
import type {
  VnGenerationState,
  VnStageOutput,
  VnStoryGenerationDeps,
  VnStoryGenerationInput,
  VnStoryGenerationResult,
  VnStoryGenerationStageId
} from './types.js'
import { VN_STORY_GENERATION_STAGES } from './types.js'

const DEFAULT_SEED_RETRIES = 5
const DEFAULT_STAGE_RETRIES = 3

export async function runVnStoryGeneration(
  input: VnStoryGenerationInput,
  deps: VnStoryGenerationDeps
): Promise<VnStoryGenerationResult> {
  const asserted = assertVnStoryGenerationInput(input)
  return runWithSeedRetries({ ...input, ...asserted }, deps)
}

async function runWithSeedRetries(
  input: VnStoryGenerationInput & { actCount: number },
  deps: VnStoryGenerationDeps
): Promise<VnStoryGenerationResult> {
  const maxRetries = input.maxSeedRetries ?? DEFAULT_SEED_RETRIES
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return finalize(await runSeedAttempt(input, deps, attempt))
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('VN story generation failed')
}

async function runSeedAttempt(
  input: VnStoryGenerationInput & { actCount: number },
  deps: VnStoryGenerationDeps,
  seedAttempt: number
): Promise<VnGenerationState> {
  const state = initialState(input, seedAttempt)
  for (const stage of VN_STORY_GENERATION_STAGES) {
    const output = await runValidatedStage(stage, state, deps)
    state.stages.push(output)
    await persistVnStage(stage, state, deps, output)
  }
  return state
}

async function runValidatedStage(
  stage: VnStoryGenerationStageId,
  state: VnGenerationState,
  deps: VnStoryGenerationDeps
): Promise<VnStageOutput> {
  const maxRetries = state.input.maxStageRetries ?? DEFAULT_STAGE_RETRIES
  let errors: string[] = []
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const result = await deps.narration.fillAndValidate({
      skeleton: buildVnStageSkeleton(stage, state),
      facts: factsForStage(state),
      stage,
      seed: stageSeed(state.seed, stage, attempt)
    }, deps.completer)
    if (result.ok) return stageOutput(stage, result.filled, result.filledText)
    errors = result.errors
  }
  throw new Error(`VN story generation stage ${stage} failed validation: ${errors.join('; ')}`)
}

function initialState(
  input: VnStoryGenerationInput & { actCount: number },
  seedAttempt: number
): VnGenerationState {
  const seed = input.seed === undefined ? `vn:${input.campaignId}` : input.seed
  const attemptSeed = seedAttempt === 0 ? seed : `${seed}:retry-${seedAttempt + 1}`
  return {
    input,
    actCount: input.actCount,
    seed: attemptSeed,
    worldId: `${input.campaignId}-vn-world`,
    civilizationId: `${input.campaignId}-vn-civ`,
    regionId: `${input.campaignId}-vn-region`,
    stages: [],
    acts: [],
    placeholders: [],
    npcs: [],
    cast: [],
    catalogEntries: []
  }
}

function stageOutput(
  stage: VnStoryGenerationStageId,
  filled: Record<string, string>,
  filledText: string | undefined
): VnStageOutput {
  return { stage, filled, filledText: filledText ?? Object.values(filled).join('\n') }
}

function finalize(state: VnGenerationState): VnStoryGenerationResult {
  return {
    campaignId: state.input.campaignId,
    seed: state.seed,
    lifecycle: 'draft',
    stages: state.stages,
    overview: buildOverview(state),
    npcIds: state.npcs.map((npc) => npc.npcId),
    campaign: requireValue(state.campaign, 'campaign')
  }
}

function requireValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`VN story generation missing ${label}`)
  }
  return value
}
