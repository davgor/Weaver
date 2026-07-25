# EPIC: LLMEngine multi-cloud provider adapters

Port the provider-agnostic cloud LLM backend: Claude, OpenAI, Gemini, Grok, and Player2 (local, OpenAI-compatible), swappable via Settings or env with no code change.

**Ported from:** `board/done/005-claude-provider.md`, `014-player2-provider.md`, `113-multi-cloud-provider-settings-dropdown.md`, and AI-DND-Matrix's README ("Provider-agnostic LLM backend").

**Depends on:** `019-LLMEngine-Text-Passthrough-API` (these adapters sit behind the same `completeText` contract — cloud providers are just another backend, not a parallel API shape). **Feeds:** `075-ElectronAITTRPG-Settings-Ui`.

## Acceptance criteria

- [ ] Claude, OpenAI, Gemini, Grok, and Player2 each have an adapter implementing the same `completeText`-shaped contract from `019` — callers (NarrationEngine/DMEngine) do not need to know which backend is active
- [ ] Provider + model selection resolves from Settings first, falling back to env vars (`AGENT_PROVIDER`, `*_API_KEY`, `*_MODEL`) for dev/portable use, matching AI-DND-Matrix's resolution order
- [ ] Player2 adapter talks to the local OpenAI-compatible endpoint (default `http://127.0.0.1:4315`, overridable) with no API key required
- [ ] Switching provider is a runtime config change — no rebuild/redeploy needed
- [ ] Retry/backoff behavior is defined per adapter (especially for local providers prone to cold starts)
