import type {
  PantheonNaming,
  PantheonOutcome,
  PlaceNaming,
  PlaceNamingOutcome,
  RealizePantheonInput,
  RealizePlaceNamingInput,
  RegionPlaceStats,
  SettlementPlaceStats,
  TextCompleter
} from '@weaver/narration-engine'
import type { CivilizationRecord, CivilizationService } from '@weaver/civilization-engine'
import type { RegionRecord, RegionalService } from '@weaver/regional-engine'
import { realizeRegionNaming as applyRegionNaming } from '@weaver/regional-engine'
import { realizeSettlementNaming as applySettlementNaming } from '@weaver/civilization-engine'
import { DmNamingError } from './errors.js'

const VALIDATED_PLACE_NAMING = Symbol('validatedPlaceNaming')

export type ValidatedPlaceNaming = PlaceNaming & {
  readonly [VALIDATED_PLACE_NAMING]: true
  seal: string
}

export type NarrationWorldNamingApi = {
  realizePlaceNaming: (
    input: RealizePlaceNamingInput,
    completer: TextCompleter
  ) => Promise<PlaceNamingOutcome>
  realizePantheon: (
    input: RealizePantheonInput,
    completer: TextCompleter
  ) => Promise<PantheonOutcome>
  sealPlaceNaming: (naming: PlaceNaming) => string
}

export type RegionalNamingApi = {
  service: RegionalService
  worldId: string
}

export type CivilizationNamingApi = {
  service: CivilizationService
  worldId: string
}

export type RealizeRegionNameInput = {
  campaignId: string
  regionId: string
  seed?: string
}

export type RealizeSettlementNameInput = {
  campaignId: string
  civilizationId: string
  seed?: string
}

export type RealizeCampaignPantheonInput = {
  campaignId: string
  count: number
  seed?: string
}

export async function realizeRegionName(
  narration: NarrationWorldNamingApi,
  regional: RegionalNamingApi,
  completer: TextCompleter,
  input: RealizeRegionNameInput
): Promise<RegionRecord> {
  const region = requireRegion(regional, input.regionId)
  const outcome = await narration.realizePlaceNaming(
    {
      kind: 'region',
      campaignId: input.campaignId,
      stats: toRegionStats(region),
      ...(input.seed === undefined ? {} : { seed: input.seed })
    },
    completer
  )
  const validated = toValidatedPlaceNaming(narration, requirePlaceOutcome(outcome))
  return persistValidatedRegionNaming(regional, input.regionId, validated)
}

export async function regenerateRegionName(
  narration: NarrationWorldNamingApi,
  regional: RegionalNamingApi,
  completer: TextCompleter,
  input: RealizeRegionNameInput
): Promise<RegionRecord> {
  const region = requireRegion(regional, input.regionId)
  const outcome = await narration.realizePlaceNaming(
    {
      kind: 'region',
      campaignId: input.campaignId,
      stats: toRegionStats(region, { omitExistingLabel: true }),
      ...(input.seed === undefined ? {} : { seed: input.seed })
    },
    completer
  )
  const validated = toValidatedPlaceNaming(narration, requirePlaceOutcome(outcome))
  return persistValidatedRegionNaming(regional, input.regionId, validated, { regenerate: true })
}

export type RealizeSettlementNameDeps = {
  narration: NarrationWorldNamingApi
  civilization: CivilizationNamingApi
  regional: RegionalNamingApi
  completer: TextCompleter
}

export async function realizeSettlementName(
  deps: RealizeSettlementNameDeps,
  input: RealizeSettlementNameInput
): Promise<CivilizationRecord> {
  const settlement = requireSettlement(deps.civilization, input.civilizationId)
  const region = requireRegion(deps.regional, settlement.regionId)
  const outcome = await deps.narration.realizePlaceNaming(
    {
      kind: 'settlement',
      campaignId: input.campaignId,
      stats: toSettlementStats(settlement, region),
      ...(input.seed === undefined ? {} : { seed: input.seed })
    },
    deps.completer
  )
  const validated = toValidatedPlaceNaming(deps.narration, requirePlaceOutcome(outcome))
  return persistValidatedSettlementNaming(deps.civilization, input.civilizationId, validated)
}

