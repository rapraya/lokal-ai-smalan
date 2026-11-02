# Product Architecture & Delivery Roadmap

## Product direction

Lokal AI SMALAN is a browser-based, multi-capability AI workspace for SMALAN. The product combines conversational AI, coding, image and media tools, language workflows, data analysis, assistance, personalization, document knowledge, and navigation in one cohesive Modern Premium workspace.

The architecture is **local-first, not local-only**. Supported models should run in the browser whenever practical. Any future feature that needs an external service must identify the provider, disclose what data leaves the device, and require an explicit user choice. Never embed private API keys or secrets in the frontend.

## Current implementation — v0.38.0

The current `main` branch has progressed beyond the original v0.17 architecture notes. The README is the detailed release record; this document summarizes the current architecture and delivery priorities.

### Application shell and model runtime
- Responsive Modern Premium dashboard with navigation across 11 capability areas, capability search, browser-stored Dark/Light/Colorful themes, and a desktop-collapsible sidebar.
- Model Engine provider registry with a normalized chat-completions runtime contract. WebLLM is the only active provider in this release; OpenAI GPT, Anthropic Claude, and Google Gemini are registered as cloud integration targets that remain disabled until a secure authenticated gateway is available.
- The Model Engine dashboard reports the active local runtime, WebGPU/secure-context diagnostics, the current local model catalogue, and cloud gateway readiness.
- The provider registry does not send network requests or store credentials. Private provider keys must remain server-side; CORS alone is not authentication.
- Shared WebLLM 0.2.87 language-model runtime through a Web Worker for AI Chat, AI Coding, Text & Language, AI Assistant, and optional Data Analyst interpretation.
- Llama 3.2 1B/3B model choices, download progress, streaming responses, secure-context/WebGPU adapter checks, and browser caching.
- WebGPU adapter detection is not a guarantee that a selected model fits the device. Real browser/GPU validation, cancellation, lifecycle recovery, and robust resource handling remain required.
- Generated code is displayed as text only; the current alpha does not execute code, edit project files, or open a terminal.

### AI Knowledge
- In-session collection of up to five PDF, TXT, and Markdown documents, with per-file removal and clear-all controls. Document content is not uploaded or persisted.
- PDF.js text extraction and opt-in Tesseract.js OCR for pages without embedded text, limited to 20 OCR pages per PDF. OCR runtime and language data load from external CDNs only after opt-in.
- Optional multilingual semantic retrieval using Transformers.js 4.3.2 and a pinned quantized ONNX embedding model, combined with BM25 lexical retrieval. Semantic downloads are opt-in; BM25 remains the fallback.
- Section-aware retrieval, document summaries, cross-document comparison, source coverage, and filename/page/section citations.
- Claim-level citation review and conservative numerical/contextual checks. These are review signals, not proof of entailment, factuality, or correctness.
- Cross-source evidence comparison distinguishes potential value conflicts, period/scope differences, and unit differences. It does not decide which source is authoritative.
- Table-aware evidence extraction recognizes subject/identity, metric, and period columns; supports up to three header levels, repeated headers, and possible cross-page continuation.
- Structural diagnostics flag duplicate or unknown headers, unrecognized columns, missing roles, inconsistent row widths, inherited identities, and low numeric coverage. Unrecognized tabular blocks remain visible for review and are excluded from generic prose-number comparison.
- Numeric evidence traceability preserves the extracted source line, exact cell text, parsed numeric token, column identity, and character offsets. Offsets refer to extracted text, not physical PDF coordinates.
- **Outstanding validation:** actual browser/device testing is still required for OCR accuracy, embedding downloads and retrieval quality, PDF layout reconstruction, merged cells, multiline rows, complex tables, source display, and real school documents. The checklist is in `docs/AI-KNOWLEDGE-BROWSER-VALIDATION.md`.

### Data Analyst
- Browser-local CSV import with bounded file/row limits, parsing, data-quality profiling, descriptive statistics, histograms, search, filters, sorting, and pagination.
- Grouped count/sum/average summaries, two-dimensional pivot tables, explicit ISO/DMY/MDY date parsing, daily/monthly/yearly trends, previous-period comparisons, and downloadable reports.
- Deterministic IQR outlier detection, quantiles, Pearson correlations, and statistical findings.
- Optional user-triggered local-model interpretation uses aggregate statistics rather than raw rows. Follow-up questions and Markdown report export are session-bound.
- Findings are advisory review signals; correlation does not establish causation. Representative CSV exports and all visual interactions still need hands-on browser testing.

