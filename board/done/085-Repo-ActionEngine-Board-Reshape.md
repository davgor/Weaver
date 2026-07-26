# EPIC: Reshape spell/Action work into ActionEngine

Follow-up on the seeded MVP gap: spells and class actions are the same mechanical thing (shared effects + typed ranges; flavor differs). Replace the CombatEngine-owned spell/lockout epic (`082`) with a dedicated `@weaver/action-engine` package plan, update peer epics/README, and regenerate implementation order.

**Depends on:** none (board/docs only). **Feeds:** Wave planning for ActionEngine implementation.

## Acceptance criteria

- [x] Old `082-CombatEngine-Spell-Casting-And-Action-Lockout` (+ `082.*` spell sub-tickets) removed
- [x] New ActionEngine epics exist: core model (`082`), catalog/known actions (`083`), use/resolution/lockout (`084`), each with Depends/Feeds, sub-ticket files, and checkable ACs
- [x] Root README package table lists ActionEngine (planned) with the unified spell/class-action boundary
- [x] Peer epics that assumed a CombatEngine spell surface (`025`, `028`, `036`, Combat README notes) point at ActionEngine for action definitions/effects
- [x] `npm run board:order` regenerated; `npm test` / `lint` / `build` / `deadcode` pass for touched scripts/docs
- [x] `npm run ci:act` — verified (`pr-checks.yml` + `deadcode.yml` both `🏁 Job succeeded`)
