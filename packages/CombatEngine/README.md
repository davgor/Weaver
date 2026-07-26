# CombatEngine (`@weaver/combat-engine`)

Deterministic combat rules and resolution for Weaver campaigns.

## Role

Owns turn order, hit/damage resolution, combatant state, and related combat facts. Peer packages (DMEngine, NarrationEngine, Electron shells) consume this API; they must not invent combat outcomes. **Usable abilities** (spells and class actions) and their **effects/ranges** are owned by ActionEngine (board `082`–`084`); this package supplies turn/Action slots and consumes use/lockout results.

## Boundaries

- **LLM-free** — no model calls, no story invention
- **No Electron** — library only; UI shells call through published exports
- Consumers that call this package need `*.contract.test.ts` against the real API

## Status

Encounter lifecycle implemented for epic [048](../../board/in-progress/048-CombatEngine-Encounter-Lifecycle.md): durable encounter start/query, initiative (`d20 + Agility modifier`), and one Action + Movement per turn. Remaining hit/damage and resolution design lives in epics [049](../../board/backlog/049-CombatEngine-Hit-Damage-Crit-Conditions.md)–[051](../../board/backlog/051-CombatEngine-Dynamic-Start-And-Triggers.md).

## Public API

```ts
import {
  combatEngine,
  createJsonEncounterStore,
  startEncounter,
  submitCombatAction
} from '@weaver/combat-engine'

combatEngine.health()
combatEngine.listEndpoints()
await combatEngine.call('health')

const store = createJsonEncounterStore({ dataRoot: '/path/to/campaign-data' })
const encounter = startEncounter({
  encounterId: 'encounter-1',
  combatants: [
    {
      id: 'hero-1',
      kind: 'character',
      abilityScores: { Body: 10, Agility: 14, Mind: 10, Presence: 10 }
    }
  ],
  store
})

submitCombatAction({
  encounterId: encounter.encounterId,
  combatantId: encounter.currentTurn.combatantId,
  action: { type: 'typed-action', action: 'Strike the goblin with my sword' },
  store
})
```

| Export | Notes |
|--------|--------|
| `combatEngine` | Singleton `CombatEngineApi` |
| `startEncounter` / `getEncounter` / `endTurn` | Durable encounter lifecycle |
| `submitCombatAction` / `submitMovement` | One typed free-text Action and one Movement per turn |
| `createJsonEncounterStore` | JSON file store under `dataRoot/combat/encounters` |
| `hydrateCombatantFromNpcId` / `hydrateCombatantFromNpcRecord` / `hydrateCombatantFromFoeRef` | Adapters for published NPCEngine and EnemyEngine combat data |
| `CombatEngineApi` / `EngineEndpoint` and encounter types | Types |

## Planned direction (from epics 048–051)

| Epic | Intent |
|------|--------|
| [048](../../board/backlog/048-CombatEngine-Encounter-Lifecycle.md) | Encounter lifecycle: initiative (`d20 + Agility`), Action + Movement turns |
| [049](../../board/backlog/049-CombatEngine-Hit-Damage-Crit-Conditions.md) | Hit/damage/crit resolution, condition application |
| [050](../../board/backlog/050-CombatEngine-Flee-Surrender-Nonlethal.md) | Flee, surrender, non-lethal victory, execute |
| [051](../../board/backlog/051-CombatEngine-Dynamic-Start-And-Triggers.md) | Dynamic combat start without a pre-placed hostile |
| [084](../../board/backlog/084-ActionEngine-Use-Resolution-And-Lockout.md) *(peer)* | ActionEngine use/lockout — Combat does not own ability definitions |

## Scripts

From repo root (preferred):

```bash
npm test -- packages/CombatEngine
npm run build:engines
```

Package-local: `npm run build` / `npm run typecheck` inside this folder after workspace install.
