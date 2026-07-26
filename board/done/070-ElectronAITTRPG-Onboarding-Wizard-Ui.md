# EPIC: ElectronAITTRPG character onboarding wizard UI

Build the per-character onboarding wizard: mechanical setup → race → background → equipment → companions → guided identity → opening scene → enter world.

**Ported from:** the `characterSetup` / `raceSelection` / `backgroundSelection` / `equipmentSelection` / `guidedCreation` renderer modules in AI-DND-Matrix's README, plus `board/done/053-onboarding-back-persistence.md`.

**Depends on:** `022-CharacterEngine-Ability-Score-Generation`, `029-CharacterEngine-Race-And-Background-Selection`, `026-CharacterEngine-Archetypes-And-Starting-Loadouts`, `030-CharacterEngine-Companions-And-Inactive-Proxy`, `061-DMEngine-Guided-Character-Creation-Orchestration`.

## Acceptance criteria

- [x] Wizard steps follow the phase order: mechanical setup → race → background → equipment → companions (optional/skippable) → guided identity → opening scene → complete
- [x] Navigating back a step preserves already-entered choices (no data loss on back navigation), matching AI-DND-Matrix's onboarding-back-persistence fix
- [x] Each step reads/writes exclusively through the owning engine's API (CharacterEngine for stats/race/background/gear, DMEngine for the identity/opening-scene chat)
- [x] Wizard cannot be bypassed into play before phase reaches `complete`
- [x] The legacy "AI Party Members" block from the old character-setup step stays out of scope/hidden — companions are exclusively the dedicated post-equipment step
- [x] This package's consumption of CharacterEngine (`022`, `029`, `026`, `030`) and DMEngine (`061`) is each covered by `*.contract.test.ts` here against their real published APIs
