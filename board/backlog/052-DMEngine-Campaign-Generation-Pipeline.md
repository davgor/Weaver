# EPIC: DMEngine cascading campaign generation pipeline

Port AI-DND-Matrix's single highest-value piece of agent engineering: the cascading campaign-create pipeline and its skeleton/labeled-block LLM contract, which avoids ever asking the model for raw JSON.

**Ported from:** `board/done/007-campaign-generation.md`, `054-campaign-world-generation.md`, `055-campaign-create-contract-test.md`, `161-campaign-gen-skeleton-fill.md`, and the "Campaign-create LLM contract" section of AI-DND-Matrix's README.

**Depends on:** `012`/`013`/`016` (WorldEngine/RegionalEngine/CivilizationEngine — this pipeline calls their fill APIs instead of inventing geography), `037-NPCEngine-Construction-And-Identity`, `045-EnemyEngine-Bestiary-Catalog`, `040-NPCEngine-Factions-And-Reputation`, `060-DMEngine-World-Naming-And-History-Authoring`, `063-NarrationEngine-Scene-Social-Split-And-Streaming` (the invention+validation engine every content-bearing stage calls). **Feeds:** every downstream campaign-scoped epic.

**LLM boundary (corrected):** per the root README's rule that only NarrationEngine invents story prose, **DMEngine does not call `LLMEngine.completeText` itself for any stage that produces player-facing lore/flavor** (canon, pantheon, world summary/history, faction flavor, NPC bios, bestiary flavor, story premise). DMEngine owns the pipeline: it decides stage order, builds each stage's skeleton (the `{{TOKEN}}` shape a stage needs, derived from what the owning peer engine's API expects), calls **NarrationEngine** to fill and validate that skeleton against already-fixed peer facts, and persists NarrationEngine's validated output through the owning peer engine's API (WorldEngine/RegionalEngine/CivilizationEngine/NPCEngine/EnemyEngine). NarrationEngine owns the actual model call, the labeled-block parse, and claim validation — DMEngine never accepts or persists invented content that didn't come back through NarrationEngine's validation step.

## Acceptance criteria

- [ ] Pipeline runs strict stages: canon → pantheon → world → factions → regions → NPCs → bestiary → story → persist, each stage's output validated before the next stage runs
- [ ] Each stage's skeleton uses `{{TOKEN}}` placeholders; NarrationEngine returns `<<<TOKEN>>>…<<</TOKEN>>>` labeled blocks — nothing in this pipeline asks for raw JSON or trusts unlabeled free text as structured data
- [ ] DMEngine's stage loop is: build skeleton → call NarrationEngine (`fillAndValidate`-equivalent) → normalize → persist via the owning peer engine's API, with outer seed retries (~5) and per-stage retries (~3) triggered by DMEngine re-invoking NarrationEngine, not by DMEngine re-inventing content itself
- [ ] Each stage persists through the owning peer engine's API (WorldEngine/RegionalEngine/CivilizationEngine/NPCEngine/EnemyEngine) — DMEngine holds no shadow copy of world/NPC/item facts, and NarrationEngine holds no persisted copy either (it returns validated content, it doesn't write peer state)
- [ ] This package's consumption of NarrationEngine's fill/validate API and of WorldEngine/RegionalEngine/CivilizationEngine/NPCEngine/EnemyEngine's persistence APIs is each covered by `*.contract.test.ts` here against their real published APIs; fixtures use labeled-block content (not live LLM calls) to keep the parse/normalize/persist path fast and deterministic
- [ ] Configurable generation counts (region count, NPCs per region) are respected as pipeline parameters, matching AI-DND-Matrix's `039-configurable-generation-counts-review-validation`
