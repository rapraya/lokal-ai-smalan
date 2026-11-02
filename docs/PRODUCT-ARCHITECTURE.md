# Product Architecture & Delivery Roadmap

## Product direction

Lokal AI SMALAN is intended to feel like a premium AI product: one cohesive workspace with distinct studios for conversation, software development, creative media, language, data, assistance, personalization, and mobility.

The product is **local-first, not local-only**. A browser can run many useful models locally, but not every capability is equally practical on every device. Each module must show where processing happens, what model or provider is used, what it needs, and whether data leaves the device.

## Current implementation — v0.17.0

The current branch contains:

- A responsive premium workspace shell.
- An initial AI Knowledge workspace for PDF, TXT, and Markdown documents. TXT/Markdown text is chunked; PDF text is extracted per page through PDF.js loaded on demand from cdnjs. Deterministic lexical matching selects up to five excerpts for local WebLLM Q&A. Page/section citations and the actual excerpts are displayed for verification. Files and extracted text stay in page memory only; OCR and semantic/embedding retrieval are not implemented.\n- An initial AI Assistant workspace with an in-session task list (up to 50 tasks), completion/removal controls, and local WebLLM planning based on user-selected task titles. Assistant conversation context is bounded to 12 stored messages and the latest six are sent with each prompt. The model only recommends; it cannot execute actions, modify files, send messages, or access connected accounts. Task list and conversation remain in page memory and are not persisted.
- Navigation for ten capability modules plus Model Engine and Settings.
- Overview cards, capability search, module descriptions, and roadmap views.
- A browser-stored theme preference.
- A first-pass WebGPU adapter and secure-context check.
- A shared WebLLM 0.2.87 worker-based language-model engine for AI Chat and the initial AI Coding workspace, including a 1B/3B model selector, loading progress callback, and streaming responses.
- AI Coding task modes for code generation, explanation, debugging, review, refactoring, and documentation, with bounded in-session context and copyable text output.
- Generated code is rendered as text only; this alpha does not execute code, edit project files, or open a terminal.
- An initial Text & Language workspace with six task modes: drafting, editing, proofreading, summarization, translation, and information extraction. It reuses the shared engine and keeps task context in memory for the active browser session only.
- An initial deterministic Data Analyst workspace: local CSV import (5 MB / 10,000 data-row limits), quoted and multiline field parsing, comma/semicolon/tab delimiter detection, missing and duplicate row counts, column profiling, numeric descriptive statistics, histograms, global search, type-aware sorting, 25-row pagination, column-specific text filters and numeric ranges, grouped count/sum/average summaries based on active filters, two-dimensional pivot tables, explicit date parsing (ISO, DMY, MDY), daily/monthly/yearly trend summaries with previous-period changes, SVG trend visualization, latest/highest/lowest/net-change indicators, downloadable trend-report CSV, IQR outlier detection, quantile summaries, pairwise Pearson correlation matrix, deterministic statistical findings, optional user-triggered interpretation of aggregate-only statistics through the already-loaded local WebLLM model, follow-up questions with six focus modes and bounded in-session conversation context, Markdown report export, explicit session-history clearing, and filtered CSV export. The interpretation prompt excludes raw CSV rows and individual records; follow-up history is bounded to the latest eight messages and remains in browser memory only; Markdown reports separate deterministic statistics from advisory model output. Statistical findings are transparent rule-based descriptions rather than AI advice. Date format is user-selected; ambiguous values are not guessed and invalid dates are excluded with a visible count. Data is processed in the browser and is not uploaded.

**Runtime validation is pending.** The shared Chat/Coding/Text implementation has not yet been tested on an actual browser/GPU device in this project session. The AI Assistant message builder has deterministic fixture coverage for bounded history, safe task context, and planning prompts. The task manager and streaming assistant UI still require hands-on browser testing. The Data Analyst parser, filtering, sorting, grouped summaries, pivot/trend calculations, IQR outlier detection, Pearson correlation, and aggregate interpretation-context construction and follow-up message construction have automated fixture coverage but still require hands-on browser testing against representative CSV exports. Text quality, translation fidelity, and Indonesian spelling/grammar quality require hands-on evaluation. The AI Assistant reuses the existing local WebLLM engine and has no external-provider fallback. The code path is based on the documented WebLLM worker API. Do not treat the presence of the integration as proof that a selected model will load on every computer.

The WebGPU readiness check does not benchmark GPU memory, browser quotas, or device performance. The actual model manifest resource estimate is only a planning value.

## Capability feasibility

| Area | Local-first approach | Important limitation / decision |
| --- | --- | --- |
| Chat | WebLLM + WebGPU for supported LLMs; worker-based generation and streaming. Initial integration is present; browser testing pending. | Model files must be downloaded; hardware, browser, memory, and model license matter. |
| Coding | Initial shared-WebLLM workspace with generate, explain, debug, review, refactor, and document prompts. | Alpha only: no project-file context loading, code execution, terminal, or automatic edits; those require an isolated workspace and explicit approval. |
| Image understanding | Transformers.js tasks such as image classification, object detection, segmentation, image-to-text, and background removal where a compatible model exists. | Supported tasks and language/quality vary per model. |
| Image generation | Evaluate a dedicated browser image-generation runtime/model; optionally offer a clearly disclosed remote provider. | Transformers.js' current documented task list does not provide a general text-to-image pipeline. Do not label this capability local until an actual runtime is validated. |
| Audio | Transformers.js-compatible speech recognition, audio classification, and text-to-speech models. | Language coverage, voice quality, model size, and offline behavior must be tested per model. |
| Video | Browser-native media processing, frame extraction, and audio transcription; evaluate dedicated video models separately. | AI video generation is a distinct, resource-intensive workload and must not be implied by basic browser video APIs. |
| Text & language | Initial shared-WebLLM workspace for drafting, editing, proofreading, summarization, translation, and extraction. | Alpha only: output quality and Indonesian language behavior must be evaluated. Large document ingestion, citations, and source verification are not implemented. |
| Data analysis | Initial local CSV parser, data-quality checks, numeric descriptive statistics, and browser-side histograms. | Alpha limits: CSV only, 5 MB and 10,000 rows; numeric parsing is conservative and locale-ambiguous formats may be treated as text. AI interpretation is available only as an optional prompt to the already-loaded local WebLLM model using aggregate statistics, not raw rows; no PDF report export yet; date parsing requires an explicit ISO/DMY/MDY selection and does not infer ambiguous formats. CSV export includes the filtered and sorted source rows. Numerical calculations remain deterministic; model interpretation is separate, user-triggered, and advisory. |
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

