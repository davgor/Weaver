import { restoreLatestAutosaveSnapshot } from './autosave.js'
import { CharacterEngineError } from './errors.js'
import { resolveObituaryText } from './obituary.js'

export const DEATH_MODES = ['legendary', 'standard', 'respawn'] as const
export type DeathMode = (typeof DEATH_MODES)[number]

/**
 * DMEngine sets `storyDriven: true` when narrative stakes require a permanent death
 * even if the campaign uses Standard or Respawn mode. When omitted or false, Standard
 * restores the latest autosave snapshot and Respawn applies relocate/cost/limit rules.
 */
export type ResolveCharacterDeathInput = {
  characterId: string
  campaignId: string
  cause: string
  storyDriven?: boolean
  obituaryDraft?: string
  respawnConfig?: RespawnConfig
}

export type RespawnConfig = {
  relocateTo: string
  cost: number
  maxRespawns: number
  currentGold: number
}

export type RespawnResult = {
  relocatedTo: string
  costPaid: number
  respawnsUsed: number
  respawnsRemaining: number
  goldRemaining: number
}

export type CharacterLifeStatus = {
  status: 'alive' | 'dead'
  cause?: string
  obituary?: string
}

export type CharacterDeathResolution = {
  mode: DeathMode
  status: 'alive' | 'dead'
  cause?: string
  obituary?: string
  restoredFromAutosave?: boolean
  respawn?: RespawnResult
}

type CharacterLifeRecord = {
  status: 'alive' | 'dead'
  cause?: string
  obituary?: string
}

type RespawnTracker = {
  usedRespawns: number
  lastRelocatedTo?: string
}

const campaignDeathModes = new Map<string, DeathMode>()
const lifeRecords = new Map<string, CharacterLifeRecord>()
const respawnTrackers = new Map<string, RespawnTracker>()

export function isDeathMode(value: unknown): value is DeathMode {
  return typeof value === 'string' && DEATH_MODES.some((mode) => mode === value)
}

export function setCampaignDeathMode(campaignId: string, mode: DeathMode): DeathMode {
  assertNonEmpty(campaignId, 'campaignId')
  if (!isDeathMode(mode)) {
    throw new CharacterEngineError('DEATH_MODE_INVALID', 'Death mode must be legendary, standard, or respawn')
  }
  campaignDeathModes.set(campaignId, mode)
  return mode
}

export function getCampaignDeathMode(campaignId: string): DeathMode | undefined {
  return campaignDeathModes.get(campaignId)
}

export function getCharacterLifeStatus(characterId: string): CharacterLifeStatus {
  assertNonEmpty(characterId, 'characterId')
  const record = lifeRecords.get(characterId)
  if (record === undefined || record.status === 'alive') {
    return { status: 'alive' }
  }
  return copyLifeStatus(record)
}

export async function resolveCharacterDeath(
  input: ResolveCharacterDeathInput
): Promise<CharacterDeathResolution> {
  assertDeathInput(input)
  const mode = readCampaignDeathMode(input.campaignId)
  if (input.storyDriven === true) {
    return finalizeDeath(mode, input)
  }
  if (mode === 'legendary') {
    return finalizeDeath(mode, input)
  }
  if (mode === 'standard') {
    return resolveStandardDeath(mode, input)
  }
  return resolveRespawnDeath(mode, input)
}

export function clearDeathModeStores(): void {
  campaignDeathModes.clear()
  lifeRecords.clear()
  respawnTrackers.clear()
}

async function finalizeDeath(
  mode: DeathMode,
  input: ResolveCharacterDeathInput
): Promise<CharacterDeathResolution> {
  const obituary = await resolveObituaryText(
    {
      characterId: input.characterId,
      campaignId: input.campaignId,
      cause: input.cause
    },
    input.obituaryDraft
  )
  markCharacterDead(input.characterId, input.cause, obituary)
  return {
    mode,
    status: 'dead',
    cause: input.cause,
    obituary
  }
}

async function resolveStandardDeath(
  mode: DeathMode,
  input: ResolveCharacterDeathInput
): Promise<CharacterDeathResolution> {
  restoreLatestAutosaveSnapshot(input.characterId)
  markCharacterAlive(input.characterId)
  return {
    mode,
    status: 'alive',
    restoredFromAutosave: true
  }
}

async function resolveRespawnDeath(
  mode: DeathMode,
  input: ResolveCharacterDeathInput
): Promise<CharacterDeathResolution> {
  const respawn = applyRespawn(input.characterId, readRespawnConfig(input))
  markCharacterAlive(input.characterId)
  return {
    mode,
    status: 'alive',
    respawn
  }
}

function applyRespawn(characterId: string, config: RespawnConfig): RespawnResult {
  const tracker = readRespawnTracker(characterId)
  if (tracker.usedRespawns >= config.maxRespawns) {
    throw new CharacterEngineError(
      'RESPAWN_LIMIT_EXCEEDED',
      `Character ${characterId} has exhausted respawn limit of ${config.maxRespawns}`
    )
  }
  if (config.currentGold < config.cost) {
    throw new CharacterEngineError(
      'RESPAWN_COST_INSUFFICIENT',
      `Respawn cost ${config.cost} exceeds current gold ${config.currentGold}`
    )
  }
  const usedRespawns = tracker.usedRespawns + 1
  const nextTracker = { usedRespawns, lastRelocatedTo: config.relocateTo }
  respawnTrackers.set(characterId, nextTracker)
  return {
    relocatedTo: config.relocateTo,
    costPaid: config.cost,
    respawnsUsed: usedRespawns,
    respawnsRemaining: config.maxRespawns - usedRespawns,
    goldRemaining: config.currentGold - config.cost
  }
}

function markCharacterDead(characterId: string, cause: string, obituary: string): void {
  lifeRecords.set(characterId, { status: 'dead', cause, obituary })
}

function markCharacterAlive(characterId: string): void {
  lifeRecords.set(characterId, { status: 'alive' })
}

function readCampaignDeathMode(campaignId: string): DeathMode {
  const mode = getCampaignDeathMode(campaignId)
  if (mode === undefined) {
    throw new CharacterEngineError(
      'DEATH_MODE_NOT_SET',
      `Campaign ${campaignId} does not have a death mode configured`
    )
  }
  return mode
}

function readRespawnConfig(input: ResolveCharacterDeathInput): RespawnConfig {
  if (input.respawnConfig === undefined) {
    throw new CharacterEngineError('DEATH_INPUT_INVALID', 'Respawn mode requires respawnConfig')
  }
  return input.respawnConfig
}

function readRespawnTracker(characterId: string): RespawnTracker {
  return respawnTrackers.get(characterId) ?? { usedRespawns: 0 }
}

function copyLifeStatus(record: CharacterLifeRecord): CharacterLifeStatus {
  const status: CharacterLifeStatus = { status: 'dead' }
  if (record.cause !== undefined) {
    status.cause = record.cause
  }
  if (record.obituary !== undefined) {
    status.obituary = record.obituary
  }
  return status
}

function assertDeathInput(input: ResolveCharacterDeathInput): void {
  assertNonEmpty(input.characterId, 'characterId')
  assertNonEmpty(input.campaignId, 'campaignId')
  assertNonEmpty(input.cause, 'cause')
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('DEATH_INPUT_INVALID', `${label} must not be empty`)
  }
}
