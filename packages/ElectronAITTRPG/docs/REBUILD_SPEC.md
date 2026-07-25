# AI-TTRPG — Rebuild Specification

**Purpose:** single source of truth to recreate this product from a clean tree (or empty repo) without rediscovering design from hundreds of board tickets.

**Product name (display):** AI TTRPG
**Package / Electron ids (do not “clean up”):** `ai-dnd-matrix`, `com.davgor.aidndmatrix`  
**Nature:** personal desktop app shared as packaged binaries with friends — not a public SaaS.

When rebuilding, treat this document as the contract. Domain detail that already has a living SPEC under `src/**/SPEC.md` is summarized here and linked; prefer those SPECs for implementation edge cases once the tree exists again.

---

## 1. Product vision

A **single-player, text-adventure-style TTRPG** desktop app. Two cooperating AI roles run fiction:

| Role | Job |
|------|-----|
| **DM agent** | Scenes, plot, encounters, world mutations, quests, loot narration, Ask-the-DM OOC |
| **NPC / party-member agents** | Isolated roleplay for named NPCs and optional AI companions |

Campaigns are **generated from a free-text premise**, reviewed, then played. World state is **durable and causally consistent** (burn a village → later scenes know it). Multiple **player characters** share one campaign world via a **Campaign Hub**.

### Non-negotiable design principles

1. **Engine + SQLite are the source of truth.** Agents narrate and propose; the deterministic rules engine validates/resolves dice, checks, damage, death, currency, travel, and lockouts before persistence.
2. **Every agent call is re-grounded from SQLite**, never from chat history alone. Destroyed regions, dead NPCs, and past choices stick because context is assembled from DB (+ capped RAG).
3. **NPC memory isolation.** Each NPC only sees its own `npc_memories` plus world facts tagged to its region/faction. Cross-NPC leakage is a hard fail.
4. **Campaign-level world, character-level story.** Shared: world prose, pantheon, regions, NPCs, factions, threads, events, `current_state_summary`. Per character: journal, log book, quests, spells, narration history, Social/Scene projections, guided-creation state, `currentRegionId`, owned companions.
5. **Social vs Scene.** Play UI splits player/NPC dialogue (Social, streaming) from DM exposition (Scene).
6. **Provider-agnostic LLM.** Pluggable providers; Settings-driven; no code change to swap clouds.
7. **Plain-English fantasy tone.** No D&D-trademark user copy (see `docs/terminology/ttrpg-replacement-map.md`). Internal “DM” naming is fine.

---

## 2. Tech stack & toolchain

| Layer | Choice |
|-------|--------|
| Shell | Electron (`contextIsolation` on, `nodeIntegration` off, `sandbox` on, narrow typed IPC, CSP) |
| UI | React 18 + TypeScript (renderer) |
| Build | `electron-vite` + Vite; `electron-builder` for NSIS / portable Win + mac DMG |
| DB | SQLite via `better-sqlite3` — **one file per campaign** |
| Test | Vitest (`happy-dom` where needed); CI shards tests; local `npm test` is full |
| Lint | oxlint strict on `src` — **fix code, never relax rules** |
| Deadcode | `ts-prune` vs `.tsprune-ignore` (`npm run deadcode`) |
| Packaging | `release/`; GitHub Releases + `electron-updater` (`latest.yml`) |
| Embeddings (RAG) | Local MiniLM (`@huggingface/transformers`) + optional OpenAI/Gemini cloud embedders; lexical fallback |

### Required scripts (recreate in `package.json`)

```
npm run dev          # Electron + Vite + rebuild better-sqlite3 for Electron
npm run build        # electron-vite build
npm run package:win / package:mac
npm test             # vitest run (pretest: rebuild better-sqlite3 for Node)
npm run lint         # oxlint src
npm run typecheck    # tsc node + web projects
npm run deadcode / deadcode:refresh
npm run terminology:check
```

### Env / providers

| `AGENT_PROVIDER` | Keys / notes |
|------------------|--------------|
| `claude` | `CLAUDE_API_KEY`, optional `CLAUDE_MODEL` |
| `openai` | `OPENAI_API_KEY` |
| `gemini` | `GEMINI_API_KEY` |
| `grok` | `GROK_API_KEY` / `XAI_API_KEY` |
| `player2` | Local OpenAI-compatible at `http://127.0.0.1:4315` (optional `PLAYER2_BASE_URL`) |
| `llamacpp` | Managed local runtime (Settings download + lifecycle) — ship when revisit epic 020 is in scope |

