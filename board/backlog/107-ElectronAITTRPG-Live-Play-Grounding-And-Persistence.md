# EPIC: Live play grounding and turn persistence

Wire production live play (`createLiveResolveTurnDeps`, turn service, Ask-DM) to real campaign state from `106` instead of in-memory/no-op stubs. Every resolved turn must persist durable facts and later context must be assembled from stored state — not chat history alone (REBUILD_SPEC §1).

**Why now:** `105` connected Settings-backed LLM completers, but `livePlayDeps.ts` still uses in-memory currency/combat stores, permissive destination lookup (`isKnownLocation: () => true`), stub NPC/item peers, and `persist: () => undefined`.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `105-ElectronAITTRPG-Live-Settings-Llm-Create-Play`, `053-DMEngine-Turn-Routing`.

**Feeds:** `110-ElectronAITTRPG-Production-Character-And-Npc-Ui`, `111-DMEngine-Live-Rag-And-Context-Integration`, `112-DMEngine-Exploration-And-Destination-Validation`, `113-DMEngine-Weather-Play-Integration`, `114-ElectronAITTRPG-Quest-Offer-And-Progression-Ui`, `116-DMEngine-Live-Population-Production`.

**Out of scope:** RAG retrieval wiring (epic `111`); quest offer UI (`114`); full exploration/pathfinding (`112`).

## Sub-tickets

| Id | Summary |
|----|---------|
| `107.1` | Campaign-scoped live play factory (open DB → inject repositories) |
| `107.2` | Real currency, inventory, and item lookup peers |
| `107.3` | Real NPC/location/character lookup peers for narration validation |
| `107.4` | Durable combat encounter store + turn `persist` hook |
| `107.5` | Playability smoke + contract tests with SQLite fixtures |

## Acceptance criteria

- [ ] Production bootstrap opens the active campaign DB and passes SQLite-backed deps into `createLiveResolveTurnDeps`
- [ ] Currency debit/credit and inventory mutations persist across turns and survive app restart
- [ ] Narration claim checks use real NPC presence, item ownership, and location facts — no always-true stubs in production wiring
- [ ] Combat encounters use a durable store (not `createMemoryEncounterStore`) in production
- [ ] Turn resolution `persist` writes turn outcomes / autosave snapshots to campaign storage
- [ ] Unit/contract/smoke tests still inject in-memory fixtures for determinism
- [ ] `WIRING.md` documents production vs test dependency injection
- [ ] Sub-tickets verified; `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 107.1 — Campaign-scoped live play factory

Extract a tested factory that, given `campaignId` + open campaign DB, builds `ResolveTurnDeps` with SQLite repositories.

**Parent:** `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`. **Depends on:** `106`.

#### Acceptance criteria

- [ ] Factory lives in a tested module (not inline in IPC handler)
- [ ] Wrong/missing campaign id fails with a clear error
- [ ] Electron handler remains thin wiring-only

### 107.2 — Real commerce peers

Replace in-memory currency service with campaign-backed balances; wire item `hasItem` / inventory mutations from ItemEngine stores.

**Parent:** `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`. **Depends on:** `107.1`.

#### Acceptance criteria

- [ ] Commerce/trade intents debit/credit persisted balances
- [ ] Narration item claims consult real inventory state

### 107.3 — Real narration validation peers

Wire NPC lookup, location validation, and character stats peers used by `fillAndValidate` / turn routing.

**Parent:** `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`. **Depends on:** `107.1`.

#### Acceptance criteria

- [ ] `getNpc` returns stored NPC facts or undefined — not always undefined
- [ ] Location checks consult CharacterEngine/NPCEngine stored locations (destination permissiveness tightened in `112`; here: no unconditional `true`)

### 107.4 — Durable combat + persist hook

Swap memory encounter store; implement turn `persist` to write combat state, character mutations, and autosave snapshots.

**Parent:** `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`. **Depends on:** `107.1`, `107.2`, `107.3`.

#### Acceptance criteria

- [ ] Active encounter survives renderer reload within the same app session and across restart when in combat
- [ ] `recordAutosaveSnapshot` (or equivalent) writes durable rows each resolved turn

### 107.5 — Smoke + contract coverage

Extend playability smoke and DMEngine/Electron contract tests to assert SQLite-backed live deps.

**Parent:** `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`. **Depends on:** `107.4`.

#### Acceptance criteria

- [ ] At least one contract test exercises live play factory against real campaign DB fixture
- [ ] Playability smoke documents restart persistence check (manual or automated)
