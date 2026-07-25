# EPIC: CharacterEngine HP model

Port the hit-point model: rolled hit die per level plus the Body modifier once at level 1, persisted as `stats.maxHp`, with sane defaults for non-player actors that other engines hydrate against this same rule.

**Ported from:** `board/done/042-hit-die-hp-generation.md` and the HP rules described in AI-DND-Matrix's README ("villagers default to 10 HP; catalog monsters and retired adventurers use hit-die HP at hydration — catalog `hp` is authoring reference only").

**Depends on:** `021-CharacterEngine-Core-Ability-Model`. **Feeds:** NPCEngine (`039-NPCEngine-Attackable-Civilian-Combat-Disposition`) and EnemyEngine (`045-EnemyEngine-Bestiary-Catalog`), which hydrate HP from this same function rather than inventing their own formula.

## Acceptance criteria

- [ ] `computeMaxHp(hitDie, level, bodyMod)` (or equivalent) is a pure, unit-tested function
- [ ] Level-1 HP = hit die roll (or archetype-fixed die) + Body modifier; persisted, not recomputed on every read
- [ ] Villager/civilian default (10 HP) and catalog-monster hydration path both documented as consumers of this function, not separate formulas
- [ ] Catalog-authored `hp` fields are explicitly reference-only — hydration always recomputes from hit die + level

## Notes

- Multi-level HP growth (levels beyond 1) uses the same function per level-up; confirm accumulation vs. recompute-from-scratch semantics in the sub-ticket.
