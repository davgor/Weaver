# AI-TTRPG — Rebuild Specification

**Purpose:** rebuild orientation for recreating this product from a clean tree without rediscovering design from hundreds of board tickets.

**Product name (display):** AI TTRPG
**Package / Electron ids:** `@weaver/electron-aittrpg`, `com.davgor.weaver.aittrpg`
**Nature:** personal desktop app shared as packaged binaries with friends — not a public SaaS.

This file is a historical rebuild map. The living contracts in the Weaver tree are package READMEs, package tests, and `/board` epics. The monolith-era `src/**/SPEC.md` files referenced by older versions of this document are not present under `packages/`; use [`SPEC-INDEX.md`](SPEC-INDEX.md) for each historical SPEC path and its current replacement.

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
7. **Plain-English fantasy tone.** No D&D-trademark user copy (see `packages/NarrationEngine/src/terminologyMap.ts`; verify with `npm run terminology:check`). Internal “DM” naming is fine.

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

## 3. Repository layout (current monorepo)

```
/packages
  /ActionEngine        Actions, effects, ranges, and turn-cost lockouts
  /CharacterEngine     PC facts, checks, HP, journals/logs/quests, rest/time
  /CombatEngine        Encounters, initiative, turns, hit/damage, flee/yield
  /DMEngine            Campaign orchestration, routing, campaign-bundle lifecycle
  /EnemyEngine         Bestiary, foe generation, combat-token hook
  /ItemEngine          Items, inventory, currency, loot, starting gear
  /LLMEngine           Local/provider raw text completion and usage metering
  /NarrationEngine     Story prose and portrait-token invention with validation
  /NPCEngine           NPC construction, memory/social facts, placement
  /QuestEngine         World quest templates and seeded campaign instances
  /ElectronAITTRPG     AI TTRPG Electron chrome, IPC, renderer UI, packaging
  /ElectronAdmin       AI ADMIN Electron chrome and dev surfaces
/board                       Text tickets: backlog → in-progress → done
/packages/ElectronAITTRPG/docs
                             Rebuild spec, SPEC audit index, and runbooks
/.cursor + /.claude   Skills: delivery-standards, complete-ticket, …
/.github/workflows    pr-checks.yml, deadcode.yml, deploy
```

Electron packages own UI, IPC, packaging, and app chrome only. Business rules and durable facts live in `packages/*Engine` libraries and are consumed through published exports with consumer contract tests. Deterministic engines must not import Electron or LLM providers; only NarrationEngine invents story prose/visual tokens, and only DMEngine orchestrates those results into peer-engine APIs.

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
- Recreate or restore a campaign-create change checklist when changing this path. The current checked-in runbook is [`docs/runbooks/playability-smoke.md`](runbooks/playability-smoke.md).

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

Structured encounter: initiative once (`d20 + Agility`), Action + Movement per turn, engine-owned hit/damage/crits/conditions/dying. Flee, surrender, non-lethal, execute. See the [CombatEngine README](../../CombatEngine/README.md), epics [048](../../../board/done/048-CombatEngine-Encounter-Lifecycle.md)–[051](../../../board/done/051-CombatEngine-Dynamic-Start-And-Triggers.md), and [`SPEC-INDEX.md`](SPEC-INDEX.md).

### 4.7 Death modes

| Mode | Behavior |
|------|----------|
| Legendary | Permanent death + AI obituary |
| Standard | Restore last auto-snapshot (story-driven death can still stick) |
| Respawn | World rules: relocate, cost, limits |

---

## 5. Rules engine contract

Custom simplified tabletop rules — fully unit-tested in the owning engine packages.

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

Historical domain SPEC paths are audited in [`SPEC-INDEX.md`](SPEC-INDEX.md). Implement against package READMEs, public APIs, tests, and board epics instead of recreating monolith `src/**/SPEC.md` files. `rulesDebt` and `rulesHonesty` were monolith cleanup placeholders and are intentionally obsolete.

---

## 6. Persistence model

The intended production shape is one durable campaign-store boundary with
forward-only numbered migrations. Current Weaver splits this work into two
layers:

- **Campaign-bundle SQLite (epic [081](../../../board/done/081-DMEngine-Campaign-Persistence-And-Migrations.md)):**
  DMEngine owns create/open/migrate for the campaign file and currently stores
  cross-cutting stubs (`campaign_meta`, character/NPC/quest references, seeded
  catalog entries).
- **Engine-local stores and in-memory services:** deterministic packages keep
  package-owned facts behind their own APIs today. DMEngine coordinates them but
  should not duplicate peer-engine internals into the bundle.
- **Production path:** backlog epic [106](../../../board/done/106-DMEngine-Production-Campaign-Stores.md)
  promotes durable campaign facts into the production campaign-store path after
  the 081 stubs. Treat the broad table below as the target inventory for 106+
  work, not as the current 081 schema.

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

