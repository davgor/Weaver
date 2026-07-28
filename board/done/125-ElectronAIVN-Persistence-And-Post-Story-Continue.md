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

- [x] Mid-story progress survives restart (act/beat, speakers, last projection, pending input)
- [x] Completing the final act does not delete the save; player can continue exploring/interacting in the world
- [x] Continue-in-world still uses NPCEngine memory + DM scene setting (same engines, looser act structure)
- [x] Home distinguishes in-progress story vs completed-but-continuing saves
- [x] Persistence goes through DMEngine campaign/VN store APIs — no ad-hoc renderer-only storage for story facts
- [x] Tests cover save → simulated restart → resume, and story-complete → continue flag
- [x] Gates pass; cloud gate: PR checks green + PR marked ready

## Implementation notes

- Act boundaries are not yet DM-signalled. ElectronAIVN uses a deterministic
  stand-in: a per-campaign `vn_story_turns` counter in `campaign_meta` is bumped
  on each committed turn, and while `phase === 'story'` every 2nd turn completes
  the current act (`advanceVnPlayCursor({ completeAct: turns % 2 === 0 })`). Once
  the final act (`overview.acts.length`, min 1) completes, the cursor flips to
  `storyComplete + phase 'freeplay'` and stays there; later turns only move the
  turn fields. Replace this heuristic when the DM emits real act boundaries.

## Sub-tickets

### 125.1 — Autosave play cursor

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `124`, `106`.

#### Acceptance criteria

- [x] Cursor schema documented (act index, beat id, mode, last choices)
- [x] Autosave triggers on turn commit (unit-tested)

### 125.2 — Resume mid-story

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `125.1`, `122.4`.

#### Acceptance criteria

- [x] Selecting a saved game restores stage + interaction state
- [x] Contract/integration test simulates restart without live LLM

### 125.3 — Continue-in-world

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `125.2`, `121`.

#### Acceptance criteria

- [x] Final-act completion sets `storyComplete` and unlocks freeplay continuation
- [x] Freeplay turns still ground against world/NPC facts

### 125.4 — Home save states

**Parent:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`. **Depends on:** `125.3`.

#### Acceptance criteria

- [x] UI labels in-progress vs story-complete continuing
- [x] Both remain permanent across boots
