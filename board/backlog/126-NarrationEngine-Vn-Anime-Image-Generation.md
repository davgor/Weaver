# EPIC: NarrationEngine VN anime image generation (V2)

Hook the V1 prompt contract (`123`) to real image generation for AI Visual Novel: consistent anime character sprites (no background) across stances/expressions, plus background generation for presets and on-the-fly locations when the player wanders.

**Depends on:** `123-NarrationEngine-Vn-Image-Prompt-Contract`, `124-ElectronAIVN-Visual-Novel-Play-Loop`, `066-NarrationEngine-Visual-Token-Generation`.

**Out of scope:** Retraining / LoRA fine-tunes as a hard requirement for V2 (prefer prompt+seed locking first; document if a stronger lock is needed later); video/animation.

## Sub-tickets

| Id | Summary |
|----|---------|
| `126.1` | Character sprite generation + asset cache by identity/stance/expression |
| `126.2` | Consistency guardrails (seed/style lock; deviation retry policy) |
| `126.3` | Background generation for presets + adaptive scenes |
| `126.4` | ElectronAIVN swaps placeholders for assets with async non-blocking load |
| `126.5` | Failure degradation back to prompt placeholders |

## Acceptance criteria

- [ ] Character images generate through NarrationEngine’s image-provider interface using `123` prompts; cached per character+stance+expression
- [ ] Consistency policy documented and tested (retry/fail → placeholder)
- [ ] Backgrounds generate for presets and adaptive prompts; composed behind transparent character sprites
- [ ] ElectronAIVN play stage loads assets asynchronously without blocking turn flow
- [ ] Provider failure degrades to V1 prompt placeholders (never blocks play)
- [ ] Contract tests cover generation ports with fake image providers
- [ ] Gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 126.1 — Character sprite generation + cache

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `123`, `066`.

#### Acceptance criteria

- [ ] Cache key includes identity seed + stance + expression
- [ ] No-background requirement enforced in prompt path (asserted in tests)

### 126.2 — Consistency guardrails

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `126.1`.

#### Acceptance criteria

- [ ] Documented seed/style-lock approach; retry policy unit-tested with fake provider

### 126.3 — Background generation

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `123.3`.

#### Acceptance criteria

- [ ] Preset + adaptive generation paths share one provider call site
- [ ] Adaptive path does not invent map facts (caller supplies descriptors)

### 126.4 — ElectronAIVN asset swap

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `126.1`, `126.3`, `124`.

#### Acceptance criteria

- [ ] Placeholders replace with images when ready; layout does not jump unusable amounts
- [ ] Turn input remains available while images load

### 126.5 — Failure → placeholder

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `126.4`.

#### Acceptance criteria

- [ ] Provider errors surface as placeholders with prompt text still visible
- [ ] No turn failure solely due to image errors
