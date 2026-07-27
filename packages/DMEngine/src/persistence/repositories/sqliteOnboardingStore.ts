import type { GuidedCreationState } from '../../guidedCreation/types.js'
import type { GuidedCreationStateStore } from '../../guidedCreation/stateStore.js'
import { cloneGuidedCreationState } from '../../guidedCreation/stateStore.js'
import type { SqliteDatabase } from '../migrationRunner.js'

export const ONBOARDING_CAMPAIGN_SLICE_VERSION = 1

export type OnboardingStoredRecord = {
  campaignId: string
  characterId: string
  characterName: string
  phase: string
  selections: unknown
  updatedAt: string
}

export type OnboardingRecordWrite = Omit<OnboardingStoredRecord, 'updatedAt'> & {
  updatedAt?: string
}

export type OnboardingStore = GuidedCreationStateStore & {
  saveRecord: (record: OnboardingRecordWrite) => OnboardingStoredRecord
  loadRecord: (characterId: string) => OnboardingStoredRecord | undefined
  listRecords: (campaignId: string) => OnboardingStoredRecord[]
  deleteRecord: (characterId: string) => void
  clearRecords: (campaignId?: string) => void
  saveGuidedState: (state: GuidedCreationState) => GuidedCreationState
  loadGuidedState: (characterId: string) => GuidedCreationState | undefined
  listGuidedStates: (campaignId: string) => GuidedCreationState[]
  deleteGuidedState: (characterId: string) => void
  clearGuidedStates: (campaignId?: string) => void
  getActiveCharacterId: () => string | null
  setActiveCharacterId: (characterId: string | null) => void
}

export type OnboardingCampaignSlice = {
  sliceVersion: typeof ONBOARDING_CAMPAIGN_SLICE_VERSION
  campaignId: string
  records: OnboardingStoredRecord[]
  guidedCreationStates: GuidedCreationState[]
  activeCharacterId: string | null
}

type StoreOptions = {
  now?: () => string
}

type OnboardingRow = {
  campaign_id: string
  character_id: string
  character_name: string
  phase: string
  selections_json: string
  updated_at: string
}

type GuidedRow = {
  payload_json: string
}

type MetaRow = {
  value: string
}

const ACTIVE_CHARACTER_META_KEY = 'active_character_id'
let defaultOnboardingStore: OnboardingStore | null = null
let boundOnboardingStore: OnboardingStore | null = null

export function createSqliteOnboardingStore(
  db: SqliteDatabase,
  options: StoreOptions = {}
): OnboardingStore {
  return new SqliteOnboardingStore(db, options.now ?? isoNow)
}

export function createMemoryOnboardingStore(options: StoreOptions = {}): OnboardingStore {
  return new MemoryOnboardingStore(options.now ?? isoNow)
}

export function bindOnboardingStore(store: OnboardingStore): void {
  boundOnboardingStore = store
}

export function unbindOnboardingStore(): void {
  boundOnboardingStore = null
}

export function isOnboardingStoreBound(): boolean {
  return boundOnboardingStore !== null
}

export function getActiveOnboardingStore(): OnboardingStore {
  return boundOnboardingStore ?? getDefaultOnboardingStore()
}

export function exportOnboardingCampaignSlice(
  ctx: { campaignId: string },
  store: OnboardingStore = getActiveOnboardingStore()
): OnboardingCampaignSlice {
  return {
    sliceVersion: ONBOARDING_CAMPAIGN_SLICE_VERSION,
    campaignId: ctx.campaignId,
    records: store.listRecords(ctx.campaignId),
    guidedCreationStates: store.listGuidedStates(ctx.campaignId),
    activeCharacterId: store.getActiveCharacterId()
  }
}

export function importOnboardingCampaignSlice(
  ctx: { campaignId: string },
  slice: OnboardingCampaignSlice,
  store: OnboardingStore = getActiveOnboardingStore()
): void {
  if (slice.campaignId !== ctx.campaignId) {
    throw new Error(`Onboarding slice campaignId mismatch: expected ${ctx.campaignId}`)
  }
  store.clearRecords(ctx.campaignId)
  store.clearGuidedStates(ctx.campaignId)
  for (const record of slice.records) {
    store.saveRecord(record)
  }
  for (const state of slice.guidedCreationStates) {
    store.saveGuidedState(state)
  }
  store.setActiveCharacterId(slice.activeCharacterId)
}

