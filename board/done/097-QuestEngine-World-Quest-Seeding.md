# EPIC: QuestEngine world-quest seeding

Add `packages/QuestEngine` (`@weaver/quest-engine`): deterministic, LLM-free owner of **world/campaign quest definitions and seeded instances** bound to real world facts (regions, settlements/places, NPCs, items, optional dungeon ids). Today quests are only a thin CharacterEngine log (`questId` / kind / status / title) plus DM propose/complete orchestration (`028` / `056`) — nothing seeds a coherent world quest graph at campaign generation time.

**Depends on:** `012` / `013` / `016` (world/region/settlement facts to bind), `028-CharacterEngine-Journal-Logbook-Quests-Spellbook` (PC quest log remains the acceptance surface), `037` / `032` (NPC/item ids for FK targets), `052-DMEngine-Campaign-Generation-Pipeline` (orchestration host for a seed stage).

**Feeds:** DMEngine campaign-gen quest stage (`102-DMEngine-Campaign-Gen-Quest-Seed-Stage`), DM `proposeQuest` (should reference QuestEngine definitions), NarrationEngine quest flavor fill (titles/briefs via Narration — QuestEngine stores validated text + structure, does not invent). Location-gated offers may use `096-CharacterEngine-Location-Ownership` later (not a hard dependency for seeding).

**Ownership split (chosen):**
| Package | Owns |
|---------|------|
| **QuestEngine** | Quest templates + campaign-seeded world quest instances, objectives/hooks, FK refs to peer ids, seed/list/get APIs |
| **CharacterEngine** | Per-character quest **log** (accepted/active/complete/failed pointers + optional title cache) — does not become the world quest database |
| **DMEngine** | When to seed, when to offer/assign, FK existence checks via peer lookups; no shadow quest catalog |
| **NarrationEngine** | Invents player-facing quest prose into QuestEngine-shaped skeletons when a gen stage needs flavor |

**Out of scope:** Full RPG quest scripting language; auto-completing quests from free-text narration; HTTP API; replacing CharacterEngine’s per-PC log in this epic.

**LLM boundary:** QuestEngine is deterministic/LLM-free. Seeding may accept caller-supplied titles/briefs (already Narration-validated) but must not call LLMEngine or NarrationEngine itself.

## Core APIs

| Function | Behavior |
|----------|----------|
| `seedWorldQuests` | Given campaign/world context + peer id pools (regions, places, NPCs, items, …), deterministically create a set of world quest instances (main + side) with stable ids and FK hooks |
| `listWorldQuests` / `getWorldQuest` | Query seeded instances for a campaign/world |
| `defineQuestTemplate` (optional early) | Register reusable template shapes the seeder draws from |
| `attachObjective` / objective model | Structured objectives (e.g. talk-to NPC, reach place, obtain item) with typed peer refs — richer than CharacterEngine’s title/status row |

## Supporting APIs

| Function | Why |
|----------|-----|
| `health` / `listEndpoints` / `call` | Admin + Electron catalog parity |
| Portability export/import | Campaign bundle can carry seeded world quests |
| Reject dangling FKs | Seed/define APIs reject unknown peer ids when a lookup is provided (same hardening spirit as `056`) |

## Sub-tickets

| Id | Summary |
|----|---------|
| `097.1` | Scaffold QuestEngine package + monorepo/Electron/README/delivery-standards wiring |
| `097.2` | Quest template + world-quest instance types/store (objectives + FK refs) |
| `097.3` | Deterministic `seedWorldQuests` from peer id pools + unit tests |
| `097.4` | List/get/delete + admin endpoints; dangling-FK rejection with injected lookups |
| `097.5` | Portability slice + QuestEngine→peer contract tests |
| `097.6` | DMEngine campaign-gen seed stage hook (or documented Feeds ticket if staged later) + CharacterEngine log id compatibility note |

## Acceptance criteria

- [x] `packages/QuestEngine` exists, LLM-free, on `build:engines` and engine catalogs
- [x] Seeding creates world quests bound to real peer ids; dangling refs rejected when lookups are supplied
- [x] CharacterEngine remains the per-PC quest log; QuestEngine does not duplicate acceptance/status per character in this epic
- [x] Sub-tickets `097.1`–`097.6` completed
- [x] Explicit: prose invention stays in NarrationEngine; DMEngine orchestrates seed timing only

