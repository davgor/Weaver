# EPIC: ElectronAIVN Tell a Story + review + permanentize

Ship the home-screen **Tell a story** flow: collect premise + main-character details, run the DMEngine VN story pipeline, show a reviewable overview, and on **Play** mark the game permanent so it appears whenever the app boots.

**Depends on:** `119-ElectronAIVN-Scaffold-And-Dev-Cmd`, `120-ElectronAIVN-Llm-First-Run-And-Boot`, `121-DMEngine-Visual-Novel-Story-Pipeline`. **Feeds:** `124-ElectronAIVN-Visual-Novel-Play-Loop`, `125-ElectronAIVN-Persistence-And-Post-Story-Continue`.

**Out of scope:** In-scene VN play chrome (124); post-story freeplay (125); image generation.

## Sub-tickets

| Id | Summary |
|----|---------|
| `122.1` | Tell-a-story form (premise, MC details, act count) |
| `122.2` | Generation progress + story overview review screen |
| `122.3` | Play action permanentizes game into saved-games list |
| `122.4` | Home lists saved games; resume entry point |
| `122.5` | Electron → DMEngine story-pipeline contract tests |

## Acceptance criteria

- [x] Home shows **Tell a story** once LLM first-run gate is satisfied
- [x] Form collects premise, main-character details, and configurable act count (default 3)
- [x] After generation, overview review is required before Play
- [x] Play marks the story/game permanent and navigates into the VN play surface (or a stub route until `124` lands)
- [x] Permanent games appear on subsequent boots in a saved-games list
- [x] UI calls DMEngine published APIs only — no story-generation logic in the Electron package
- [x] Consumer `*.contract.test.ts` covers ElectronAIVN → DMEngine story APIs
- [x] Gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 122.1 — Tell-a-story form

**Parent:** `122-ElectronAIVN-Tell-A-Story-And-Review`. **Depends on:** `120`, `121.1`.

#### Acceptance criteria

- [x] Form validates required fields client-side and via main-process service
- [x] Act count control defaults to 3 and documents allowed range

### 122.2 — Overview review

**Parent:** `122-ElectronAIVN-Tell-A-Story-And-Review`. **Depends on:** `122.1`, `121.2`.

#### Acceptance criteria

- [x] Review shows acts, cast, premise summary; Play disabled until explicit continue/confirm
- [x] Regenerate or back-to-edit policy documented and implemented (at least back-to-edit)

### 122.3 — Permanentize on Play

**Parent:** `122-ElectronAIVN-Tell-A-Story-And-Review`. **Depends on:** `122.2`, `121.4`.

#### Acceptance criteria

- [x] Play flips draft → permanent/active game record
- [x] Restart simulation still lists the game

### 122.4 — Saved games on home

**Parent:** `122-ElectronAIVN-Tell-A-Story-And-Review`. **Depends on:** `122.3`.

#### Acceptance criteria

- [x] Home lists permanent games with resume affordance
- [x] Empty state still highlights Tell a story

### 122.5 — Contract tests

**Parent:** `122-ElectronAIVN-Tell-A-Story-And-Review`. **Depends on:** `122.3`.

#### Acceptance criteria

- [x] Main-process service tests: create draft → review payload → permanentize → list
