import type { SilentResolveDecision, TurnInterestInput } from './proseTypes.js'

export function decideSilentResolve(input: TurnInterestInput): SilentResolveDecision {
  if (isQuietTurn(input)) {
    return { silent: true, reason: 'nothing_interesting' }
  }
  return { silent: false, reason: 'needs_narration' }
}

function isQuietTurn(input: TurnInterestInput): boolean {
  return (
    input.stakes === 'low' &&
    !input.hasDialogue &&
    !input.worldChanged &&
    !input.combatOccurred &&
    input.noteworthyEventCount === 0
  )
}