Settings UI is the preferred place for provider + model; `.env` next to the `.exe` (portable) or repo root (dev) still works.

---

## 3. Repository layout (target)

```
/src
  /main       Electron main: window, SQLite, IPC handlers, combat/turn orchestration, tokens, llama/RAG downloads
  /preload    contextBridge APIs (typed, narrow)
  /renderer   React UI (see §8)
  /engine     Pure TS rules — NO Electron, DB, or LLM imports
  /agents     DM/NPC/party/campaign-gen/providers; re-ground from DB-shaped context
  /db         Schema, forward-only migrations, repositories, catalog seeds, RAG
  /shared     Types + domain SPECs shared across processes
/board        Text tickets: backlog → in-progress → done
/docs         Runbooks, research, this rebuild spec
/.cursor + /.claude   Skills: delivery-standards, complete-ticket, …
/.github/workflows    pr-checks.yml, deadcode.yml, deploy
```

**Import boundary (enforce with a unit test):** `/engine` must not import Electron, `better-sqlite3`, or agent/provider modules.

---

## 4. Player journeys (rebuild acceptance spine)

### 4.1 First launch

1. Startup loading stages (provider check, DB ready).
2. Optional Settings intro / provider configuration.
3. Sidebar of campaigns (empty → create).

### 4.2 Create campaign

**UI:** premise prompt, optional name, death mode (`legendary` | `standard` | `respawn`), region count 0–5, NPCs/region 0–10, generative-tokens flag.

**Pipeline stages (strict order):**

`canon → pantheon → world → factions → regions → npcs → bestiary → story → persist`

**Campaign-create LLM contract (critical):**

- Do **not** ask the model for raw JSON.
- Engine builds a JSON **skeleton** with `{{TOKEN}}` / `{{@TOKEN}}` placeholders.
- Model returns `<<<TOKEN>>>…<<</TOKEN>>>` labeled blocks.
- `fillSkeleton` → parse → `normalize*` → validate → persist.
- Outer seed retries (~5); per-stage retries (~3).
- Full change checklist: `docs/runbooks/campaign-create-change-checklist.md`.

**After create:** Campaign Review (edit/regenerate world, pantheon, regions, NPCs, factions, bestiary) → continue into character onboarding (or Hub if characters already exist).

### 4.3 Character onboarding (per PC)

Phases (persisted `guidedCreationPhase`):

`race → background → equipment → companions → identity → opening_scene → complete`

| Phase | Behavior |
|-------|----------|
| Mechanical setup | Archetype, abilities (point buy 12 pts 8–20 / standard array 14/12/10/8 / roll), death already campaign-scoped |
| Race | Campaign-scoped race roster + lore |
| Background | Roster + personal story generation |
| Equipment | Archetype starting loadouts + starter spells |
| Companions | Prompt-generated AI companion (optional skip); face tokens if generative tokens on |
| Identity | AI-guided foundations: **who / why / where / what** |
| Opening scene | AI scene → confirm → enter world |

Old Character Setup “AI Party Members” block stays **hidden**; companions are the dedicated post-equipment step.

### 4.4 Hub & multi-PC

Re-opening a campaign with ≥1 completed character lands on **Campaign Hub** (world preview + cast rail + session recap), not straight into play. Add more PCs via the same onboarding path. Shared world time/causality across PCs.

### 4.5 Play loop

1. Player types in free-text box (exploration or combat actions).
2. Main process: lock turn → interpret intent (+ route) → engine resolve → agent beats → persist → Social/Scene projections.
3. Mechanical outcomes never invented by LLM.
4. Auto-save snapshot after every resolved action (Standard death mode restore).
5. Ask the DM is OOC and **must never** call `turn:resolve`.

### 4.6 Combat

Structured encounter: initiative once (`d20 + Agility`), Action + Movement per turn, engine-owned hit/damage/crits/conditions/dying. Flee, surrender, non-lethal, execute. See `src/shared/combat/SPEC.md`.

### 4.7 Death modes

| Mode | Behavior |
|------|----------|
| Legendary | Permanent death + AI obituary |
| Standard | Restore last auto-snapshot (story-driven death can still stick) |
| Respawn | World rules: relocate, cost, limits |

---

## 5. Rules engine contract

Custom simplified tabletop rules — fully unit-tested in `/engine`.

