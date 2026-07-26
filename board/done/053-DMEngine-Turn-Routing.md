# EPIC: DMEngine turn routing

Port the play-loop turn router: the merged intent+route LLM call, the heuristic fast path that skips the LLM entirely for provably simple turns, and the dedicated branches that guarantee commerce/travel/combat can't be starved by narration.

**Ported from:** `board/done/029-dm-turn-review-and-gameplay-loop-routing.md`, `040-llm-efficiency-token-cost-reduction.md` (merged intent+route, heuristic routing), `084-intent-route-social-plan-fallback.md`.

**Depends on:** `052-DMEngine-Campaign-Generation-Pipeline` (a campaign must exist), `048-CombatEngine-Encounter-Lifecycle` (combat-active branch), `033-ItemEngine-Currency-And-Economy` + `055-DMEngine-Commerce-And-Travel-Intents` (dedicated branch), `063-NarrationEngine-Scene-Social-Split-And-Streaming` (produces the Social/Scene projections this router persists).

**LLM boundary:** intent classification + routing is DMEngine's own direct LLM call — it's an internal routing decision, not player-facing invented prose, so it doesn't need to go through NarrationEngine. The **narrated outcome text** (the actual Social/Scene beats shown to the player) is a different call and does: DMEngine resolves mechanics via peer engines first, then calls **NarrationEngine** to narrate the resolved outcome (validated against the facts that resolution just produced). DMEngine never fabricates the narrated beats itself.

## Acceptance criteria

- [x] A turn resolves through: lock turn → interpret intent (+ route, DMEngine's own LLM call) → engine resolve (peer engines) → NarrationEngine narrates the resolved outcome → persist → Social/Scene projections
- [x] Heuristic routing supplies a deterministic plan (skipping the LLM intent call) for provably simple turns; merged `interpretIntentAndRoute` handles everything else in one call instead of two
- [x] Commerce and travel intents route through a dedicated engine branch that cannot be pre-empted by a narration-only interpretation — a "buy the sword" turn always reaches ItemEngine's currency API
- [x] When combat is active, turns route to the combat path exclusively; there is no ad hoc reaction damage outside a combat turn
- [x] Ask-the-DM (OOC) never enters this router — it is excluded at the entry point, not filtered late (see `057-DMEngine-Ask-The-Dm`)
- [x] Mechanical outcomes are never invented by the LLM at this layer — the router calls peer engines for anything that changes durable state, and calls NarrationEngine (not LLMEngine directly) for anything that narrates it
- [x] This package's consumption of CombatEngine (`048`), ItemEngine (`033`), and NarrationEngine (`063`) is each covered by `*.contract.test.ts` here against their real published APIs
