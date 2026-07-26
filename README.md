# Weaver

TypeScript monorepo for a modular TTRPG game. Deterministic engines own rules and data; **LLMEngine** owns only local model install/runtime and raw text passthrough (`completeText`). LLMs only invent through **NarrationEngine** (validated against peer engines) and orchestrate through **DMEngine** (API calls into other packages — no invented facts).

## For AI agents working on this repo

Package names encode where code belongs. Follow these conventions on every change.

### Naming conventions

| Prefix / suffix | Meaning | Put here | Do not put here |
|-----------------|---------|----------|-----------------|
| `Electron*` | Releasable Electron **UI** app (desktop shell, IPC, React chrome) | Windowing, preload bridges, renderer UI, packaging, auto-update, DEV/admin surfaces that call engines | Combat/world/item/NPC/enemy rules, story invention, DM orchestration, any durable game facts |
| `*Engine` | Library package under `packages/` with testable APIs | Rules, generation, construction, validation, LLM orchestration (only where noted below) | Electron main/renderer code, app chrome, installer config |

**Rule of thumb:** if a package directory starts with `Electron`, it is a UI releasable Electron app. Business logic must not live there — implement it in the appropriate engine package and call that engine from the Electron shell.

**Cross-package contracts:** packages stay isolated; integrations go through published APIs only. Whenever one package calls another’s API, the **consumer** must have `*.contract.test.ts` coverage against the real provider (see delivery-standards skill). Unit tests do not replace contract tests at the peer boundary.

