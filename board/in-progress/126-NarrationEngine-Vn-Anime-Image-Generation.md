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

- [x] Character images generate through NarrationEngine’s image-provider interface using `123` prompts; cached per character+stance+expression (`vnImageGen/generateVnSprite.ts` + `spriteCache.ts`)
- [x] Consistency policy documented and tested (retry/fail → placeholder) (`vnImageGen/CONSISTENCY.md`, `consistency.test.ts`)
- [x] Backgrounds generate for presets and adaptive prompts (`generateVnBackground.ts`); ElectronAIVN composites via adaptive background + transparent sprites (`vnAssetService.ts`, `PlaceholderLayer.tsx`)
- [x] ElectronAIVN play stage loads assets asynchronously without blocking turn flow (`vnAssetService.queueFromSnapshot` fire-and-forget; renderer `onAssets` never toggles `busy`)
- [x] Provider failure degrades to V1 prompt placeholders (engine returns `{ status: 'degraded', prompt, provider }`; `vnAssetService` maps degrade/throw → `failed` keeping label+fullPrompt; `PlaceholderLayer` renders prompt text)
- [x] Contract tests cover generation ports with fake image providers (`providerGenerate.test.ts`, sprite/background generation tests inject fake `ImageProvider`s; ElectronAIVN `narrationEngine.vnImage.contract.test.ts`)
- [ ] Gates pass; cloud gate: PR checks green + PR marked ready (handled at integration by parent flow)

## Sub-tickets

### 126.1 — Character sprite generation + cache

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `123`, `066`.

#### Acceptance criteria

- [x] Cache key includes identity seed + stance + expression (`spriteCache.ts` key `characterKey::stance::expression`; asset carries `cacheKey`)
- [x] No-background requirement enforced in prompt path (asserted in `generateVnSprite.test.ts` via `/no background|transparent/i`)

### 126.2 — Consistency guardrails

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `126.1`.

#### Acceptance criteria

- [x] Documented seed/style-lock approach (`vnImageGen/CONSISTENCY.md`); retry policy unit-tested with fake provider (`consistency.test.ts`, `generateWithConsistency` default `maxAttempts` 2 → degrade)

### 126.3 — Background generation

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `123.3`.

#### Acceptance criteria

- [x] Preset + adaptive generation paths share one provider call site (`generateViaImageProvider` in `providerGenerate.ts`)
- [x] Adaptive path does not invent map facts (caller supplies descriptors; builder-enforced, covered in `generateVnBackground.test.ts`)

### 126.4 — ElectronAIVN asset swap

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `126.1`, `126.3`, `124`.

#### Acceptance criteria

- [x] Placeholders replace with images when ready; layout does not jump unusable amounts (`PlaceholderLayer.tsx` fixed-size boxes + `data-status` swap; CSS `.vn-placeholder-*` reserve fixed height)
- [x] Turn input remains available while images load (`vnAssetService.queueFromSnapshot` never awaited by `playService`; renderer asset updates don't set `busy`)

### 126.5 — Failure → placeholder

**Parent:** `126-NarrationEngine-Vn-Anime-Image-Generation`. **Depends on:** `126.4`.

#### Acceptance criteria

- [x] Provider errors surface as placeholders with prompt text still visible (`vnAssetService` degrade/throw → `failed` state preserving `label`+`fullPrompt`; `PlaceholderLayer.test.tsx` asserts prompt stays visible)
- [x] No turn failure solely due to image errors (assets optional + fire-and-forget in `playService`; `playService.test.ts` asserts `open` resolves even when the asset service throws)
