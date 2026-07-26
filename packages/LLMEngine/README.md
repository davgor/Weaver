# LLMEngine (`@weaver/llm-engine`)

Local and provider-backed LLM runtime controller for Weaver.

## Role

Owns model install lifecycle and raw text passthrough completion against a pinned local model or a selected provider adapter. Electron UIs prompt download/status; **NarrationEngine** / **DMEngine** build prompts and consume raw text for invention and orchestration. This package does **not** invent game facts, parse structured output, call tools, or own campaign rules.

## Model & backend

| Setting | Value |
|---------|--------|
| Default model | Qwen2.5 7B Instruct, Q4_K_M (`QWEN_2_5_7B_INSTRUCT_Q4_K_M` / `DEFAULT_MODEL`) |
| Preferred backend | Vulkan, then CPU fallback (`resolvePreferredBackend`) |
| Runtime | `node-llama-cpp` (optional dependency) via `createNodeLlamaRuntime` |
| Default data dir | `.weaver-llm` (`defaultLlmDataDir` / `createDefaultLlmEngine`) |

## Boundaries

- No combat/world/item invention
- No JSON/schema/tool/function-calling modes in the public generation contract
- No Electron imports in the library core — apps call the published API
- Consumers need `*.contract.test.ts` when they call this package

## Generation contract

`completeText` is the core generation API:

```ts
await llmEngine.completeText({
  prompt: 'Continue the scene in one paragraph.',
  context: 'Validated world/NPC/combat facts supplied by the caller.',
  maxTokens: 160
})
// => { text: string, backend: 'vulkan' | 'cpu' }
```

Callers own all prompt construction and any parsing, validation, higher-level retry policy, or multi-step orchestration. **NarrationEngine** is responsible for story prose invention and validation against peer engine data. **DMEngine** is responsible for any "LLM chose an API call" loop by combining `completeText` responses with real peer engine APIs. Deterministic engines do not call LLMEngine.

Cloud/provider adapters keep that same request shape and return the provider id as `backend`:

```ts
import { createTextCompletionClient } from '@weaver/llm-engine'

const client = createTextCompletionClient({
  env: process.env
})

await client.completeText({ prompt: 'Summarize these validated facts.' })
// => { text: string, backend: 'claude' | 'openai' | 'gemini' | 'grok' | 'player2' }
```

## Providers and configuration

Supported provider ids are `claude`, `openai`, `gemini`, `grok`, `player2`, and `local`.

`resolveProviderConfig(settings?, env?)` resolves configuration in this order:

1. Explicit `settings` object (`provider`, then provider-specific `apiKey`, `model`, `baseUrl`)
2. Environment variables
3. Provider defaults where safe (`local` provider, model names, base URLs)

Environment variables:

| Variable | Purpose |
|----------|---------|
| `AGENT_PROVIDER` | Provider id (`claude`, `openai`, `gemini`, `grok`, `player2`, `local`) |
| `CLAUDE_API_KEY` / `CLAUDE_MODEL` | Anthropic messages API |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI chat completions |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini `generateContent` |
| `GROK_API_KEY` or `XAI_API_KEY` / `GROK_MODEL` | xAI Grok OpenAI-compatible chat completions |
| `PLAYER2_BASE_URL` | Player2 OpenAI-compatible server; defaults to `http://127.0.0.1:4315` |

Player2 does not require an API key. Cloud providers require their provider key. `local` remains the default and delegates to the existing node-llama install/runtime path when a local runtime is injected into `createTextCompletionClient` / `createProviderRuntime`.

## Retry behavior

`retryWithBackoff` is a small injectable helper used by provider runtimes. Cloud adapters default to one attempt; Player2 and injected local provider runtimes default to a short capped exponential retry window for cold starts. Tests inject both `fetch` and `sleep`, so unit tests never make real network calls or wait on real timers.

## Status