**LLM boundary (engines only):** **LLMEngine** owns the local model runtime, install lifecycle, and raw `completeText({ prompt, context?, maxTokens? })` passthrough (UI packages prompt the download). It does not provide JSON/schema/tool modes or decide which APIs to call. Only **NarrationEngine** invents story prose (and must validate against peer engine data). Only **DMEngine** orchestrates the LLM against other engines via their APIs — it must not invent combat/world/item/NPC/enemy/**action** facts. Deterministic engines stay LLM-free and must not import Electron or LLM providers.

### Package details

| Package | npm name | Role |
|---------|----------|------|
| `packages/CombatEngine` | `@weaver/combat-engine` | **Deterministic combat rules and resolution.** Owns turn order, hit/damage resolution, and related combat state — no Electron, no LLM invention. Consumes ActionEngine when a combatant uses an ability (lockout / effect application); does not own ability definitions. |
| `packages/ActionEngine` | `@weaver/action-engine` | **Deterministic abilities & effects.** Spells and class actions are one `Action` type (flavor tags are cosmetic): shared effect catalog, typed ranges (`feet` or `meleeWeapon`), Action-turn costs — no mana, no LLM invention. Combat, Character, DM, and Electron callers use this package for ability/effect facts instead of branching on spell vs. class-action flavor. |
| `packages/CharacterEngine` | `@weaver/character-engine` | **Deterministic player-character facts and core resolution.** Owns Body/Agility/Mind/Presence, ability modifiers, `d20 + modifier + optional proficiency` checks, and AC from Agility plus caller-supplied armor. Later epics add HP, XP/leveling, archetypes, death modes, journal/log book/quest log/known-action list (UI may still say “spellbook”). Known action *ids* live here; ActionEngine owns definitions. No Electron, no LLM invention. |
| `packages/WorldEngine` | `@weaver/world-engine` | **Perlin-based world generation** for each game/campaign. Terrain/map facts live here so narration and UI consume generated data rather than inventing geography. Sparse overlays (including `landTypeOverride`) let peers like WeatherEngine mutate effective cell reads without rewriting packed chunks. |
| `packages/RegionalEngine` | `@weaver/regional-engine` | **Deterministic map segmentation** over WorldEngine cells. Assigns machine region ids and LLM-ready summary stats (no display names or prose). LLM-free. |
| `packages/CivilizationEngine` | `@weaver/civilization-engine` | **Deterministic settlements on regions** (farmhouse → city), population ledger, map overlays, and NPC placeholder slots for later assignment. LLM-free; no NPC construction or display names. |
| `packages/DungeonEngine` | `@weaver/dungeon-engine` | **Deterministic instanced dungeon maps** — finite multi-floor room/corridor layouts with engine-local hybrid storage. Parallel to WorldEngine’s overworld; LLM-free. |
| `packages/WeatherEngine` | `@weaver/weather-engine` | **Deterministic climate / weather fields** that mutate WorldEngine cell **results** via sparse overlays (effective `landType` overrides) without rewriting packed Perlin chunks. LLM-free; does not invent terrain. |
| `packages/NarrationEngine` | `@weaver/narration-engine` | **LLM story invention + validation — prose and visual tokens.** Owns Social (streaming dialogue) vs Scene (DM exposition) projections; invents prose only after claim checks against peer engines, and NPC/enemy/companion/PC portraits the same way. The sole package allowed to invent narrative text or generated imagery (see board epics `063`, `066`). |
| `packages/ItemEngine` | `@weaver/item-engine` | **Create and modify game items.** Item definitions, mutations, and inventory-facing item APIs — deterministic, LLM-free. |
| `packages/NPCEngine` | `@weaver/npc-engine` | **Construct NPCs** for campaigns (stats, identity, placement data). Deterministic construction; dialogue flavor may be narrated elsewhere but NPC facts stay here. |
| `packages/EnemyEngine` | `@weaver/enemy-engine` | **Construct enemies** for combat encounters. Encounter-ready enemy data consumed by CombatEngine / DM orchestration. |
| `packages/DMEngine` | `@weaver/dm-engine` | **DM / story control via engine APIs.** Orchestrates peer engines (and the LLM against those APIs), owns campaign SQLite open/create/migrations, and exposes the Electron → DMEngine → SQLite persistence call path. Renderers must use typed Electron engine bridges; no raw SQL IPC. Does **not** invent world or combat facts itself — it pulls from the other packages. |
| `packages/LLMEngine` | `@weaver/llm-engine` | **Local LLM runtime controller.** Pins Qwen2.5 7B Instruct (Q4_K_M); prefers Vulkan, falls back to CPU. Exposes install status/`install`/`completeText` raw text passthrough so Electron UI can prompt download and exercise generation — no game invention, structured output, or tool calling here. |
| `packages/ElectronAdmin` | `@weaver/electron-admin` | **AI ADMIN** Electron app (`npm run admin`). DEV panel for app/LLM metrics, exercising engine endpoints, and related tooling. UI + IPC only; no game business logic. Releasable alongside AI TTRPG. |
| `packages/ElectronAITTRPG` | `@weaver/electron-aittrpg` | **AI TTRPG** releasable Electron game client (`npm run ai-ttrpg`; Win/Mac packaging). Product chrome/icons; wires UI to engines. No business rules in this package — call engines instead. |

## Setup

Game app (same ergonomics as AI-DND-Matrix `npm run dev`):

```bash
npm run ai-ttrpg
```

That command bootstraps via `scripts/ensure-dev.mjs` (install / Electron binary / engines / migrate) then launches the AI TTRPG Electron UI.

Admin panel (metrics, LLM review, test functions):

```bash
npm run admin
```

Manual pieces if you need them alone: `npm install`, `npm run build:engines`, `npm run migrate`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run ai-ttrpg` | Bootstrap + AI TTRPG game app |
| `npm run admin` | Bootstrap + AI ADMIN (metrics / test functions) |
| `npm run migrate` | Apply pending migrations (currently none) |
| `npm test` | Full Vitest suite (packages + CI scripts) |
| `npm run lint` | oxlint across packages/scripts |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run build:engines` | Build non-Electron packages |
| `npm run deadcode` | ts-prune gate vs `.tsprune-ignore` |
| `npm run package:win` / `package:mac` | Package **AI TTRPG** and **AI ADMIN** installers via electron-builder |

## Pipeline (mirrors AI-DND-Matrix)

- **CI Checks** — duration-balanced Vitest shards (~60s target), oxlint, typecheck + build (Windows)
- **Security Audit** — `npm audit`, fails on moderate+
- **Dead Code Check** — ts-prune across package tsconfigs
- **Deploy** — on green `main`: bump minor (root + both Electron apps), package Win/Mac for AI TTRPG + AI ADMIN, GitHub Release titled `Weaver vX.Y.0 (AI TTRPG + AI ADMIN)` with updater channels `latest` / `ai-admin` (`[skip ci]` on release commits)
- **Auto Revert** — reverts `main` when CI Checks fails

Silent desktop updates use electron-updater + NSIS (same pattern as AI-DND-Matrix).

## Ticket board & agent skills

Work is tracked as text-file tickets under [`/board`](board/) (`backlog` → `in-progress` → `done`). Every implementation change gets a ticket with checkable acceptance criteria — agents create tickets themselves (never ask to skip).

| Skill | Cursor | Claude |
|-------|--------|--------|
| Delivery standards (TDD, contract tests, gates, board) | `.cursor/skills/delivery-standards/` | `.claude/skills/delivery-standards/` |
| Complete ticket / epic | `.cursor/skills/complete-ticket/` | `.claude/skills/complete-ticket/` |
| Collapse finished epic | `.cursor/skills/collapse-epic/` | `.claude/skills/collapse-epic/` |

Always-on Cursor rules: `.cursor/rules/delivery-standards.mdc`, `.cursor/rules/act-ci-after-local-tasks.mdc` (local gates + `act` on `pr-checks.yml` / `deadcode.yml` before done).

oxlint is configured in `.oxlintrc.json` (complexity ≤10, ~50 lines/function, ≤4 params, depth 3) — agents must fix code, not relax rules.
