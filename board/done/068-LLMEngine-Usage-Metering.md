# EPIC: LLMEngine usage metering

Port token/cost metering by purpose so spend is visible across all providers.

**Ported from:** `board/done/112-llm-usage-metering-tokens-cost-by-purpose.md`.

**Depends on:** `067-LLMEngine-Multi-Cloud-Provider-Adapters` (meters every adapter call, not just one provider). **Feeds:** `077-ElectronAdmin-Llm-Usage-Dashboard`.

## Acceptance criteria

- [x] Every completion call records a usage event: provider, model, purpose/tag (e.g. `campaign-create`, `turn-narration`, `guided-identity`), token counts, and estimated cost
- [x] Usage events are queryable aggregated by purpose and by time range
- [x] Metering wraps the adapter layer from `067` so it can't be bypassed by calling a provider directly
- [x] Local providers (Player2, future llama.cpp) still record token counts even though cost is $0, so purpose-level usage stays comparable across providers
