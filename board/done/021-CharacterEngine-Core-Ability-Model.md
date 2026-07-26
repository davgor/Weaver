# EPIC: CharacterEngine core ability & resolution model

Stand up `packages/CharacterEngine` (`@weaver/character-engine`): the deterministic home for player-character facts that don't belong to CombatEngine (combat-session state), ItemEngine (items), or NPCEngine/EnemyEngine (non-player actors). This epic lays the foundation other CharacterEngine epics build on: the four abilities, modifiers, and the core `d20 + mod (+ proficiency) vs DC/AC` resolution used everywhere a check is made.

**Ported from:** AI-DND-Matrix's rules engine (`board/done/004-engine.md` and the "Rules Engine" section of its README) — Body/Agility/Mind/Presence, `floor((score-10)/2)` modifiers, advantage/disadvantage (2d20 take higher/lower), no fixed skill list (DM flags ability + proficiency boolean; engine owns the bonus amount), AC = `10 + Agility mod + armor`.

**Depends on:** none (foundation epic; may proceed in parallel with `012-WorldEngine-Chunked-Map-Store`). **Feeds:** every other CharacterEngine epic, plus CombatEngine (`048-CombatEngine-Encounter-Lifecycle`).

**LLM boundary:** deterministic only — no Electron imports, no LLM calls. DMEngine/NarrationEngine may propose which ability + whether proficiency applies; this package always owns the actual bonus math and the roll.

## Sub-tickets

| Id | Summary |
|----|---------|
| `021.1` | Scaffold `packages/CharacterEngine` + Admin/AITTRPG registry wiring |
| `021.2` | Four abilities + modifier math (`floor((score-10)/2)`), boundary-tested |
| `021.3` | Core resolution API (d20 + mod + proficiency, advantage/disadvantage) |
| `021.4` | AC formula as pure function consuming ItemEngine-supplied armor bonus |
| `021.5` | Package README + root README table + explicit LLM-free boundary |

## Acceptance criteria

- [x] Four abilities (Body, Agility, Mind, Presence) with `floor((score-10)/2)` modifier math, unit-tested at score boundaries
- [x] Core resolution API: `d20 + abilityMod + (proficiencyBonus if proficient) vs target`, with advantage/disadvantage support
- [x] AC formula (`10 + Agility mod + armor bonus`) as a pure function consuming ItemEngine-supplied armor bonus
- [x] Package scaffolded matching sibling engines (`health` / `listEndpoints` / `call`), added to root README package table and `build:engines`
- [x] Wired into both existing engine registries — `ElectronAdmin/src/main/index.ts`'s `engines` array (so it shows up in AI ADMIN's endpoint tester, per board `078`) and `ElectronAITTRPG/src/shared/engineHealth.ts`'s `REQUIRED_ENGINE_IDS` (so boot health checks for it) — these are hardcoded lists, not auto-discovered, and are easy to forget since every sibling engine is already in both
- [x] Explicit: deterministic, LLM-free; Electron apps and DMEngine call this package, they do not reimplement resolution math
- [x] Sub-tickets listed above exist as `board/backlog/021.*` files; none implemented until separately completed

## Sub-tickets

### 021.1 021.1 — Scaffold CharacterEngine package + registry wiring

Create `packages/CharacterEngine` (`@weaver/character-engine`) as a deterministic engine stub with health/catalog surface matching siblings. Wire into `build:engines`, ElectronAdmin `engines` array, and AITTRPG `REQUIRED_ENGINE_IDS`. No ability/resolution math yet.

**Parent:** `021-CharacterEngine-Core-Ability-Model`.

#### Acceptance criteria

- [x] Package exists with tsc build, Vitest health/listEndpoints/call/unknown-endpoint coverage
- [x] Root `build:engines` includes `@weaver/character-engine`
- [x] ElectronAdmin and ElectronAITTRPG depend on the package and register it (Admin engines array + `REQUIRED_ENGINE_IDS`)
- [x] Root README package table lists CharacterEngine

### 021.2 021.2 — Four abilities + modifier math

Implement Body/Agility/Mind/Presence and `floor((score-10)/2)` modifiers with boundary unit tests.

**Parent:** `021-CharacterEngine-Core-Ability-Model`. **Depends on:** `021.1`.

#### Acceptance criteria

- [x] Four abilities are the only core ability keys
- [x] Modifier math unit-tested at score boundaries (including low/high)
- [x] Deterministic, LLM-free; no Electron imports

### 021.3 021.3 — Core resolution API

Implement `d20 + abilityMod + (proficiencyBonus if proficient) vs target` with advantage/disadvantage.

**Parent:** `021-CharacterEngine-Core-Ability-Model`. **Depends on:** `021.2`.

#### Acceptance criteria

- [x] Resolution API accepts ability + proficiency boolean + target DC/AC
- [x] Advantage/disadvantage (2d20 take higher/lower) is unit-tested with injectable RNG
- [x] Engine owns bonus math; callers only propose ability + proficiency flag

### 021.4 021.4 — AC formula

Pure AC function: `10 + Agility mod + armor bonus` (armor bonus supplied by ItemEngine / caller).

**Parent:** `021-CharacterEngine-Core-Ability-Model`. **Depends on:** `021.2`.

#### Acceptance criteria

- [x] AC is a pure function of Agility mod + armor bonus
- [x] Unit tests cover zero armor and positive armor bonus cases
- [x] No ItemEngine import required yet — armor bonus is an input number (contract with ItemEngine lands when equip flows call this)

### 021.5 021.5 — Package README + LLM-free boundary

Document CharacterEngine role, current API, and deterministic boundary after scaffold + core math land.

**Parent:** `021-CharacterEngine-Core-Ability-Model`. **Depends on:** `021.1`, `021.3`, `021.4`.

#### Acceptance criteria

- [x] `packages/CharacterEngine/README.md` covers role, LLM/Electron boundary, build/test, and shipped APIs
- [x] Explicit: Electron apps and DMEngine call this package; they do not reimplement resolution math
- [x] Planned epics 022–031 referenced where relevant

