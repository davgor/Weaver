import {
  itemEngine,
  unbindItemCampaignStores
} from '@weaver/item-engine'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createCampaignSession,
  openCampaignSession,
  type CampaignSession
} from '../campaignSession.js'

describe('item campaign store contract', () => {
  afterEach(() => {
    unbindItemCampaignStores()
  })

  it('round-trips item and currency facts through SQLite reopen', () => {
    withCampaignPath((filePath) => {
      let active: CampaignSession | undefined
      try {
        active = createCampaignSession({ campaignId: 'item-camp', filePath })
        expect(active.isStoreBound()).toBe(true)
        const instanceId = seedItemFacts()
        const beforeInventory = itemEngine.listInventory('pc-1')
        const beforeBalance = itemEngine.getBalance('pc-1')
        active.close()
        active = undefined

        unbindItemCampaignStores()
        expect(() => itemEngine.listInventory('pc-1')).toThrow(/Inventory not found/)

        active = openCampaignSession({ campaignId: 'item-camp', filePath })
        expect(itemEngine.listInventory('pc-1')).toEqual(beforeInventory)
        expect(itemEngine.getBalance('pc-1')).toBe(beforeBalance)

        itemEngine.transferItem('pc-1', 'pc-2', instanceId)
        expect(itemEngine.listInventory('pc-1').equipped.mainHand).toBeUndefined()
        expect(itemEngine.listInventory('pc-2').held.map((item) => item.instance.id)).toEqual([instanceId])
        expect(() => itemEngine.transferItem('pc-1', 'pc-2', instanceId)).toThrow(/not owned/i)
        active.close()
      } finally {
        active?.close()
      }
    })
  })
})

function seedItemFacts(): string {
  itemEngine.defineTemplate({
    id: 'template.contract-sword',
    name: 'Contract Sword',
    equipmentSlots: ['mainHand'],
    tags: ['weapon']
  })
  itemEngine.createInventory('pc-1')
  itemEngine.createInventory('pc-2')
  const item = itemEngine.addItem('pc-1', 'template.contract-sword', {
    durability: 6,
    customName: 'Oath'
  })
  itemEngine.equip('pc-1', item.id, 'mainHand')
  itemEngine.credit('pc-1', 33)
  return item.id
}

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-item-store-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
