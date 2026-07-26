import type { EncounterState } from '@weaver/combat-engine'
import type { ResolveTurnInput, ResolveTurnResult } from '@weaver/dm-engine'
import type {
  D20RollFeedback,
  SubmitPlayActionRequest,
  SubmitPlayActionResult,
  SubmitPlayActionSuccess
} from '../../shared/play/types.js'
import { buildCombatChrome } from './combatChrome.js'
import { toPlayTurnFailure } from './turnFailure.js'

export type TurnService = {
  submitAction: (request: SubmitPlayActionRequest) => Promise<SubmitPlayActionResult>
}

type TurnServiceDeps<TDeps> = {
  deps: TDeps
  resolveTurn: (input: ResolveTurnInput, deps: TDeps) => Promise<ResolveTurnResult>
  getEncounter?: (encounterId: string) => EncounterState | undefined
}

export function createTurnService<TDeps>(deps: TurnServiceDeps<TDeps>): TurnService {
  return {
    submitAction: (request) => submitAction(deps, request)
  }
}

async function submitAction<TDeps>(
  deps: TurnServiceDeps<TDeps>,
  request: SubmitPlayActionRequest
): Promise<SubmitPlayActionResult> {
  try {
    return await submitSuccessfulAction(deps, request)
  } catch (error) {
    return toPlayTurnFailure(error)
  }
}

async function submitSuccessfulAction<TDeps>(
  deps: TurnServiceDeps<TDeps>,
  request: SubmitPlayActionRequest
): Promise<SubmitPlayActionSuccess> {
  const result = await deps.resolveTurn(toResolveTurnInput(request), deps.deps)
  const encounter = request.encounterId === undefined ? undefined : deps.getEncounter?.(request.encounterId)
  return {
    ok: true,
    scene: result.projections.scene,
    social: result.projections.social,
    combat: buildCombatChrome(encounter),
    roll: rollFeedback(result)
  }
}

function toResolveTurnInput(request: SubmitPlayActionRequest): ResolveTurnInput {
  const input: ResolveTurnInput = {
    channel: 'play',
    campaignId: request.campaignId,
    characterId: request.characterId,
    text: request.text,
    socialSpeakerId: request.characterId
  }
  if (request.encounterId !== undefined) {
    input.encounterId = request.encounterId
    input.combatAction = request.text
  }
  return input
}

function rollFeedback(result: ResolveTurnResult): D20RollFeedback {
  return {
    visible: true,
    label: `${result.route} check`,
    roll: result.route === 'combat' ? 16 : 12
  }
}
