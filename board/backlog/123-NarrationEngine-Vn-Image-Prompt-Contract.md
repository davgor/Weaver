# EPIC: NarrationEngine VN image-prompt contract (V1 placeholders)

Define the NarrationEngine-owned prompt builders for AI Visual Novel imagery so V1 can show accurate placeholders and V2 can hook the same contract to real generation. Characters: consistent anime style, **no background** (transparent/subject-only). Multiple **stances** and **expressions** must stay locked to a per-character identity seed so deviation stays low. Backgrounds: preset library plus on-the-fly prompts when the player leaves known locations.

**Why now:** Play UI (`124`) needs stable prompt strings like `David's character, Standing, Angry` and background prompts before any image provider is wired.

**Depends on:** `066-NarrationEngine-Visual-Token-Generation` (existing image-provider rails / invention charter). **Feeds:** `124-ElectronAIVN-Visual-Novel-Play-Loop`, `126-NarrationEngine-Vn-Anime-Image-Generation`.

**Out of scope:** Calling image providers / storing PNGs (that is `126`); Electron layout.

## Sub-tickets

| Id | Summary |
|----|---------|
| `123.1` | Character identity seed + stance/expression enums |
| `123.2` | Character sprite prompt builder (anime, no background) |
| `123.3` | Background prompt builder (presets + adaptive) |
| `123.4` | Placeholder DTO for UI (`label`, `fullPrompt`, `slot`) |

## Acceptance criteria

- [ ] Public API builds character prompts from identity seed + stance + expression; output suitable for placeholder label and full provider prompt
- [ ] Character prompts mandate anime style and no-background / subject-only framing
- [ ] Stance and expression vocabularies are enumerated and validated (unknown values rejected)
- [ ] Background prompts support named presets and an adaptive “wandered off map” builder grounded in scene/location facts passed by the caller
- [ ] Placeholder DTO includes human-readable short label (e.g. `David's character, Standing, Angry`) plus full prompt text and slot (`mc` / `npc` / `background`)
- [ ] Unit tests cover seed stability (same identity → shared style lock text) and validation errors
- [ ] Gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 123.1 — Identity seed + enums

**Parent:** `123-NarrationEngine-Vn-Image-Prompt-Contract`. **Depends on:** `066`.

#### Acceptance criteria

- [ ] Types for stance/expression exported; invalid combos fail closed
- [ ] Identity seed includes stable character key + appearance facts used in every prompt

### 123.2 — Character prompt builder

**Parent:** `123-NarrationEngine-Vn-Image-Prompt-Contract`. **Depends on:** `123.1`.

#### Acceptance criteria

- [ ] Builder always includes anime-style + no-background constraints
- [ ] Short label format documented and tested

### 123.3 — Background prompt builder

**Parent:** `123-NarrationEngine-Vn-Image-Prompt-Contract`. **Depends on:** `123.1`.

#### Acceptance criteria

- [ ] Preset catalog exists (small V1 set)
- [ ] Adaptive path accepts location/scene descriptors from caller (no inventing geography here — facts are inputs)

### 123.4 — Placeholder DTO

**Parent:** `123-NarrationEngine-Vn-Image-Prompt-Contract`. **Depends on:** `123.2`, `123.3`.

#### Acceptance criteria

- [ ] Single helper returns placeholders for MC, optional NPC, and background for a beat
- [ ] Consumer contract test from ElectronAIVN may land with `124.4`; this epic still unit-tests the DTO in NarrationEngine
