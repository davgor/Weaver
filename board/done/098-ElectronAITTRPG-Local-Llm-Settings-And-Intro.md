# EPIC: ElectronAITTRPG local LLM settings + settingsIntro

Add first-run / settings intro gating and a Settings surface to download/status the pinned local Qwen model via LLMEngine `getStatus` / `install`, completing the offline play path `075` left to cloud/Player2 only.

**Why now:** LLMEngine `011`/`019` own install lifecycle; Settings (`075`) probes local status on connection check but never prompts download. `settingsIntro` appears in `REBUILD_SPEC` IPC list but is absent from preload.

**Depends on:** `011-LLMEngine-Local-Qwen-Runtime`, `075-ElectronAITTRPG-Settings-Ui`.

## Acceptance criteria

- [x] `settingsIntro` IPC/API reports whether the player still needs first-run provider/local-model setup and can be dismissed once ready
- [x] Settings shows local model install status and can start/monitor `install` progress without restarting the app when hot-swap works
- [x] Connection check / provider selection can use the local backend after install succeeds
- [x] Consumer `*.contract.test.ts` covers Electron → LLMEngine `getStatus` / `install` APIs
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready
