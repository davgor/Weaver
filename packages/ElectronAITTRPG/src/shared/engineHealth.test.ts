import { describe, expect, it } from 'vitest'
import { summarizeEngineHealth } from './engineHealth.js'

describe('summarizeEngineHealth', () => {
  it('reports ready when every engine id is present', () => {
    const summary = summarizeEngineHealth([
      { id: 'CombatEngine' },
      { id: 'WorldEngine' },
      { id: 'RegionalEngine' },
      { id: 'CivilizationEngine' },
      { id: 'DungeonEngine' },
      { id: 'NarrationEngine' },
      { id: 'ItemEngine' },
      { id: 'NPCEngine' },
      { id: 'EnemyEngine' },
      { id: 'DMEngine' },
      { id: 'LLMEngine' }
    ])
    expect(summary.ready).toBe(true)
    expect(summary.missing).toEqual([])
    expect(summary.label).toBe('Weaver engines ready')
  })

  it('lists missing engine ids when the catalog is incomplete', () => {
    const summary = summarizeEngineHealth([{ id: 'CombatEngine' }, { id: 'WorldEngine' }])
    expect(summary.ready).toBe(false)
    expect(summary.missing).toEqual([
      'RegionalEngine',
      'CivilizationEngine',
      'DungeonEngine',
      'NarrationEngine',
      'ItemEngine',
      'NPCEngine',
      'EnemyEngine',
      'DMEngine',
      'LLMEngine'
    ])
    expect(summary.label).toContain('missing')
  })
})
