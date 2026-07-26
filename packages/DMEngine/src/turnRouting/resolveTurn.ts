import { lockTurn } from './lockTurn.js'
import { interpretIntentAndRoute } from './interpretIntentAndRoute.js'
import { resolveCommerceBranch } from './branches/commerce.js'
import { narrateTurnOutcome, resolveNarrationBranch } from './branches/narration.js'
import { resolveTravelBranch } from './branches/travel.js'
import { resolveEncounterLoop } from '../encounterLoop/encounterLoop.js'
import {
  TurnRoutingError,
  type BranchResolution,
  type CombatBranchInput,
  type CommerceBranchInput,
  type ResolveTurnDeps,
  type ResolveTurnInput,
  type ResolveTurnResult,
  type RoutePlan,
  type TravelBranchInput
} from './types.js'

export async function resolveTurn(
  input: ResolveTurnInput,
  deps: ResolveTurnDeps
): Promise<ResolveTurnResult> {
  rejectAskDm(input.channel)
  const unlock = lockTurn(input.campaignId, input.characterId)
  try {
    return await resolveLockedTurn(input, deps)
  } finally {
    unlock()
  }
}

function rejectAskDm(channel: ResolveTurnInput['channel']): void {
  if (channel === 'askDm') {
    throw new TurnRoutingError(
      'DM_TURN_ASK_DM_REJECTED',
      'Ask-the-DM turns must not enter play turn routing'
    )
  }
}

async function resolveLockedTurn(
  input: ResolveTurnInput,
  deps: ResolveTurnDeps
): Promise<ResolveTurnResult> {
  const combatActive = isCombatActive(input, deps)
  const plan = await interpretIntentAndRoute({
    text: input.text,
    completer: deps.completer,
    combatActive
  })
  const resolution = resolveBranch(input, deps, plan)
  const narrated = await narrateTurnOutcome(buildNarrationInput(input, plan, resolution), deps.narration)
  await deps.persist({
    campaignId: input.campaignId,
    characterId: input.characterId,
    route: plan.route,
    resolution,
    narration: narrated.narration
  })
  return {
    route: plan.route,
    skipLlm: plan.skipLlm,
    resolution,
    narration: narrated.narration,
    projections: narrated.projections
  }
}

function buildNarrationInput(
  input: ResolveTurnInput,
  plan: RoutePlan,
  resolution: BranchResolution
): {
  route: RoutePlan['route']
  resolution: BranchResolution
  playerText: string
  socialSpeakerId?: string
} {
  if (input.socialSpeakerId === undefined) {
    return {
      route: plan.route,
      resolution,
      playerText: input.text
    }
  }
  return {
    route: plan.route,
    resolution,
    playerText: input.text,
    socialSpeakerId: input.socialSpeakerId
  }
}

function isCombatActive(input: ResolveTurnInput, deps: ResolveTurnDeps): boolean {
  if (input.encounterId === undefined) {
    return false
  }
  const encounter = deps.combat.getEncounter(input.encounterId)
  return encounter?.status === 'active'
}

function resolveBranch(
  input: ResolveTurnInput,
  deps: ResolveTurnDeps,
  plan: RoutePlan
): BranchResolution {
  if (plan.route === 'commerce') {
    return resolveCommerceBranch(buildCommerceInput(input, deps, plan))
  }
  if (plan.route === 'travel') {
    return resolveTravelBranch(buildTravelInput(input, deps, plan))
  }
  if (plan.route === 'combat') {
    return resolveEncounterLoop({
      branch: buildCombatInput(input, deps),
      context: {
        campaignId: input.campaignId,
        characterId: input.characterId,
        text: input.text
      },
      ...(input.encounterStart === undefined ? {} : { encounterStart: input.encounterStart }),
      ...(input.encounterRewards === undefined ? {} : { rewards: input.encounterRewards }),
      ...(deps.progression === undefined ? {} : { progression: deps.progression }),
      ...(deps.createEncounterId === undefined ? {} : { createEncounterId: deps.createEncounterId })
    })
  }
  return resolveNarrationBranch(input.text)
}

function buildCommerceInput(
  input: ResolveTurnInput,
  deps: ResolveTurnDeps,
  plan: RoutePlan
): CommerceBranchInput {
  const branch: CommerceBranchInput = {
    intent: plan.intent,
    currency: deps.currency,
    characterId: input.characterId
  }
  if (input.itemId !== undefined) {
    branch.itemId = input.itemId
  }
  if (input.proposedPrice !== undefined) {
    branch.proposedPrice = input.proposedPrice
  }
  return branch
}

function buildTravelInput(
  input: ResolveTurnInput,
  deps: ResolveTurnDeps,
  plan: RoutePlan
): TravelBranchInput {
  const branch: TravelBranchInput = {
    intent: plan.intent,
    travel: deps.travel,
    destinations: deps.destinations,
    campaignId: input.campaignId
  }
  if (input.destinationId !== undefined) {
    branch.destinationId = input.destinationId
  }
  if (input.proposedDays !== undefined) {
    branch.proposedDays = input.proposedDays
  }
  return branch
}

function buildCombatInput(input: ResolveTurnInput, deps: ResolveTurnDeps): CombatBranchInput {
  const branch: CombatBranchInput = {
    combat: deps.combat,
    combatantId: input.characterId
  }
  if (input.encounterId !== undefined) {
    branch.encounterId = input.encounterId
  }
  if (input.combatAction !== undefined) {
    branch.combatAction = input.combatAction
  }
  if (input.combatIntent !== undefined) {
    branch.combatIntent = input.combatIntent
  }
  if (deps.actions !== undefined) {
    branch.actions = deps.actions
  }
  return branch
}
