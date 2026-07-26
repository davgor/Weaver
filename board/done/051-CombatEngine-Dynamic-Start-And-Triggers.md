# EPIC: CombatEngine dynamic combat start & triggers

Port the ability to start a combat encounter without a pre-placed hostile — i.e. combat that begins dynamically from play rather than only from a pre-authored encounter.

**Ported from:** `board/done/115-combat-start-without-hostiles.md`.

**Depends on:** `048-CombatEngine-Encounter-Lifecycle`, `046-EnemyEngine-Dynamic-Foe-Generation` (supplies the foe(s) once a trigger fires).

## Acceptance criteria

- [x] Combat can be started by DMEngine mid-scene without any hostile having been pre-placed in the region, sourcing the foe from `046-EnemyEngine-Dynamic-Foe-Generation`
- [x] Starting an encounter with zero currently-known hostiles is a valid, tested path (not an implicit error case)
- [x] Encounter-start API clearly distinguishes "ambush/ad hoc start" from "pre-authored encounter start" so DMEngine can pick the right one deliberately
- [x] This package's consumption of `046-EnemyEngine-Dynamic-Foe-Generation`'s API is covered by a `*.contract.test.ts` here against EnemyEngine's real published API
