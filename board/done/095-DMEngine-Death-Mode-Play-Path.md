# EPIC: DMEngine / ElectronAITTRPG death-mode play path

Persist campaign death mode at create time and wire autosave + death resolution into the play loop so Legendary / Standard / Respawn behave as CharacterEngine already defines.

**Why now:** CharacterEngine `027` owns `setCampaignDeathMode`, autosave snapshots, and `resolveCharacterDeath`, but campaign create never calls `setCampaignDeathMode`, turns do not autosave, and play has no death/obituary/restore path.

**Depends on:** `027-CharacterEngine-Death-Modes-And-Obituary`, `053-DMEngine-Turn-Routing`, `069-ElectronAITTRPG-Campaign-Creation-And-Review-Ui`, `094-DMEngine-Combat-Resolution-Orchestration`.

## Acceptance criteria

- [x] Campaign create persists the chosen death mode via CharacterEngine `setCampaignDeathMode`
- [x] Successful play turns record an autosave snapshot for Standard-mode restore
- [x] Reaching 0 HP / dying failure on a PC invokes `resolveCharacterDeath` with the campaign mode
- [x] Play/hub surfaces distinguish Legendary (obituary), Standard (restore snapshot), and Respawn outcomes
- [x] Consumer `*.contract.test.ts` covers Electron/DMEngine → CharacterEngine death/autosave APIs
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready
