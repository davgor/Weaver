import type { CivilizationRecord } from './types.js'
import type { CivilizationService } from './civilizationService.js'

export type SettlementNamingInput = {
  displayName: string
  history: string
}

export type RealizeSettlementNamingOptions = {
  regenerate?: boolean
}

export class SettlementNamingError extends Error {
  constructor(
    readonly code:
      | 'SETTLEMENT_NOT_FOUND'
      | 'SETTLEMENT_NAMING_ALREADY_REALIZED'
      | 'SETTLEMENT_NAMING_INVALID',
    message: string
  ) {
    super(message)
    this.name = 'SettlementNamingError'
  }
}

export function realizeSettlementNaming(
  service: CivilizationService,
  scope: { worldId: string; civilizationId: string },
  naming: SettlementNamingInput,
  options: RealizeSettlementNamingOptions = {}
): CivilizationRecord {
  const record = service.getCivilization(scope.worldId, scope.civilizationId)
  if (record === null) {
    throw new SettlementNamingError(
      'SETTLEMENT_NOT_FOUND',
      `Settlement not found: ${scope.civilizationId}`
    )
  }

  assertNamingInput(naming)

  if (record.namingRealizedAt !== undefined && options.regenerate !== true) {
    throw new SettlementNamingError(
      'SETTLEMENT_NAMING_ALREADY_REALIZED',
      `Settlement naming already realized: ${scope.civilizationId}`
    )
  }

  return service.updateSettlementNaming(scope.worldId, scope.civilizationId, {
    displayName: naming.displayName.trim(),
    history: naming.history.trim(),
    namingRealizedAt: new Date().toISOString()
  })
}

function assertNamingInput(naming: SettlementNamingInput): void {
  if (naming.displayName.trim().length === 0 || naming.history.trim().length === 0) {
    throw new SettlementNamingError(
      'SETTLEMENT_NAMING_INVALID',
      'Settlement naming requires non-empty displayName and history'
    )
  }
}