| Concept | Spec |
|---------|------|
| Abilities | Body, Agility, Mind, Presence; mod = `floor((score-10)/2)` |
| Resolution | `d20 + mod + (proficiency if flagged) vs DC/AC`; adv/disadv |
| Skills | No skill list — DM flags ability + proficiency boolean; engine owns bonus |
| AC | `10 + Agility mod + armor` |
| HP | Hit die + Body at L1; villagers ~10; catalog HP is authoring reference |
| Crit | Nat 20 doubles damage dice |
| Damage | Physical, Fire, Cold, Poison, Arcane + resist/vuln + enchant overlays |
| Conditions | Prone, Stunned, Poisoned, Restrained, Unconscious (`CONDITION_EFFECTS`); dying saves separate |
| Spells/abilities | Cost **turns** (Action lockout), not mana; cost from catalog, not LLM duration |
| Archetypes | Fighter, Rogue, Mage, Cleric, Ranger; L1–20 |
| XP | LLM rates difficulty band; engine applies fixed fraction of level span |
| Level-up | Agent proposes flavor; numbers from `computeFeatureFromTemplate`; engine fallback perks |
| Emergent homebrew | Detect tagged play patterns → optional `custom_feature` fiction; mechanics still templated |
| Time | Day counter; long rest +1 day; travel DM-estimated, engine-clamped |
| Economy | Engine debits/credits currency; clamps DM-proposed prices |

Domain SPECs (implement against these once present):

- `src/engine/hp/SPEC.md`, `startingLoadout/SPEC.md`, `raceSelection/SPEC.md`
- `src/shared/combat/SPEC.md`, `combat/flee/SPEC.md`
- `src/shared/items/SPEC.md`, `loot/SPEC.md`, `spells/SPEC.md`, `quests/SPEC.md`
- `src/shared/progression/SPEC.md`, `rulesDebt/SPEC.md`, `rulesHonesty/SPEC.md`
- `src/shared/commerceTravel/SPEC.md`, `worldMutations/SPEC.md`, `sharedTime/SPEC.md`

---

## 6. Persistence model

One SQLite file per campaign. Forward-only numbered migrations on open.

### Core tables (minimum viable rebuild set)

| Table | Role |
|-------|------|
| `campaigns` | Premise, death mode, world prose, summaries, flags (generative tokens, faction pressure, …) |
| `deities` / pantheon fields | Gods |
| `regions`, `region_history` | Places + seeded history |
| `npcs` | Identity, combat, faction, speaking style, yield state, tokens |
| `npc_memories` | Per-NPC private log |
| `npc_opinions` | Stance toward PC/NPC subjects |
| `characters` | PCs + `ai_party_member` rows; stats JSON; guided fields; life status |
| `world_facts` | Explicit DM-emitted durable facts (not auto-derived) |
| `story_threads`, `events`, `sessions` | Plot + append-only log + session metadata |
| `items`, `character_items`, `character_item_modifications` | Inventory / equipment / enchantments |
| `log_entries`, `character_journal_entries` | Log book + journal |
| `guided_creation_messages` | Identity / opening transcript |
| `combat_encounters` | Active/resolved encounter state |
| `campaign_races` | Realize-once race lore |
| `factions`, `faction_relations`, `character_faction_reputations` | Social graph |
| `bestiary_species`, `bestiary_variants`, `quest_foe_assignments` | Campaign bestiary |
| `catalog_creatures`, `catalog_spells`, `catalog_bucket_tags` | Seeded content catalog |
| `saves` | Auto snapshots for Standard death |
| `ask_dm_messages` | OOC Ask-the-DM history |
| `llm_usage_events` | Metering |
| RAG chunk / embedder meta tables | Hybrid retrieval index |

**Catalog:** seed creatures/spells on migrate; taxonomy + seed format live in `docs/runbooks/catalog-*.md`.

**Portability:** export/import/backup campaign packages (`src/shared/campaignPortability/SPEC.md`).

---

## 7. Agents & LLM contracts

### Provider adapter interface

Common chat-completions-shaped adapter with:

- Retries / serial queue (local providers)
- Usage recording → `llm_usage_events`
- Token escalation / purpose guards where applicable
- Settings + env resolution (`selectProvider`)

### Major agent entry points

