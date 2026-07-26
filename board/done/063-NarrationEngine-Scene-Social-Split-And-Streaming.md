# EPIC: NarrationEngine Scene/Social split & claim validation

Port the play UI's foundational narration split: a streaming Social channel (player/NPC dialogue) separate from DM Scene exposition, plus the validate-before-persist step that keeps invented prose honest.

**Ported from:** `board/done/085-social-column-text-stream.md`, `087-player-messages-in-social.md`, `088-silent-social-resolve.md`, and the "Social vs Scene" design principle in AI-DND-Matrix's README.

**Depends on:** `037-NPCEngine-Construction-And-Identity`, `043-NPCEngine-Speaking-Style-And-Selective-Replies` (NPC lines use these), `067-LLMEngine-Multi-Cloud-Provider-Adapters` (or `019-LLMEngine-Text-Passthrough-API` directly).

**LLM boundary:** this is the package's core charter — invent prose, then validate every factual claim in it against peer engines before it's accepted. Reject/rewrite when prose contradicts stored state.

## Acceptance criteria

- [x] Social (player + NPC dialogue) and Scene (DM exposition) are separate projections a caller can request independently, with Social supporting incremental/streaming delivery
- [x] Before persisting generated prose, NarrationEngine extracts factual claims (an NPC is present, an item exists, a location name) and checks them against the relevant peer engine — contradicted claims are rejected or rewritten, not persisted as-is
- [x] Silent resolution: routine, low-stakes turns can resolve without generating a full narration block when nothing narratively interesting happened (matches AI-DND-Matrix's `088-silent-social-resolve`)
- [x] Package scaffolded matching sibling engines, added to root README package table and `build:engines`
- [x] This package's consumption of NPCEngine (`037`, `043`) and LLMEngine (`019`/`067`) is each covered by `*.contract.test.ts` here against their real published APIs — proving NarrationEngine calls peer engines to validate claims rather than trusting the LLM's output on faith
