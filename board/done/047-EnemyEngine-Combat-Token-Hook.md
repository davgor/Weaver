# EPIC: EnemyEngine combat token generation hook

Port the enemy portrait/combat-token pipeline used during encounters.

**Ported from:** `board/done/123-enemy-combat-token-image-generation.md`.

**Depends on:** `045-EnemyEngine-Bestiary-Catalog`, `066-NarrationEngine-Visual-Token-Generation` (this epic is the enemy-side consumer of that image-generation capability).

## Acceptance criteria

- [x] Enemy instances have an optional combat-token image reference, populated asynchronously/non-blocking
- [x] Token generation is gated by the campaign's generative-tokens flag
- [x] Species/variant-level tokens can be cached and reused across encounters rather than regenerated per spawn, unless the instance is visually unique
- [x] Failure to generate a token never blocks encounter start
- [x] This package's consumption of `066-NarrationEngine-Visual-Token-Generation`'s image API is covered by a `*.contract.test.ts` here against NarrationEngine's real published API
