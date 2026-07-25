# EPIC: DMEngine context efficiency & RAG integration

Port the token/cost discipline that made AI-DND-Matrix's agent calls affordable: capped context, templated mechanical outputs, and wiring NarrationEngine's retrieval into DM/NPC grounding within a hard budget.

**Ported from:** `board/done/040-llm-efficiency-token-cost-reduction.md` and the orchestration half of `083-rag-db-retrieval.md`.

**Depends on:** `052-DMEngine-Campaign-Generation-Pipeline`, `065-NarrationEngine-Rag-Retrieval` (DMEngine calls Narration's retrieval, it does not reimplement it).

## Acceptance criteria

- [ ] Every agent-call context assembly has an enforced token cap with truncation guards — no unbounded prompt growth as a campaign ages
- [ ] Combat/XP/loot narration uses templated prompts (fixed structure with slots) rather than full free-form context dumps, cutting tokens for high-frequency calls
- [ ] Always-on grounding fields (current HP, present NPCs, active combat state) are never displaced by RAG-selected content — RAG fills the remaining budget around these, not instead of them
- [ ] Guided-creation transcripts are windowed (bounded history) rather than replaying the full onboarding chat into every subsequent call
- [ ] A budget-exceeded test proves the cap is enforced, not just documented
- [ ] This package's consumption of `065-NarrationEngine-Rag-Retrieval`'s retrieval API is covered by a `*.contract.test.ts` here against NarrationEngine's real published API
