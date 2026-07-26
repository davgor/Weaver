# EPIC: ElectronAdmin LLM usage & provider review dashboard

Build the Admin-side view of `LLMEngine`'s usage metering, plus exercise coverage so each new engine gets an Admin panel entry as it lands.

**Ported from:** the Admin/metering side of `board/done/112-llm-usage-metering-tokens-cost-by-purpose.md` and `113-multi-cloud-provider-settings-dropdown.md`.

**Depends on:** `068-LLMEngine-Usage-Metering`.

## Acceptance criteria

- [x] Admin dashboard shows usage aggregated by purpose, provider, and time range, sourced from `068`'s query API
- [x] Provider/model currently active is visible at a glance, with a manual connection-check action
- [x] `EngineRail`/`EndpointPanel` (existing Admin engine-catalog UI) gains entries for `CharacterEngine`, `CombatEngine`, `ItemEngine`, `NPCEngine`, `EnemyEngine`, `DMEngine`, and `NarrationEngine` as each ships its first real endpoint beyond `health`
- [x] No game business logic lives in this package — dashboard reads exclusively through engine APIs
- [x] This package's consumption of LLMEngine's usage-metering API (`068`) is covered by a `*.contract.test.ts` here against LLMEngine's real published API
