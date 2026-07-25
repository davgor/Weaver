# EPIC: DMEngine shared time, causality & hub recap

Port multi-PC shared world time/causality and the campaign hub's session recap.

**Ported from:** `board/done/038-campaign-hub-multi-character-shared-world.md` (shared-time portion), `133-multi-pc-shared-time-causality.md`, `124-hub-session-recap-replaces-recent-events.md`.

**Depends on:** `031-CharacterEngine-Time-And-Rest`, `052-DMEngine-Campaign-Generation-Pipeline`. **Feeds:** `071-ElectronAITTRPG-Campaign-Hub-Ui`.

## Acceptance criteria

- [ ] All player characters in a campaign share one day counter and one causal event timeline — an action by PC A is visible to PC B's later scenes
- [ ] Turn order across multiple active PCs is well-defined (documented policy: e.g. per-PC async turns vs. round-robin) so causality can't be gamed by turn ordering
- [ ] Session recap summarizes what happened since a PC's last session, replacing a raw "recent events" dump with a DM-authored summary grounded in the actual event log
- [ ] Recap generation is re-derivable from stored events at any time, not a one-shot artifact that goes stale
- [ ] This package's consumption of `031-CharacterEngine-Time-And-Rest`'s day-counter API is covered by a `*.contract.test.ts` here against CharacterEngine's real published API
