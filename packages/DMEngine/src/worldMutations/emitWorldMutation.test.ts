import { describe, expect, it } from 'vitest'
import { emitWorldMutation } from './emitWorldMutation.js'
import type { WorldMutationDeps } from './types.js'

describe('emitWorldMutation', () => {
  it('routes typed mutations to the owning engine API', () => {
    const calls: string[] = []
    const deps: WorldMutationDeps = {
      regional: {
        applyRegionMutation: (worldId, regionId, mutation) => {
          calls.push(`${worldId}:${regionId}:${mutation.kind}`)
          return { target: 'region', worldId, regionId, mutation }
        }
      },
      civilization: {
        applySettlementMutation: (worldId, civilizationId, mutation) => {
          calls.push(`${worldId}:${civilizationId}:${mutation.kind}`)
          return { target: 'settlement', worldId, civilizationId, mutation }
        }
      },
      npc: {
        applyNpcWorldMutation: (npcId, mutation) => {
          calls.push(`${npcId}:${mutation.kind}`)
          return { target: 'npc', npcId, mutation }
        }
      }
    }

    const result = emitWorldMutation({
      target: 'settlement',
      worldId: 'world-1',
      civilizationId: 'civ-1',
      mutation: { kind: 'burned' }
    }, deps)

    expect(result).toMatchObject({ target: 'settlement', civilizationId: 'civ-1' })
    expect(calls).toEqual(['world-1:civ-1:burned'])
  })
})
