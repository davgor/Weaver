# CombatEngine (`@weaver/combat-engine`)

Deterministic combat rules and resolution for Weaver campaigns.

## Role

Owns turn order, hit/damage resolution, combatant state, and related combat facts. Peer packages (DMEngine, NarrationEngine, Electron shells) consume this API; they must not invent combat outcomes.

## Boundaries

- **LLM-free** — no model calls, no story invention
- **No Electron** — library only; UI shells call through published exports
- Consumers that call this package need `*.contract.test.ts` against the real API

## Status

Scaffold. Exposes the shared admin/health endpoint surface (`health`, `listEndpoints`, `call`). Full design lives in epics [048](../../board/backlog/048-CombatEngine-Encounter-Lifecycle.md)–[051](../../board/backlog/051-CombatEngine-Dynamic-Start-And-Triggers.md).

## Public API (today)

```ts
import { combatEngine } from '@weaver/combat-engine'

combatEngine.health()
combatEngine.listEndpoints()
await combatEngine.call('health')
```

| Export | Notes |
|--------|--------|
| `combatEngine` | Singleton `CombatEngineApi` |
| `CombatEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epics 048–051)

| Epic | Intent |
|------|--------|
| [048](../../board/backlog/048-CombatEngine-Encounter-Lifecycle.md) | Encounter lifecycle: initiative (`d20 + Agility`), Action + Movement turns |
| [049](../../board/backlog/049-CombatEngine-Hit-Damage-Crit-Conditions.md) | Hit/damage/crit resolution, condition application |
| [050](../../board/backlog/050-CombatEngine-Flee-Surrender-Nonlethal.md) | Flee, surrender, non-lethal victory, execute |
| [051](../../board/backlog/051-CombatEngine-Dynamic-Start-And-Triggers.md) | Dynamic combat start without a pre-placed hostile |

## Scripts

From repo root (preferred):

```bash
npm test -- packages/CombatEngine
npm run build:engines
```

Package-local: `npm run build` / `npm run typecheck` inside this folder after workspace install.
