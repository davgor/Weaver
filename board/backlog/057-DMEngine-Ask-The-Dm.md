# EPIC: DMEngine Ask-the-DM (OOC)

Port the out-of-character chat channel players use to ask the DM questions without affecting the story.

**Ported from:** `board/done/106-ask-the-dm-ooc-chat.md`.

**Depends on:** `052-DMEngine-Campaign-Generation-Pipeline` (needs campaign context to answer from), `063-NarrationEngine-Scene-Social-Split-And-Streaming` (the invention+validation engine this epic calls for the actual answer text).

**LLM boundary:** an Ask-the-DM answer is still invented natural-language text describing game state, so it follows the same split as `052`/`060`/`061`: **NarrationEngine** generates and validates the answer against current campaign/character facts; **DMEngine** only decides what context to assemble and enforces that this path can never reach `turn:resolve`. DMEngine does not call LLMEngine directly here.

## Acceptance criteria

- [ ] Ask-the-DM is a distinct entry point from the turn router (`053-DMEngine-Turn-Routing`) — it must never call the turn-resolve path
- [ ] DMEngine assembles the grounding context (campaign/character state) and calls NarrationEngine for the answer text; NarrationEngine validates the answer against that same state so OOC answers can't contradict in-fiction facts
- [ ] OOC messages are persisted to their own history, separate from Social/Scene turn history
- [ ] A regression test proves an Ask-the-DM call cannot mutate turn state, currency, HP, or any other durable fact
- [ ] This package's consumption of `063`'s generation API is covered by a `*.contract.test.ts` here against NarrationEngine's real published API
