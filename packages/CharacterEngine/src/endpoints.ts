import {
  ABILITIES,
  calculateArmorClass,
  getAbilityModifier,
  isAbility,
  resolveAbilityCheck,
  type Ability,
  type AbilityResolutionInput,
  type AbilityScores,
  type ArmorClassInput,
  type RollMode
} from './abilities.js'
import {
  assignStandardArrayAbilityScores,
  confirmRolledAbilityScores,
  pointBuyAbilityScores,
  rollAbilityScoreDraft,
  type AbilityRollDetails,
  type RolledAbilityScoreDraft
} from './abilityScoreGeneration.js'
import {
  applyDamageModifiers,
  isDamageType,
  listDamageTypes,
  type DamageType
} from './damageTypes.js'
import { computeMaxHp, getCharacterStats, persistCharacterMaxHp } from './hp.js'
import {
  addJournalEntry,
  learnKnownAction,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog,
  upsertQuest,
  writeLogBookEvent,
  type AddJournalEntryInput,
  type JournalEntryFilter,
  type QuestKind,
  type QuestStatus,
  type UpsertQuestInput,
  type WriteLogBookEventInput
} from './records.js'
import {
  getCharacterIdentity,
  listCampaignBackgrounds,
  listCampaignRaces,
  selectBackground,
  selectRace,
  setCampaignBackgroundRoster,
  setCampaignRaceRoster,
  type BackgroundRosterEntry,
  type BackgroundSelectionInput,
  type RaceRosterEntry,
  type RaceSelectionInput
} from './raceBackground.js'
import { advanceTravelDays, getCampaignDay, longRest } from './timeRest.js'

export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type CharacterEngineApi = {
  id: 'CharacterEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/character-engine'
const VERSION = '0.1.0'

export function buildEndpoints(): EngineEndpoint[] {
  return [
    ...coreEndpoints(),
    ...abilityGenerationEndpoints(),
    ...hpEndpoints(),
    ...damageTypeEndpoints(),
    ...recordEndpoints(),
    ...raceBackgroundEndpoints(),
    ...timeRestEndpoints()
  ]
}

export function health() {
  return { ok: true as const, package: PACKAGE_NAME, version: VERSION }
}

function coreEndpoints(): EngineEndpoint[] {
  return [
    { name: 'health', description: 'Return package health metadata', invoke: health },
    {
      name: 'abilities',
      description: 'List core player-character abilities',
      invoke: () => [...ABILITIES]
    },
    {
      name: 'abilityModifier',
      description: 'Calculate floor((score - 10) / 2) for an ability score',
      invoke: (payload) => getAbilityModifier(parseAbilityModifierPayload(payload).score)
    },
    {
      name: 'resolveAbilityCheck',
      description: 'Resolve d20 + ability modifier + optional proficiency vs target',
      invoke: (payload) => resolveAbilityCheck(parseResolutionPayload(payload))
    },
    {
      name: 'armorClass',
      description: 'Calculate 10 + Agility modifier + armor bonus',
      invoke: (payload) => calculateArmorClass(parseArmorClassPayload(payload))
    }
  ]
}

function damageTypeEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'listDamageTypes',
      description: 'List canonical damage types',
      invoke: () => listDamageTypes()
    },
    {
      name: 'applyDamageModifiers',
      description: 'Apply resistance/vulnerability multipliers for a damage type',
      invoke: (payload) => {
        const request = parseDamageModifierPayload(payload)
        return applyDamageModifiers(request.amount, request)
      }
    }
  ]
}

function abilityGenerationEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'pointBuyAbilityScores',
      description: 'Validate and return a 12-point point-buy ability allocation',
      invoke: (payload) => pointBuyAbilityScores(readNestedScores(payload, 'pointBuyAbilityScores'))
    },
    {
      name: 'standardArrayAbilityScores',
      description: 'Validate and return a unique 14/12/10/8 standard-array assignment',
      invoke: (payload) =>
        assignStandardArrayAbilityScores(readNestedScores(payload, 'standardArrayAbilityScores'))
    },
    {
      name: 'rollAbilityScoreDraft',
      description: 'Roll four drop-lowest d6 scores for the roll-for-stats draft flow',
      invoke: () => rollAbilityScoreDraft()
    },
    {
      name: 'confirmRolledAbilityScores',
      description: 'Confirm rolled draft scores into the shared AbilityScores shape',
      invoke: (payload) => confirmRolledAbilityScores(parseRolledDraft(payload))
    }
  ]
}

function hpEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'computeMaxHp',
      description: 'Compute max HP from hit die, level, Body modifier, and optional rolls',
      invoke: (payload) => {
        const input = parseComputeHpPayload(payload)
        return computeMaxHp(input.hitDie, input.level, input.bodyMod, input.rolls)
      }
    },
    {
      name: 'persistCharacterMaxHp',
      description: 'Compute and persist character stats.maxHp',
      invoke: (payload) => persistCharacterMaxHp(parsePersistHpPayload(payload))
    },
    {
      name: 'getCharacterStats',
      description: 'Read persisted character stats',
      invoke: (payload) => getCharacterStats(readCharacterIdPayload(payload, 'getCharacterStats'))
    }
  ]
}

function recordEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'addJournalEntry',
      description: 'Append a character journal entry',
      invoke: parseAddJournal
    },
    {
      name: 'listJournalEntries',
      description: 'List character journal entries',
      invoke: parseJournalList
    },
    {
      name: 'writeLogBookEvent',
      description: 'Write a log-book event to one or more characters',
      invoke: parseLogEvent
    },
    {
      name: 'listLogBookEntries',
      description: 'List character log-book events',
      invoke: parseLogList
    },
    {
      name: 'upsertQuest',
      description: 'Create or update a character quest-log entry',
      invoke: parseQuest
    },
    { name: 'listQuestLog', description: 'List a character quest log', invoke: parseQuestList },
    {
      name: 'learnKnownAction',
      description: 'Record one known ActionEngine action id',
      invoke: parseLearnAction
    },
    {
      name: 'listKnownActions',
      description: 'List known ActionEngine action ids',
      invoke: parseKnownActions
    }
  ]
}

function raceBackgroundEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'setCampaignRaceRoster',
      description: 'Replace campaign race roster',
      invoke: parseRaceRoster
    },
    { name: 'listCampaignRaces', description: 'List campaign race roster', invoke: parseRaceList },
    {
      name: 'selectRace',
      description: 'Persist and realize a character race choice',
      invoke: parseRaceSelection
    },
    {
      name: 'setCampaignBackgroundRoster',
      description: 'Replace campaign background roster',
      invoke: parseBackgroundRoster
    },
    {
      name: 'listCampaignBackgrounds',
      description: 'List campaign background roster',
      invoke: parseBackgroundList
    },
    {
      name: 'selectBackground',
      description: 'Persist a character background choice',
      invoke: parseBackgroundSelection
    },
    {
      name: 'getCharacterIdentity',
      description: 'Read persisted race/background identity',
      invoke: parseIdentity
    }
  ]
}

function timeRestEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getCampaignDay',
      description: 'Read campaign day counter',
      invoke: parseGetCampaignDay
    },
    {
      name: 'longRest',
      description: 'Advance campaign day by one long rest',
      invoke: parseLongRest
    },
    {
      name: 'advanceTravelDays',
      description: 'Advance campaign day by clamped travel days',
      invoke: parseTravel
    }
  ]
}

function parseAbilityModifierPayload(payload: unknown): { score: number } {
  const record = readRecord(payload, 'abilityModifier')
  return { score: readNumber(record, 'score') }
}

function parseArmorClassPayload(payload: unknown): ArmorClassInput {
  const record = readRecord(payload, 'armorClass')
  return {
    agilityScore: readNumber(record, 'agilityScore'),
    armorBonus: readNumber(record, 'armorBonus')
  }
}

