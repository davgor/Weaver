# EPIC: CharacterEngine death modes, obituary & autosave recovery

Port the three per-campaign death modes and the autosave-snapshot mechanism that makes Standard mode work.

**Ported from:** AI-DND-Matrix's README ("Death modes" — Legendary / Standard / Respawn) and its Campaign Hub epic (`board/done/038-campaign-hub-multi-character-shared-world.md`, which introduced death/obituaries).

**Depends on:** `024-CharacterEngine-Damage-Conditions-Dying`.

## Acceptance criteria

- [ ] Death mode is a per-campaign setting: **Legendary** (permanent death + AI-drafted obituary), **Standard** (restore last autosave snapshot — no explicit player save step), **Respawn** (world-defined relocate + cost + limits, mechanically applied by the engine, not narrated as a suggestion)
- [ ] Autosave snapshot is written after every resolved action; Standard-mode death restores from the latest snapshot
- [ ] Story-driven death can still persist even under Standard/Respawn when explicitly flagged by DMEngine — document the flag contract
- [ ] Obituary is drafted text attached to a dead character record, not a separate untracked artifact
- [ ] Life status (`alive` | `dead`) and death cause are queryable so DMEngine/NarrationEngine can ground later scenes on a character's fate