class SqliteOnboardingStore implements OnboardingStore {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly now: () => string
  ) {}

  saveRecord(record: OnboardingRecordWrite): OnboardingStoredRecord {
    const stored = withTimestamp(record, this.now)
    this.db.prepare(
      `INSERT INTO onboarding_records
       (character_id, campaign_id, character_name, phase, selections_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(character_id) DO UPDATE SET
         campaign_id = excluded.campaign_id,
         character_name = excluded.character_name,
         phase = excluded.phase,
         selections_json = excluded.selections_json,
         updated_at = excluded.updated_at`
    ).run(
      stored.characterId,
      stored.campaignId,
      stored.characterName,
      stored.phase,
      JSON.stringify(stored.selections),
      stored.updatedAt
    )
    return cloneRecord(stored)
  }

  loadRecord(characterId: string): OnboardingStoredRecord | undefined {
    const row = this.db
      .prepare(
        `SELECT campaign_id, character_id, character_name, phase, selections_json, updated_at
         FROM onboarding_records
         WHERE character_id = ?`
      )
      .get(characterId) as OnboardingRow | undefined
    return row === undefined ? undefined : toRecord(row)
  }

  listRecords(campaignId: string): OnboardingStoredRecord[] {
    const rows = this.db
      .prepare(
        `SELECT campaign_id, character_id, character_name, phase, selections_json, updated_at
         FROM onboarding_records
         WHERE campaign_id = ?
         ORDER BY updated_at, character_id`
      )
      .all(campaignId) as OnboardingRow[]
    return rows.map(toRecord)
  }

  deleteRecord(characterId: string): void {
    this.db.prepare('DELETE FROM onboarding_records WHERE character_id = ?').run(characterId)
  }

  clearRecords(campaignId?: string): void {
    runScopedDelete(this.db, 'onboarding_records', campaignId)
  }

  saveGuidedState(state: GuidedCreationState): GuidedCreationState {
    const stored = cloneGuidedCreationState(state)
    this.db.prepare(
      `INSERT INTO guided_creation_states (character_id, campaign_id, payload_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(character_id) DO UPDATE SET
         campaign_id = excluded.campaign_id,
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`
    ).run(stored.characterId, stored.campaignId, JSON.stringify(stored), this.now())
    return cloneGuidedCreationState(stored)
  }

  loadGuidedState(characterId: string): GuidedCreationState | undefined {
    return this.load(characterId)
  }

  listGuidedStates(campaignId: string): GuidedCreationState[] {
    return this.list(campaignId)
  }

  deleteGuidedState(characterId: string): void {
    this.delete(characterId)
  }

  clearGuidedStates(campaignId?: string): void {
    runScopedDelete(this.db, 'guided_creation_states', campaignId)
  }

  save(state: GuidedCreationState): GuidedCreationState {
    return this.saveGuidedState(state)
  }

  load(characterId: string): GuidedCreationState | undefined {
    const row = this.db
      .prepare('SELECT payload_json FROM guided_creation_states WHERE character_id = ?')
      .get(characterId) as GuidedRow | undefined
    return row === undefined ? undefined : parseGuided(row.payload_json)
  }

  list(campaignId?: string): GuidedCreationState[] {
    const rows = readGuidedRows(this.db, campaignId)
    return rows.map((row) => parseGuided(row.payload_json))
  }

  delete(characterId: string): void {
    this.db.prepare('DELETE FROM guided_creation_states WHERE character_id = ?').run(characterId)
  }

  clear(): void {
    this.clearGuidedStates()
  }

  getActiveCharacterId(): string | null {
    const row = this.db
      .prepare('SELECT value FROM campaign_meta WHERE key = ?')
      .get(ACTIVE_CHARACTER_META_KEY) as MetaRow | undefined
    return row?.value ?? null
  }

  setActiveCharacterId(characterId: string | null): void {
    if (characterId === null) {
      this.db.prepare('DELETE FROM campaign_meta WHERE key = ?').run(ACTIVE_CHARACTER_META_KEY)
      return
    }
    this.db.prepare(
      `INSERT INTO campaign_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`
    ).run(ACTIVE_CHARACTER_META_KEY, characterId, this.now())
  }
}

class MemoryOnboardingStore implements OnboardingStore {
  private readonly records = new Map<string, OnboardingStoredRecord>()
  private readonly guided = new Map<string, GuidedCreationState>()
  private activeCharacterId: string | null = null

  constructor(private readonly now: () => string) {}

  saveRecord(record: OnboardingRecordWrite): OnboardingStoredRecord {
    const stored = withTimestamp(record, this.now)
    this.records.set(record.characterId, cloneRecord(stored))
    return cloneRecord(stored)
  }

