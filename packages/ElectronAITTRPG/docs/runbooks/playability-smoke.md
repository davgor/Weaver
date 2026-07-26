# Playability smoke runbook

Covers REBUILD_SPEC §15: create → onboard → hub → play → combat → death-mode, plus multi-PC isolation.

Automated coverage lives in:

- `src/main/play/playability.smoke.test.ts` — scripted in-memory provider path (no live LLM)
- Engine contracts under `packages/DMEngine/src/contracts/` and Electron `*.contract.test.ts`

## Manual checklist (live provider)

1. Launch `npm run ai-ttrpg`, configure Settings (cloud or local after install).
2. Create a campaign with a premise; confirm Review → continue.
3. Complete onboarding for PC A through opening scene.
4. Land on Campaign Hub; add PC B and complete onboarding.
5. Play as A: converse, rest/travel/buy if available, start combat (hostile intent or supplied encounter).
6. Confirm Social/Scene split and combat chrome HP updates after attacks.
7. Trigger Standard death (0 HP) and confirm autosave restore; or Legendary obituary / Respawn per mode.
8. Switch to PC B: journal/quests for A must not appear in B’s sheet; shared world mutations persist.

## Multi-PC isolation asserts (automated)

The smoke test creates two characters in one campaign and verifies proxy/play turns for B do not write A’s journal entries and do not touch A’s active encounter id.
