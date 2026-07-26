import { combatEngine } from '@weaver/combat-engine'
import { worldEngine } from '@weaver/world-engine'
import { regionalEngine } from '@weaver/regional-engine'
import { civilizationEngine } from '@weaver/civilization-engine'
import { dungeonEngine } from '@weaver/dungeon-engine'
import { narrationEngine } from '@weaver/narration-engine'
import { itemEngine } from '@weaver/item-engine'
import { npcEngine } from '@weaver/npc-engine'
import { enemyEngine } from '@weaver/enemy-engine'
import { dmEngine } from '@weaver/dm-engine'
import { llmEngine } from '@weaver/llm-engine'
import { summarizeEngineHealth } from '../shared/engineHealth.js'
import type { StartupBootSnapshot } from '../shared/gameApi.js'

const engines = [
  combatEngine,
  worldEngine,
  regionalEngine,
  civilizationEngine,
  dungeonEngine,
  narrationEngine,
  itemEngine,
  npcEngine,
  enemyEngine,
  dmEngine,
  llmEngine
] as const

export function buildStartupBoot(): StartupBootSnapshot {
  const health = summarizeEngineHealth(engines.map((engine) => ({ id: engine.id })))
  if (!health.ready) {
    return {
      phase: 'failed',
      progress: 100,
      stageLabel: 'Startup Interrupted',
      statusText: health.label,
      engineLabel: health.label,
      failureMessage: health.label
    }
  }
  return {
    phase: 'ready',
    progress: 100,
    stageLabel: 'Ready',
    statusText: health.label,
    engineLabel: health.label,
    failureMessage: null
  }
}
