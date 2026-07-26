# EPIC: NarrationEngine tone & terminology guards

Port the plain-English-fantasy tone enforcement and jargon/terminology scrub that keeps generated prose free of trademarked tabletop terminology and copy-paste jargon.

**Ported from:** `board/done/022-terminology-scrub-dnd-to-ttrpg.md`, `063-plain-english-fantasy-prompts.md`, `171-world-gen-reject-pantheon-epithet-hyphens.md`.

**Depends on:** `063-NarrationEngine-Scene-Social-Split-And-Streaming` (guards run on the same generation path).

## Acceptance criteria

- [x] A terminology replacement map rejects/rewrites trademarked TTRPG terms in any user-facing copy or generated prose (internal code naming like "DM" is unaffected)
- [x] Pantheon/deity name generation rejects known-bad epithet shapes (e.g. hyphenated epithets) and re-prompts or falls back to a safe default
- [x] A `terminology:check`-equivalent script/test can run over generated fixtures to catch regressions before they ship
- [x] Tone guard is enforced at validation time (same pass as claim validation in `063`), not left to prompt instructions alone