### Other capability workspaces
- **AI Chat:** local WebLLM conversation with streaming and optional browser-local history; browser/GPU validation pending.
- **AI Coding:** local-model generate, explain, debug, review, refactor, and document modes; no code execution or automatic project edits.
- **Text & Language:** drafting, editing, proofreading, summarization, translation, and extraction using the shared local model; Indonesian quality and translation fidelity need evaluation.
- **AI Assistant:** in-session task planning and recommendations only. It does not execute actions, modify files, send messages, or access accounts.
- **Personal AI:** user-managed preferences and manual notes; persistence and model-context inclusion are separate opt-ins. Browser storage is not encrypted and is unsuitable for secrets or sensitive data.
- **Image Studio, Audio Lab, Video Studio, and AI Navigator:** capability navigation and roadmap direction exist, but full working model-backed workflows must not be represented as complete until implemented and validated.

## Privacy and security rules

1. Prefer on-device inference when a supported model and device make it practical; accurately label where processing occurs.
2. Model/runtime downloads require a network connection even when inference later runs locally.
3. Do not upload user content without a clear, feature-specific choice.
4. Disclose external libraries, CDNs, model hosts, map providers, and other services when relevant.
5. Geolocation, file access, persistence, and external actions require explicit user permission.
6. Keep credentials and private data out of public repository files and browser bundles.
7. AI answers, analyses, code, and recommendations must communicate uncertainty and invite verification for consequential use.
8. Any future assistant action system must use an allowlist, least privilege, visible previews, and explicit confirmation gates.

## Delivery priorities

### Priority 1 — Validate the current AI Knowledge release
Do not add more heuristic table features until v0.30.0 has been checked in a real browser against representative, non-sensitive documents. Follow the complete checklist in `docs/AI-KNOWLEDGE-BROWSER-VALIDATION.md`. Record browser/device, test file characteristics, expected versus observed output, console/network errors, and pass/fail status. A diagnostic status such as “consistent” is not proof that the PDF was interpreted correctly.

### Priority 2 — Complete the secure multi-provider Model Engine
The provider registry and Model Engine dashboard are now in place, but cloud providers are not connected. Select a server-side gateway host and authentication model before implementing API adapters. Require provider/model allowlists, explicit data consent, usage budgets, and per-user rate limits. Never place a shared secret in the static frontend. See docs/MODEL-ENGINE-ARCHITECTURE.md.

### Priority 3 — Close runtime and user-experience gaps
Validate WebLLM model loading, streaming, cache/reload behavior, cancellation, error recovery, and browser memory on supported devices. Test Data Analyst with representative CSV exports and verify filtering, pivot tables, trends, charts, and report exports. Evaluate Indonesian drafting, proofreading, and translation quality.

### Priority 4 — Improve reliability from observed failures
Fix only reproducible issues found in browser/device testing. Add regression fixtures for each failure and keep source citations, privacy boundaries, bounded processing, and deterministic fallbacks intact. Avoid extending PDF layout heuristics without real sample evidence.

### Priority 5 — Implement remaining media capabilities
Evaluate compatible browser-based image understanding/editing, speech recognition, text-to-speech, and video frame/audio workflows. Treat image/video generation as separate model/runtime evaluations. Do not label a feature “local” until actual inference and device requirements are validated. Any remote provider must be optional and clearly disclosed.

### Priority 6 — Quality and publication
Complete functional, accessibility, responsive, privacy, dependency, and browser-compatibility reviews before enabling GitHub Pages or a production domain. Keep deployment disabled until these checks pass.

## Technology direction

- Static HTML, CSS, and modern JavaScript for the current application shell.
- WebLLM for compatible browser-based language models through WebGPU.
- Transformers.js for supported browser-based text, vision, audio, and embedding tasks.
- Web Workers for compute-heavy tasks where supported.
- Browser Cache API / IndexedDB only for explicitly disclosed, user-controlled persistence and model artifacts.
- GitHub Pages as a possible static hosting target after quality and privacy validation.

Model support, licenses, attribution, browser compatibility, GPU memory, download size, storage quotas, and performance must be checked before a model is offered as ready to use.

## Local preview

Use `PREVIEW-WINDOWS.bat` on Windows. Keep the preview server window open while using the displayed localhost URL. Do not open `index.html` through `file://`; Web Workers and WebGPU require a secure context. See the repository README for setup and first-model instructions.
