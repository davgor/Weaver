import { bindNpcCampaignStore } from '@weaver/npc-engine'
import type { SqliteDatabase } from '../migrationRunner.js'
import { createSqliteNpcCampaignStore } from './sqliteNpcStore.js'

export function bindNpcCampaignStores(db: SqliteDatabase): void {
  bindNpcCampaignStore(createSqliteNpcCampaignStore(db))
}
