import { combatEngine } from '@weaver/combat-engine'
import { actionEngine } from '@weaver/action-engine'
import { characterEngine } from '@weaver/character-engine'
import { worldEngine } from '@weaver/world-engine'
import { regionalEngine } from '@weaver/regional-engine'
import { civilizationEngine } from '@weaver/civilization-engine'
import { dungeonEngine } from '@weaver/dungeon-engine'
import { weatherEngine } from '@weaver/weather-engine'
import { narrationEngine } from '@weaver/narration-engine'
import { itemEngine } from '@weaver/item-engine'
import { npcEngine } from '@weaver/npc-engine'
import { enemyEngine } from '@weaver/enemy-engine'
import { questEngine } from '@weaver/quest-engine'
import { dmEngine } from '@weaver/dm-engine'
import { llmEngine } from '@weaver/llm-engine'
import { summarizeEngineHealth } from '../shared/engineHealth.js'
import type { StartupBootSnapshot } from '../shared/gameApi.js'

const engines = [
  combatEngine,
  actionEngine,
  characterEngine,
  worldEngine,
  regionalEngine,
  civilizationEngine,
  dungeonEngine,
  weatherEngine,
  narrationEngine,
  itemEngine,
  npcEngine,
  enemyEngine,
  questEngine,
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