WebLLM's default model-artifact cache uses the browser Cache API; an IndexedDB cache backend is also documented. Storage remains subject to browser quota and eviction behavior. This project's initial integration uses the default WebLLM cache behavior.

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
**Implemented in v0.2.0.**

Premium responsive overview, ten capability areas, module descriptions, search, theme preference, and first-pass device checks.

### Phase 2 — Model Engine foundation
**Initial device checks are present; full model management remains planned.**

Build a model registry, robust WebGPU diagnostics, model detail cards, loading progress, error recovery, storage management, and worker lifecycle. Validate on more than one browser/device class.

### Phase 3 — Working local AI Chat
**Initial WebLLM worker integration is present; live browser/GPU validation remains pending.**

Verify the 1B model on a compatible device, show clear first-download progress, stream responses, test reload/cache behavior, and validate optional local history. Add cancellation, model lifecycle recovery, and history controls before calling this phase complete.

### Phase 4 — Coding and Text & Language
**AI Coding alpha was implemented in v0.4.0; Text & Language alpha is implemented in v0.5.0.** Both reuse the shared language-model engine and provide structured task prompts with safe text output. Next: validate model behavior on real devices, evaluate Indonesian language quality, add user-selected document/project context with preview and consent, and only later evaluate sandboxed execution and source-grounded workflows.

### Phase 5 — Vision and Audio
Add compatible image understanding, background removal, speech-to-text, and text-to-speech models. Test Indonesian language quality and provide model-specific device requirements.

### Phase 6 — Data Analyst and Assistant
**Data Analyst CSV alpha is implemented in v0.6.0; Data Explorer and grouped summaries were implemented in v0.7.0; column-specific text and numeric-range filters were added in v0.8.0; two-dimensional pivot tables were added in v0.9.0; explicit-format date and trend analysis was added in v0.10.0; visual trend reporting and report export were added in v0.11.0; deterministic decision support (IQR outliers, quantiles, and Pearson correlations) was added in v0.12.0; optional aggregate-only interpretation through the loaded local model was added in v0.13.0; follow-up questions, focus modes, session history, and Markdown report export were added in v0.14.0.** Next: test representative exports in real browsers, improve locale-aware number/date parsing, and export reproducible analysis reports. Then build AI interpretation that receives validated aggregate statistics rather than an unreviewed raw dataset. AI Assistant has an initial planning-only alpha and must use an allowlisted tool registry with preview/approval semantics before any future action execution.

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


## Personal AI and memory controls (v0.17.0)

Personal AI stores only user-entered preference values and manually added notes. Automatic memory extraction is not implemented. Data stays in page memory unless the user explicitly enables browser persistence. Persistence is stored under a versioned localStorage key with a consent flag; turning it off or clearing data removes that key. Browser storage is not encrypted and is not suitable for secrets or sensitive information. A separate disabled-by-default permission controls whether a bounded preference-and-note context is added to local WebLLM requests from Chat, Coding, Text, and Assistant. No cloud sync or transcript storage is added. The user can inspect and delete each note and clear all stored Personal AI data.


## AI Knowledge workspace (v0.18.0)

The workspace now supports an in-memory collection of up to five PDF, TXT, and Markdown documents. Each file is processed independently under the existing per-file size and page limits. Users can remove one document or clear the collection. Cross-document lexical retrieval ranks relevant chunks across the complete loaded collection and preserves document filename plus page/section identity in source markers and displayed excerpts. Only the selected excerpts are passed to the already-loaded local WebLLM model. No document data is persisted or uploaded. Semantic embeddings, OCR for scanned PDFs, and browser/device validation remain future work.

## Previous AI Knowledge alpha (v0.17.0)

The initial Knowledge alpha accepts PDF, TXT, and Markdown documents in the browser. Files are limited to 12 MB; PDFs are limited to 80 pages; extracted text is bounded to 90,000 characters. PDF extraction loads PDF.js 4.10.38 and its worker from cdnjs on demand. This is a disclosed external static-library dependency, not a document upload: document bytes and extracted text remain in page memory.

Retrieval is deterministic lexical matching over page/section text and selects up to five excerpts. Only selected excerpts and the question are sent to the already-loaded local WebLLM model. The system prompt treats source text as untrusted data, asks for source markers, and requires the model to state when evidence is insufficient. The UI displays the actual selected excerpts with page/section labels so users can verify the answer. This is not guaranteed semantic retrieval or formal citation validation.

Documents are not persisted and can be cleared. No raw file, document text, or prompt is sent to a remote AI provider. PDF scans without embedded text are unsupported because OCR is not included. Embeddings, semantic search, multi-document collections, source ranking evaluation, and actual browser/WebGPU validation remain pending.
