# EPIC: Repo playability smoke + runbooks

Document and automate (or script) the REBUILD_SPEC §15 playability spine: create → onboard → hub → play → combat → death-mode, plus multi-PC isolation smoke. Add missing `docs/runbooks/` pointers under ElectronAITTRPG.

**Why now:** Engines and UI shells exist, but there is no living runbook or smoke gate proving the wired path after Wave 10 combat/death/rewards land.

**Depends on:** `094-DMEngine-Combat-Resolution-Orchestration`, `095-DMEngine-Death-Mode-Play-Path`, `096-DMEngine-Encounter-Start-And-Rewards`.

## Acceptance criteria

- [x] `packages/ElectronAITTRPG/docs/runbooks/` includes create/play/combat/death and multi-PC smoke runbooks (or one indexed runbook covering them)
- [x] An automated smoke test or scripted checklist exercises create → onboard → hub → play → combat → death-mode against in-memory/fake providers where live LLM is not required
- [x] Multi-PC shared-world / per-PC story isolation is asserted in that smoke path
- [x] Root or package README links the runbooks
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready
