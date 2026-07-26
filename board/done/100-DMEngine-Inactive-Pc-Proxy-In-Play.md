# EPIC: DMEngine inactive-PC proxy in play

Let hub/play advance inactive player characters via CharacterEngine `requestInactiveProxyAction`, preserving per-PC story isolation while the shared world moves.

**Why now:** `030` shipped inactive proxy suggestions; Campaign Hub (`071`) supports multi-PC but nothing calls the proxy API during play.

**Depends on:** `030-CharacterEngine-Companions-And-Inactive-Proxy`, `071-ElectronAITTRPG-Campaign-Hub-Ui`, `053-DMEngine-Turn-Routing`.

## Acceptance criteria

- [x] Hub or play can request an inactive-PC proxy action suggestion through CharacterEngine and apply a resolved turn for that character
- [x] Proxy turns do not leak journal/quest/narration state across PCs
- [x] Active combat on one PC does not silently mutate another PC's combat state
- [x] Consumer `*.contract.test.ts` covers DMEngine/Electron → CharacterEngine inactive-proxy API
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode` pass; cloud gate: PR checks green + PR marked ready
