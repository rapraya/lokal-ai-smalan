# Lokal AI — SMALAN

**Lokal AI** is a browser-based, multi-capability AI workspace for SMALAN. The product direction combines conversational AI, coding, image and media tools, language workflows, data analysis, virtual assistance, personalization, and navigation in one modern workspace.

The architecture is **local-first, not local-only**: supported models should run in the browser whenever practical. Any future feature that needs an external service must disclose what data leaves the device and require an explicit user choice.

## Current status

**v0.47.0 — Experimental Indonesian Text-to-Speech**
- Adds opt-in browser-local Indonesian speech synthesis to Audio Lab using the MMS VITS ONNX conversion `payam1394/traxlate-mms-tts-ind`.
- Uses the quantized q8 ONNX weight file (about 38.3 MB), Transformers.js 4.3.2, WebAssembly CPU, and a dedicated worker. The first model/runtime load requires an internet connection; generated text and audio stay in the browser and are not sent to an inference endpoint.
- Requires explicit acknowledgement of the model's **CC BY-NC 4.0** license before model loading. The model is for noncommercial use only and attribution is required. Do not use it in a commercial context without separate permission.
- Limits input to 500 characters and a generated waveform to 90 seconds. Output is previewable and downloadable as mono PCM16 WAV.
- This is experimental: the model conversion was exported using Transformers.js 3.8.1 while this app uses 4.3.2. Browser tests mock the pipeline and verify license gating, worker lifecycle, audio output handling, WAV encoding, cancellation, and mobile layout; they do not verify real model compatibility, pronunciation quality, speed, or memory use on physical devices.
- Model attribution and usage notes are in [Third-party model licenses](docs/THIRD-PARTY-MODEL-LICENSES.md).

**v0.46.2 — Accurate SRT Cue Timing**
- Preserves the Whisper segment's actual start timestamp while clamping its end to the selected source-audio range.
- Ignores zero-length subtitle cues and avoids extending valid cues beyond the source clip.
- Refreshes browser asset cache identifiers after the timing correction.

**v0.46.1 — Transcript Timestamp Boundary Fix**
- Clamps normalized subtitle cue times to the selected source-audio range so SRT timestamps cannot extend beyond the original clip.
- Distinguishes an empty new range from an empty overall transcript, preserving earlier appended results without reporting that new speech was added.
- Refreshes browser asset cache identifiers for the Audio Lab refinement.

**v0.46.0 — Multi-range Transcript Assembly & Subtitle Export**
- Audio Lab can append successive 1–120 second Whisper results into one timestamped transcript or switch to replace mode for a fresh result.
- Each segment keeps its absolute position in the original audio, so separately processed ranges can be combined without losing the source-time offset.
- Adds transcript TXT download, SRT subtitle export with sequential cue numbers and millisecond timestamps, copy, and clear controls.
- Browser smoke tests use a mocked ASR pipeline to verify append/replace behavior, timestamp offsets, TXT/SRT contents, minimum-range enforcement, cancellation, and output clearing. This validates the application workflow, not the real model's speech accuracy, device speed, or memory use.

**v0.45.0 — Local Whisper Tiny Speech-to-Text (Alpha)**
- Adds optional browser-local speech transcription to Audio Lab using Transformers.js 4.3.2 and the multilingual `onnx-community/whisper-tiny` model.
- Runs quantized 8-bit inference through a dedicated single-thread WebAssembly worker on CPU; it does not require a GPU or API key.
- The model weights are downloaded from Hugging Face on first use (approximately 45 MB; actual supporting-file transfer may vary) and cached by the browser. The Transformers.js runtime is loaded from jsDelivr. An internet connection is needed for first-time downloads.
- Audio remains in the browser. The selected range is resampled to mono 16 kHz locally and transferred to the worker; there is no audio upload or cloud inference.
- Each transcription requires a selected range of at least 1 second and is limited to 120 seconds. Longer recordings can be processed in smaller ranges. Language choices are Indonesian, English, and automatic detection; 30-second chunks use 5-second overlap.
- Adds download progress, worker cancellation, transcription timestamps, copyable results, and worker cleanup when leaving Audio Lab.
- Automated browser coverage uses a deterministic mock of the Transformers.js pipeline to test worker wiring, progress, 16 kHz audio transfer, language selection, results, and cancellation. It does not establish real-device model speed, speech accuracy, or memory use; those still need testing on supported hardware.
- A separate [real-model validation checklist](docs/audio-asr-real-validation.md) covers actual browser inference, Indonesian/English samples, transcript reference comparison, cancellation recovery, and network privacy inspection. Do not treat mocked browser tests as real-model validation.

