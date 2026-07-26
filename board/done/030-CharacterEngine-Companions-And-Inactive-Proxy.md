# EPIC: CharacterEngine companions & inactive-character proxy

Port AI party-member companions (prompt-generated, optional) and the inactive-character AI proxy that keeps a campaign's other player characters acting believably when their owner isn't the one typing.

**Ported from:** `board/done/129-prompt-generated-ai-party-companions.md` and the inactive-player-proxy portion of `board/done/038-campaign-hub-multi-character-shared-world.md`.

**Depends on:** `026-CharacterEngine-Archetypes-And-Starting-Loadouts` (companions get a loadout too), `029-CharacterEngine-Race-And-Background-Selection`, `044-NPCEngine-Face-Token-Hook` (companions reuse the NPC face-token generation hook).

## Acceptance criteria

- [x] Companion creation is a dedicated post-equipment onboarding step, optional/skippable, owned by (`owner_player_character_id`-equivalent) the player character that generated it
- [x] Companions are full CharacterEngine records (stats, HP, inventory via ItemEngine) distinguished from party-owned NPCs by an `isCompanion`/owner flag, not a separate schema
- [x] Inactive-character proxy: when a PC's owner isn't actively playing, DMEngine can request an engine-grounded action on that PC's behalf without inventing new stats
- [x] Face-token portraits for companions reuse the same generation hook as NPC face tokens (`044-NPCEngine-Face-Token-Hook`) rather than a parallel pipeline
- [x] Consumption of `044-NPCEngine-Face-Token-Hook` and ItemEngine's inventory API is each covered by a `*.contract.test.ts` here against their real published APIs, per delivery-standards' cross-package contract-test rule
