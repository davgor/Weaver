# VN image consistency approach

Goal: keep AI Visual Novel character sprites recognizably the *same* character across
every stance and expression, and degrade gracefully when a provider cannot deliver — never
blocking the play loop. This is the V2 layer on top of the V1 prompt contract (epic `123`).

## Levers (cheapest first)

1. **Prompt-level style lock.** `buildVnCharacterPrompt` embeds a deterministic
   `Style lock: vn-character-<hash>` line derived from the character key
   (`vnCharacterStyleLockId`). The same key always yields the same lock id, so the prompt
   repeatedly instructs the model to "preserve face, outfit, palette, and proportions across
   every stance and expression."
2. **Deterministic seed.** `vnSeedFromIdentity({ characterKey })` returns
   `vn-seed-<styleLockId>`, a stable per-character seed passed to the image provider
   (`ProviderImageRequest.seed`). Providers that honour seeds then reproduce the same base
   character between generations; stance/expression vary via the prompt, not the seed.
3. **Asset cache.** Every accepted sprite is cached by
   `characterKey::stance::expression`, so a given pose is generated once and reused. This
   removes drift entirely for already-generated poses and avoids repeat provider spend.

Only when a stronger lock proves necessary would we consider reference-image conditioning or
a LoRA/fine-tune — explicitly out of scope for V2 (see epic `126`). The prompt + seed + cache
stack is the documented first line of defence.

## Retry policy

`generateWithConsistency(generateOnce, policy, isAcceptable?)`:

- Calls `generateOnce` up to `policy.maxAttempts` times (default `2`).
- Retries when the provider returns `null` (failure) or when an optional `isAcceptable`
  check rejects the produced image (a hook for future deviation detection).
- Returns `{ imagePath }` on the first acceptable result.
- Returns `{ degraded: true }` after exhausting all attempts.

## Degradation

When retries are exhausted, generation is disabled, or no provider is configured,
`generateVnSprite` / `generateVnBackground` return a `degraded` result that **retains the V1
prompt** (`prompt`) and the intended provider id. Callers (ElectronAIVN) show the V1 prompt
placeholder in that slot, so a missing or failed image never blocks the turn — it simply
falls back to the descriptive placeholder from epic `123`.