| Module | Responsibility |
|--------|----------------|
| `campaignGeneration/*` | Cascading create + skeleton fill + normalize/persist |
| `dm.ts` / `intentAndRoute.ts` | Intent + routing (merged call); narration |
| `turnRoutingHeuristic.ts` | Skip LLM routing for provably simple turns |
| `npc.ts`, `partyMember.ts`, `inactivePlayer.ts` | Roleplay / proxy |
| `guidedIdentity*`, `guidedOpeningScene`, `guidedPlayerReply` | Onboarding chat |
| `companionGenerate.ts` | Post-equipment companions |
| `levelUp.ts`, `xp.ts`, `loot.ts` | Progression / rewards flavor |
| `askDm.ts` | OOC only |
| `obituary.ts`, `fleeNarration`, `yieldReview`, … | Outcome flavor |
| `worldMutationNarration`, place/NPC play mint | Live world population |
| `bestiary/*` | Species generation + quest foe assignment |

### Turn routing (play)

See `src/shared/turnRouting/SPEC.md`. Summary:

1. Heuristic may supply a deterministic plan → intent-only LLM call.
2. Else merged `interpretIntentAndRoute`.
3. `dmNarration` is the write path for world facts, quests, journal/log grants, mutations, etc.
4. Commerce/travel also have a dedicated engine branch so debit/move cannot starve.
5. Combat active → combat path; no ad-hoc reaction damage outside combat turns.
6. Ask-the-DM never mutates turn state.

### Context & RAG

- Slim context budgets (token caps / truncation) — epic 040 class constraints.
- RAG selects existing rows into prompts within a hard injection cap; always-on fields (HP, present NPCs, combat state, …) are **not** replaced by RAG. See `src/db/rag/SPEC.md`.
- Embedder mode: lexical fallback if assets/keys missing; Settings picker for local/cloud when rebuilt.

### Campaign-create tone guards

Reject / normalize jargon and bad epithet shapes (e.g. pantheon hyphen epithets) in normalize layer — keep prose fantasy-plain.

---

## 8. UI surfaces (renderer)

Rebuild these modules as first-class routes/panels:

| Area | Job |
|------|-----|
| `titlebar` | Frameless min/max/close |
| `sidebar` | Campaign list, delete |
| `startup` | Boot stages |
| `settings` / `settingsIntro` | Providers, models, llama, embeddings, image rails |
| `campaignStart` | New campaign modal |
| `campaignReview` | World review / regenerate |
| `campaignHub` | Multi-PC cast + recap |
| `characterSetup` | Mechanical creation |
| `raceSelection` / `backgroundSelection` / `equipmentSelection` / `companionsSelection` | Onboarding steps |
| `guidedCreation` | Identity + opening scene chat |
| `playView` | Scene + Social, combat chrome, Ask DM, ErrorBoundary |
| `characterSheet` | Stats, gear, journal, log, quests, spellbook |
| `npcDossier` / `relationshipWeb` | NPC depth UI |
| `autoUpdate` | Update banner |
| `inCampaign` | Shared layout chrome |

Visual language: existing dark fantasy play UI — when refreshing, prefer continuity over a generic dashboard look. Generative face/creature/PC icons are optional behind the campaign generative-tokens flag.

---

## 9. IPC surface (preload → main)

Expose only via `contextBridge` (names as in current preload):

`windowControls`, `campaigns`, `files`, `characters`, `logBook`, `npcDossier`, `relationshipWeb`, `journal`, `askDm`, `quests`, `spellbook`, `turn`, `combat`, `progression`, `startup`, `guidedCreation`, `companions`, `startingLoadout`, `race`, `background`, `settings`, `llmUsage`, `settingsIntro`, `autoUpdate`

**Security baseline (do not regress):** no Node in renderer; no broad `ipcRenderer` exposure; typed channel allowlist only.

---

## 10. Packaging & distribution

- Product name: **AI TTRPG**
- Windows: NSIS installer (auto-update) + portable `.exe`
- macOS: `.dmg` (arm64 + x64)
- Publish: GitHub Release artifacts + `latest.yml`
- Portable: user places `.env` beside the exe
- App icon under `build/`

---

## 11. Engineering workflow (mandatory)

1. **Board tickets** under `/board` with Description + checkable Acceptance Criteria before/during work.
2. **TDD-first** for `/engine`, `/db`, agents, IPC, and other testable logic.
3. **Verify before done:**
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - `npm run deadcode`
   - `act` on `.github/workflows/pr-checks.yml` and `deadcode.yml` (Docker required)
4. Campaign-create changes: also run `docs/runbooks/campaign-create-change-checklist.md`.
5. Skills: `.claude/skills/delivery-standards/SKILL.md` and `complete-ticket` (keep Cursor copies in sync).

