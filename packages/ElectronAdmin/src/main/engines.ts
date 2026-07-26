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
import type { DispatchableEngine } from './engineDispatch.js'

/** Registered engine packages for the Admin catalog and IPC dispatch. */
export const adminEngines: readonly DispatchableEngine[] = [
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
]
