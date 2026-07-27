# CombatEngine (`@weaver/combat-engine`)

Deterministic combat rules and resolution for Weaver campaigns.

## Role

Owns turn order, hit/damage resolution, combatant state, and related combat facts. Peer packages (DMEngine, NarrationEngine, Electron shells) consume this API; they must not invent combat outcomes. **Usable abilities** (spells and class actions) and their **effects/ranges** are owned by ActionEngine (board `082`–`084`); this package supplies turn/Action slots and consumes use/lockout results.

## Boundaries

- **LLM-free** — no model calls, no story invention
- **No Electron** — library only; UI shells call through published exports
- Consumers that call this package need `*.contract.test.ts` against the real API
- Engine-local stores own encounter snapshots only; production campaign-wide
  persistence belongs to the DMEngine campaign-store path in
  [106](../../board/done/106-DMEngine-Production-Campaign-Stores.md)

## Status

Encounter lifecycle ([048](../../board/done/048-CombatEngine-Encounter-Lifecycle.md)), hit/damage/crit/conditions ([049](../../board/done/049-CombatEngine-Hit-Damage-Crit-Conditions.md)), flee/surrender/non-lethal/execute ([050](../../board/done/050-CombatEngine-Flee-Surrender-Nonlethal.md)), and ad-hoc dynamic start ([051](../../board/done/051-CombatEngine-Dynamic-Start-And-Triggers.md)) are implemented. ActionEngine use/lockout integration is tracked by peer epic [084](../../board/done/084-ActionEngine-Use-Resolution-And-Lockout.md); CombatEngine does not own ability definitions.

## Public API

```ts
import {
  combatEngine,
  createJsonEncounterStore,
  startEncounter,
  startAdHocEncounter,
  attemptFlee,
  resolveNonLethalVictory,
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

const ambush = startAdHocEncounter({
  encounterId: 'ambush-1',
  knownCombatants: [],
  foeGeneration: { difficulty: 'easy', count: 1 },
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
| `startEncounter` / `startAdHocEncounter` | Pre-authored vs ambush/ad-hoc start (`startMode`) |
| `getEncounter` / `endTurn` | Durable encounter lifecycle |
| `submitCombatAction` / `submitMovement` | One typed free-text Action and one Movement per turn |
| `attemptFlee` / `evaluateSurrender` / `applySurrender` | Flee and surrender resolution |
| `resolveNonLethalVictory` / `executeHelplessCombatant` | Non-lethal down vs deliberate execute; loot via ItemEngine |
| `createJsonEncounterStore` / `createMemoryEncounterStore` | Durable / in-memory stores |
| `hydrateCombatantFromNpcId` / `hydrateCombatantFromNpcRecord` / `hydrateCombatantFromFoeRef` | Adapters for published NPCEngine and EnemyEngine combat data |
| `CombatEngineApi` / `EngineEndpoint` and encounter types | Types |

## Planned direction (from epics 048–051)

| Epic | Intent |
|------|--------|
| [048](../../board/done/048-CombatEngine-Encounter-Lifecycle.md) | Encounter lifecycle: initiative (`d20 + Agility`), Action + Movement turns |
| [049](../../board/done/049-CombatEngine-Hit-Damage-Crit-Conditions.md) | Hit/damage/crit resolution, condition application |
| [050](../../board/done/050-CombatEngine-Flee-Surrender-Nonlethal.md) | Flee, surrender, non-lethal victory, execute |
| [051](../../board/done/051-CombatEngine-Dynamic-Start-And-Triggers.md) | Dynamic combat start without a pre-placed hostile |
| [084](../../board/done/084-ActionEngine-Use-Resolution-And-Lockout.md) *(peer)* | ActionEngine use/lockout — Combat does not own ability definitions |

## Scripts

From repo root (preferred):

```bash
npm test -- packages/CombatEngine
npm run build:engines
```

Package-local: `npm run build` / `npm run typecheck` inside this folder after workspace install.