function parseDamageModifierPayload(payload: unknown): {
  amount: number
  damageType: DamageType
  resistances: DamageType[]
  vulnerabilities: DamageType[]
} {
  const record = readRecord(payload, 'applyDamageModifiers')
  return {
    amount: readNumber(record, 'amount'),
    damageType: readDamageType(record, 'damageType'),
    resistances: readDamageTypeList(record, 'resistances'),
    vulnerabilities: readDamageTypeList(record, 'vulnerabilities')
  }
}

function readDamageType(record: Record<string, unknown>, key: string): DamageType {
  const value = record[key]
  if (!isDamageType(value)) {
    throw new Error(`Expected ${key} to be a known damage type`)
  }
  return value
}

function readDamageTypeList(record: Record<string, unknown>, key: string): DamageType[] {
  const value = record[key]
  if (!Array.isArray(value) || !value.every(isDamageType)) {
    throw new Error(`Expected ${key} to be an array of damage types`)
  }
  return [...value]
}

function parseResolutionPayload(payload: unknown): AbilityResolutionInput {
  const record = readRecord(payload, 'resolveAbilityCheck')
  const base = {
    ability: readAbility(record['ability']),
    scores: readAbilityScores(record['scores']),
    proficient: readBoolean(record, 'proficient'),
    proficiencyBonus: readNumber(record, 'proficiencyBonus'),
    target: readNumber(record, 'target')
  }
  const rollMode = readRollMode(record)
  return rollMode === undefined ? base : { ...base, rollMode }
}

function readNestedScores(payload: unknown, label: string): AbilityScores {
  return readAbilityScores(readRecord(payload, label)['scores'])
}

function parseRolledDraft(payload: unknown): RolledAbilityScoreDraft {
  const record = readRecord(payload, 'confirmRolledAbilityScores')
  return {
    scores: readAbilityScores(record['scores']),
    rolls: readAbilityRollDetails(record['rolls']),
    confirmed: false
  }
}

function parseComputeHpPayload(payload: unknown) {
  const record = readRecord(payload, 'computeMaxHp')
  return {
    hitDie: readNumber(record, 'hitDie'),
    level: readNumber(record, 'level'),
    bodyMod: readNumber(record, 'bodyMod'),
    rolls: readOptionalNumberArray(record, 'rolls')
  }
}

function parsePersistHpPayload(payload: unknown) {
  const record = readRecord(payload, 'persistCharacterMaxHp')
  const rolls = readOptionalNumberArray(record, 'rolls')
  const base = {
    characterId: readString(record, 'characterId'),
    hitDie: readNumber(record, 'hitDie'),
    level: readNumber(record, 'level'),
    bodyMod: readNumber(record, 'bodyMod')
  }
  return rolls === undefined ? base : { ...base, rolls }
}

function parseAddJournal(payload: unknown) {
  return addJournalEntry(parseJournalPayload(payload))
}

function parseJournalList(payload: unknown) {
  const record = readRecord(payload, 'listJournalEntries')
  return listJournalEntries(readString(record, 'characterId'), parseJournalFilter(record))
}

function parseLogEvent(payload: unknown) {
  return writeLogBookEvent(parseLogEventPayload(payload))
}

function parseLogList(payload: unknown) {
  return listLogBookEntries(readCharacterIdPayload(payload, 'listLogBookEntries'))
}

function parseQuest(payload: unknown) {
  return upsertQuest(parseQuestPayload(payload))
}

function parseQuestList(payload: unknown) {
  return listQuestLog(readCharacterIdPayload(payload, 'listQuestLog'))
}

function parseLearnAction(payload: unknown) {
  const record = readRecord(payload, 'learnKnownAction')
  return learnKnownAction(readString(record, 'characterId'), readString(record, 'actionId'))
}

function parseKnownActions(payload: unknown) {
  return listKnownActions(readCharacterIdPayload(payload, 'listKnownActions'))
}

function parseRaceRoster(payload: unknown) {
  const record = readRecord(payload, 'setCampaignRaceRoster')
  return setCampaignRaceRoster(readString(record, 'campaignId'), readRaceRoster(record['races']))
}

