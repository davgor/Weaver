# EPIC: Full campaign portability slices

Extend DMEngine export/import so a campaign backup restores the durable facts introduced in `106` — not just the thin slices shipped in `059`, `104`, and early Character/Item portability types.

**Why now:** CharacterEngine portability (`096`/`104`) exports day, death mode, ids, companions, and locations only. ItemEngine exports balances only. Rich per-PC state (stats/HP, journal, logbook, quest log, known actions, inventory instances, narration projections, onboarding transcript) is missing from backup/restore.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `059-DMEngine-Campaign-Portability`, `104-DMEngine-Quest-Portability-Slice`.

**Feeds:** `109-ElectronAITTRPG-Durable-Onboarding-And-Hub` (onboarding slice), `097-ElectronAITTRPG-Campaign-Portability-Ui` (UI already exists — verify round-trip).

## Sub-tickets

| Id | Summary |
|----|---------|
| `108.1` | CharacterEngine full slice (stats, HP, journal, log, quests, known actions, autosaves) |
| `108.2` | ItemEngine full slice (instances, inventories, equipment, balances) |
| `108.3` | NPCEngine + EnemyEngine + NarrationEngine projection slices |
| `108.4` | DMEngine orchestrated export/import version bump + round-trip contract suite |

## Acceptance criteria

- [ ] Export bundle version bumped with explicit migration notes for older saves
- [ ] Character slice includes stats/HP, journal, logbook, per-PC quest log, known actions, level-up history, autosave snapshots
- [ ] Item slice includes item instances, per-character inventories, equipped slots, and currency balances
- [ ] NPC slice includes memories, factions, relationships, and locations; enemy slice includes generated foes; narration slice includes Social/Scene projections
- [ ] Import is idempotent-safe for same bundle (document policy) and rejects unknown future versions clearly
- [ ] Round-trip contract test: populate campaign → export → import into fresh DB → assert deep equality on sampled facts
- [ ] Electron portability UI (`097`) works without changes or receives minimal slice-version display update
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 108.1 — Character full portability slice

**Parent:** `108-Repo-Full-Campaign-Portability-Slices`. **Depends on:** `106`.

#### Acceptance criteria

- [ ] `CHARACTER_SLICE_VERSION` incremented; schema validation tests cover new fields
- [ ] Export/import preserves stats, HP, journal, logbook, quest log entries, known action ids, autosaves

### 108.2 — Item full portability slice

**Parent:** `108-Repo-Full-Campaign-Portability-Slices`. **Depends on:** `106`.

#### Acceptance criteria

- [ ] Item slice exports instances, inventory membership, equipment, and balances
- [ ] Import remaps ids if needed (document policy) without duplicating items

### 108.3 — NPC, enemy, narration slices

**Parent:** `108-Repo-Full-Campaign-Portability-Slices`. **Depends on:** `106`.

#### Acceptance criteria

- [ ] Each engine exposes `export*CampaignSlice` / `import*CampaignSlice` covering durable rows from `106`
- [ ] Narration projections round-trip per character

### 108.4 — DMEngine orchestration + contract suite

**Parent:** `108-Repo-Full-Campaign-Portability-Slices`. **Depends on:** `108.1`, `108.2`, `108.3`.

#### Acceptance criteria

- [ ] `exportCampaign` / `importCampaign` invoke all new slices in documented order
- [ ] DMEngine `*.contract.test.ts` covers full round-trip against real engine providers
