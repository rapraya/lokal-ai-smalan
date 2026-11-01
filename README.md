# Lokal AI — SMALAN

**Lokal AI** is a browser-based, multi-capability AI workspace for SMALAN. The product direction combines conversational AI, coding, image and media tools, language workflows, data analysis, virtual assistance, personalization, and navigation in one modern workspace.

The architecture is **local-first, not local-only**: supported models should run in the browser whenever practical. Any future feature that needs an external service must disclose what data leaves the device and require an explicit user choice.

## Current status

**v0.9.0 — Local pivot tables**

- Modern responsive dashboard and navigation for 10 capability areas.
- Dedicated workspaces for AI Chat, AI Coding alpha, Text & Language alpha, and a deterministic local Data Analyst alpha; other capability areas retain their roadmap views.
- Global capability search, responsive layout, and dark/light theme preference stored in the browser.
- Secure-context and WebGPU adapter checks before model initialization.
- Shared WebLLM 0.2.87 runtime through a Web Worker, so Chat and Coding can use the same loaded model.
- Llama 3.2 1B and 3B model options, download progress, and streaming responses.
- AI Coding task modes: generate, explain, debug, review, refactor, and document code.
- Text & Language task modes: write, edit, proofread, summarize, translate, and extract information.
- Chat, Coding, and Text share one loaded local language-model engine; Text and Coding working context are held in the active browser session only.
- Data Analyst imports CSV files locally (up to 5 MB / 10,000 data rows), profiles missing/unique values and duplicate rows, calculates descriptive statistics, draws numeric histograms, supports global search, column-specific text filters, numeric minimum/maximum ranges, numeric/text sorting, pagination, grouped count/sum/average summaries, cross-tab pivot tables with count/sum/average aggregation, and exports filtered rows to CSV without sending data to a server. Pivot and grouped summaries follow active global and column filters.
- Optional local chat history; saving is off by default. Coding prompts and context remain in the active browser session.
- Copyable text output; generated code is displayed as text and is never executed or applied to project files.

**Validation status:** JavaScript syntax and repository smoke checks run in GitHub Actions. The Chat, Coding, and Text runtime still need a real browser/WebGPU session to validate model downloads, device compatibility, language quality, and actual generation. Data Analyst CSV parsing, filtering, sorting, grouping, and deterministic calculations have automated unit coverage but still need hands-on browser testing with representative files, including pivot-table rendering and export. Image, Audio, Video, Assistant, Personal AI, and Navigator remain UI and architecture plans; they do not yet run their respective AI tasks.

The WebGPU check only detects whether a browser can provide an adapter. It does not guarantee that a particular model will fit or run successfully.

## Workspace capabilities

| Workspace | Direction |
| --- | --- |
| AI Chat | WebLLM-based local language-model conversations, streaming, and optional browser-local history. Initial code integration is present; device validation is pending. |
| AI Coding | Initial local-model workspace for code generation, explanation, review, debugging, refactoring, and documentation. No code execution or automatic project-file changes. |
| Image Studio | Image understanding, editing utilities, and a separately evaluated image-generation runtime. |
| Audio Lab | Speech recognition, text-to-speech, audio understanding, and processing. |
| Video Studio | Browser-based media tools, video understanding, and separately evaluated AI video generation. |
| Text & Language | Initial local-model workspace for drafting, editing, proofreading, summarizing, translation, and information extraction. |
| Data Analyst | Local CSV import, data-quality profile, descriptive statistics, histogram, global search, column-specific text filters and numeric ranges, sorting, pagination, grouped count/sum/average, local pivot tables with cross-tab count/sum/average, and filtered CSV export. AI interpretation and date/trend analysis are not yet implemented. |
| AI Assistant | Task planning and approved tools with explicit user confirmation. |
| Personal AI | User-controlled preferences, optional local memory, and explainable recommendations. |
| AI Navigator | Opt-in location, maps, route planning, and mobility assistance. |

See [the product architecture and roadmap](docs/PRODUCT-ARCHITECTURE.md) for feasibility notes, privacy rules, and delivery phases.

## Technology direction

- Static HTML, CSS, and modern JavaScript for the current application shell.
- [WebLLM](https://webllm.mlc.ai/docs/) 0.2.87 for compatible browser-based language models through WebGPU.
- [Transformers.js](https://huggingface.co/docs/transformers.js) for supported browser-based text, vision, and audio tasks.
- Web Workers for compute-heavy tasks where supported.
- Browser Cache API / IndexedDB for model artifacts and user-controlled local data where appropriate.
- GitHub Pages as a static hosting target.

Model support, model licenses, browser compatibility, GPU memory, download size, and performance must be checked before a model is offered as ready to use.

## Run locally (Windows preview)

1. Download the repository ZIP from GitHub and extract it, or clone the repository.
2. Double-click `PREVIEW-WINDOWS.bat` in the extracted project folder.
3. The launcher selects an available local port, opens the preview URL, and displays that exact URL in the launcher window.
4. Keep the `Lokal AI Preview Server` window open while using the preview. Close that window to stop the server.

The launcher uses Python 3 when available, or PHP CLI as a fallback. It checks that `index.html` exists and verifies that the server has started before opening the browser. Alternatively, run `py -3 -m http.server 8766 --bind 127.0.0.1` in the repository root and open http://127.0.0.1:8766/. Do not open `index.html` directly with `file://`; Web Workers and WebGPU require a secure context. Localhost is normally treated as a secure development context.

## AI Chat: first model test

1. Open the AI Chat workspace.
2. Select the smaller 1B model first.
3. Press **Muat model lokal** and allow the runtime/model downloads to finish.
4. Send a simple prompt after the engine reports that the model is ready.
5. If the browser cannot initialize WebGPU or the model exceeds device resources, try another supported browser/device or do not load the model.

The selected model files are downloaded over the network the first time. WebLLM uses browser caching for model artifacts by default, so subsequent loads may reuse cached files. The actual first-run download size and performance depend on the model assets and cache state.

## Privacy and security principles

1. Local processing is preferred when a supported model and device make it practical.
2. Model downloads use a network connection even when later inference runs locally.
3. Optional chat history is stored in this browser only when the user enables it; it is off by default.
4. External AI, maps, storage, or other providers must be clearly identified and opt-in.
5. Never embed private API keys or secrets in a GitHub Pages application.
6. File access, geolocation, and consequential actions require explicit user permission.
7. Local history and memory must be visible, exportable where practical, and deletable by the user.
8. AI output is assistive; important decisions and generated code must be reviewed.

## Deployment

GitHub Pages deployment has not yet been enabled. Keep the site in preview until the application has passed functional, accessibility, privacy, and browser-compatibility checks.

## License

To be decided by the repository owner.
