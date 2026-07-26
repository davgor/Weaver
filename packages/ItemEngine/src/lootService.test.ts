import { describe, expect, it } from 'vitest'
import { createItemService } from './itemService.js'
import { DEFAULT_LOOT_TABLE_ID, generateLoot } from './lootService.js'
import { seedItemTemplateCatalog } from './templateCatalog.js'

describe('loot generation', () => {
  it('generates deterministic drops for the same seed and request', () => {
    const request = { difficulty: 'standard', seed: 'encounter.17', tableId: DEFAULT_LOOT_TABLE_ID } as const

    expect(generateLoot(request)).toEqual(generateLoot(request))
  })

  it('changes deterministic rolls when the seed changes', () => {
    const first = generateLoot({ difficulty: 'standard', seed: 'encounter.17' })
    const second = generateLoot({ difficulty: 'standard', seed: 'encounter.18' })

    expect(second).not.toEqual(first)
  })

  it('returns template ids and quantities that resolve against the seeded catalog', () => {
    const service = createItemService()
    seedItemTemplateCatalog(service)

    const drops = generateLoot({ tag: 'consumable', seed: 'quest.cache' })

    expect(drops.length).toBeGreaterThan(0)
    for (const drop of drops) {
      expect(drop.quantity).toBeGreaterThan(0)
      expect(service.getTemplate(drop.templateId).id).toBe(drop.templateId)
    }
  })
})
