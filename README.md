# Lokal AI — SMALAN

**Lokal AI** is a browser-based, multi-capability AI workspace for SMALAN. The product direction combines conversational AI, coding, image and media tools, language workflows, data analysis, virtual assistance, personalization, and navigation in one modern workspace.

The architecture is **local-first, not local-only**: supported models should run in the browser whenever practical. Any future feature that needs an external service must disclose what data leaves the device and require an explicit user choice.

## Current status

**v0.2.0 — Premium workspace foundation**

- Modern responsive dashboard and navigation for 10 capability areas.
- Module overview pages and global capability search.
- Dark/light theme preference stored in the browser.
- Initial secure-context and WebGPU adapter checks.
- Product architecture and implementation roadmap.

**Important:** This is still a UI and architecture foundation. No AI model inference, image generation, speech processing, video generation, data-agent workflow, or map service is connected yet. The WebGPU check only detects whether an adapter is available; it does not prove that a particular model can run.

## Workspace capabilities

| Workspace | Direction |
| --- | --- |
| AI Chat | Local language-model conversations with streaming responses and locally stored history. |
| AI Coding | Code explanation, generation, review, debugging, and later safe project workflows. |
| Image Studio | Image understanding, editing utilities, and a separately evaluated image-generation runtime. |
| Audio Lab | Speech recognition, text-to-speech, audio understanding, and processing. |
| Video Studio | Browser-based media tools, video understanding, and separately evaluated AI video generation. |
| Text & Language | Writing, summarization, translation, language tasks, and document workflows. |
| Data Analyst | Local data import, deterministic statistics, visualizations, and AI-assisted interpretation. |
| AI Assistant | Task planning and approved tools with explicit user confirmation. |
| Personal AI | User-controlled preferences, optional local memory, and explainable recommendations. |
| AI Navigator | Opt-in location, maps, route planning, and mobility assistance. |

See [the product architecture and roadmap](docs/PRODUCT-ARCHITECTURE.md) for feasibility notes, privacy rules, and delivery phases.

## Technology direction

- Static HTML, CSS, and modern JavaScript for the current application shell.
- [WebLLM](https://webllm.mlc.ai/docs/) for compatible browser-based language models through WebGPU.
- [Transformers.js](https://huggingface.co/docs/transformers.js) for supported browser-based text, vision, and audio tasks.
- Web Workers for compute-heavy tasks where supported.
- IndexedDB and browser caching for user-controlled local data and model assets.
- GitHub Pages as a static hosting target.

Model support, model licenses, browser compatibility, GPU memory, download size, and performance must be checked before a model is offered as ready to use.

## Run locally

Serve the repository root with a local static HTTP server:

    python -m http.server 8080

Open http://localhost:8080. WebGPU features require a secure context in supporting browsers; localhost is normally treated as a secure development context.

## Privacy and security principles

1. Local processing is preferred when a supported model and device make it practical.
2. External AI, maps, storage, or other providers must be clearly identified and opt-in.
3. Never embed private API keys or secrets in a GitHub Pages application.
4. File access, geolocation, and consequential actions require explicit user permission.
5. Local history and memory must be visible, exportable where practical, and deletable by the user.
6. AI output is assistive; important decisions and generated code must be reviewed.

## Deployment

GitHub Pages deployment has not yet been enabled. Keep the site in preview until the application has passed functional, accessibility, privacy, and browser-compatibility checks.

## License

To be decided by the repository owner.
