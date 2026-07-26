# EPIC: ElectronAITTRPG campaign portability UI + sidebar lifecycle

Expose DMEngine campaign export/import and campaign delete from the AI TTRPG shell (sidebar + IPC), so players can back up, move, and remove campaigns.

**Why now:** `059` shipped `exportCampaignPackage` / `importCampaignPackage`, but ElectronAITTRPG has no IPC/UI for them and the sidebar only lists/opens campaigns.

**Depends on:** `059-DMEngine-Campaign-Portability`, `071-ElectronAITTRPG-Campaign-Hub-Ui`.

## Acceptance criteria

- [x] Preload/main expose typed export, import, and delete campaign IPC (no raw filesystem IPC)
- [x] Sidebar (or adjacent chrome) can export the selected campaign and import a package round-trip via DMEngine portability APIs
- [x] Delete removes a campaign after confirmation and refreshes the list
- [x] Consumer `*.contract.test.ts` covers Electron → DMEngine portability APIs
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready
