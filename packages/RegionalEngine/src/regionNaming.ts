import type { RegionalService, RegionRecord } from './types.js'

export type RegionNamingInput = {
  displayName: string
  history: string
}

export type RealizeRegionNamingOptions = {
  regenerate?: boolean
}

export class RegionNamingError extends Error {
  constructor(
    readonly code: 'REGION_NOT_FOUND' | 'REGION_NAMING_ALREADY_REALIZED' | 'REGION_NAMING_INVALID',
    message: string
  ) {
    super(message)
    this.name = 'RegionNamingError'
  }
}

export function realizeRegionNaming(
  service: RegionalService,
  scope: { worldId: string; regionId: string },
  naming: RegionNamingInput,
  options: RealizeRegionNamingOptions = {}
): RegionRecord {
  const region = service.getRegion(scope.worldId, scope.regionId)
  if (region === null) {
    throw new RegionNamingError('REGION_NOT_FOUND', `Region not found: ${scope.regionId}`)
  }

  assertNamingInput(naming)

  if (region.namingRealizedAt !== undefined && options.regenerate !== true) {
    throw new RegionNamingError(
      'REGION_NAMING_ALREADY_REALIZED',
      `Region naming already realized: ${scope.regionId}`
    )
  }

  return service.updateRegionNaming(scope.worldId, scope.regionId, {
    displayName: naming.displayName.trim(),
    history: naming.history.trim(),
    namingRealizedAt: new Date().toISOString()
  })
}

function assertNamingInput(naming: RegionNamingInput): void {
  if (naming.displayName.trim().length === 0 || naming.history.trim().length === 0) {
    throw new RegionNamingError(
      'REGION_NAMING_INVALID',
      'Region naming requires non-empty displayName and history'
    )
  }
}
