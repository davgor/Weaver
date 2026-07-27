import { bindEnemyCampaignStore } from '@weaver/enemy-engine'
import { bindNarrationCampaignStore } from '@weaver/narration-engine'
import { bindQuestCampaignStore } from '@weaver/quest-engine'
import type { SqliteDatabase } from '../migrationRunner.js'
import { createSqliteEnemyCampaignStore } from './sqliteEnemyCampaignStore.js'
import { createSqliteNarrationProjectionStore } from './sqliteNarrationProjectionStore.js'
import { createSqliteQuestCampaignStore } from './sqliteQuestCampaignStore.js'

type MetaRow = { value: string }

export function bindEnemyQuestNarrationStores(db: SqliteDatabase): void {
  const campaignId = readCampaignId(db)
  bindEnemyCampaignStore(createSqliteEnemyCampaignStore(db))
  bindQuestCampaignStore(createSqliteQuestCampaignStore(db))
  bindNarrationCampaignStore(campaignId, createSqliteNarrationProjectionStore(db, { campaignId }))
}

function readCampaignId(db: SqliteDatabase): string {
  const row = db.prepare("SELECT value FROM campaign_meta WHERE key = 'campaign_id'").get()
  if (isMetaRow(row)) {
    return row.value
  }
  throw new Error('Campaign id meta row is missing; cannot bind campaign stores')
}

function isMetaRow(value: unknown): value is MetaRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string'
  )
}
