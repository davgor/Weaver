# EPIC: DMEngine world mutations & live world population

Port "hard" world mutations (burn the village, and later scenes remember it) and on-demand population of places/NPCs that weren't pre-generated but that play now requires.

**Ported from:** `board/done/130-hard-world-mutations-engine-owned.md`, `134-on-demand-live-world-population.md`, `141-play-place-mint-light-regions.md`.

**Depends on:** `053-DMEngine-Turn-Routing`, `013-RegionalEngine-Map-Segmentation` / `016-CivilizationEngine-Settlement-Placement` (targets of mutation/mint), `037-NPCEngine-Construction-And-Identity`, `035-ItemEngine-Loot-Generation` (world mutations can seed loot into a minted place).

## Acceptance criteria

- [ ] World mutations are typed (not free-text world-fact blobs) and engine-persisted — DMEngine emits a typed mutation, the owning engine (RegionalEngine/CivilizationEngine/NPCEngine) applies and persists it
- [ ] A destroyed/altered place or NPC stays that way for every later scene — re-grounding from storage reflects the mutation, never the pre-mutation state
- [ ] Live population: when play references a place or NPC that doesn't exist yet (travel to an ungenerated destination, a name-dropped NPC), DMEngine can mint it on demand through the same peer APIs the campaign-create pipeline uses — not a separate ad hoc generator
- [ ] Place minting is idempotent — resolving the same `placeProposal` twice does not create duplicate regions/settlements
- [ ] This package's consumption of RegionalEngine (`013`), CivilizationEngine (`016`), NPCEngine (`037`), and ItemEngine (`035`) mutation/mint/loot APIs is each covered by `*.contract.test.ts` here against their real published APIs