Implemented for install status, backend probe, install with progress, local `completeText` raw text passthrough, provider adapters for Claude/OpenAI/Gemini/Grok/Player2 behind the same contract, and usage metering (tokens + estimated cost by purpose/tag) wrapped around every adapter completion. Default singleton `llmEngine` remains the local engine used by Electron admin endpoint exercise.

## Usage metering

Every `completeText` call through `createProviderRuntime` / `createTextCompletionClient` (and local `createLlmEngine`) records a usage event: provider, model, purpose/tag, token counts, and estimated USD cost. Local and Player2 providers still record tokens with `$0` cost so purpose-level usage stays comparable.

```ts
import {
  createTextCompletionClient,
  createUsageMeter
} from '@weaver/llm-engine'

const meter = createUsageMeter()
const client = createTextCompletionClient({
  settings: { provider: 'openai', openai: { apiKey: '…' } },
  meter,
  fetch
})

await client.completeText({ prompt: '…', purpose: 'turn-narration' })
meter.aggregateByPurpose()
meter.listEvents({ from, to })
```

Inject `meter` for isolated stores (tests / multi-tenant). Omit it to use `sharedUsageMeter`. Query helpers are also on `LlmEngineApi` as `queryUsageByPurpose` / `listUsageEvents`.

## Public API

```ts
import {
  llmEngine,
  createLlmEngine,
  createDefaultLlmEngine,
  createTextCompletionClient,
  createProviderRuntime,
  resolveProviderConfig,
  DEFAULT_MODEL,
  resolvePreferredBackend
} from '@weaver/llm-engine'

await llmEngine.getStatus()
await llmEngine.resolveBackend()
await llmEngine.install((p) => { /* progress */ })
await llmEngine.completeText({ prompt: 'Hi' })
await llmEngine.dispose()
```

| Export | Notes |
|--------|--------|
| `llmEngine` | Default singleton |
| `createLlmEngine` / `createDefaultLlmEngine` | Factories |
| `createTextCompletionClient`, `createProviderRuntime`, `resolveProviderConfig` | Provider adapter path |
| `createUsageMeter`, `sharedUsageMeter`, `wrapWithUsageMetering`, `estimateCostUsd` | Usage metering |
| `createNodeLlamaRuntime`, `probeVulkanWithNodeLlama` | Runtime wiring |
| `fetchDownloader`, `nodeFileStore`, `defaultLlmDataDir` | Node I/O helpers |
| `DEFAULT_MODEL`, `QWEN_2_5_7B_INSTRUCT_Q4_K_M` | Catalog |
| Types | `ProviderId`, `ProviderSettings`, `ResolvedProviderConfig`, `LlmEngineApi`, `LlmStatus`, `TextRequest` / `TextResponse`, `UsageEvent`, `UsageMeter`, etc. |

Admin-facing endpoints also include `health`, `getStatus`, `resolveBackend`, `install`, `completeText`, `queryUsageByPurpose`, `listUsageEvents` via `listEndpoints` / `call`.

`complete` / `ChatRequest` remain only as a deprecated compatibility wrapper that maps system messages to `context` and the latest user message to `prompt`.

## Future consumer contract tests

When these packages first call LLMEngine, add consumer contract tests in the consumer package against the real `@weaver/llm-engine` public export:

- `packages/NarrationEngine/src/contracts/llmEngine.contract.test.ts` — pin import path, `completeText({ prompt, context? })`, raw `{ text, backend }`, and installed-gate assumptions used by narration.
- `packages/DMEngine/src/contracts/llmEngine.contract.test.ts` — pin the same passthrough contract for DM orchestration loops, with no expectation that LLMEngine emits tool calls or engine-call envelopes.

Those tests belong with the future consumers, not in LLMEngine, and should arrive with the actual NarrationEngine / DMEngine call sites.

## Scripts

```bash
npm test -- packages/LLMEngine
npm run build:engines
```
