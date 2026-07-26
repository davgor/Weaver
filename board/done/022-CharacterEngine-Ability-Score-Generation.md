# EPIC: CharacterEngine ability score generation methods

Give players a choice of three ability-score generation methods at character creation, matching AI-DND-Matrix's balance work.

**Ported from:** `board/done/097-standard-array-14-12-10-8-unique.md`, `board/done/098-point-buy-12-pool-max-20.md`, and the original roll-for-stats option.

**Depends on:** `021-CharacterEngine-Core-Ability-Model`.

## Acceptance criteria

- [x] Point buy: 12-point pool, scores range 8–20
- [x] Standard array: fixed 14 / 12 / 10 / 8 values, unique assignment per ability (no duplicates)
- [x] Roll-for-stats: engine-rolled scores, re-roll/confirm flow defined
- [x] Each method exposed as a pure, unit-tested function returning the same ability-score shape regardless of method chosen
- [x] Invalid allocations (over-budget point buy, duplicate standard-array assignment) rejected with a typed error, not silently clamped