Smoke runbooks live in `docs/runbooks/` — recreate critical ones early (startup, campaign create, gameplay loop, combat, guided creation, hub).

---

## 12. Phased rebuild order

Use this sequence so each phase is playable or testable before stacking the next.

### Phase A — Scaffold & safety

- Electron + React + TS monorepo layout (`main` / `preload` / `renderer` / `engine` / `db` / `shared` / `agents`)
- Security baseline, frameless window, empty sidebar
- Vitest + oxlint + CI workflows + deadcode gate
- Terminology map + `terminology:check`
- Delivery-standards / complete-ticket skills

**Exit:** `npm run dev` opens an empty shell; CI green on scaffold.

### Phase B — Engine

- Abilities, dice, checks, saves, AC, HP, damage, conditions, dying
- Combat initiative/turns, flee/yield eligibility
- XP, perks, feature templates, turn lockout, travel/rest, pricing clamps
- Import-boundary test

**Exit:** engine unit suite green; no Electron deps.

### Phase C — DB + repositories

- Schema + migrations runner
- Campaign/character/region/NPC CRUD
- Catalog seeds
- Saves snapshots
- Portability later (can follow Phase F)

**Exit:** create/open/delete campaign file round-trip in tests.

### Phase D — Providers + Settings

- Provider interface + Claude/OpenAI/Gemini/Grok/Player2
- Settings store + IPC + UI
- Usage metering hooks
- Connection check

**Exit:** Settings can call a live or mocked provider.

### Phase E — Campaign generation

- Skeleton-fill protocol + normalize + persist
- Create IPC + progress events
- Review UI (minimal then full)
- Contract tests with labeled-block fixtures

**Exit:** premise → persisted campaign with regions/NPCs/factions/bestiary/story.

### Phase F — Character onboarding

- Mechanical setup → race → background → equipment → companions → guided identity → opening scene
- Stage routing / play gate until `complete`
- Hub for multi-PC

**Exit:** one PC can reach play; second PC can be added from hub.

### Phase G — Play loop

- Turn IPC: intent/route → engine → beats → Social/Scene
- Heuristic routing + merged LLM call
- World facts, journal/log, quests
- Commerce/travel branch
- Hard world mutations
- Play resilience (ErrorBoundary, turn failure recovery)
- Ask the DM (OOC)

**Exit:** smoke: converse, check, rest, travel, buy/sell without crashes.

### Phase H — Combat & progression

- Encounter lifecycle, attacks, flee/surrender, loot, XP, level-up ceremony
- Bestiary spawn / foe assignment
- Death modes + obituaries

**Exit:** combat smoke + progression smoke green.

### Phase I — Social depth & tokens

- Factions/reputation, NPC dossier, relationship web
- Speaking styles, selective NPC replies
- Face/creature/PC generative tokens + image provider rails (as scoped)
- Session recap on hub

### Phase J — RAG & efficiency

- Chunk index, hybrid retrieve, embedder selection
- Context caps / templates from efficiency epic
- Wire DM/NPC/party grounding

### Phase K — Packaging & polish

- NSIS + portable + DMG, auto-update
- LLM usage UI export
- Export/import campaigns
- Live population (mint place/NPC in play)
- Shared multi-PC time

### Phase L — Optional / revisit / moonshots

| Id | Intent |
|----|--------|
| **020** | Local llama.cpp full Settings lifecycle |
| **143** | World grid spatial model (data/APIs; not sprite play) |
| **m001+** | Broader image gen (region backgrounds) |
| **m002** | Host-driven multiplayer |
| **m003** | Mod homebrew packs |
| **m004** | Pixel/sprite campaign type |
| **m005** | Thin remote client → host PC LLM |

---

## 13. Feature inventory checklist

Use as a rebuild completeness audit (shipped product scope).

**World & create**

- [ ] Cascading create with configurable region/NPC counts
- [ ] Pantheon, factions (pressure bands), bestiary prep (≥3 species)
- [ ] Review regenerate/edit surfaces
- [ ] History-aware additional regions; live place/NPC mint in play
- [ ] Hard world mutations (typed, engine-persisted)
- [ ] Campaign export/import/backup
- [ ] Generative tokens campaign flag

**Characters**

- [ ] Multi-PC hub + cast rail + session recap
- [ ] Race / background / starting loadouts / companions
- [ ] Guided identity (who/why/where/what) + opening scene
- [ ] Character sheet: equipment slots, journal, log book, quests, spellbook
- [ ] PC icon generate/upload
- [ ] Inactive PC AI proxy + cross-character log writes

