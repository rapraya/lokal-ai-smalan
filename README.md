# Lokal AI — SMALAN

A privacy-first, browser-based AI workspace for SMALAN. The project is designed to run supported AI models directly in the user's browser where hardware and browser capabilities allow it.

## Project status

**Early foundation / UI scaffold.** The current version contains the responsive application shell and module navigation. AI inference is not connected yet.

## Planned modules

- **AI Chat** — conversations with locally running language models.
- **AI Vision** — image and document understanding.
- **AI Coding** — code explanation, review, and debugging assistance.
- **Model Engine** — browser capability checks, model loading, and local model storage.
- **Settings** — appearance, privacy, and device information.

## Technology direction

- HTML, CSS, and modern JavaScript
- WebLLM / WebGPU for supported language models
- Transformers.js for supported vision and utility models
- IndexedDB for local persistence where appropriate
- GitHub Pages for static hosting

## Privacy and hardware notes

The goal is local-first processing. A feature may use a remote service only if a future implementation explicitly offers that option and the user chooses it. Model files may be large and must be downloaded before first use. WebGPU support, available memory, browser compatibility, and device performance vary. The interface must clearly disclose model status and whether processing is local.

Never enter confidential or sensitive information into an AI model unless you understand the model and storage behavior.

## Run locally

Because this is a static web app, serve the repository root with any local static HTTP server. For example:

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## Deployment

The project is intended for GitHub Pages. Deployment configuration and automated checks will be added in a later step.

## License

License to be decided by the repository owner.
