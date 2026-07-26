import { describe, expect, it } from 'vitest'
import { EQUIPMENT_SLOTS, itemEngine } from './index.js'

const EXPECTED_ENDPOINTS = [
  'health',
  'defineTemplate',
  'getTemplate',
  'createInventory',
  'addItem',
  'listInventory',
  'getEquipped',
  'equip',
  'unequip'
]

function requireInstanceId(result: unknown): string {
  if (!result || typeof result !== 'object' || !('id' in result)) {
    throw new Error('addItem endpoint did not return an instance')
  }
  const { id } = result
  if (typeof id !== 'string') throw new Error('addItem endpoint returned an invalid instance id')
  return id
}

describe('@weaver/item-engine health and endpoint catalog', () => {
  it('reports healthy', () => {
    const health = itemEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/item-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = itemEngine.listEndpoints()
    const names = endpoints.map((e) => e.name)
    expect(endpoints.length).toBeGreaterThan(0)
    expect(names).toEqual(expect.arrayContaining(EXPECTED_ENDPOINTS))
  })

  it('invokes the health endpoint', async () => {
    const result = await itemEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/item-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await itemEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/item-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(itemEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})

describe('@weaver/item-engine typed singleton API', () => {
  it('exposes typed item methods on the singleton', () => {
    const characterId = 'character.singleton.typed'
    const templateId = 'template.singleton.typed'

    itemEngine.defineTemplate({
      id: templateId,
      name: 'Typed Test Spear',
      equipmentSlots: ['mainHand']
    })
    itemEngine.createInventory(characterId)
    const instance = itemEngine.addItem(characterId, templateId, { durability: 6 })
    itemEngine.equip(characterId, instance.id, 'mainHand')

    expect(EQUIPMENT_SLOTS).toContain('mainHand')
    expect(itemEngine.getTemplate(templateId).name).toBe('Typed Test Spear')
    expect(itemEngine.getEquipped(characterId).mainHand?.instance.durability).toBe(6)
  })
})

describe('@weaver/item-engine admin endpoints', () => {
  it('invokes inventory endpoints for admin callers', async () => {
    const characterId = 'character.singleton.endpoint'
    const templateId = 'template.singleton.endpoint'

    await itemEngine.call('defineTemplate', {
      id: templateId,
      name: 'Endpoint Test Shield',
      equipmentSlots: ['shield']
    })
    await itemEngine.call('createInventory', { characterId })
    const instance = await itemEngine.call('addItem', {
      characterId,
      templateId,
      instanceState: { customName: 'The Door' }
    })
    await itemEngine.call('equip', { characterId, instanceId: requireInstanceId(instance), slot: 'shield' })
    const equipped = await itemEngine.call('getEquipped', { characterId })

    expect(equipped).toMatchObject({
      shield: {
        template: { name: 'Endpoint Test Shield' },
        instance: { customName: 'The Door' }
      }
    })
  })
})