**Catalog:** seed creatures/actions on migrate through engine APIs and DMEngine
seed hooks. Restore dedicated catalog runbooks only when the catalog pipeline
needs operator steps.

**Portability:** export/import/backup campaign packages are covered by
[059](../../../board/done/059-DMEngine-Campaign-Portability.md) and the full
slice backlog in [108](../../../board/backlog/108-Repo-Full-Campaign-Portability-Slices.md).

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

See the [DMEngine README](../../DMEngine/README.md), [053](../../../board/done/053-DMEngine-Turn-Routing.md), and [`SPEC-INDEX.md`](SPEC-INDEX.md). Summary:

1. Heuristic may supply a deterministic plan → intent-only LLM call.
2. Else merged `interpretIntentAndRoute`.
3. `dmNarration` is the write path for world facts, quests, journal/log grants, mutations, etc.
4. Commerce/travel also have a dedicated engine branch so debit/move cannot starve.
5. Combat active → combat path; no ad-hoc reaction damage outside combat turns.
6. Ask-the-DM never mutates turn state.

### Context & RAG

- Slim context budgets (token caps / truncation) — see [062](../../../board/done/062-DMEngine-Context-Efficiency-And-Rag-Integration.md).
- NarrationEngine owns RAG retrieval primitives from [065](../../../board/done/065-NarrationEngine-Rag-Retrieval.md) under `packages/NarrationEngine/src/rag/`.
- Live DM/NPC/party grounding through RAG is backlog [111](../../../board/backlog/111-DMEngine-Live-Rag-And-Context-Integration.md) and depends on the production campaign-store path in [106](../../../board/done/106-DMEngine-Production-Campaign-Stores.md).
- Always-on fields (HP, present NPCs, combat state, …) are **not** replaced by RAG.

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
2. **TDD-first** for engine packages, shared scripts, IPC, and other testable logic.
3. **Verify before done:**
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - `npm run deadcode`
   - Remote CI gate per delivery standards (cloud: GitHub PR checks; desktop: `npm run ci:act`)
4. Campaign-create changes: restore or update a dedicated checklist if that path changes.
5. Skills: `.claude/skills/delivery-standards/SKILL.md` and `complete-ticket` (keep Cursor copies in sync).

Current checked-in smoke runbook: [`docs/runbooks/playability-smoke.md`](runbooks/playability-smoke.md). Recreate additional operator runbooks only when the surface needs them.

---

## 12. Phased rebuild order

Use this sequence so each phase is playable or testable before stacking the next.

### Phase A — Scaffold & safety

- Electron + React + TS monorepo layout (`packages/*Engine`, `ElectronAITTRPG/src/main`, `preload`, `renderer`, `shared`)
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

- NarrationEngine RAG primitives from [065](../../../board/done/065-NarrationEngine-Rag-Retrieval.md)
- Live DM/NPC/party grounding via backlog [111](../../../board/backlog/111-DMEngine-Live-Rag-And-Context-Integration.md), after campaign stores [106](../../../board/done/106-DMEngine-Production-Campaign-Stores.md)
- Context caps / templates from efficiency epic

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

Historical monolith SPEC paths and their replacements are maintained in
[`SPEC-INDEX.md`](SPEC-INDEX.md). Do not assume `src/**/SPEC.md` exists in the
Weaver monorepo; package READMEs, tests, and board epics are the living
contracts.

---

## 15. What “done” looks like for a rebuild

A rebuild is successful when:

1. `npm run dev` supports create → onboard → hub → play → combat → death-mode behavior end-to-end with a configured provider.
2. Engine/DM/IPC tests + lint + build + deadcode pass; remote CI gate green per the current delivery standards.
3. Campaign-create contract tests pass with skeleton/labeled-block fixtures.
4. Electron security baseline unchanged.
5. Engine package import boundaries intact.
6. Multi-PC shared world + per-PC story isolation hold under smoke tests.
7. Packaging produces runnable Win portable (and optionally NSIS/mac) artifacts.

---

## 16. Pointers for humans refreshing the tree

- Prefer copying out this file, [`SPEC-INDEX.md`](SPEC-INDEX.md), package READMEs, `docs/runbooks/`, and relevant `/board` epics before wiping code.
- Board history under `/board/done` is living archaeology for shipped decisions; use package READMEs and this index for the current map.
- Do not rename `@weaver/electron-aittrpg` or `com.davgor.weaver.aittrpg` unless intentionally resetting installer/updater continuity.
- If Docker is unavailable in a desktop session, do not claim local `act` CI done; in cloud sessions use the GitHub PR-check gate instead.

---

*Historical rebuild contract for AI-TTRPG. Prefer updating this file and `SPEC-INDEX.md` when product invariants or package ownership change.*
