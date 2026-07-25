# EPIC: LLMEngine raw text passthrough API

Refine `@weaver/llm-engine` so its **core generation surface** is a dumb passthrough: other engines and packages own prompts; LLMEngine only runs the local model and returns raw text. One request shape in, one text string out. No JSON-mode, schema forcing, tool/function calling, or game orchestration in this package.

**Builds on:** `011-LLMEngine-Local-Qwen-Runtime` (install, backend probe, `node-llama-cpp` runtime). **Feeds:** NarrationEngine (prose invention), DMEngine (orchestration — including any multi-step / tool-style loops). Deterministic engines stay LLM-free and never call this package directly for invention.

**LLM boundary:** runtime + passthrough only. **DMEngine** owns any “LLM makes calls / picks APIs” behavior by composing multiple `complete`-style calls and peer engine APIs itself. **NarrationEngine** owns validated story prose. LLMEngine must not invent facts or decide which engines to invoke.

## Core contract (v1)

| Side | Shape | Notes |
|------|--------|-------|
| **Input** | `{ prompt: string, context?: string, maxTokens?: number }` | Callers (Narration / DM / Admin) build `prompt` and optional `context`. LLMEngine does not interpret game meaning. |
| **Output** | `{ text: string, backend: LlmBackend }` | Raw model text only — no parse-to-JSON, no structured-output mode, no tool-call envelopes. |

Suggested public method name (lock in sub-ticket): `completeText(request)` (or slim `complete` to this shape and migrate callers off chat-message arrays).

### What “passthrough” means

```text
Caller (NarrationEngine | DMEngine | ElectronAdmin)
  builds prompt + optional context strings
        │
        ▼
LLMEngine.completeText({ prompt, context?, maxTokens? })
  installs/runtime already ready → run model → return { text, backend }
        │
        ▼
Caller parses / validates / orchestrates
  (Narration validates vs peer engines; DM may loop and call other APIs)
```

### Explicitly out of scope for this epic

- JSON / structured output modes, response schemas, or “return valid JSON” system prompts owned by LLMEngine
- Tool / function calling, tool registries, or agent loops inside LLMEngine
- Choosing which peer engine to call (that is **DMEngine**)
- Inventing combat/world/item/NPC/enemy facts
- Changing the pinned model catalog or Vulkan→CPU backend preference (already done in 011)

Chat-style `messages: [{ role, content }]` may remain as an internal/runtime adapter or a thin deprecated alias during migration, but the **published v1 contract** for consumers is prompt + context → text.

## Supporting APIs (keep / align)

Install and health from 011 stay; this epic only reshapes generation:

| Function | Behavior |
|----------|----------|
| `getStatus` / `install` / `resolveBackend` | Unchanged intent — UI prompts download; engine owns files + backend |
| `completeText` (core) | Passthrough generation; refuse when not installed |
| `dispose` | Tear down runtime |
| Admin `listEndpoints` / `call` | Expose `completeText` (and status/install) for ElectronAdmin exercise |

## Peer contract (who calls what)

```text
ElectronAdmin / ElectronAITTRPG
  getStatus / install / resolveBackend     ← UI download prompts
  completeText (Admin smoke / metrics)     ← optional exercise only

NarrationEngine
  completeText({ prompt, context })        ← invents prose; validates elsewhere

DMEngine
  completeText({ prompt, context })        ← may call repeatedly
  peer engine APIs                         ← “LLM made a call” = DM decides & invokes
  (never expects LLMEngine to emit tool calls)

Deterministic engines
  do not import LLMEngine
```

## Sub-tickets

| Id | Summary |
|----|---------|
| `019.1` | Types + `completeText` contract (prompt/context in, raw `text` out); unit tests with injectable runtime fake |
| `019.2` | Wire `createLlmEngine` / default singleton / node-llama runtime to `completeText`; map prompt+context → model input without JSON/tool modes |
| `019.3` | Migrate Admin catalog / existing `complete` callers to `completeText`; deprecate or remove chat-message public request if unused |
| `019.4` | Package README + root README LLM boundary wording: passthrough only; tool/API loops owned by DMEngine |
| `019.5` | Consumer contract stubs / notes for NarrationEngine + DMEngine (real `*.contract.test.ts` when those packages call LLMEngine) |

## Acceptance criteria

- [ ] Epic defines a single core generation API: prompt + optional context in, raw text out
- [ ] Explicit: no JSON formatting / structured-output / tool-calling inside LLMEngine; DMEngine owns multi-step API orchestration
- [ ] Sub-tickets listed above; none implemented until separately completed
- [ ] Builds on 011 runtime/install; does not re-litigate model pin or Vulkan/CPU preference
- [ ] Peer boundary documented: Narration/DM (and Admin for exercise) call LLMEngine; deterministic engines do not
