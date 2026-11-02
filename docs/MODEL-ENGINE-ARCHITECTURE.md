# Model Engine Architecture

## Purpose

Model Engine is the shared provider and runtime layer for Lokal AI SMALAN. It separates the application workspaces (Chat, Coding, Text, Assistant, Knowledge, and Data Analyst interpretation) from the model provider that performs inference.

The intended product is local-first, not local-only. Provider selection must never silently move user content from the device to a cloud service.

## Current implementation in v0.41.1

- The current browser runtime is WebLLM 0.2.87 running in a Web Worker.
- Llama 3.2 1B and 3B are registered as the current local model choices.
- The same loaded local client is shared by AI Chat, AI Coding, Text & Language, AI Assistant, AI Knowledge, and optional Data Analyst interpretation.
- `assets/js/model-engine-core.js` provides the provider registry, local runtime lifecycle, authenticated gateway discovery, and a same-origin OpenAI-compatible client.
- The Model Engine workspace displays local runtime/model information and live gateway readiness. AI Chat offers GPT only after the authenticated `/api/health` check returns a configured gateway and allowed-model list.
- `gateway/src/worker.js` is a Cloudflare Worker that validates `Cf-Access-Jwt-Assertion` signature, issuer, audience, expiry, and allowed email; it uses the server-side `OPENAI_API_KEY` secret and a per-user Cloudflare rate-limit binding.
- The OpenAI adapter calls the Responses API with `store: false`, bounded input/output, a model allowlist, and streaming. It normalizes output into the Chat Completions stream contract used by the current AI Chat workspace.
- GPT Chat requires explicit consent for the Chat session. Personal AI context is not automatically appended. Other workspaces remain on the local runtime and must not silently fall back to cloud.
- The gateway code and automated mock tests are present but **not deployed**. A path-scoped Access application for `/api/*`, its deny-by-default policy, DNS/Worker route, allowed email list, and Worker secret are still deployment prerequisites.
- Claude and Gemini remain registered targets without provider adapters.

The release contains a tested gateway implementation and gated GPT UI, but no real cloud request can succeed until the Worker is deployed and configured.

## Shared runtime contract

A provider adapter must expose a client compatible with:

```js
client.chat.completions.create({
  messages,
  temperature,
  top_p,
  max_tokens,
  stream
});
```

For streaming calls, the returned value must support asynchronous iteration over chunks containing `choices[0].delta.content`. A runtime may also expose an asynchronous `unload()` lifecycle method.

The local WebLLM client already follows this interface. Future cloud adapters must normalize provider-specific APIs behind the same interface so workspace modules do not need provider-specific request code.

The current registry exposes:
- `getSnapshot()`: safe provider and active-runtime metadata; never exposes the client object.
- `getClient()`: active normalized client for application code.
- `attachRuntime(providerId, client, modelId)`: validates and attaches an available provider runtime.
- `clearRuntime(client?)`: clears the active runtime, with an identity guard when a client is supplied.

Cloud provider entries are intentionally not attachable until a secure gateway is delivered.

## Provider routing principles

1. Local WebLLM remains the default and only enabled provider in this release.
2. The application must show which provider and model are active.
3. Cloud providers remain unavailable until the server-side gateway and its authentication controls are configured.
4. No automatic local-to-cloud fallback. The user must choose and approve an external provider for the specific task.
5. The UI must identify the provider, model, data destination, and expected cost or usage limit before a cloud request is sent.
6. AI Knowledge documents, CSV source rows, personal notes, and other user context must not be sent to cloud providers merely because a cloud provider is connected. Each feature needs a separate data-sharing decision.

## Secure cloud gateway requirements

The current application shell is static HTML/JavaScript and may be hosted as a static site. Private provider credentials must never be embedded in:
- `index.html`, JavaScript, CSS, source maps, or other public repository files;
- browser localStorage, sessionStorage, IndexedDB, or URL parameters;
- client-side configuration objects or build-time public variables.

A future gateway must keep credentials in server-side secret storage and must enforce, at minimum:

- authenticated users or an equivalent access-control mechanism; CORS alone is not authentication;
- provider and model allowlists;
- server-side request validation, maximum input size, maximum output tokens, timeouts, and concurrency limits;
- per-user/per-workspace usage accounting and spending limits;
- explicit per-request or clearly scoped user consent for cloud processing;
- provider-specific error normalization and safe retry rules;
- safe logs that avoid recording full prompts, documents, API keys, or personal content by default;
- rate limiting, abuse protection, secret rotation, and operational monitoring.

A static public app with a shared gateway secret in its JavaScript is not an acceptable design. A shared unrestricted gateway would allow anyone who discovers the endpoint to consume the owner's provider quota.

## Delivery sequence

### Phase 1 — Provider foundation (implemented)
- Register the local provider and future cloud targets.
- Normalize the runtime lifecycle and shared client contract.
- Turn the Model Engine page into a truthful provider/status dashboard.
- Add automated registry and lifecycle checks.

### Phase 2 — Configure and deploy the secure gateway
- The Cloudflare Worker implementation is selected. Confirm the `smalan.sch.id` zone and add an Access self-hosted application for `ai.smalan.sch.id/api/*` only, leaving the static app pages public. Attach a deny-by-default Allow policy for approved SMALAN identities. Add the same-origin `/api/*` Worker route, set the Access team domain/AUD/allowlisted email list, configure the rate-limit namespace, and set `OPENAI_API_KEY` as a Worker secret. Complete the deployment and authenticated `/api/health` check before enabling cloud Chat.
- Define how SMALAN users authenticate and how usage is attributed.
- Set provider/model allowlists, quotas, timeouts, and cost limits.
- Review hosting constraints and the privacy implications before enabling provider calls.

### Phase 3 — Cloud adapters
- Implement one provider adapter at a time behind the gateway.
- Normalize streaming/non-streaming responses into the shared client contract.
- Test errors, rate limits, context limits, cancellation, cost reporting, and data consent.
- Add provider/model selection to the UI only after a tested adapter is available.

### Phase 4 — Smart routing
- Add user-visible routing policies such as Local only, Ask before cloud, and an explicitly configured default provider.
- Never silently send a local prompt to the cloud after a local error.
- Report the selected provider and processing location on every response.

## Validation

Automated tests validate the provider registry, local runtime attachment, cloud provider gating, and runtime cleanup. They do not prove WebGPU model compatibility or any cloud adapter's operational correctness.

A provider is not considered ready until a real browser/device test confirms model selection, generation, streaming, cancellation, error recovery, privacy disclosures, and resource/usage controls.