export async function realizeCampaignPantheon(
  narration: NarrationWorldNamingApi,
  completer: TextCompleter,
  input: RealizeCampaignPantheonInput
): Promise<PantheonNaming> {
  const outcome = await narration.realizePantheon(
    {
      campaignId: input.campaignId,
      count: input.count,
      ...(input.seed === undefined ? {} : { seed: input.seed })
    },
    completer
  )
  if (!outcome.ok) {
    throw new DmNamingError('DM_NAMING_INVENT_FAILED', outcome.reason)
  }
  return outcome.pantheon
}

export function persistValidatedRegionNaming(
  regional: RegionalNamingApi,
  regionId: string,
  naming: ValidatedPlaceNaming,
  options: { regenerate?: boolean } = {}
): RegionRecord {
  assertValidatedPlaceNaming(naming)
  return applyRegionNaming(
    regional.service,
    { worldId: regional.worldId, regionId },
    { displayName: naming.displayName, history: naming.history },
    options
  )
}

export function persistValidatedSettlementNaming(
  civilization: CivilizationNamingApi,
  civilizationId: string,
  naming: ValidatedPlaceNaming,
  options: { regenerate?: boolean } = {}
): CivilizationRecord {
  assertValidatedPlaceNaming(naming)
  return applySettlementNaming(
    civilization.service,
    { worldId: civilization.worldId, civilizationId },
    { displayName: naming.displayName, history: naming.history },
    options
  )
}

export function toValidatedPlaceNaming(
  narration: NarrationWorldNamingApi,
  naming: PlaceNaming
): ValidatedPlaceNaming {
  const seal = narration.sealPlaceNaming(naming)
  return {
    ...naming,
    [VALIDATED_PLACE_NAMING]: true,
    seal
  }
}

export function assertValidatedPlaceNaming(naming: ValidatedPlaceNaming): void {
  if (naming[VALIDATED_PLACE_NAMING] !== true) {
    throw new DmNamingError(
      'DM_NAMING_UNVALIDATED',
      'Place naming must round-trip through NarrationEngine validation'
    )
  }
  if (naming.displayName.trim().length === 0 || naming.history.trim().length === 0) {
    throw new DmNamingError('DM_NAMING_INPUT_INVALID', 'Validated naming must not be empty')
  }
}

function requirePlaceOutcome(outcome: PlaceNamingOutcome): PlaceNaming {
  if (!outcome.ok) {
    throw new DmNamingError('DM_NAMING_INVENT_FAILED', outcome.reason)
  }
  return outcome.naming
}

function requireRegion(regional: RegionalNamingApi, regionId: string): RegionRecord {
  const region = regional.service.getRegion(regional.worldId, regionId)
  if (region === null) {
    throw new DmNamingError('DM_NAMING_REGION_NOT_FOUND', `Region not found: ${regionId}`)
  }
  return region
}

function requireSettlement(
  civilization: CivilizationNamingApi,
  civilizationId: string
): CivilizationRecord {
  const record = civilization.service.getCivilization(civilization.worldId, civilizationId)
  if (record === null) {
    throw new DmNamingError(
      'DM_NAMING_SETTLEMENT_NOT_FOUND',
      `Settlement not found: ${civilizationId}`
    )
  }
  return record
}

function toRegionStats(
  region: RegionRecord,
  options: { omitExistingLabel?: boolean } = {}
): RegionPlaceStats {
  const stats: RegionPlaceStats = {
    dominantLandType: region.dominantLandType,
    isOcean: region.isOcean,
    isLandlocked: region.isLandlocked,
    touchesOcean: region.touchesOcean,
    waterContent: region.waterContent
  }
  if (options.omitExistingLabel !== true && region.displayName !== undefined) {
    stats.existingDisplayName = region.displayName
  }
  return stats
}

function toSettlementStats(
  settlement: CivilizationRecord,
  region: RegionRecord
): SettlementPlaceStats {
  const stats: SettlementPlaceStats = {
    settlementKind: settlement.kind,
    population: settlement.population,
    regionDominantLandType: region.dominantLandType,
    regionIsLandlocked: region.isLandlocked,
    regionTouchesOcean: region.touchesOcean
  }
  if (settlement.displayName !== undefined) stats.existingDisplayName = settlement.displayName
  return stats
}
