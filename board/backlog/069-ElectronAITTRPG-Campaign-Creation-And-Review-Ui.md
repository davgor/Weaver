# EPIC: ElectronAITTRPG campaign creation & review UI

Build the new-campaign modal and the post-generation review screen against `DMEngine`'s campaign-generation pipeline.

**Ported from:** the `campaignStart` / `campaignReview` renderer modules described in AI-DND-Matrix's README architecture section, plus `board/done/039-configurable-generation-counts-review-validation.md` and `153-campaign-page-improvements.md`.

**Depends on:** `052-DMEngine-Campaign-Generation-Pipeline`.

## Acceptance criteria

- [ ] Create modal collects: free-text premise, optional name, death mode (Legendary/Standard/Respawn), region count (0–5), NPCs-per-region (0–10), and the generative-tokens flag
- [ ] Review screen lets the player edit/regenerate world, pantheon, regions, NPCs, factions, and bestiary before continuing, with per-region "generate NPC" available
- [ ] Continue/play gates block entry to onboarding until the review is explicitly confirmed
- [ ] UI calls `DMEngine`'s pipeline through its published API only — no campaign-generation business logic lives in this package
- [ ] Generative-tokens toggle is scoped to campaign start only (not re-toggleable mid-campaign), matching AI-DND-Matrix's `153.1` follow-through
- [ ] This package's consumption of DMEngine's campaign-generation API (`052`) is covered by a `*.contract.test.ts` here (main/preload/shared, per delivery-standards' Electron rule) against DMEngine's real published API
