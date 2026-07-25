# EPIC: ElectronAITTRPG settings UI

Build the Settings surface for provider/model selection, image-provider rails, and embedding mode.

**Ported from:** the `settings` renderer module in AI-DND-Matrix's README, `board/done/016-settings-provider-setup.md`, `113-multi-cloud-provider-settings-dropdown.md`, `152-image-provider-settings-and-local-rails.md`.

**Depends on:** `067-LLMEngine-Multi-Cloud-Provider-Adapters`, `066-NarrationEngine-Visual-Token-Generation`, `065-NarrationEngine-Rag-Retrieval` (embedder mode picker).

## Acceptance criteria

- [ ] Provider dropdown covers Claude/OpenAI/Gemini/Grok/Player2 with a curated model picker plus optional custom model id per provider
- [ ] Image-provider rails (cloud/Player2/local) are selectable independently of the text-LLM provider
- [ ] Embedding mode (local/cloud/lexical-only) is selectable and reflects what `065` actually supports at runtime (no dead options)
- [ ] Settings changes take effect without an app restart wherever the underlying engine supports hot-swapping (matches AI-DND-Matrix's seamless-apply lifecycle work)
- [ ] A connection-check action confirms the selected provider is reachable before the player relies on it mid-campaign
- [ ] This package's consumption of LLMEngine (`067`) and NarrationEngine (`066`, `065`) is each covered by `*.contract.test.ts` here against their real published APIs
