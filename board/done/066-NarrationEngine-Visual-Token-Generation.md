# EPIC: NarrationEngine visual token generation & image provider rails

Port image generation for NPC/enemy/companion/PC portraits, including the pluggable image-provider layer (cloud / Player2 / local rails) that AI-DND-Matrix built up through its image-generation moonshot and its promoted follow-through epics.

**Ported from:** `board/done/122-npc-face-token-image-generation.md`, `123-enemy-combat-token-image-generation.md`, `139-ai-companion-face-token-image-generation.md`, `144-player-character-icon-image-generation.md`, `152-image-provider-settings-and-local-rails.md` (the promoted portion of moonshot **m001** — image generation itself shipped; broader background-image exploration stays out of scope here per the decision to skip moonshots).

**Depends on:** `019-LLMEngine-Text-Passthrough-API` (sibling pattern this epic's provider boundary follows — not a runtime call to LLMEngine itself, since image generation is a separate provider surface). **Feeds:** `044-NPCEngine-Face-Token-Hook`, `047-EnemyEngine-Combat-Token-Hook`, the PC-icon consumer in `030-CharacterEngine-Companions-And-Inactive-Proxy`/`073-ElectronAITTRPG-Character-Sheet-Ui`.

**Resolved scope note (this package owns image invention, not just text):** the root README currently describes NarrationEngine as inventing "narrative text," but portrait generation is the same shape of problem — invent content, then validate it against peer facts (a portrait must match the subject's actual race/description; it must not contradict CivilizationEngine/NPCEngine data) — just in a different medium. Rather than add a 13th package for one image-provider boundary, this epic keeps visual invention in NarrationEngine and extends its charter accordingly. **Action for whoever picks up this epic:** update the root README's NarrationEngine row to read "invention + validation (prose and visual tokens)" as part of this epic's first sub-ticket, so the package table and this epic stay in sync. Revisit as a split into a dedicated `ImageEngine` only if a second, unrelated image-generation need emerges later (e.g. background/scenery art) — not needed for the portrait scope here.

## Acceptance criteria

- [x] A provider-agnostic image generation interface (cloud API / Player2 / local-model rails), selectable via settings with no code change to swap
- [x] NPC, enemy, companion, and player-character portrait generation all call this one interface rather than each owning a bespoke image pipeline
- [x] Generation is gated by the campaign's generative-tokens flag and is always non-blocking/asynchronous relative to the entity's construction
- [x] Player character icons additionally support manual Upload/Replace as an alternative to generation
- [x] Failure of the image provider degrades to "no portrait" without failing the owning entity's construction or the campaign-create pipeline
- [x] Root README's `NarrationEngine` package-table row is updated to name visual-token generation alongside prose invention (first sub-ticket of this epic)
