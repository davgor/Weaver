# EPIC: ElectronAIVN persistence + post-story continue

Make VN games durable across app restarts during play, and when the authored short story completes, allow the player to keep playing in the same world (sandbox continuation) rather than ending the save.

**Depends on:** `124-ElectronAIVN-Visual-Novel-Play-Loop`, `122-ElectronAIVN-Tell-A-Story-And-Review`, `106-DMEngine-Production-Campaign-Stores`, `107-ElectronAITTRPG-Live-Play-Grounding-And-Persistence` (pattern for durable live play wiring). **Feeds:** future portability / cloud-sync work (not in V1).

**Out of scope:** Full campaign portability ZIP parity with TTRPG (`108`) unless cheap to reuse; multiplayer.

## Sub-tickets

| Id | Summary |
|----|---------|
| `125.1` | Autosave play cursor (act/beat/scene, pending choices) |
| `125.2` | Resume mid-story after app restart |
| `125.3` | Story-complete → continue-in-world mode |
| `125.4` | Home/saved-game states for in-progress vs completed-continuing |

## Acceptance criteria

- [ ] Mid-story progress survives restart (act/beat, speakers, last projection, pending input)
- [ ] Completing the final act does not delete the save; player can continue exploring/interacting in the world
- [ ] Continue-in-world still uses NPCEngine memory + DM scene setting (same engines, looser act structure)
- [ ] Home distinguishes in-progress story vs completed-but-continuing saves
- [ ] Persistence goes through DMEngine campaign/VN store APIs — no ad-hoc renderer-only storage for story facts
- [ ] Tests cover save → simulated restart → resume, and story-complete → continue flag
- [ ] Gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 125.1 — Autosave play cursor

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `124`, `106`.

#### Acceptance criteria

- [ ] Cursor schema documented (act index, beat id, mode, last choices)
- [ ] Autosave triggers on turn commit (unit-tested)

### 125.2 — Resume mid-story

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `125.1`, `122.4`.

#### Acceptance criteria

- [ ] Selecting a saved game restores stage + interaction state
- [ ] Contract/integration test simulates restart without live LLM

### 125.3 — Continue-in-world

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `125.2`, `121`.

#### Acceptance criteria

- [ ] Final-act completion sets `storyComplete` and unlocks freeplay continuation
- [ ] Freeplay turns still ground against world/NPC facts

### 125.4 — Home save states

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `125.3`.

#### Acceptance criteria

- [ ] UI labels in-progress vs story-complete continuing
- [ ] Both remain permanent across boots
