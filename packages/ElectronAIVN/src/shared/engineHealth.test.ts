import { describe, expect, it } from 'vitest'
import { summarizeEngineHealth } from './engineHealth.js'

const ALL_ENGINE_IDS = [
  'CombatEngine',
  'ActionEngine',
  'CharacterEngine',
  'WorldEngine',
  'RegionalEngine',
  'CivilizationEngine',
  'DungeonEngine',
  'WeatherEngine',
  'NarrationEngine',
  'ItemEngine',
  'NPCEngine',
  'EnemyEngine',
  'QuestEngine',
  'DMEngine',
  'LLMEngine'
] as const

describe('summarizeEngineHealth', () => {
  it('reports ready when every engine id is present', () => {
    const summary = summarizeEngineHealth(ALL_ENGINE_IDS.map((id) => ({ id })))
    expect(summary.ready).toBe(true)
    expect(summary.missing).toEqual([])
    expect(summary.label).toBe('Weaver engines ready')
  })

  it('lists missing engine ids when the catalog is incomplete', () => {
    const summary = summarizeEngineHealth([{ id: 'CombatEngine' }, { id: 'WorldEngine' }])
    expect(summary.ready).toBe(false)
    expect(summary.missing).toEqual([
      'ActionEngine',
      'CharacterEngine',
      'RegionalEngine',
      'CivilizationEngine',
      'DungeonEngine',
      'WeatherEngine',
      'NarrationEngine',
      'ItemEngine',
      'NPCEngine',
      'EnemyEngine',
      'QuestEngine',
      'DMEngine',
      'LLMEngine'
    ])
    expect(summary.label).toContain('missing')
  })
})
