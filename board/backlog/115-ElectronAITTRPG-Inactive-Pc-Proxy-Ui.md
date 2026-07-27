# EPIC: Inactive PC proxy UI

Hub and play affordances for inactive player-character proxy turns (`100`) so companions and off-screen PCs can act in the shared campaign timeline with visible outcomes.

**Why now:** DMEngine inactive proxy orchestration exists (`100-DMEngine-Inactive-Pc-Proxy-In-Play`) but `105` listed inactive-PC proxy hub UI out of scope. Hub has no UI to request proxy actions or show cross-character effects.

**Depends on:** `100-DMEngine-Inactive-Pc-Proxy-In-Play`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence`, `109-ElectronAITTRPG-Durable-Onboarding-And-Hub`, `030-CharacterEngine-Companions-And-Inactive-Proxy`, `071-ElectronAITTRPG-Campaign-Hub-Ui`.

## Sub-tickets

| Id | Summary |
|----|---------|
| `115.1` | Hub inactive PC list + "play as proxy" affordance |
| `115.2` | Play shell mode for inactive PC (distinct from active PC chrome) |
| `115.3` | Shared timeline / recap surfacing proxy turn outcomes |
| `115.4` | Contract tests for proxy turn → persist → hub recap |

## Acceptance criteria

- [ ] Hub lists inactive PCs with proxy-eligible status from CharacterEngine
- [ ] User can start a proxy play session for an inactive PC without corrupting active PC cursor
- [ ] Proxy turns call `requestInactivePcProxyTurn` (or current API) with durable persistence
- [ ] Hub recap or shared timeline shows notable proxy outcomes (document minimal v1 scope)
- [ ] Returning to active PC restores hub cursor cleanly
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 115.1 — Hub proxy list

**Parent:** `115-ElectronAITTRPG-Inactive-Pc-Proxy-Ui`. **Depends on:** `109`, `100`.

#### Acceptance criteria

- [ ] Hub screen queries inactive PCs and companion proxy flags
- [ ] Disabled state when proxy not allowed (document rules)

### 115.2 — Proxy play mode

**Parent:** `115-ElectronAITTRPG-Inactive-Pc-Proxy-Ui`. **Depends on:** `115.1`, `107`.

#### Acceptance criteria

- [ ] Play view accepts `proxyCharacterId` session param
- [ ] Turn routing uses inactive proxy branch from `100`

### 115.3 — Timeline surfacing

**Parent:** `115-ElectronAITTRPG-Inactive-Pc-Proxy-Ui`. **Depends on:** `115.2`.

#### Acceptance criteria

- [ ] Hub recap includes last N proxy events or link to logbook entry
- [ ] Uses durable autosave/log rows from `106`

### 115.4 — Contract coverage

**Parent:** `115-ElectronAITTRPG-Inactive-Pc-Proxy-Ui`. **Depends on:** `115.3`.

#### Acceptance criteria

- [ ] Contract test: proxy turn persists → hub service reads outcome
