import type { NarrationPeers } from './peers.js'
import { validateClaims } from './claimValidate.js'
import type { ClaimValidationResult, FactualClaim } from './proseTypes.js'
import type { TerminologyRewrite } from './terminologyGuards.js'
import { validateProseTone } from './toneGuard.js'

export type ProseValidationResult = ClaimValidationResult & {
  prose: string
  rewrites: TerminologyRewrite[]
  toneViolations: string[]
}

export function validateProse(
  prose: string,
  claims: readonly FactualClaim[],
  peers: NarrationPeers
): ProseValidationResult {
  const tone = validateProseTone(prose)
  const claimsResult = validateClaims(claims, peers)

  return {
    ok: tone.ok && claimsResult.ok,
    prose: tone.prose,
    rewrites: tone.rewrites,
    toneViolations: tone.violations,
    accepted: claimsResult.accepted,
    rejected: claimsResult.rejected
  }
}
