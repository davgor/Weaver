# EPIC: NPCEngine speaking style & selective Social replies

Port the two features that keep group Social conversation readable: each NPC has a consistent voice, and not every NPC answers every line.

**Ported from:** `board/done/090-selective-npc-responses.md` and `092-npc-speaking-style.md`.

**Depends on:** `037-NPCEngine-Construction-And-Identity`. **Feeds:** `063-NarrationEngine-Scene-Social-Split-And-Streaming` (Narration consumes speaking-style samples when generating an NPC's line).

## Acceptance criteria

- [ ] Each NPC carries speaking-style sample data (tone/vocabulary hints) that NarrationEngine can read when generating that NPC's dialogue
- [ ] Selective-reply logic: given a Social turn with multiple NPCs present, this package (or a query it exposes) determines which NPCs are relevant enough to respond, so DMEngine doesn't have to invoke every present NPC every turn
- [ ] Selective-reply decisions are deterministic given the same inputs (present NPCs, addressed target, recent context), not an LLM guess
- [ ] Speaking style stays consistent across a campaign for a given NPC (not regenerated per line)