**v0.44.0 — Browser-local Video Studio Frame Capture**
- Adds a browser-local video workspace for supported files up to 100 MB and 10 minutes.
- Reads video metadata and previews the selected local file with the browser's native media player. If a container omits duration metadata, frame capture can advance through local playback with a 10-minute timestamp ceiling.
- Captures a frame at a user-selected timestamp and exports it as PNG without uploading the source video.
- Enforces a 4,096 px maximum frame side and a 16-megapixel export limit. Video codec support depends on the browser.
- Timeline trimming, clip merging, audio extraction, transcription, and AI video generation are not enabled.
- Adds Chromium coverage that creates a short WebM fixture, checks decoded metadata and timestamp seeking, verifies the exported PNG signature/dimensions, checks cleanup, and validates the mobile layout. Browser/device codec behavior still requires real-device validation.

**v0.43.0 — Browser-local Audio Lab (Initial)**
- Adds a local audio workspace for browser-decodable audio files up to 20 MB and 5 minutes.
- Uses the Web Audio API to decode audio in the browser, display a waveform, play the selected range, and export a trimmed WAV file.
- WAV output uses uncompressed PCM 16-bit and preserves the decoded sample rate and channel count.
- Enforces a 20-million decoded-sample-point budget to limit memory use; actual codec support depends on the browser.
- Audio bytes are not uploaded. AI transcription, text-to-speech, source separation, and model-based audio understanding are not yet enabled.
- Adds Chromium browser coverage for audio decoding, waveform drawing, selected-range preview start, WAV header/payload verification, resource clearing, and mobile layout. Device-specific codec and memory behavior still need real-device validation.

**v0.42.1 — Image Studio Export Verification**
- Extends the GitHub Chromium journey to inspect downloaded PNG bytes and verify the exported pixel dimensions, then validate the JPEG file signature and selected quality setting.
- Refreshes static asset cache identifiers so browsers request the latest editor and stylesheet files.
- No new cloud dependency or provider API key is required.

**v0.42.0 — Local Image Studio Editor**
- Introduces a browser-local image editing workspace for JPEG, PNG, and WebP files.
- Adds 90-degree rotation, horizontal/vertical flipping, locked-aspect resizing, and PNG/JPEG/WebP export through Canvas.
- Enforces a 20 MB source-file limit, 8,000 px maximum side length, and 40-megapixel processing/output budget; unsupported formats and oversized inputs fail closed.
- Image bytes remain in the browser. Temporary object URLs and Canvas buffers are released when the user clears the image or leaves the workspace.
- AI image generation, image understanding, and background removal remain explicitly unavailable; this release is a local editing utility, not a generative model.
- Adds GitHub Actions browser coverage for image loading, transforms, dimension controls, export, and cleanup. Actual performance still depends on each device's browser and available memory.


**v0.32.0 — Responsive Usability & Full-width Workspace**
- Corrects desktop workspace sizing so the main area uses the full space beside the fixed sidebar without creating horizontal overflow.
- Removes restrictive maximum widths from module and chat workspaces so working areas expand to the available page width.
- Applies a consistent minimum 12px readable text floor while preserving larger heading hierarchy.
- Reinforces narrow-screen layout behavior for module, chat, coding, knowledge, and data-table workspaces.
- Adds regression checks for full-width layout, mobile sizing, and readable typography. Real browser/device testing is still required.

**v0.30.0 — Table Evidence Traceability & Structural Audit**
- Preserves the exact extracted text cell, parsed numeric token, one-based extraction line, column identity, and character offsets for each table-derived numeric value. Offsets refer to extracted page/section text, not physical PDF coordinates.
- Cross-source conflict details show the originating cell and numeric token alongside document, page, data-row, column, and header metadata.
- Adds diagnostic structure checks for duplicate headers, unrecognized columns, missing identity/metric roles, inconsistent row widths, inherited identities, and low numeric parsing coverage.
- Keeps unrecognized TAB-delimited blocks visible as review items and excludes them from numeric table comparisons and generic prose fallback.
- Automated tests cover decimal/thousands token offsets, exact source-cell tracing, structural status, inherited-identity warnings, and fail-closed handling of unrecognized tables. OCR, visual merged cells, multiline rows, and real PDF layout still require browser/device validation.

