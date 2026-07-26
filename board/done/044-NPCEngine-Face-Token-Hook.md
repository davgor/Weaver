# EPIC: NPCEngine face token generation hook

Port the non-blocking NPC portrait pipeline, reused by companions.

**Ported from:** `board/done/122-npc-face-token-image-generation.md` and `139-ai-companion-face-token-image-generation.md`.

**Depends on:** `037-NPCEngine-Construction-And-Identity`, `066-NarrationEngine-Visual-Token-Generation` (this epic is the NPC-side consumer of that image-generation capability). **Feeds:** `030-CharacterEngine-Companions-And-Inactive-Proxy` (companions reuse this same hook).

## Acceptance criteria

- [x] NPC record has an optional portrait reference field, populated asynchronously/non-blocking after construction
- [x] Portrait generation is gated by the campaign's generative-tokens flag — off by default unless the campaign opts in
- [x] Companion portraits call the exact same hook as NPC portraits rather than a parallel pipeline (matches AI-DND-Matrix's `139` reusing `122`'s pipeline)
- [x] Failure to generate a portrait never blocks NPC construction or play — it degrades to "no portrait" silently
- [x] This package's consumption of `066-NarrationEngine-Visual-Token-Generation`'s image API is covered by a `*.contract.test.ts` here against NarrationEngine's real published API
