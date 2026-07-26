# EPIC: CampaignEngine full bootstrap & Admin inspect

Add `packages/CampaignEngine` (`@weaver/campaign-engine`): the **culmination engine** that fully prepares a playable campaign for existence by orchestrating peer engines — world, regions, civilizations, NPCs, enemies, dungeons, quests, weather readiness, character-location hooks — and exposes **generate + inspect** APIs so ElectronAdmin can create a campaign and browse every durable artifact it produced.

Today campaign generation lives inside DMEngine (`052`) and is only wired through ElectronAITTRPG create/review. Admin can poke individual engine endpoints but has **no campaign generate path and no aggregate inspector**. Stub campaign SQLite tables (`campaign_characters` / `campaign_npcs` / `campaign_quests`) are unused; dungeons/weather/world quests/location are not seeded by the current pipeline.

**Depends on:** `012`/`013`/`016`/`037`/`045`/`052`/`081`/`086` (world/region/civ/NPC/enemy/DM gen+SQLite/dungeon), `094-WeatherEngine-Climate-And-World-Mutations`, `096-CharacterEngine-Location-Ownership`, `097-QuestEngine-World-Quest-Seeding`. Soft: `095` (rest recovery ready for play, not required to seed). **Feeds:** ElectronAdmin campaign explorer, ElectronAITTRPG campaign create (migrate off DM-owned gen), DMEngine play-time (turns/intents consume a CampaignEngine-ready campaign).

**Ownership split (chosen):**

| Package | Owns |
|---------|------|
| **CampaignEngine** | Deterministic **bootstrap plan** (stage graph, counts, peer call order); **campaign readiness** report; **inspect aggregate** (`inspectCampaign` / entity indexes by `campaignId` + `dataRoot`); Admin generate+inspect endpoints. May host the migrated Narration-driven gen loop moved out of DMEngine (or wrap `runCampaignGeneration` during transition). Does **not** invent lore itself. |
| **DMEngine** | Play-time orchestration (turns, intents, ask-DM, quest propose-to-PC-log); campaign **SQLite open/create/migrations**; calls CampaignEngine to bootstrap rather than owning the long-term gen graph |
| **Peer engines** | Entity truth (World, Regional, Civ, NPC, Enemy, Dungeon, Quest, Weather, Character location, Item, …) |
| **NarrationEngine** | Prose fill/validate for content-bearing stages only |
| **ElectronAdmin** | UI chrome to run generate and render inspect trees — wiring only |

**Out of scope:** Replacing DM turn routing; multiplayer; inventing a second SQLite schema that duplicates peer stores; HTTP server.

**LLM boundary:** CampaignEngine must not call LLMEngine for invention. Content stages go NarrationEngine → peer persist, same contract as `052`. Structural seed stages (dungeon layout, quest seed, weather field apply, location set) stay deterministic.

## Bootstrap surface (epic-level)

A successful `generateCampaign` (name TBD) yields a campaign that is **inspectable** and **play-ready**:

1. Campaign SQLite handle exists (`DMEngine.createCampaign` / open)
2. World + expansions, regions, civilizations + placeholders
3. Factions, NPCs assigned to slots, enemy bestiary/foes as today
4. **Dungeon** instances linked to overworld entrances where applicable
5. **QuestEngine** `seedWorldQuests` with pools from peers
6. **Weather** initial field apply (or documented readiness hook) over starting regions
7. **Character location** readiness: starting region/place hooks available for PCs (even before guided creation finishes)
8. Catalog/lore summaries persisted for hub/review
9. `inspectCampaign` returns a structured index of all of the above (ids, counts, links) without requiring the operator to know every peer endpoint

## Core APIs

| Function | Behavior |
|----------|----------|
| `generateCampaign` | Run full bootstrap against `dataRoot` + options (seed, counts); returns campaign id + readiness summary |
| `inspectCampaign` | Aggregate read model: worlds, regions, settlements, NPCs, foes, dungeons, world quests, weather overlays summary, character locations, catalog lore — via peer public APIs |
| `getCampaignReadiness` | Checklist of required peers/stages (pass/fail + missing counts) |
| `listCampaignArtifacts` | Flat/paginated artifact index for Admin tree views |

## Supporting APIs

| Function | Why |
|----------|-----|
| `health` / `listEndpoints` / `call` | Admin catalog parity |
| Migrate or wrap DM `runCampaignGeneration` | Single gen entrypoint; AITTRPG eventually calls CampaignEngine |
| Contract tests | CampaignEngine→each peer used in generate/inspect |

## Sub-tickets

| Id | Summary |
|----|---------|
| `098.1` | Scaffold CampaignEngine + registry/README/delivery-standards wiring |
| `098.2` | Readiness model + `inspectCampaign` aggregate over existing peer APIs (pre-gen may be empty/partial) |
| `098.3` | Host/migrate campaign generation pipeline into CampaignEngine (wrap first OK); Admin `generateCampaign` endpoint |
| `098.4` | Extend bootstrap: dungeon seed + overworld entrances |
| `098.5` | Extend bootstrap: QuestEngine world-quest seed + CharacterEngine location hooks |
| `098.6` | Extend bootstrap: WeatherEngine initial field / readiness |
| `098.7` | ElectronAdmin Campaign Explorer UI (generate + inspect tree; wiring-only containers) |
| `098.8` | Portability/index completeness + cross-package contracts; AITTRPG create path cutover or dual-call note |

## Acceptance criteria

- [ ] `packages/CampaignEngine` exists, on `build:engines` and Admin/AITTRPG catalogs
- [ ] Operator can **generate a campaign from ElectronAdmin** and **inspect all seeded peer data** through CampaignEngine inspect APIs (world → regions → civs → NPCs → enemies → dungeons → quests → weather → location readiness)
- [ ] Bootstrap includes dungeon, quest, weather, and location stages beyond today’s DM-only gen graph
- [ ] DMEngine remains play-time + SQLite lifecycle; does not permanently own a competing gen graph
- [ ] Narration-only invention boundary preserved
- [ ] Sub-tickets `098.1`–`098.8` completed