function parseRaceList(payload: unknown) {
  return listCampaignRaces(readCampaignIdPayload(payload, 'listCampaignRaces'))
}

function parseRaceSelection(payload: unknown) {
  return selectRace(parseRaceSelectionPayload(payload))
}

function parseBackgroundRoster(payload: unknown) {
  const record = readRecord(payload, 'setCampaignBackgroundRoster')
  return setCampaignBackgroundRoster(
    readString(record, 'campaignId'),
    readBackgroundRoster(record['backgrounds'])
  )
}

function parseBackgroundList(payload: unknown) {
  return listCampaignBackgrounds(readCampaignIdPayload(payload, 'listCampaignBackgrounds'))
}

function parseBackgroundSelection(payload: unknown) {
  return selectBackground(parseBackgroundSelectionPayload(payload))
}

function parseIdentity(payload: unknown) {
  return getCharacterIdentity(readCharacterIdPayload(payload, 'getCharacterIdentity'))
}

function parseGetCampaignDay(payload: unknown) {
  return getCampaignDay(readCampaignIdPayload(payload, 'getCampaignDay'))
}

function parseLongRest(payload: unknown) {
  return longRest(readCampaignIdPayload(payload, 'longRest'))
}

function parseTravel(payload: unknown) {
  const record = readRecord(payload, 'advanceTravelDays')
  return advanceTravelDays(readString(record, 'campaignId'), readNumber(record, 'proposedDays'))
}

function parseJournalPayload(payload: unknown): AddJournalEntryInput {
  const record = readRecord(payload, 'addJournalEntry')
  const linkedNpcId = readOptionalString(record, 'linkedNpcId')
  const createdAt = readOptionalString(record, 'createdAt')
  const base = {
    characterId: readString(record, 'characterId'),
    text: readString(record, 'text')
  }
  return {
    ...base,
    ...optionalStringField('createdAt', createdAt),
    ...optionalStringField('linkedNpcId', linkedNpcId)
  }
}

function parseJournalFilter(record: Record<string, unknown>): JournalEntryFilter {
  const linkedNpcId = readOptionalString(record, 'linkedNpcId')
  return linkedNpcId === undefined ? {} : { linkedNpcId }
}

function parseLogEventPayload(payload: unknown): WriteLogBookEventInput {
  const record = readRecord(payload, 'writeLogBookEvent')
  const createdAt = readOptionalString(record, 'createdAt')
  const base = {
    characterIds: readStringArray(record['characterIds'], 'characterIds'),
    type: readString(record, 'type'),
    payload: readRecord(record['payload'], 'payload')
  }
  return createdAt === undefined ? base : { ...base, createdAt }
}

function parseQuestPayload(payload: unknown): UpsertQuestInput {
  const record = readRecord(payload, 'upsertQuest')
  const title = readOptionalString(record, 'title')
  const base = {
    characterId: readString(record, 'characterId'),
    questId: readString(record, 'questId'),
    kind: readQuestKind(record['kind']),
    status: readQuestStatus(record['status'])
  }
  return title === undefined ? base : { ...base, title }
}

function parseRaceSelectionPayload(payload: unknown): RaceSelectionInput {
  const record = readRecord(payload, 'selectRace')
  const lore = readOptionalString(record, 'lore')
  const base = {
    campaignId: readString(record, 'campaignId'),
    characterId: readString(record, 'characterId'),
    raceId: readString(record, 'raceId')
  }
  return lore === undefined ? base : { ...base, lore }
}

function parseBackgroundSelectionPayload(payload: unknown): BackgroundSelectionInput {
  const record = readRecord(payload, 'selectBackground')
  const personalStory = readOptionalString(record, 'personalStory')
  const base = {
    campaignId: readString(record, 'campaignId'),
    characterId: readString(record, 'characterId'),
    backgroundId: readString(record, 'backgroundId')
  }
  return personalStory === undefined ? base : { ...base, personalStory }
}

