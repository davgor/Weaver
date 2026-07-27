# EPIC: DMEngine visual-novel short-story pipeline

Add a DMEngine orchestration pipeline that builds a short, configurable N-act visual-novel story from a free-text premise plus main-character details. Reuse existing World/Regional/Civilization/NPC construction and NPC memory isolation; NarrationEngine invents all player-facing prose; DMEngine never invents facts.

**Why now:** ElectronAIVN’s “Tell a story” flow needs an engine-owned generation path distinct from the full TTRPG campaign-create cascade (`052`), tuned for short arcs (default 3 acts) and a reviewable story overview before play.

**Depends on:** `052-DMEngine-Campaign-Generation-Pipeline`, `037-NPCEngine-Construction-And-Identity`, `038-NPCEngine-Memory-Isolation`, `063-NarrationEngine-Scene-Social-Split-And-Streaming`, `106-DMEngine-Production-Campaign-Stores`. **Feeds:** `122-ElectronAIVN-Tell-A-Story-And-Review`, `124-ElectronAIVN-Visual-Novel-Play-Loop`.

**LLM boundary:** Same as `052` — DMEngine builds skeletons / stage order / peer persistence; NarrationEngine fills+validates; no raw-JSON trust; no DMEngine `completeText` for lore.

**Out of scope:** Electron UI; combat-first TTRPG campaign gen changes; V2 image generation.

## Sub-tickets

| Id | Summary |
|----|---------|
| `121.1` | Story-brief input model (premise, MC details, act count) |
| `121.2` | N-act story generation stages + overview artifact |
| `121.3` | Multi-NPC cast via NPCEngine + memory isolation wired |
| `121.4` | Persist draft story into campaign store (pre-play) |
| `121.5` | Contract tests vs NarrationEngine + NPCEngine + stores |

## Acceptance criteria

- [x] API accepts premise, main-character details, and configurable act count (default 3)
- [x] Pipeline produces a structured story overview (acts, cast, premise summary, opening beat) suitable for player review before permanentize/play
- [x] Cast NPCs are created through NPCEngine; memory isolation rules from `038` apply
- [x] All invented prose goes through NarrationEngine validation; peer facts persist via owning engines / campaign store
- [x] Draft stories can be saved without marking the game as “in play”
- [x] Consumer contract tests cover DMEngine → NarrationEngine / NPCEngine / store APIs with scripted labeled-block fixtures
- [ ] Gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 121.1 — Story-brief input model

**Parent:** `121-DMEngine-Visual-Novel-Story-Pipeline`. **Depends on:** `052`.

#### Acceptance criteria

- [x] Typed brief: premise text, MC name/personality/appearance fields, `actCount` (min/max documented)
- [x] Unit tests reject empty premise / invalid act count

### 121.2 — N-act generation + overview

**Parent:** `121-DMEngine-Visual-Novel-Story-Pipeline`. **Depends on:** `121.1`, `063`.

#### Acceptance criteria

- [x] Stages produce act outlines and a player-facing overview document
- [x] Default act count is 3; custom counts respected
- [x] Skeleton → NarrationEngine fill/validate → normalize loop matches campaign-gen contract style

### 121.3 — NPC cast + memory

**Parent:** `121-DMEngine-Visual-Novel-Story-Pipeline`. **Depends on:** `121.2`, `037`, `038`.

#### Acceptance criteria

- [x] Multiple story NPCs constructed via NPCEngine APIs
- [x] Per-NPC memory isolation preserved in generation fixtures/tests

### 121.4 — Draft persistence

**Parent:** `121-DMEngine-Visual-Novel-Story-Pipeline`. **Depends on:** `121.2`, `106`.

#### Acceptance criteria

- [x] Draft story + cast ids persist in campaign SQLite (or documented VN game store on the same path)
- [x] Draft is distinguishable from an active/permanent play session

### 121.5 — Contract tests

**Parent:** `121-DMEngine-Visual-Novel-Story-Pipeline`. **Depends on:** `121.3`, `121.4`.

#### Acceptance criteria

- [x] `*.contract.test.ts` against real NarrationEngine + NPCEngine published APIs
- [x] No live LLM calls in unit/contract suite
