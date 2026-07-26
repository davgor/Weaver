# EPIC: DMEngine commerce & travel intents

Port reliable buy/sell/travel handling so these common intents resolve mechanically every time, rather than sometimes being absorbed into pure narration.

**Ported from:** `board/done/135-reliable-commerce-and-travel-intents.md`.

**Depends on:** `033-ItemEngine-Currency-And-Economy`, `031-CharacterEngine-Time-And-Rest` (travel advances the day counter). **Feeds:** `053-DMEngine-Turn-Routing` (the router dispatches to this branch handler — like `060` feeding `052`, the branch handler does not depend back on the router that calls it).

## Acceptance criteria

- [x] Buy/sell intents always resolve through `033-ItemEngine-Currency-And-Economy`'s debit/credit + price-clamp API — never a narration-only "you buy the sword" with no state change
- [x] Travel intents advance the day counter through `031-CharacterEngine-Time-And-Rest`'s clamped travel-advance function, using a DM-estimated duration the engine still bounds
- [x] Both intents are covered by the dedicated turn-routing branch from `053`, with a regression test proving they can't be silently reclassified as pure narration
- [x] Failed commerce (insufficient funds) and failed travel (unreachable/ungenerated destination without live population) produce a clear, engine-grounded rejection rather than a silently-ignored turn
- [x] This package's consumption of ItemEngine's currency API (`033`) and CharacterEngine's time-advance API (`031`) is each covered by `*.contract.test.ts` here against their real published APIs
