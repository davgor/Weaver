# EPIC: EnemyEngine bestiary catalog

Stand up `@weaver/enemy-engine`'s core content model: a seeded bestiary of species and variants, separate from the per-encounter foe generation that consumes it.

**Ported from:** the bestiary portions of `board/done/023-preseeded-ttrpg-content-catalog.md` and `board/done/155-triple-creature-seed-catalog.md`.

**Depends on:** `023-CharacterEngine-Hp-Model` (bestiary HP hydrates from the shared formula), `024-CharacterEngine-Damage-Conditions-Dying` (shared damage-type taxonomy). **Feeds:** `046-EnemyEngine-Dynamic-Foe-Generation`, `047-EnemyEngine-Combat-Token-Hook`.

**LLM boundary:** deterministic catalog data — no Electron, no invented stat blocks at query time (invention, if any, happens once at authoring/seed time, not per-encounter).

## Acceptance criteria

- [ ] Bestiary species/variant records with stat blocks (abilities, HP via the shared hit-die formula, damage types dealt/resisted)
- [ ] Seed catalog covers at least three species at launch (matching AI-DND-Matrix's minimum bar) with room to grow without a schema change
- [ ] Package scaffolded matching sibling engines, added to root README package table and `build:engines`
- [ ] Catalog `hp` fields are reference-only; hydration always recomputes via `023-CharacterEngine-Hp-Model`'s function
- [ ] This package's consumption of `023`/`024`'s CharacterEngine APIs (HP hydration, damage-type taxonomy) is covered by a `*.contract.test.ts` here against CharacterEngine's real published API