  loadRecord(characterId: string): OnboardingStoredRecord | undefined {
    const record = this.records.get(characterId)
    return record === undefined ? undefined : cloneRecord(record)
  }

  listRecords(campaignId: string): OnboardingStoredRecord[] {
    return [...this.records.values()]
      .filter((record) => record.campaignId === campaignId)
      .map(cloneRecord)
  }

  deleteRecord(characterId: string): void {
    this.records.delete(characterId)
  }

  clearRecords(campaignId?: string): void {
    deleteByCampaign(this.records, campaignId)
  }

  saveGuidedState(state: GuidedCreationState): GuidedCreationState {
    return this.save(state)
  }

  loadGuidedState(characterId: string): GuidedCreationState | undefined {
    return this.load(characterId)
  }

  listGuidedStates(campaignId: string): GuidedCreationState[] {
    return this.list(campaignId)
  }

  deleteGuidedState(characterId: string): void {
    this.delete(characterId)
  }

  clearGuidedStates(campaignId?: string): void {
    if (campaignId === undefined) {
      this.guided.clear()
      return
    }
    deleteByCampaign(this.guided, campaignId)
  }

  save(state: GuidedCreationState): GuidedCreationState {
    const stored = cloneGuidedCreationState(state)
    this.guided.set(stored.characterId, stored)
    return cloneGuidedCreationState(stored)
  }

  load(characterId: string): GuidedCreationState | undefined {
    const state = this.guided.get(characterId)
    return state === undefined ? undefined : cloneGuidedCreationState(state)
  }

  list(campaignId?: string): GuidedCreationState[] {
    return [...this.guided.values()]
      .filter((state) => campaignId === undefined || state.campaignId === campaignId)
      .map(cloneGuidedCreationState)
  }

  delete(characterId: string): void {
    this.guided.delete(characterId)
  }

  clear(): void {
    this.guided.clear()
  }

  getActiveCharacterId(): string | null {
    return this.activeCharacterId
  }

  setActiveCharacterId(characterId: string | null): void {
    this.activeCharacterId = characterId
  }
}

function withTimestamp(record: OnboardingRecordWrite, now: () => string): OnboardingStoredRecord {
  return {
    campaignId: record.campaignId,
    characterId: record.characterId,
    characterName: record.characterName,
    phase: record.phase,
    selections: cloneJson(record.selections),
    updatedAt: record.updatedAt ?? now()
  }
}

function toRecord(row: OnboardingRow): OnboardingStoredRecord {
  return {
    campaignId: row.campaign_id,
    characterId: row.character_id,
    characterName: row.character_name,
    phase: row.phase,
    selections: parseJson(row.selections_json),
    updatedAt: row.updated_at
  }
}

function cloneRecord(record: OnboardingStoredRecord): OnboardingStoredRecord {
  return {
    ...record,
    selections: cloneJson(record.selections)
  }
}

function parseGuided(payload: string): GuidedCreationState {
  return cloneGuidedCreationState(JSON.parse(payload) as GuidedCreationState)
}

function parseJson(payload: string): unknown {
  return JSON.parse(payload) as unknown
}

function cloneJson(value: unknown): unknown {
  if (value === undefined) return null
  return JSON.parse(JSON.stringify(value)) as unknown
}

function readGuidedRows(db: SqliteDatabase, campaignId?: string): GuidedRow[] {
  if (campaignId === undefined) {
    return db
      .prepare('SELECT payload_json FROM guided_creation_states ORDER BY updated_at, character_id')
      .all() as GuidedRow[]
  }
  return db
    .prepare(
      `SELECT payload_json FROM guided_creation_states
       WHERE campaign_id = ?
       ORDER BY updated_at, character_id`
    )
    .all(campaignId) as GuidedRow[]
}

function runScopedDelete(db: SqliteDatabase, table: string, campaignId?: string): void {
  if (campaignId === undefined) {
    db.prepare(`DELETE FROM ${table}`).run()
    return
  }
  db.prepare(`DELETE FROM ${table} WHERE campaign_id = ?`).run(campaignId)
}

function deleteByCampaign<T extends { campaignId: string }>(
  values: Map<string, T>,
  campaignId?: string
): void {
  if (campaignId === undefined) {
    values.clear()
    return
  }
  for (const [key, value] of values.entries()) {
    if (value.campaignId === campaignId) values.delete(key)
  }
}

function isoNow(): string {
  return new Date().toISOString()
}

function getDefaultOnboardingStore(): OnboardingStore {
  defaultOnboardingStore ??= createMemoryOnboardingStore()
  return defaultOnboardingStore
}
