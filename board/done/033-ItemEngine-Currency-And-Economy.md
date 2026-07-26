# EPIC: ItemEngine currency & economy guardrails

Port the single-currency economy model, where the engine is the only thing allowed to move money, and any DM-proposed price gets clamped the same way a proposed DC would be.

**Ported from:** AI-DND-Matrix's README ("single currency debited/credited only by the engine, encounter/quest loot tables, prices narrated contextually by the DM agent (engine clamps any proposed price, same guardrail pattern as DC)").

**Depends on:** `032-ItemEngine-Item-Model-And-Inventory`. **Feeds:** `055-DMEngine-Commerce-And-Travel-Intents` (DM calls this API rather than mutating currency directly).

## Acceptance criteria

- [x] Single currency balance per character, debited/credited only through this package's API — no other package writes currency directly
- [x] `clampProposedPrice`-equivalent function bounds any DM/NarrationEngine-proposed price into an acceptable range before a debit/credit is applied
- [x] Insufficient-funds and negative-amount cases are rejected with typed errors, not silently clamped to zero
- [x] Unit tests cover clamp boundaries and reject-vs-clamp behavior explicitly
