import {
  bindCharacterFactStore,
  isCharacterCampaignStoreBound,
  unbindCharacterFactStore
} from '@weaver/character-engine'
import {
  bindItemCampaignStores,
  isItemCampaignStoreBound,
  unbindItemCampaignStores
} from '@weaver/item-engine'
import { isNpcCampaignStoreBound, unbindNpcCampaignStore } from '@weaver/npc-engine'
import { isEnemyCampaignStoreBound, unbindEnemyCampaignStore } from '@weaver/enemy-engine'
import {
  isNarrationCampaignStoreBound,
  unbindNarrationCampaignStore
} from '@weaver/narration-engine'
import { isQuestCampaignStoreBound, unbindQuestCampaignStore } from '@weaver/quest-engine'
import {
  createCampaign,
  openCampaign,
  type CampaignHandle,
  type CampaignOpenOptions
} from './campaignPersistence.js'
import { readCampaignMeta, upsertCampaignMeta } from './campaignMeta.js'
import type { SqliteDatabase } from './migrationRunner.js'
import { createSqliteCharacterFactStore } from './repositories/sqliteCharacterFactStore.js'
import {
  createSqliteCurrencyService,
  createSqliteItemService
} from './repositories/sqliteItemStore.js'
import { bindNpcCampaignStores } from './repositories/bindNpcStores.js'
import { bindEnemyQuestNarrationStores } from './repositories/bindEnemyQuestNarrationStores.js'

export type CampaignSession = Omit<CampaignHandle, 'getDb'> & {
  isStoreBound: () => boolean
  /** Write a campaign_meta key on the open session without a second SQLite connection. */
  upsertMeta: (key: string, value: string) => void
  /** Read a campaign_meta key on the open session without a second SQLite connection. */
  readMeta: (key: string) => string | undefined
}

type InternalHandle = CampaignHandle & {
  getDb: () => SqliteDatabase
}

let activeSession: CampaignSession | null = null

export function createCampaignSession(options: CampaignOpenOptions): CampaignSession {
  assertNoActiveSession()
  const handle = createCampaign(options) as InternalHandle
  return bindSession(handle)
}

export function openCampaignSession(options: CampaignOpenOptions): CampaignSession {
  assertNoActiveSession()
  const handle = openCampaign(options) as InternalHandle
  return bindSession(handle)
}

export function getActiveCampaignSession(): CampaignSession | null {
  return activeSession
}

export function assertCampaignStoresBound(): void {
  if (activeSession === null || !activeSession.isStoreBound()) {
    throw new Error('Campaign stores are not bound; open a campaign session first')
  }
}

function bindSession(handle: InternalHandle): CampaignSession {
  const db = handle.getDb()
  bindCharacterFactStore(createSqliteCharacterFactStore(db))
  bindItemCampaignStores({
    itemService: createSqliteItemService(db),
    currencyService: createSqliteCurrencyService(db)
  })
  // NPC campaign store binding (106.3): durable NPC facts, memories, factions, opinions, locations.
  bindNpcCampaignStores(db)
  bindEnemyQuestNarrationStores(db)
  const session: CampaignSession = {
    campaignId: handle.campaignId,
    filePath: handle.filePath,
    schemaVersion: handle.schemaVersion,
    appliedMigrations: handle.appliedMigrations,
    isStoreBound: allCampaignStoresBound,
    upsertMeta(key: string, value: string) {
      upsertCampaignMeta(handle, key, value)
    },
    readMeta(key: string) {
      return readCampaignMeta(handle, key)
    },
    close() {
      unbindAllStores()
      handle.close()
      if (activeSession === session) {
        activeSession = null
      }
    }
  }
  activeSession = session
  return session
}

function unbindAllStores(): void {
  unbindCharacterFactStore()
  unbindItemCampaignStores()
  unbindNpcCampaignStore()
  unbindEnemyCampaignStore()
  unbindQuestCampaignStore()
  unbindNarrationCampaignStore()
}

function allCampaignStoresBound(): boolean {
  return (
    isCharacterCampaignStoreBound() &&
    isItemCampaignStoreBound() &&
    isNpcCampaignStoreBound() &&
    isEnemyCampaignStoreBound() &&
    isQuestCampaignStoreBound() &&
    isNarrationCampaignStoreBound()
  )
}

function assertNoActiveSession(): void {
  if (activeSession !== null) {
    throw new Error('A campaign session is already open; close it before opening another')
  }
}