function readRaceRoster(value: unknown): RaceRosterEntry[] {
  return readArray(value, 'races').map((entry) => {
    const record = readRecord(entry, 'race')
    const lore = readOptionalString(record, 'lore')
    const base = { raceId: readString(record, 'raceId'), name: readString(record, 'name') }
    return lore === undefined ? base : { ...base, lore }
  })
}

function readBackgroundRoster(value: unknown): BackgroundRosterEntry[] {
  return readArray(value, 'backgrounds').map(readBackgroundEntry)
}

function readBackgroundEntry(value: unknown): BackgroundRosterEntry {
  const record = readRecord(value, 'background')
  const hook = readOptionalString(record, 'personalStoryHook')
  const base = {
    backgroundId: readString(record, 'backgroundId'),
    name: readString(record, 'name'),
    description: readString(record, 'description')
  }
  return hook === undefined ? base : { ...base, personalStoryHook: hook }
}

function readCharacterIdPayload(payload: unknown, label: string): string {
  return readString(readRecord(payload, label), 'characterId')
}

function readCampaignIdPayload(payload: unknown, label: string): string {
  return readString(readRecord(payload, label), 'campaignId')
}

function readAbilityScores(value: unknown): AbilityScores {
  const record = readRecord(value, 'scores')
  return {
    Body: readNumber(record, 'Body'),
    Agility: readNumber(record, 'Agility'),
    Mind: readNumber(record, 'Mind'),
    Presence: readNumber(record, 'Presence')
  }
}

function readAbilityRollDetails(value: unknown): AbilityRollDetails {
  const record = readRecord(value, 'rolls')
  return {
    Body: readRollTuple(record['Body'], 'Body'),
    Agility: readRollTuple(record['Agility'], 'Agility'),
    Mind: readRollTuple(record['Mind'], 'Mind'),
    Presence: readRollTuple(record['Presence'], 'Presence')
  }
}

function readRollTuple(value: unknown, label: string): readonly [number, number, number, number] {
  const rolls = readArray(value, label).map((roll) => readNumberValue(roll, label))
  if (rolls.length !== 4) {
    throw new Error(`Expected ${label} to contain four rolls`)
  }
  return [rolls[0] ?? 0, rolls[1] ?? 0, rolls[2] ?? 0, rolls[3] ?? 0]
}

function readAbility(value: unknown): Ability {
  if (!isAbility(value)) {
    throw new Error('Expected ability to be Body, Agility, Mind, or Presence')
  }
  return value
}

function readRollMode(record: Record<string, unknown>): RollMode | undefined {
  const value = record['rollMode']
  if (value === undefined) {
    return undefined
  }
  if (value === 'normal' || value === 'advantage' || value === 'disadvantage') {
    return value
  }
  throw new Error('Expected rollMode to be normal, advantage, or disadvantage')
}

function readQuestKind(value: unknown): QuestKind {
  if (value === 'main' || value === 'side') {
    return value
  }
  throw new Error('Expected kind to be main or side')
}

function readQuestStatus(value: unknown): QuestStatus {
  if (value === 'active' || value === 'complete' || value === 'failed') {
    return value
  }
  throw new Error('Expected status to be active, complete, or failed')
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`Expected ${key} to be a boolean`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  return readNumberValue(record[key], key)
}

function readNumberValue(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${label} to be a finite number`)
  }
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string`)
  }
  return value
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string`)
  }
  return value
}

function readOptionalNumberArray(
  record: Record<string, unknown>,
  key: string
): readonly number[] | undefined {
  const value = record[key]
  return value === undefined
    ? undefined
    : readArray(value, key).map((entry) => readNumberValue(entry, key))
}

function readStringArray(value: unknown, label: string): string[] {
  return readArray(value, label).map((entry) => {
    if (typeof entry !== 'string') {
      throw new Error(`Expected ${label} to contain strings`)
    }
    return entry
  })
}

function readArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`)
  }
  return value
}

function readRecord(payload: unknown, label: string): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(`Expected ${label} payload to be an object`)
  }
  return payload as Record<string, unknown>
}

function optionalStringField(key: string, value: string | undefined): Record<string, string> {
  return value === undefined ? {} : { [key]: value }
}
