# EPIC: ActionEngine catalog & known-action grants

Seed the deterministic action/effect catalog (including Ice Bolt and Hamstring Strike as shared-effect examples) and define how characters **know** actions. CharacterEngine stores known `actionId`s (spellbook UI may still say "Spellbook"); ActionEngine owns definitions and grant validation.

**Depends on:** `082-ActionEngine-Ability-Effect-And-Range-Model`. **Feeds:** `026-CharacterEngine-Archetypes-And-Starting-Loadouts` / `036-ItemEngine-Starting-Gear-Catalog` (starting known actions), `025-CharacterEngine-Xp-And-Level-Up` (level-up grants), `028-CharacterEngine-Journal-Logbook-Quests-Spellbook` (known-actions surface), `084-ActionEngine-Use-Resolution-And-Lockout`.

**LLM boundary:** catalog is seed data — LLM must not invent action ids, ranges, or effect magnitudes.

## Sub-tickets

| Id | Summary |
|----|---------|
| `083.1` | Seed effect + action catalog (at least `slow_movement`, `ice_bolt`, `hamstring_strike`) |
| `083.2` | Known-action grant/revoke/query helpers for a character id (keys only; no duplicate definitions) |
| `083.3` | Contract notes/tests: CharacterEngine / ItemEngine starting-loadout consumers read catalog by id |
| `083.4` | README catalog authoring notes + versioning/seed determinism |

## Acceptance criteria

- [ ] Seed catalog includes Ice Bolt (range feet 30, effect `slow_movement`) and Hamstring Strike (range `meleeWeapon`, same `slow_movement` effect), unit-tested for shared effect identity
- [ ] Grant/query APIs track known `actionId`s per character without copying action definitions into CharacterEngine
- [ ] Starting-loadout / level-up peers are expected to grant ids from this catalog (documented + contract coverage when those call sites land)
- [ ] Catalog seeding is deterministic for a fresh campaign
- [ ] Sub-tickets listed above exist as `board/backlog/083.*` files; none implemented until separately completed