**v0.29.0 — Advanced Table Structure Recognition**
- Recognizes up to three consecutive table-header levels and composes column labels from hierarchical group headers and leaf headers.
- Attaches shorter, merged group-header rows above the detailed PDF table grid when their recognized identity/metric roles align with the columns below.
- Carries blank identity cells forward within a table as a possible merged-cell label, while marking inherited identities in each evidence record so the user can review the inference.
- Preserves header depth, header rows, normalized column labels, and data-row boundaries in PDF table metadata; repeated-header checks can use the composed header key.
- Table conflict evidence displays the complete column header, row/column position, header depth, and whether the subject identity was inherited. Unrecognized tabular text is withheld from generic prose-number comparison rather than guessed.
- Automated tests cover hierarchical PDF headers, multi-row text headers, merged group labels, inherited identity cells, row boundaries, and unrecognized-table fallback. Scanned/OCR tables, merged PDF cells, multiline rows, and complex layouts still require browser/device validation.

**v0.28.0 — Subject-aware & Table-aware Evidence Verification**
- Parses TAB-delimited PDF text lines into conservative table records when recognized identity columns and numeric metric/period columns are present.
- Maps row identity from subject, class, category, indicator, and other recognized label columns; maps metrics from value headers; and keeps year/semester/month scope separate from measurement values.
- Compares table values only when the normalized row identity and metric key match across different selected source pages. Different names, classes, categories, and indicators are not treated as the same record.
- Distinguishes value differences, period differences, and unit differences. The review panel shows the subject/row label, metric column, period, data-row index, column index, source document, page, and original TAB-delimited row excerpt.
- Table-derived numeric values are excluded from the generic prose comparison for that source, avoiding a second comparison that would ignore row identity. Prose evidence continues to use the v0.27 heuristic.
- Automated tests cover matching subject/class rows, different subjects, different classes, year columns, year fields, unit-aware metric headers, and row/column source provenance. Complex PDF layouts, merged cells, OCR tables, and actual school documents still need browser validation.
**v0.27.0 — Cross-source Evidence Conflict Detection**
- Uses PDF.js text coordinates to reconstruct approximate reading lines and preserve wider horizontal gaps as TAB-separated columns.
- Detects repeated multi-column row patterns as potential table rows and retains a row-count hint on each PDF page. The UI and evidence prompt disclose this as an indication, not guaranteed table reconstruction.
- Builds table blocks from consistent column counts and horizontal anchors, then checks adjacent PDF pages for a table reaching the bottom of one page and resuming at the top of the next.
- Identical leading header cells on consecutive pages are marked as a repeated header. Matching column geometry without an identical header is shown only as a **possible** continuation, never as a confirmed link.
- Repeated-header and possible-continuation metadata stays attached to the original page citations; the local synthesis prompt is instructed not to count repeated headers as data rows or overstate uncertain continuation.
- Automated tests cover table-block boundaries, header normalization, repeated headers, possible continuations, and rejection of non-consecutive page links. Complex layouts and real multi-page files still require manual validation.
- Adds claim-level citation review for answer sentences, checking each [S#] reference against the exact excerpt text sent to the local model.
- Classifies claims as textually supported, partial, weak, uncited, invalid-reference, or too short to assess; the UI shows claim snippets, cited sources, and lexical overlap ratios for claims needing review.
- Strengthens answer instructions to separate directly stated facts from interpretation and cite each factual sentence.
- The verifier is deliberately lexical, not a semantic entailment or factuality model. A high word overlap does not prove that a claim is accurate, logically supported, or in the right context; human review remains required.
- Automated tests cover supported, partial, weak, uncited, invalid, multiple-claim, and short-claim cases.
- Preserves OCR line breaks when available; OCR-derived content is not falsely labeled as a coordinate-reconstructed table.
- Local synthesis instructions tell the model to respect visible column/value relationships, avoid inventing headers or units, and disclose incomplete table excerpts.
- Question mode ranks the complete active collection before selecting evidence. When multiple files contain relevant material, it limits each file to two excerpts (up to five overall) to reduce single-file dominance; when only one file is relevant, its useful excerpts are not unnecessarily capped by diversity.
- Grounded synthesis guidance asks the local model to distinguish corroborating evidence, contextual differences, and possible conflicts while checking date and scope. It continues to require source markers for factual claims.
- Claim-level verification also checks explicit numeric values, currency, units, dates, years, and context/exception markers. Warnings are review signals, not proof of correctness or contradiction.
- Cross-source comparison highlights differing values with similar context and units, separates explicit year differences and unit differences, and shows both source excerpts with their document/page identity. It only checks selected excerpts and requires human review.
- Automated tests cover coordinate-based column extraction, repeated row detection, row boundaries, unpositioned-text fallback, and source metadata. Real-world PDFs with merged cells, borders, multi-column layouts, and scanned tables still require browser/device validation.

**v0.27.0 — Cross-source Evidence Conflict Detection**
- Adds a deterministic cross-source review of cited excerpts to surface different numeric values attached to sufficiently similar text context and matching recognized units.
- Distinguishes potential value conflicts from explicit year/period differences and same-number/different-unit cases. Both source identities, page/section labels, values, and short evidence excerpts are shown together for manual review.
- Requires at least two shared context terms before comparing values and ignores unqualified numbers to reduce noise from page numbers and unrelated figures. The detector is bounded to selected excerpts and a small number of review items.
- A potential conflict is not a finding that either source is wrong. Different populations, definitions, document versions, dates, or measurement methods may explain the difference; the detector does not establish semantic equivalence or resolve which source is authoritative.
- Automated tests cover similar-context value differences, explicit year differences, unrelated subjects, and unit differences. Real multi-document school files still require browser/device validation.


**v0.26.0 — Numerical & Contextual Verification**
- Extends claim-level citation review to inspect explicit numeric values, percentages, currency amounts, common units, calendar dates, and standalone years in each cited claim.
- Normalizes common Indonesian number formatting (for example, "1.500.000" and "1,5") and common equivalent date formats before comparison; a value absent from the exact cited excerpts is surfaced for review.
- Flags same-number/different-unit cases separately and highlights differences in negation, obligation, exception, period, and scope markers such as "tidak", "wajib", "kecuali", "semester", and "tahun ajaran".
- The panel shows the reason and the claim details that triggered each warning. These are conservative review signals, not proof of contradiction or correctness. Different but equivalent wording, a legitimate scope distinction, or a formatting variation may still need human interpretation.
- Automated tests cover equivalent currency/date formatting, missing values and years, unit mismatches, and changes in negation/exception language. Real school documents and browser/device behavior still require manual validation.

**v0.22.0 — Section-aware Advanced RAG**
- Preserves line breaks exposed by PDF.js instead of flattening every native-text page into one paragraph, improving heading recognition without changing the page citation identity.
- Detects Markdown, numbered, and short uppercase section headings; section labels carry forward to following pages/chunks until another heading is found. Heading detection is heuristic, not a full layout parser.
- BM25 retrieval can use matching section-title terms as a small additional signal, while retaining body-text relevance. Hybrid semantic retrieval still falls back to BM25 when needed.
- Groups selected evidence by normalized section heading across documents and keeps original [S#] citation numbering intact.
- Automated tests cover heading detection, section carry-forward, section-title retrieval, cross-document grouping, and stable citation numbering. Real PDFs, OCR layout, browser memory, and actual model quality still require manual validation.

**v0.21.0 — Document Summaries & Comparison**
- Adds three explicit AI Knowledge workflows: ask the collection, summarize each document, and compare evidence across documents.
- Document summaries use up to three representative sections per file (early, middle, and late) with visible page/section references and a clear note that the summary is not exhaustive.
- Comparison retrieval evaluates all loaded page candidates, then selects at most two relevant excerpts per document and up to ten excerpts overall to reduce single-document dominance.
- Documents without selected evidence are disclosed as missing from the comparison; the model is instructed not to infer their contents.
- Automated tests cover representative summary sampling, per-document comparison quotas, missing-source coverage, and expanded retrieval pools. Actual model quality and browser memory behavior still require manual validation.

**v0.20.0 — Local Semantic Knowledge Search**
- Adds opt-in semantic retrieval for AI Knowledge using the multilingual `Xenova/paraphrase-multilingual-MiniLM-L12-v2` ONNX model with 8-bit weights through Transformers.js 4.3.2.
- The quantized ONNX weight file is approximately 118 MB; runtime assets are additional, and active memory use may exceed the download size. The model is pinned to reviewed Hub revision `2c4055b`, while the runtime version is pinned to Transformers.js `4.3.2`. Downloads begin only after documents are loaded and the user enables semantic search. Downloads are served by jsDelivr and Hugging Face.
- Embeddings are generated in a browser Web Worker and kept in page memory. Each source page is split into sentence-aware chunks of up to 360 characters with 60-character overlap to reduce input truncation risk; page identity is retained for citations. Document text and search queries are not uploaded for embedding; the selected evidence excerpts continue to be passed to the already-loaded local WebLLM model for answers.
- Combines semantic similarity with BM25 lexical relevance, applies a conservative minimum cosine-similarity threshold of 0.35 to semantic-only matches, retains original file/page citations, limits embedding preparation to 600 text segments per active collection, and falls back to BM25 if semantic retrieval is disabled or unavailable. The threshold still needs evaluation against representative school documents.
- Model/runtime download, browser memory use, and actual retrieval quality still require real-device validation; semantic search remains optional and off by default.

**v0.19.0 — OCR & Knowledge Retrieval**
- Adds explicit opt-in OCR for scanned PDF pages using Tesseract.js in the browser, with Indonesian and English language data.
- OCR is bounded to 20 pages per PDF; PDF text extraction remains primary, and only pages without extractable text are sent through OCR.
- Replaces simple term-count ranking with deterministic BM25 relevance scoring across the active multi-document collection.
- OCR library and language data load from external CDNs only when the user enables OCR. Document content remains in page memory and is not uploaded to an AI service.
- Browser OCR accuracy and real-device validation remain required.

**v0.18.0 — Advanced Knowledge Workspace**
- Adds an in-session collection of up to five PDF, TXT, or Markdown documents, per-file removal, and clear-all controls.
- Searches all loaded document chunks with deterministic lexical ranking and preserves source filename plus page/section labels in every retrieved excerpt.
- Local-model answers can compare evidence across files and display the exact selected excerpts with source markers.
- Documents remain in page memory only; no persistence or upload. Scanned-PDF OCR and real-device validation remain future work.

**v0.17.0 — AI Knowledge Workspace**
- Adds PDF, TXT, and Markdown document import, browser-local extraction, lexical retrieval of up to five relevant excerpts, and local-model Q&A with visible page/section citations. PDF.js is loaded from cdnjs on demand; document contents are never uploaded or persisted. Scanned PDF OCR and semantic retrieval are not yet available.

**v0.16.0 — Personal AI Workspace**
- Adds an in-session task manager (up to 50 user-entered tasks), completion toggles, and explicit task removal. A local WebLLM planning assistant can review the task list and answer follow-up prompts. Only task titles and the user's prompt are included when the user explicitly requests a recommendation; conversation context is bounded and kept in page memory. The model provides suggestions only: it does not run commands, edit files, send messages, access accounts, or complete tasks. No external service fallback is used.


**v0.14.0 — Data Intelligence Workspace**
- Data Analyst now supports follow-up questions with focus modes (overview, trends, comparisons, anomalies, relationships, and next actions), a bounded in-session conversation history, Markdown report export, and explicit history clearing. Each request includes refreshed aggregate statistics for the active filters; raw CSV rows are not included in model messages. History remains in browser memory for the current session and is not persisted.

**v0.13.0 — Local AI data interpretation**
- Data Analyst can optionally ask the already-loaded local WebLLM model to interpret aggregate statistics for the currently filtered dataset. The prompt includes column-level descriptive summaries, IQR counts, selected-column fences, Pearson relationships, deterministic findings, and explicit caveats; it does not include raw CSV rows or individual records. The action is user-triggered, uses the model already loaded in AI Chat, and does not silently call an external provider. Model output is advisory and must be checked against the source data.

**v0.12.0 — Statistical decision support**
- Data Analyst adds filtered-data IQR outlier detection, quantile summaries, pairwise Pearson correlation matrix, and concise deterministic statistical findings. Findings are labeled as statistical evidence, not AI-generated advice. Outliers are signals for review, not automatic errors; correlation is descriptive and does not establish causation. Calculations remain in-browser.

**v0.11.0 — Visual trend reports**

- Modern responsive dashboard and navigation for 11 capability areas.
- Dedicated workspaces for AI Chat, AI Coding alpha, Text & Language alpha, and a deterministic local Data Analyst alpha; other capability areas retain their roadmap views.
- Global capability search, responsive layout, and Dark, Light, and Colorful theme preference stored in the browser, with a desktop-collapsible sidebar.
- Secure-context and WebGPU adapter checks before model initialization.
- Shared WebLLM 0.2.87 runtime through a Web Worker, so Chat and Coding can use the same loaded model.
- Llama 3.2 1B and 3B model options, download progress, and streaming responses.
- AI Coding task modes: generate, explain, debug, review, refactor, and document code.
- Text & Language task modes: write, edit, proofread, summarize, translate, and extract information.
- Chat, Coding, and Text share one loaded local language-model engine; Text and Coding working context are held in the active browser session only.
- Data Analyst imports CSV files locally (up to 5 MB / 10,000 data rows), profiles missing/unique values and duplicate rows, calculates descriptive statistics, draws numeric histograms, supports global search, column-specific text filters, numeric minimum/maximum ranges, numeric/text sorting, pagination, grouped count/sum/average summaries, cross-tab pivot tables with count/sum/average aggregation, explicit-format date parsing (ISO, day/month/year, or month/day/year), daily/monthly/yearly trend summaries, previous-period change and percentage, visual trend charts, latest/highest/lowest/net-change indicators, and downloadable trend report CSVs, without sending data to a server. Pivot, grouped, and trend summaries follow active global and column filters. Ambiguous date formats are never guessed; invalid dates are counted and excluded.
- Optional local chat history; saving is off by default. Coding prompts and context remain in the active browser session.
- Copyable text output; generated code is displayed as text and is never executed or applied to project files.

**Validation status:** JavaScript syntax and repository smoke checks run in GitHub Actions. The Chat, Coding, and Text runtime still need a real browser/WebGPU session to validate model downloads, device compatibility, language quality, and actual generation. Data Analyst calculations, AI Assistant prompts, Personal AI privacy gates, and AI Knowledge retrieval helpers, document-summary selection, cross-file comparison selection, and citation checks have automated fixture coverage; actual browser model downloads, embedding quality, OCR accuracy, model answer quality, and source display still need real-device testing. PDF parsing, OCR accuracy, and source display still need browser testing. Data Analyst CSV parsing, filtering, sorting, grouping, and deterministic calculations have automated unit coverage but still need hands-on browser testing with representative files, including pivot-table rendering, trend charts, trend highlights, report export, IQR outlier detection, Pearson correlation, and aggregate-only interpretation using the already-loaded local model, follow-up questions, focus modes, and Markdown report export. Image, Audio, Video, and Navigator remain UI and architecture plans. AI Assistant, Personal AI, and AI Knowledge have initial alpha workspaces; browser/device validation remains pending.

The WebGPU check only detects whether a browser can provide an adapter. It does not guarantee that a particular model will fit or run successfully.

## AI Knowledge validation

A real-browser checklist for semantic retrieval, PDF/OCR, privacy/network inspection, citation markers, and memory behavior is available in [`docs/AI-KNOWLEDGE-BROWSER-VALIDATION.md`](docs/AI-KNOWLEDGE-BROWSER-VALIDATION.md). Automated CI coverage does not replace the device/browser checks listed there.

## Workspace capabilities

| Workspace | Direction |
| --- | --- |
| AI Chat | WebLLM-based local language-model conversations, streaming, and optional browser-local history. Initial code integration is present; device validation is pending. |
| AI Coding | Initial local-model workspace for code generation, explanation, review, debugging, refactoring, and documentation. No code execution or automatic project-file changes. |
| Image Studio | Image understanding, editing utilities, and a separately evaluated image-generation runtime. |
| Audio Lab | Speech recognition, text-to-speech, audio understanding, and processing. |
| Video Studio | Browser-based media tools, video understanding, and separately evaluated AI video generation. |
| Text & Language | Initial local-model workspace for drafting, editing, proofreading, summarizing, translation, and information extraction. |
| Data Analyst | Local CSV import, data-quality profile, descriptive statistics, histogram, global search, column-specific text filters and numeric ranges, sorting, pagination, grouped count/sum/average, local pivot tables with cross-tab count/sum/average, and filtered CSV export. AI interpretation is not yet implemented; statistical decision support uses deterministic IQR and Pearson calculations. |
| AI Assistant | In-session task planning with the local model; suggestions only, no actions executed. |
| Personal AI | User-managed preferences and notes, with separate opt-ins for local persistence and model context. |
| AI Knowledge | Multi-document PDF/TXT/Markdown collection, opt-in scanned-PDF OCR, BM25 cross-document retrieval, and local-model Q&A with visible filename/page excerpts. |\n| AI Navigator | Opt-in location, maps, route planning, and mobility assistance. |

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

## Model Engine and provider status

The unified Model Engine, secure gateway code, and gated GPT Chat adapter are available in v0.41.1.

- **Local:** WebLLM 0.2.87 with Llama 3.2 1B/3B. Existing AI Chat, Coding, Text, Assistant, AI Knowledge, and optional Data Analyst interpretation continue to use the shared local runtime.
- **OpenAI GPT:** a same-origin gateway client and Cloudflare Worker adapter are implemented. AI Chat exposes GPT only when the authenticated gateway health check is ready and requires explicit cloud-session consent. Personal AI context is not automatically appended to GPT Chat requests.
- **Gateway deployment:** not yet configured or deployed. Cloudflare Access must protect only `ai.smalan.sch.id/api/*` (not the public app pages), with the matching allowed-user list, proxied DNS route, and server-side `OPENAI_API_KEY` secret. Until then, GPT remains unavailable in the preview.
- **Anthropic Claude and Google Gemini:** registered as future provider targets; adapters are not implemented.
- **Credentials:** never paste provider API keys into the frontend, browser storage, or public repository. The OpenAI key belongs only in the Cloudflare Worker secret store.
- **Routing:** local-first. No automatic local-to-cloud fallback, and non-Chat workspaces remain on the local runtime.

See [Model Engine Architecture](docs/MODEL-ENGINE-ARCHITECTURE.md), [Gateway deployment guide](gateway/README.md), and the [Panduan deployment Bahasa Indonesia](gateway/PANDUAN-DEPLOYMENT-ID.md) for the provider contract, API-only Access setup, and deployment requirements.
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


### Personal AI Workspace v0.17.0

- User-managed response preferences (language, tone, and detail level) and up to 20 manually entered memory notes.
- Memory is never inferred or created automatically. Session-only by default; browser persistence requires an explicit opt-in.
- A separate opt-in controls whether preferences and up to 10 selected notes are included in requests to the local WebLLM model in AI Chat, AI Coding, Text & Language, and AI Assistant.
- Users can inspect and delete individual notes or clear all Personal AI data. No cloud sync; chat transcripts are not stored by this feature.
- Browser local storage is not encrypted; users are warned not to store secrets or sensitive personal information.


### AI Knowledge Workspace v0.17.0

- Adds an in-browser document workspace for PDF, TXT, and Markdown files.
- Enforces a 12 MB file limit, an 80-page PDF limit, and bounded extracted text.
- PDF extraction uses PDF.js 4.10.38 loaded on demand from cdnjs; the library and worker are external static assets, while document bytes and extracted text stay in the browser.
- Retrieves up to five page/section excerpts using deterministic lexical matching and sends only those excerpts plus the user's question to the already-loaded local WebLLM model.
- Answers are prompted to cite source markers ([S1], [S2], etc.); the matching excerpts and page/section labels are shown below the answer for verification.
- Documents remain in page memory only and can be cleared. No document persistence, upload, cloud sync, or external AI provider is used.
- Scanned PDFs without embedded text are not supported; OCR, embeddings, semantic search, multi-document retrieval, and browser testing remain future work.
