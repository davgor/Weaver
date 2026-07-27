import { extractClaims, stripClaimBlock } from './claimExtract.js'
import { validateProse, type ProseValidationResult } from './proseValidate.js'
import type { NarrationPeers, TextCompletionRequest } from './peers.js'
import type {
  FactualClaim,
  PersistOutcome,
  SceneGenerateInput,
  SocialGenerateInput,
  SocialStreamEvent
} from './proseTypes.js'
import { decideSilentResolve } from './silentResolve.js'
import {
  appendSceneBlock,
  appendSocialLine
} from './proseStore.js'

export {
  appendSceneBlock,
  appendSocialLine,
  bindNarrationCampaignStore,
  clearNarrationStore,
  createMemoryNarrationProjectionStore,
  isNarrationCampaignStoreBound,
  projectScene,
  projectSocial,
  unbindNarrationCampaignStore
} from './proseStore.js'
export type {
  AppendSceneBlockInput,
  AppendSocialLineInput,
  MemoryNarrationProjectionStoreOptions,
  NarrationProjectionStore
} from './proseStore.js'

export function recordPlayerSocial(input: { speakerId: string; text: string }) {
  return appendSocialLine({
    kind: 'player',
    speakerId: input.speakerId,
    text: input.text
  })
}

export async function generateScene(
  input: SceneGenerateInput,
  peers: NarrationPeers
): Promise<PersistOutcome> {
  const first = await completeValidated(input, peers)
  if (first.validation.ok) {
    appendSceneBlock({ text: first.prose })
    return { status: 'persisted', prose: first.prose, claims: first.claims }
  }

  const rewritten = await rewriteValidated(input, peers, first.validation)
  if (rewritten !== null && rewritten.validation.ok) {
    appendSceneBlock({ text: rewritten.prose })
    return { status: 'persisted', prose: rewritten.prose, claims: rewritten.claims }
  }

  return { status: 'rejected', prose: first.prose, validation: first.validation }
}

export async function* streamSocial(
  input: SocialGenerateInput,
  peers: NarrationPeers
): AsyncGenerator<SocialStreamEvent> {
  if (input.interest !== undefined && decideSilentResolve(input.interest).silent) {
    yield { type: 'silent' }
    return
  }

  const first = await completeValidated(toCompletionInput(input), peers)
  if (!first.validation.ok) {
    const rewritten = await rewriteValidated(toCompletionInput(input), peers, first.validation)
    if (rewritten === null || !rewritten.validation.ok) {
      yield { type: 'rejected', validation: first.validation }
      return
    }
    yield* emitSocialStream(input, rewritten.prose)
    return
  }

  yield* emitSocialStream(input, first.prose)
}

async function* emitSocialStream(
  input: SocialGenerateInput,
  prose: string
): AsyncGenerator<SocialStreamEvent> {
  for (const text of chunkProse(prose)) {
    yield { type: 'chunk', text, done: false }
  }
  yield { type: 'chunk', text: '', done: true }
  const line = appendSocialLine({
    kind: input.kind,
    speakerId: input.speakerId,
    text: prose
  })
  yield { type: 'line', line }
}

type ValidatedProse = {
  prose: string
  claims: FactualClaim[]
  validation: ProseValidationResult
}

async function completeValidated(
  input: SceneGenerateInput,
  peers: NarrationPeers
): Promise<ValidatedProse> {
  const response = await peers.llm.completeText(toTextRequest(input))
  return validateRaw(response.text, peers)
}

async function rewriteValidated(
  input: SceneGenerateInput,
  peers: NarrationPeers,
  prior: ProseValidationResult
): Promise<ValidatedProse | null> {
  const issues = [
    ...prior.rejected.map((claim) => claim.reason),
    ...prior.toneViolations.map((violation) => `Tone violation: ${violation}`)
  ].join('; ')
  const response = await peers.llm.completeText({
    prompt: `${input.prompt}\nRewrite without these contradictions: ${issues}`,
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(input.maxTokens === undefined ? {} : { maxTokens: input.maxTokens })
  })
  return validateRaw(response.text, peers)
}

function validateRaw(raw: string, peers: NarrationPeers): ValidatedProse {
  const claims = extractClaims(raw)
  const rawProse = stripClaimBlock(raw)
  const validation = validateProse(rawProse, claims, peers)
  return { prose: validation.prose, claims, validation }
}

function toCompletionInput(input: SocialGenerateInput): SceneGenerateInput {
  return {
    prompt: input.prompt,
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(input.maxTokens === undefined ? {} : { maxTokens: input.maxTokens })
  }
}

function toTextRequest(input: SceneGenerateInput): TextCompletionRequest {
  return {
    prompt: input.prompt,
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(input.maxTokens === undefined ? {} : { maxTokens: input.maxTokens })
  }
}

function chunkProse(prose: string): string[] {
  const parts = prose.match(/\S+\s*/g)
  return parts === null || parts.length <= 1 ? [prose] : parts
}
