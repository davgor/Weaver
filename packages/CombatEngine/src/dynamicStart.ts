import {
  generateEncounterFoes as defaultGenerateEncounterFoes,
  hydrateCombatantFromFoe,
  type GeneratedFoeRef
} from '@weaver/enemy-engine'
import { persistStartedEncounter } from './encounter.js'
import { hydrateCombatantFromEnemySnapshot } from './hydration.js'
import type {
  EncounterCombatantInput,
  EncounterState,
  StartAdHocEncounterDeps,
  StartAdHocEncounterInput
} from './types.js'

export function startAdHocEncounter(
  input: StartAdHocEncounterInput,
  deps: StartAdHocEncounterDeps = {}
): EncounterState {
  const known = input.knownCombatants ?? []
  const generate = deps.generateEncounterFoes ?? defaultGenerateEncounterFoes
  const foeRefs = generate(input.foeGeneration ?? { difficulty: 'easy', count: 1 })
  const foes = foeRefs.map((foe) => resolveFoeCombatant(foe, deps))
  return persistStartedEncounter(
    {
      encounterId: input.encounterId,
      combatants: [...known, ...foes],
      ...(input.dataRoot === undefined ? {} : { dataRoot: input.dataRoot }),
      ...(input.store === undefined ? {} : { store: input.store })
    },
    'ad-hoc',
    deps.roller ?? rollD20
  )
}

function resolveFoeCombatant(
  foe: GeneratedFoeRef,
  deps: StartAdHocEncounterDeps
): EncounterCombatantInput {
  if (deps.hydrateFoe !== undefined) {
    const hydrated = deps.hydrateFoe(foe)
    if (hydrated instanceof Promise) {
      throw new Error('startAdHocEncounter requires a synchronous hydrateFoe')
    }
    return hydrated
  }
  return hydrateCombatantFromEnemySnapshot(hydrateCombatantFromFoe(foe))
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}
