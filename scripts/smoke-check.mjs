import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, css, app, worker, readme] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("assets/css/style.css", "utf8"),
  readFile("assets/js/app.js", "utf8"),
  readFile("assets/js/webllm-worker.js", "utf8"),
  readFile("README.md", "utf8"),
]);

const requiredModules = [
  "chat", "coding", "image", "audio", "video",
  "text", "data", "assistant", "personal", "navigation",
];

for (const module of requiredModules) {
  assert.ok(app.includes(module + ":"), `Missing capability module: ${module}`);
}

assert.ok(html.includes('id="app"') || html.includes('id="workspace"') || html.includes('id="capabilityGrid"'),
  "Application shell markup was not found.");
assert.ok(css.includes(".chat-layout") && css.includes(".chat-composer"),
  "Premium chat workspace styles are missing.");

assert.ok(app.includes("function renderCodingWorkspace()") && app.includes("function bindCodingWorkspace()"),
  "AI Coding workspace rendering and event bindings are missing.");
assert.ok(app.includes("async function submitCodingTask()"),
  "AI Coding generation flow is missing.");
assert.ok(app.includes('value="generate"') && app.includes('value="explain"') &&
  app.includes('value="debug"') && app.includes('value="review"') &&
  app.includes('value="refactor"') && app.includes('value="document"'),
  "AI Coding task modes are incomplete.");
assert.ok(app.includes("messages: [codingSystemMessage, ...codingMessages.slice(1, -1).slice(-16)]"),
  "AI Coding must retain its system instructions, bounded context, and exclude the empty assistant placeholder.");
assert.ok(app.includes("navigator.clipboard.writeText(output.textContent)") &&
  app.includes("output.textContent = assistantMessage.content"),
  "AI Coding safe text output and copy support are missing.");
assert.ok(app.includes("const codingInput = document.getElementById(\"codingInput\")") &&
  app.includes("const codingRunButton = document.getElementById(\"codingRunButton\")"),
  "AI Coding controls are not connected to the shared model engine.");
assert.ok(css.includes(".coding-layout") && css.includes(".coding-result pre") &&
  css.includes(".coding-run-button"),
  "AI Coding workspace styles are missing.");

assert.ok(app.includes("function renderTextWorkspace()") && app.includes("function bindTextWorkspace()"),
  "Text & Language workspace rendering and event bindings are missing.");
assert.ok(app.includes("async function submitTextTask()"),
  "Text & Language generation flow is missing.");
assert.ok(app.includes('value="write"') && app.includes('value="edit"') &&
  app.includes('value="proofread"') && app.includes('value="summarize"') &&
  app.includes('value="translate"') && app.includes('value="extract"'),
  "Text & Language task modes are incomplete.");
assert.ok(app.includes("textMessages.slice(1, -1).slice(-12)") &&
  app.includes("role: \"system\""),
  "Text & Language must use bounded task context and exclude the empty assistant placeholder.");
assert.ok(app.includes("id=\"textTargetRow\"") && app.includes("Bahasa tujuan"),
  "Translation target selection is missing.");
assert.ok(app.includes("navigator.clipboard.writeText(output.textContent)") &&
  app.includes("textOutput"),
  "Text & Language result copy support is missing.");
assert.ok(app.includes("textRunButton") && app.includes("submitTextTask()"),
  "Text & Language actions are not connected to the shared model engine.");
assert.ok(css.includes(".coding-layout") && css.includes(".text-form #textInput") &&
  css.includes(".text-target-row") && css.includes(".text-result pre"),
  "Text & Language workspace styles are missing.");

assert.ok(app.includes("function renderDataWorkspace()") && app.includes("function bindDataWorkspace()"),
  "Data Analyst workspace rendering and event bindings are missing.");
assert.ok(app.includes("function parseCsvRecords(source, delimiter)") &&
  app.includes("function analyzeCsvRecords(records, delimiter)"),
  "Local CSV parsing and analysis functions are missing.");
assert.ok(app.includes("function renderDataHistogram(values)") &&
  app.includes("function renderSelectedDataColumn()"),
  "Data Analyst histogram and numeric analysis are missing.");
assert.ok(app.includes("file.size > 5 * 1024 * 1024") && app.includes("records.length - 1 > 10000"),
  "CSV file and row limits are missing.");
assert.ok(app.includes("const duplicates = new Set()") && app.includes("duplicateRows += 1"),
  "Duplicate-row quality check is missing.");
assert.ok(app.includes("file.text()") && app.includes("Tidak ada data yang dikirim ke server."),
  "CSV must be read locally with an explicit no-upload status.");
assert.ok(css.includes(".data-import-panel") && css.includes(".data-stat-grid") &&
  css.includes(".data-analysis-grid") && css.includes(".data-preview-table"),
  "Data Analyst responsive styles are missing.");

assert.ok(app.includes("function filterSortDataRows(") && app.includes("function renderDataExplorer()") && app.includes("dataFilterColumn") && app.includes("dataFilterMin") && app.includes("dataFilterMax"),
  "Data Explorer filtering, sorting, and pagination are missing.");
assert.ok(app.includes("function buildGroupedSummary(") && app.includes("function renderGroupedData()"),
  "Grouped count/sum/average analysis is missing.");
assert.ok(app.includes("function exportFilteredData()") && app.includes("filtered.csv"),
  "Filtered CSV export is missing.");
assert.ok(app.includes("pageSize: 25") && app.includes("dataSearchInput") &&
  app.includes("dataSortSelect") && app.includes("dataPrevPage") && app.includes("dataNextPage"),
  "Data Explorer controls are incomplete.");
assert.ok(css.includes(".data-column-filters") && css.includes(".data-explorer-toolbar") && css.includes(".data-group-controls") &&
  css.includes(".data-pagination") && css.includes(".data-th-sort"),
  "Data Explorer responsive styles are missing.");

assert.ok(app.includes("Llama-3.2-1B-Instruct-q4f16_1-MLC"),
  "The small Llama 3.2 1B model option is missing.");
assert.ok(app.includes("Llama-3.2-3B-Instruct-q4f16_1-MLC"),
  "The Llama 3.2 3B model option is missing.");
assert.ok(app.includes("CreateWebWorkerMLCEngine") && app.includes("initProgressCallback"),
  "WebLLM worker initialization/progress integration is missing.");
assert.ok(app.includes("stream: true") && app.includes("for await (const chunk of stream)"),
  "Streaming response handling is missing.");
assert.ok(app.includes("chatMessages.slice(0, -1).slice(-24)"),
  "The latest user prompt and recent conversation context must be sent to the model.");
assert.ok(app.includes('localStorage.getItem(chatSavePreferenceKey) !== "1"'),
  "Chat history must remain opt-in by default.");
assert.ok(worker.includes("WebWorkerMLCEngineHandler") && worker.includes("@mlc-ai/web-llm@0.2.87"),
  "WebLLM worker handler/version mismatch.");
assert.ok(readme.includes("Validation status") && readme.includes("real browser/WebGPU session"),
  "README must disclose that browser/WebGPU runtime validation is pending.");

console.log("Lokal AI smoke checks passed.");
console.log(`Validated ${requiredModules.length} capability modules, shared WebLLM Chat/Coding/Text integration, local CSV analysis, Data Explorer column filters, grouped analytics, and safe text/code output.`);
