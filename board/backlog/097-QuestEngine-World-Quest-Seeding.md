# EPIC: QuestEngine world-quest seeding

Add `packages/QuestEngine` (`@weaver/quest-engine`): deterministic, LLM-free owner of **world/campaign quest definitions and seeded instances** bound to real world facts (regions, settlements/places, NPCs, items, optional dungeon ids). Today quests are only a thin CharacterEngine log (`questId` / kind / status / title) plus DM propose/complete orchestration (`028` / `056`) — nothing seeds a coherent world quest graph at campaign generation time.

**Depends on:** `012` / `013` / `016` (world/region/settlement facts to bind), `028-CharacterEngine-Journal-Logbook-Quests-Spellbook` (PC quest log remains the acceptance surface), `037` / `032` (NPC/item ids for FK targets), `052-DMEngine-Campaign-Generation-Pipeline` (orchestration host for a seed stage).

**Feeds:** `098-CampaignEngine-Full-Bootstrap-And-Admin-Inspect` (preferred host for quest seed during full bootstrap), DMEngine campaign-gen quest stage / `proposeQuest` (should reference QuestEngine definitions), NarrationEngine quest flavor fill (titles/briefs via Narration — QuestEngine stores validated text + structure, does not invent). Location-gated offers may use `096-CharacterEngine-Location-Ownership` later (not a hard dependency for seeding).

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

- [ ] `packages/QuestEngine` exists, LLM-free, on `build:engines` and engine catalogs
- [ ] Seeding creates world quests bound to real peer ids; dangling refs rejected when lookups are supplied
- [ ] CharacterEngine remains the per-PC quest log; QuestEngine does not duplicate acceptance/status per character in this epic
- [ ] Sub-tickets `097.1`–`097.6` completed
- [ ] Explicit: prose invention stays in NarrationEngine; DMEngine orchestrates seed timing only
