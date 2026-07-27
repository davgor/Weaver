# EPIC: Durable onboarding and campaign hub

Persist guided character creation, onboarding phase/selections, completed PC records, and hub session cursor in campaign SQLite (`106`) so create → onboard → hub survives app restart.

**Why now:** `onboardingService.ts` stores records in a module-level `Map`. Campaign hub reads completed characters from that in-memory service; restart loses onboarding progress and hub state.

**Depends on:** `106-DMEngine-Production-Campaign-Stores`, `061-DMEngine-Guided-Character-Creation-Orchestration`, `071-ElectronAITTRPG-Campaign-Hub-Ui`, `070-ElectronAITTRPG-Onboarding-Wizard-Ui`.

**Feeds:** `110-ElectronAITTRPG-Production-Character-And-Npc-Ui`, `115-ElectronAITTRPG-Inactive-Pc-Proxy-Ui`.

## Sub-tickets

| Id | Summary |
|----|---------|
| `109.1` | Onboarding record schema + repository (phase, selections, guided transcript) |
| `109.2` | Hub active character / session cursor persistence |
| `109.3` | Wire onboarding + hub services to campaign DB; remove in-memory Map |
| `109.4` | Portability slice for onboarding state (or fold into `108`) |

## Acceptance criteria

- [ ] Onboarding wizard resumes at the saved phase after app restart
- [ ] Completed PCs appear in campaign hub after restart without re-onboarding
- [ ] Hub remembers last-selected active character per campaign
- [ ] Guided creation transcript and opening-scene flags persist (REBUILD_SPEC per-character guided state)
- [ ] No module-level `Map` remains on the production onboarding path
- [ ] Portability export includes onboarding/guided state (this epic or `108.4`)
- [ ] Sub-tickets verified; gates pass; cloud gate: PR checks green + PR marked ready

## Sub-tickets

### 109.1 — Onboarding durable schema

**Parent:** `109-ElectronAITTRPG-Durable-Onboarding-And-Hub`. **Depends on:** `106`.

#### Acceptance criteria

- [ ] Campaign tables or JSON blobs store onboarding phase, archetype/race/background selections, guided transcript
- [ ] Unit tests cover save/load/resume

### 109.2 — Hub session cursor

**Parent:** `109-ElectronAITTRPG-Durable-Onboarding-And-Hub`. **Depends on:** `109.1`.

#### Acceptance criteria

- [ ] `campaign_meta` or dedicated table stores `activeCharacterId` per campaign
- [ ] Hub screen loads cursor on open

### 109.3 — Service wiring + Map removal

**Parent:** `109-ElectronAITTRPG-Durable-Onboarding-And-Hub`. **Depends on:** `109.1`, `109.2`.

#### Acceptance criteria

- [ ] `onboardingService` and `campaignHubService` use injected repository; IPC handlers stay thin
- [ ] Contract test: onboard character → restart simulation → hub lists PC

### 109.4 — Onboarding portability

**Parent:** `109-ElectronAITTRPG-Durable-Onboarding-And-Hub`. **Depends on:** `109.3`, `108` (coordinate slice ownership with `108.4`).

#### Acceptance criteria

- [ ] Export/import restores in-progress onboarding for a campaign
- [ ] Document whether in-progress onboarding is included or only completed PCs
