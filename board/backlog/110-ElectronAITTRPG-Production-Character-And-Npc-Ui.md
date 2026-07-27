# EPIC: Production character sheet and NPC dossier UI

Replace demo-seeded character sheet and NPC dossier paths with the active campaign's current PC and known NPCs from durable stores (`106`/`109`/`107`).

**Why now:** `CharacterSheetOverlay` defaults to a demo request; `sheetService`/`demoSeed` and `dossierService`/`demoSeed` seed hardcoded data. `App.tsx` still links demo NPC ids in chrome.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `109-ElectronAITTRPG-Durable-Onboarding-And-Hub`, `073-ElectronAITTRPG-Character-Sheet-Ui`, `074-ElectronAITTRPG-Npc-Dossier-And-Relationship-Ui`.

**Out of scope:** New sheet/dossier features beyond wiring to real data; inactive-PC proxy UI (`115`).

## Sub-tickets

| Id | Summary |
|----|---------|
| `110.1` | Character sheet loads hub active PC (fallback policy documented) |
| `110.2` | NPC dossier lists campaign-known NPCs; remove demo seed from production path |
| `110.3` | Remove hardcoded demo links from App chrome |
| `110.4` | Renderer contract tests with fixture campaign ids |

## Acceptance criteria

- [ ] Character sheet opens with the hub's active character id — not a hardcoded demo id
- [ ] Sheet displays stats/HP/inventory/quest log from durable stores after restart
- [ ] NPC dossier enumerates NPCs present in campaign SQLite (met/known policy documented)
- [ ] Production bootstrap does not call `demoSeed` helpers
- [ ] Demo/fixture paths remain available for unit tests and Admin endpoint exercise
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 110.1 — Character sheet active PC wiring

**Parent:** `110-ElectronAITTRPG-Production-Character-And-Npc-Ui`. **Depends on:** `109`.

#### Acceptance criteria

- [ ] IPC accepts optional character id; defaults to hub active character
- [ ] Empty campaign shows empty state — not demo character

### 110.2 — NPC dossier campaign list

**Parent:** `110-ElectronAITTRPG-Production-Character-And-Npc-Ui`. **Depends on:** `106`, `107`.

#### Acceptance criteria

- [ ] Dossier service queries NPCEngine store for campaign id
- [ ] Relationship web renders from stored edges

### 110.3 — Demo chrome removal

**Parent:** `110-ElectronAITTRPG-Production-Character-And-Npc-Ui`. **Depends on:** `110.1`, `110.2`.

#### Acceptance criteria

- [ ] No hardcoded demo NPC ids in production renderer routes
- [ ] `demoSeed.ts` files clearly marked test/dev-only in README or file header

### 110.4 — UI contract tests

**Parent:** `110-ElectronAITTRPG-Production-Character-And-Npc-Ui`. **Depends on:** `110.3`.

#### Acceptance criteria

- [ ] Main-process service tests use SQLite fixture campaign with one PC and one NPC
- [ ] Renderer smoke test (happy-dom) verifies empty vs populated states
