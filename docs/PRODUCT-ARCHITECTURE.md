# Product Architecture & Delivery Roadmap

## Product direction

Lokal AI SMALAN is intended to feel like a premium AI product: one cohesive workspace with distinct studios for conversation, software development, creative media, language, data, assistance, personalization, and mobility.

The product is **local-first, not local-only**. A browser can run many useful models locally, but not every capability is equally practical on every device. Each module must show where processing happens, what model or provider is used, what it needs, and whether data leaves the device.

## Current implementation

Version 0.2.0 currently provides:

- A responsive premium workspace shell.
- Navigation for ten capability modules plus Model Engine and Settings.
- Overview cards, capability search, module descriptions, and roadmap views.
- A browser-stored theme preference.
- A first-pass WebGPU adapter and secure-context check.

The application does **not yet run any AI model**. The readiness check does not benchmark available memory or guarantee model compatibility.

## Capability feasibility

| Area | Local-first approach | Important limitation / decision |
| --- | --- | --- |
| Chat | WebLLM + WebGPU for supported LLMs; worker-based generation and streaming. | Model files must be downloaded; hardware, browser, memory, and model license matter. |
| Coding | A capable local LLM for code explanations, generation, and review. | File editing and execution need an isolated workspace, explicit scope, and user approval. |
| Image understanding | Transformers.js tasks such as image classification, object detection, segmentation, image-to-text, and background removal where a compatible model exists. | Supported tasks and language/quality vary per model. |
| Image generation | Evaluate a dedicated browser image-generation runtime/model; optionally offer a clearly disclosed remote provider. | Transformers.js' current documented task list does not provide a general text-to-image pipeline. Do not label this capability local until an actual runtime is validated. |
| Audio | Transformers.js-compatible speech recognition, audio classification, and text-to-speech models. | Language coverage, voice quality, model size, and offline behavior must be tested per model. |
| Video | Browser-native media processing, frame extraction, and audio transcription; evaluate dedicated video models separately. | AI video generation is a distinct, resource-intensive workload and must not be implied by basic browser video APIs. |
| Text & language | WebLLM for general writing and compatible Transformers.js pipelines for specialized language tasks. | Verify the chosen model supports Indonesian and the intended task. |
| Data analysis | Local CSV/table parsing, deterministic calculations, and browser-side charts; an LLM explains validated results. | Numerical calculations must not rely on an LLM's unsupported mental arithmetic. Show assumptions and data provenance. |
| Virtual assistant | Local reasoning plus an allowlisted set of tools and workflows. | Preview actions and require confirmation before sending, deleting, publishing, navigating to a site, or changing user data. |
| Personalization | Store explicitly selected preferences and optional memory locally, for example in IndexedDB. | Memory must be transparent, editable, and deletable; do not silently profile users. |
| Navigation | Browser geolocation only after permission; map and route data from an identified provider. | Location is sensitive. Explain when coordinates are sent to a map/routing provider and ask before use. |

## Core architecture

### Application shell
Keep the current static HTML/CSS/JavaScript foundation lightweight. The UI shell must remain usable even when a model is unavailable or the device does not support WebGPU.

### Model Engine
Create a registry of model records rather than hard-coding model names across screens. Each record should include:

- Task and modality.
- Runtime and supported device backends.
- Exact model identifier and source.
- Download size and storage requirements where available.
- Supported languages, license, and attribution.
- Browser/GPU prerequisites.
- Whether the model executes locally or calls a remote service.

The first runtime candidates are WebLLM for LLM inference and Transformers.js for supported vision, audio, and specialized text tasks. Heavy inference should be moved off the main UI thread where the runtime supports workers.

### Persistence
Separate preferences, conversations, uploaded work files, and model artifacts. Use browser storage deliberately, show storage usage where possible, and provide controls to clear user data. Do not assume browser cache is permanent.

### External providers
An external provider must never be a silent fallback. Before a request, tell the user which provider receives the relevant text, file, image, audio, video, or location data. Do not include API keys in frontend code; use a secure server-side integration only if a future backend is intentionally introduced.

## Privacy and safety rules

1. Local-first means local only when the selected runtime actually performs the inference on the device.
2. Model downloads use a network connection even when subsequent inference is local.
3. Do not upload user content without a clear, per-feature choice.
4. Geolocation, browser APIs, file access, and external actions are opt-in and permission-scoped.
5. AI-generated answers, analyses, code, and recommendations must communicate uncertainty and invite verification where consequential.
6. Assistant tools must use an allowlist, least privilege, visible action previews, and confirmation gates.
7. Keep credentials and private data out of public repository files and browser bundles.

## Delivery roadmap

### Phase 1 — Product shell and information architecture
**Current phase: implemented in v0.2.0.**

Premium responsive overview, ten capability areas, module descriptions, search, theme preference, and first-pass device checks.

### Phase 2 — Model Engine foundation
Build a model registry, robust WebGPU diagnostics, model detail cards, loading progress, error recovery, storage management, and worker lifecycle. Validate on more than one browser/device class.

### Phase 3 — Working local AI Chat
Integrate WebLLM, test a small prebuilt model on compatible hardware, show first-download size/progress, stream responses, handle cancellation, and persist chat history locally with clear delete controls. Do not make the application depend on a single large model.

### Phase 4 — Coding and Text & Language
Reuse the language-model abstraction, add structured prompts and safe code blocks, then build text tools and document workflows using validated local pipelines.

### Phase 5 — Vision and Audio
Add compatible image understanding, background removal, speech-to-text, and text-to-speech models. Test Indonesian language quality and provide model-specific device requirements.

### Phase 6 — Data Analyst and Assistant
Build deterministic local data handling, charts, and transparent decision support. Introduce tool execution only after sandboxing, permission scopes, confirmation UI, and audit history are in place.

### Phase 7 — Image Studio and Video Studio
Evaluate dedicated image/video runtimes and models. Offer local processing only after real device tests; any hosted generation provider must be an explicit optional integration.

### Phase 8 — Personal AI and Navigator
Add opt-in local preferences/memory, explainable recommendations, and consent-based map/location workflows.

### Phase 9 — Quality and publication
Run functional tests, accessibility checks, responsive browser testing, privacy review, documentation, and GitHub Pages deployment checks.

## Technical references

- WebLLM documentation: https://webllm.mlc.ai/docs/
- WebLLM basic usage and streaming: https://webllm.mlc.ai/docs/user/basic_usage.html
- WebLLM worker and cache guidance: https://webllm.mlc.ai/docs/user/advanced_usage.html
- Transformers.js documentation: https://huggingface.co/docs/transformers.js
- Transformers.js pipeline task matrix: https://huggingface.co/docs/transformers.js/pipelines
- MDN WebGPU API and secure-context requirements: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
