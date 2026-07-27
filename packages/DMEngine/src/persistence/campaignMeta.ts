import type { CampaignHandle } from './campaignPersistence.js'

export type CampaignMetaWriter = Pick<CampaignHandle, 'getDb'>

export type CatalogEntryRow = {
  catalog: string
  id: string
  version: number
  payloadJson: string
}

export function upsertCampaignMeta(
  handle: CampaignMetaWriter,
  key: string,
  value: string,
  updatedAt?: string
): void {
  const stamp = updatedAt ?? new Date().toISOString()
  handle.getDb().prepare(
    `INSERT INTO campaign_meta (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`
  ).run(key, value, stamp)
}

export function readCampaignMeta(
  handle: CampaignMetaWriter,
  key: string
): string | undefined {
  const row = handle.getDb()
    .prepare('SELECT value FROM campaign_meta WHERE key = ?')
    .get(key)
  return isMetaRow(row) ? row.value : undefined
}

export function readCatalogEntry(
  handle: CampaignMetaWriter,
  catalog: string,
  id: string
): CatalogEntryRow | undefined {
  const row = handle.getDb()
    .prepare(
      `SELECT catalog, id, version, payload_json AS payloadJson
       FROM campaign_catalog_entries
       WHERE catalog = ? AND id = ?`
    )
    .get(catalog, id)
  return isCatalogRow(row) ? row : undefined
}

function isMetaRow(value: unknown): value is { value: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof (value as { value: unknown }).value === 'string'
  )
}

function isCatalogRow(value: unknown): value is CatalogEntryRow {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.catalog === 'string' &&
    typeof row.id === 'string' &&
    typeof row.version === 'number' &&
    typeof row.payloadJson === 'string'
  )
}