## Sub-tickets

### 097.1 Scaffold QuestEngine package + registry wiring


Create `packages/QuestEngine` (`@weaver/quest-engine`) as a deterministic engine stub with health/catalog surface matching siblings. Wire into `build:engines`, ElectronAdmin, AITTRPG `REQUIRED_ENGINE_IDS`, root README, and delivery-standards engine lists. No quest seed APIs yet.

**Parent:** `097-QuestEngine-World-Quest-Seeding`.

#### Acceptance criteria

- [x] Package builds with `health` / `listEndpoints` / `call`; Vitest covers unknown-endpoint rejection
- [x] Root `build:engines` includes `@weaver/quest-engine`
- [x] ElectronAdmin + ElectronAITTRPG register QuestEngine; AITTRPG health summary includes it
- [x] Root README package table + delivery-standards engine lists updated

### 097.2 Quest template + world-quest instance model


Lock types for templates, seeded world quest instances, and structured objectives with peer FK refs.

**Parent:** `097-QuestEngine-World-Quest-Seeding`. **Depends on:** `097.1`.

#### Acceptance criteria

- [x] Exported types cover template id, world quest instance, kind (`main`/`side`), status for **world** lifecycle if any (`seeded`/`retired` — distinct from CharacterEngine PC log status)
- [x] Objectives support at least NPC / place / item reference kinds with string ids
- [x] In-memory (or engine-local) store helpers unit-tested for shape invariants
- [x] No seeding algorithm in this ticket

### 097.3 Deterministic seedWorldQuests


Implement seeding that turns peer id pools + campaign/world seed into a stable set of world quest instances.

**Parent:** `097-QuestEngine-World-Quest-Seeding`. **Depends on:** `097.2`.

#### Acceptance criteria

- [x] `seedWorldQuests({ campaignId, worldId, seed, pools, counts? })` is deterministic for the same inputs
- [x] Produces a mix of main/side instances with objectives pointing at ids from the supplied pools
- [x] Idempotency policy documented and tested (e.g. re-seed same campaign replaces or no-ops — pick one)
- [x] Unit tests do not require live World/NPC engines (pools are plain id lists)

### 097.4 List/get APIs, endpoints, dangling-FK guards


Query surface + admin endpoints; reject definitions/seeds that reference missing peers when lookups are provided.

**Parent:** `097-QuestEngine-World-Quest-Seeding`. **Depends on:** `097.3`.

#### Acceptance criteria

- [x] `listWorldQuests` / `getWorldQuest` (and delete/clear-campaign if needed) unit-tested
- [x] Admin `call` endpoints cover seed/list/get
- [x] Optional injected `QuestReferenceLookup` rejects unknown NPC/place/item ids at seed/define time with typed errors
- [x] CharacterEngine quest log is not written by QuestEngine in this ticket

### 097.5 Portability + peer contract tests


Campaign portability for seeded world quests; contract tests against real peer APIs where QuestEngine validates FKs.

**Parent:** `097-QuestEngine-World-Quest-Seeding`. **Depends on:** `097.4`.

#### Acceptance criteria

- [x] Export/import round-trips seeded world quests for a campaign
- [x] At least one `*.contract.test.ts` exercises real NPC/Civilization/Item (or documented subset) lookups when FK guards are enabled
- [x] Package README documents ownership split vs CharacterEngine / DMEngine / NarrationEngine

### 097.6 DMEngine campaign-gen seed hook (or Feeds stub)


Connect seeding to campaign generation without QuestEngine inventing prose.

**Parent:** `097-QuestEngine-World-Quest-Seeding`. **Depends on:** `097.3`, `052`.

#### Acceptance criteria

- [x] Either: DMEngine campaign pipeline gains a post-peers quest seed stage that calls real QuestEngine `seedWorldQuests` with pools from World/Regional/Civ/NPC/Item, covered by consumer `*.contract.test.ts`
- [x] Or: if pipeline wiring is deferred, open/document a DMEngine follow-up ticket id in this epic’s Feeds and ship only a README “integration contract” describing stage order + payload — do not leave silent
- [x] CharacterEngine log compatibility: seeded `questId`s are usable as ids in `proposeQuest` / `upsertQuest` without QuestEngine writing the PC log itself
- [x] Root README QuestEngine row mentions campaign-gen seeding responsibility

