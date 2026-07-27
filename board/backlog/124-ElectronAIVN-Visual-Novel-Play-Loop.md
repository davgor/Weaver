# EPIC: ElectronAIVN visual-novel play loop

Build the standard visual-novel play window and interaction model: background plane, MC sprite placeholder, optional speaking NPC, bottom text/interaction box. DM sets scenes and steps back during NPC dialogue. Each player prompt offers **two LLM-generated choices** derived from the MC’s personality plus a **third free-text** option.

**V1 imagery:** No real image generation — placeholders display the prompt that would have been used (character: name + stance + expression; background: scene prompt), owned by the NarrationEngine prompt contract (`123`).

**Depends on:** `122-ElectronAIVN-Tell-A-Story-And-Review`, `121-DMEngine-Visual-Novel-Story-Pipeline`, `053-DMEngine-Turn-Routing`, `063-NarrationEngine-Scene-Social-Split-And-Streaming`, `123-NarrationEngine-Vn-Image-Prompt-Contract`. **Feeds:** `125-ElectronAIVN-Persistence-And-Post-Story-Continue`, `126-NarrationEngine-Vn-Anime-Image-Generation`.

**Out of scope:** Actual image provider calls (V2 / `126`); TTRPG combat chrome.

## Sub-tickets

| Id | Summary |
|----|---------|
| `124.1` | VN stage layout (background / MC / NPC / text box) |
| `124.2` | DM scene-setting vs NPC-dialogue step-back modes |
| `124.3` | Choice pair generation + free-text third option |
| `124.4` | Wire placeholders to VN image-prompt contract |
| `124.5` | Play-loop contract tests (DM / Narration / NPC) |

## Acceptance criteria

- [ ] Play window is a full-bleed VN layout: background layer, MC placeholder, optional NPC speaker, bottom interaction panel
- [ ] Scene mode: DM/Narration scene prose drives the beat; Social/NPC mode: DM steps back and NPC dialogue is primary
- [ ] Interaction panel always offers exactly two personality-grounded generated options plus a free-text input
- [ ] Placeholders show prompts like `David's character, Standing, Angry` (and background prompt text) — no fake stock art required
- [ ] Generated choices call NarrationEngine/DMEngine APIs (MC personality from CharacterEngine/NPC-equivalent MC record) — no invention in Electron
- [ ] Consumer `*.contract.test.ts` cover Electron → DMEngine turn/scene APIs and prompt-contract consumption
- [ ] Gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 124.1 — VN stage layout

**Parent:** `124-ElectronAIVN-Visual-Novel-Play-Loop`. **Depends on:** `122`.

#### Acceptance criteria

- [ ] Renderer stage composes background, MC, NPC (conditional), text box
- [ ] Layout works at desktop and narrow widths without breaking interaction

### 124.2 — Scene vs NPC step-back

**Parent:** `124-ElectronAIVN-Visual-Novel-Play-Loop`. **Depends on:** `124.1`, `053`, `063`.

#### Acceptance criteria

- [ ] Mode switch is driven by DMEngine/Narration projections (Scene vs Social), not ad-hoc UI guessing
- [ ] Unit tests cover mode selection from projection fixtures

### 124.3 — Two choices + free text

**Parent:** `124-ElectronAIVN-Visual-Novel-Play-Loop`. **Depends on:** `124.2`, `121`.

#### Acceptance criteria

- [ ] Two options generated from MC personality + current beat; third control is free-text
- [ ] Selecting either path submits a turn through DMEngine routing
- [ ] Tests use scripted completers for deterministic options

### 124.4 — Image prompt placeholders

**Parent:** `124-ElectronAIVN-Visual-Novel-Play-Loop`. **Depends on:** `124.1`, `123`.

#### Acceptance criteria

- [ ] MC/NPC/background placeholders render contract prompt strings (not empty boxes)
- [ ] Placeholder updates when stance/expression/scene changes

### 124.5 — Contract tests

**Parent:** `124-ElectronAIVN-Visual-Novel-Play-Loop`. **Depends on:** `124.3`, `124.4`.

#### Acceptance criteria

- [ ] Contract tests against DMEngine + NarrationEngine published APIs for beat advance and choice generation
