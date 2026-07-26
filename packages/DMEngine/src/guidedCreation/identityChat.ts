import type { TextCompleter } from '@weaver/narration-engine'
import { buildCharacterFacts } from './characterFacts.js'
import { mechanicalDecisionErrors } from './mechanicalGuard.js'
import {
  requireGuidedCreationState,
  saveGuidedCreationState,
  startGuidedIdentityState
} from './phaseState.js'
import type {
  CharacterIdentityGroundingApi,
  GuidedCreationNarrationApi,
  GuidedCreationPhase,
  GuidedCreationState,
  GuidedCreationTranscriptEntry,
  GuidedIdentitySubmitResult,
  IdentityCreationPhase,
  StartGuidedIdentityInput,
  SubmitGuidedIdentityInput
} from './types.js'

const IDENTITY_PHASES: IdentityCreationPhase[] = ['who', 'why', 'where', 'what']

type AcceptedReplyInput = {
  state: GuidedCreationState
  facts: Record<string, string>
  transcript: GuidedCreationTranscriptEntry[]
  phase: IdentityCreationPhase
  prose: string
}

export function startGuidedIdentity(input: StartGuidedIdentityInput): GuidedCreationState {
  return startGuidedIdentityState(input)
}

export async function submitGuidedIdentityMessage(
  input: SubmitGuidedIdentityInput,
  narration: GuidedCreationNarrationApi,
  completer: TextCompleter,
  characterApi: CharacterIdentityGroundingApi
): Promise<GuidedIdentitySubmitResult> {
  const state = requireGuidedCreationState(input.characterId)
  const phase = readIdentityPhase(state.guidedCreationPhase)
  const facts = buildCharacterFacts(input.characterId, characterApi)
  const transcript = [...state.transcript, playerEntry(phase, input.message)]
  const result = await narration.generateGuidedIdentityReply(
    { phase, transcript: transcriptLines(transcript), characterFacts: facts },
    completer
  )
  if (!result.ok || result.prose === undefined) {
    return rejectReply(state.guidedCreationPhase, result.errors)
  }
  return acceptReply({ state, facts, transcript, phase, prose: result.prose })
}

function acceptReply(input: AcceptedReplyInput): GuidedIdentitySubmitResult {
  const errors = mechanicalDecisionErrors(input.prose)
  if (errors.length > 0) {
    return rejectReply(input.state.guidedCreationPhase, errors)
  }
  const next = nextPhase(input.phase)
  const updated = saveGuidedCreationState({
    ...input.state,
    guidedCreationPhase: next,
    transcript: [...input.transcript, dmEntry(input.phase, input.prose)],
    characterFacts: input.facts,
    enterWorldUnlocked: false
  })
  return { ok: true, phase: next, prose: input.prose, state: updated, errors: [] }
}

function rejectReply(phase: GuidedCreationPhase, errors: string[]): GuidedIdentitySubmitResult {
  return { ok: false, phase, errors }
}

function readIdentityPhase(phase: GuidedCreationPhase): IdentityCreationPhase {
  if (isIdentityPhase(phase)) {
    return phase
  }
  throw new Error(`Guided identity chat is not accepting messages during ${phase}.`)
}

function isIdentityPhase(phase: GuidedCreationPhase): phase is IdentityCreationPhase {
  return IDENTITY_PHASES.some((entry) => entry === phase)
}

function nextPhase(phase: IdentityCreationPhase): GuidedCreationPhase {
  const index = IDENTITY_PHASES.indexOf(phase)
  return IDENTITY_PHASES[index + 1] ?? 'opening_scene'
}

function playerEntry(phase: IdentityCreationPhase, text: string): GuidedCreationTranscriptEntry {
  assertMessage(text)
  return { speaker: 'player', phase, text }
}

function dmEntry(phase: IdentityCreationPhase, text: string): GuidedCreationTranscriptEntry {
  return { speaker: 'dm', phase, text }
}

function transcriptLines(transcript: readonly GuidedCreationTranscriptEntry[]): string[] {
  return transcript.map((entry) => `${entry.speaker}:${entry.phase}: ${entry.text}`)
}

function assertMessage(message: string): void {
  if (message.trim().length === 0) {
    throw new Error('Guided identity message must not be empty.')
  }
}
