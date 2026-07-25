# EPIC: DMEngine world/region/pantheon naming & history authoring

RegionalEngine and CivilizationEngine deliberately assign only machine ids and stats — "display names come later via Narration/DM" (per `013-RegionalEngine-Map-Segmentation` and `016-CivilizationEngine-Settlement-Placement`). This epic is that later step: turning machine-generated regions and settlements into named, storied places, plus pantheon/deity generation, ported from AI-DND-Matrix where this was part of world generation.

**Ported from:** `board/done/057-world-layer-naming-and-history.md`, `058-region-regenerate.md`, `059-pantheon-generation.md`.

**Depends on:** `013-RegionalEngine-Map-Segmentation`, `016-CivilizationEngine-Settlement-Placement`, `063-NarrationEngine-Scene-Social-Split-And-Streaming` (the invention+validation engine this epic calls). **Feeds:** `052-DMEngine-Campaign-Generation-Pipeline` (this is the naming/pantheon capability the pipeline's pantheon/world/regions stages call as a building block — like `036-ItemEngine-Starting-Gear-Catalog` feeding `026`, the callee does not depend on its caller) and any later regenerate/live-mint use.

**Resolved LLM-boundary split (supersedes the earlier open question on this epic):** naming/history/pantheon text is invented prose, so per the root README boundary rule ("Only NarrationEngine invents story prose... must validate against peer engine data"), **NarrationEngine** — not DMEngine — is the one that calls LLMEngine and validates the result against RegionalEngine/CivilizationEngine facts (e.g. reject "Harbor Town" for a landlocked region). **DMEngine's role here is orchestration only**: it triggers the naming pass as a stage of the campaign-generation pipeline (`052`), calls NarrationEngine for each name/history/pantheon entry it needs, and persists NarrationEngine's validated output back onto the owning engine's record via that engine's own API. DMEngine must not call LLMEngine directly for this content and must not invent or accept a name that didn't come from NarrationEngine's validated output.

## Acceptance criteria

- [ ] Every RegionalEngine region and CivilizationEngine settlement can be assigned a display name + short seeded history: DMEngine requests it from NarrationEngine, NarrationEngine invents and validates it against the region/settlement's actual stats, and DMEngine persists the accepted result back onto the owning engine's record (not shadow-copied into DMEngine, and never written from DMEngine-invented text)
- [ ] Pantheon/deity generation produces a campaign-scoped set of gods with plain-English-fantasy names and domains via the same DMEngine→NarrationEngine call, honoring `064-NarrationEngine-Tone-And-Terminology-Guards`
- [ ] Region "regenerate" (re-roll name/history for one region without touching its underlying deterministic stats) is supported through the same orchestration path
- [ ] Naming/history is a one-time "realize" per region/settlement per campaign, not regenerated on every read
- [ ] DMEngine's consumption of NarrationEngine's naming API and of RegionalEngine's/CivilizationEngine's record-update APIs is covered by `*.contract.test.ts` here against each of their real published APIs — a regression test proves DMEngine cannot persist a name that didn't round-trip through NarrationEngine's validation