**Play**

- [ ] Social/Scene split + streaming Social
- [ ] Merged intent+route + heuristic fast path
- [ ] Combat full lifecycle + flee/yield/loot
- [ ] Commerce & travel intents
- [ ] Factions/reputation in narration
- [ ] Ask the DM OOC
- [ ] Play-shell resilience
- [ ] Shared campaign time

**Systems**

- [ ] Content catalog + bestiary
- [ ] RAG hybrid retrieval + embedder modes
- [ ] Multi-cloud Settings + usage metering
- [ ] Auto-update
- [ ] NPC dossier + relationship web
- [ ] Face / enemy / companion tokens

---

## 14. Domain SPEC index

Keep or recreate these as the detailed contracts (path = canonical):

| Path | Topic |
|------|-------|
| `src/shared/combat/SPEC.md` | Encounters |
| `src/shared/combat/flee/SPEC.md` | Flee |
| `src/shared/turnRouting/SPEC.md` | Play routing |
| `src/shared/campaignHub/SPEC.md` | Multi-PC hub |
| `src/shared/playResilience/SPEC.md` | Turn failure UX |
| `src/shared/playPopulation/SPEC.md` | Live mint |
| `src/shared/worldMutations/SPEC.md` | Hard mutations |
| `src/shared/sharedTime/SPEC.md` | Multi-PC time |
| `src/shared/commerceTravel/SPEC.md` | Buy/sell/travel |
| `src/shared/factions/SPEC.md` | Factions |
| `src/shared/npcDossier/SPEC.md` | Dossier |
| `src/shared/npcRelationships/SPEC.md` | Opinions web |
| `src/shared/npcCombat/SPEC.md` | NPC combat hydration |
| `src/shared/npcFaceTokens/SPEC.md` | NPC portraits |
| `src/shared/creatureTokens/SPEC.md` | Enemy tokens |
| `src/shared/playerCharacterIcons/SPEC.md` | PC icons |
| `src/shared/partyMembers/SPEC.md` | Companions |
| `src/shared/bestiary/SPEC.md` | Bestiary |
| `src/shared/quests/SPEC.md` | Quests |
| `src/shared/journal/SPEC.md` | Journal |
| `src/shared/items/SPEC.md` | Items |
| `src/shared/loot/SPEC.md` | Loot |
| `src/shared/spells/SPEC.md` | Spells |
| `src/shared/progression/SPEC.md` | XP/level-up |
| `src/shared/llmUsage/SPEC.md` | Metering |
| `src/shared/campaignPortability/SPEC.md` | Export/import |
| `src/shared/sessionRecap/SPEC.md` | Hub recap |
| `src/shared/weaponModifications/SPEC.md` | Enchantments |
| `src/shared/rulesDebt/SPEC.md` | Closed rules gaps |
| `src/shared/rulesHonesty/SPEC.md` | Conditions/homebrew honesty |
| `src/db/rag/SPEC.md` | RAG |
| `src/engine/hp/SPEC.md` | HP |
| `src/engine/startingLoadout/SPEC.md` | Starting gear |
| `src/engine/raceSelection/SPEC.md` | Races |
| `src/shared/inCampaignLayout/*_SPEC.md` | Layout / Ask DM / Play UX |

---

## 15. What “done” looks like for a rebuild

A rebuild is successful when:

1. `npm run dev` supports create → onboard → hub → play → combat → death-mode behavior end-to-end with a configured provider.
2. Engine/DB/agent/IPC tests + lint + build + deadcode pass; `act` CI green.
3. Campaign-create contract tests pass with skeleton/labeled-block fixtures.
4. Electron security baseline unchanged.
5. `/engine` import boundary intact.
6. Multi-PC shared world + per-PC story isolation hold under smoke tests.
7. Packaging produces runnable Win portable (and optionally NSIS/mac) artifacts.

---

## 16. Pointers for humans refreshing the tree

- Prefer **copying out** this file + `docs/runbooks/` + `src/**/SPEC.md` + terminology map **before** wiping code.
- Board history under `/board/done` is archaeology, not required to rebuild — this doc + SPECs replace it.
- Do not rename package/`appId` if you want updater/install continuity with existing friend installs.
- If Docker is unavailable, do not claim CI done; run `act` once Docker is up.

---

*Generated as a rebuild contract for AI-TTRPG. Prefer updating this file when product invariants change; keep domain SPECs as the deep implementation contracts.*
