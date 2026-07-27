const REQUIRED_ENGINE_IDS = [
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

type EngineIdRef = { id: string }

export type EngineHealthSummary = {
  ready: boolean
  missing: string[]
  label: string
}

export function summarizeEngineHealth(engines: EngineIdRef[]): EngineHealthSummary {
  const present = new Set(engines.map((engine) => engine.id))
  const missing = REQUIRED_ENGINE_IDS.filter((id) => !present.has(id))
  if (missing.length === 0) {
    return { ready: true, missing: [], label: 'Weaver engines ready' }
  }
  return {
    ready: false,
    missing: [...missing],
    label: `Weaver engines missing: ${missing.join(', ')}`
  }
}
