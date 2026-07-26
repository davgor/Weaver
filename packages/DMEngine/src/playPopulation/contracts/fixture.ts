import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import {
  civilizationEngine,
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders
} from '@weaver/civilization-engine'
import { clearNpcStore, constructNpc } from '@weaver/npc-engine'
import { regionalEngine } from '@weaver/regional-engine'
import { worldEngine } from '@weaver/world-engine'
import type { LivePopulationDeps } from '../types.js'

const roots: string[] = []

export function cleanupLivePopulationRoots(): void {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
  clearNpcStore()
  clearNpcPlaceholderStore()
}

export function bootLiveWorld(campaignId: string) {
  const root = mkdtempSync(join(tmpdir(), 'dm-live-pop-contract-'))
  roots.push(root)
  const dataRoot = join(root, 'data')
  const worldId = `world-${campaignId}`
  worldEngine.createWorld(dataRoot, {
    worldId,
    seed: 37,
    bounds: { minX: 0, minY: 0, maxX: 7, maxY: 7 }
  })
  setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])
  return { dataRoot, worldId }
}

export function realLivePopulationDeps(): LivePopulationDeps {
  return {
    world: worldEngine,
    regional: regionalEngine,
    civilization: {
      fillCivilizations: civilizationEngine.fillCivilizations,
      listCivilizationsInRegion: civilizationEngine.listCivilizationsInRegion,
      ensureNpcPlaceholders
    },
    npc: { constructNpc }
  }
}
