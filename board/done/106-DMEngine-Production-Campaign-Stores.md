# EPIC: Production campaign SQLite stores

Expand the campaign-bundle SQLite schema beyond stub tables (`081`) and wire engine-facing repositories so gameplay facts survive app restart. Replace module-level in-memory maps in CharacterEngine, ItemEngine, NPCEngine, EnemyEngine, QuestEngine, and NarrationEngine prose stores with durable per-campaign persistence coordinated through DMEngine (or thin repository modules owned at the campaign boundary).

**Why now:** REBUILD_SPEC §1–§6 require engine + SQLite as source of truth. Epic `081` shipped migration scaffolding and stub tables; live play (`105`), onboarding, character sheet, and NPC dossier still read/write in-memory stores that reset on restart.

**Depends on:** `081-DMEngine-Campaign-Persistence-And-Migrations`.

**Feeds:** `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `108-Repo-Full-Campaign-Portability-Slices`, `109-ElectronAITTRPG-Durable-Onboarding-And-Hub`, `111-DMEngine-Live-Rag-And-Context-Integration`.

**LLM boundary:** persistence only — deterministic rows and JSON blobs; no prose invention.

## Sub-tickets

| Id | Summary |
|----|---------|
| `106.1` | Campaign schema v2: character stats/HP, journal, logbook, quest log, known actions |
| `106.2` | Campaign schema v2: item instances, inventories, currency balances, equipment |
| `106.3` | Campaign schema v2: NPC records, memories, factions, relationships, locations |
| `106.4` | Campaign schema v2: enemy foes, quest templates/world quests, narration projections |
| `106.5` | Repository adapters + engine store swap (in-memory → SQLite) with contract tests |

## Acceptance criteria

- [x] Campaign migrations add tables (or documented JSON columns) for the durable facts listed in REBUILD_SPEC §6 that today live in module-level maps
- [x] CharacterEngine HP/stats, journal, logbook, quest log, known actions, location, companions persist per campaign and reload on open
- [x] ItemEngine templates/instances/inventories/currency persist per campaign and reload on open
- [x] NPCEngine NPCs, memories, factions, relationships, locations persist per campaign and reload on open
- [x] EnemyEngine generated foes and QuestEngine world quests persist per campaign and reload on open
- [x] NarrationEngine Social/Scene projection rows persist per campaign (or documented alternative keyed store)
- [x] Electron/renderer never talks SQL — DMEngine (or repository modules it owns) is the call path
- [x] Cross-package contract tests exercise real SQLite round-trip for at least one consumer per engine boundary
- [x] Sub-tickets `106.1`–`106.5` acceptance criteria verified; `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 106.1 — Character durable tables + repository

Add campaign-bundle tables for character stats/HP, journal, logbook, per-PC quest log, known actions, and wire CharacterEngine stores to read/write them.

**Parent:** `106-DMEngine-Production-Campaign-Stores`. **Depends on:** none within epic.

#### Acceptance criteria

- [x] Migration v2 (or later) creates character fact tables with explicit column types / JSON schema notes
- [x] CharacterEngine public APIs behave the same; only the backing store changes from in-memory to SQLite
- [x] Unit tests cover create/read/update round-trip without Electron
- [x] Re-open of campaign DB restores character facts identically

### 106.2 — Item durable tables + repository

Persist item instances, per-character inventories, currency balances, and equipped slots.

**Parent:** `106-DMEngine-Production-Campaign-Stores`. **Depends on:** `106.1` (shared campaign open path).

#### Acceptance criteria

- [x] ItemEngine inventory/currency/equipment APIs backed by campaign SQLite
- [x] Contract test: DMEngine or ItemEngine consumer round-trips inventory + balance after simulated restart (close/reopen DB)
- [x] No duplicate item ownership possible across characters without explicit transfer API

### 106.3 — NPC durable tables + repository

Persist NPC construction records, memories, faction membership, relationship edges, and location ownership.

**Parent:** `106-DMEngine-Production-Campaign-Stores`. **Depends on:** `106.1`.

#### Acceptance criteria

- [x] NPCEngine store swap preserves memory isolation semantics (per-NPC memory rows)
- [x] Faction/reputation and relationship web reload on campaign open
- [x] NPC location records align with CharacterEngine location kind vocabulary (`096` / `103`)

### 106.4 — Enemy, quest, and narration projection stores

Persist generated foes, quest templates/world quest instances, and narration Social/Scene projections.

**Parent:** `106-DMEngine-Production-Campaign-Stores`. **Depends on:** `106.1`.

#### Acceptance criteria

- [x] EnemyEngine generated-foe cache and combat token references survive restart
- [x] QuestEngine templates and world quest rows survive restart
- [x] NarrationEngine prose projections keyed by campaign + character + channel persist and reload

### 106.5 — Engine store swap integration + contract suite

Replace remaining in-memory defaults with injected SQLite repositories; add consumer contract tests at each engine boundary.

**Parent:** `106-DMEngine-Production-Campaign-Stores`. **Depends on:** `106.1`, `106.2`, `106.3`, `106.4`.

#### Acceptance criteria

- [x] No production code path silently falls back to fresh in-memory stores when a campaign DB is open
- [x] At least one `*.contract.test.ts` per affected engine exercises real provider persistence
- [x] Package READMEs document campaign-store ownership boundary (campaign bundle vs World/Regional/Civ engine-local stores from `081.2`)
