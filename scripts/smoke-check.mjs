import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, css, app, worker, readme, designSystem, modelEngineCore] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("assets/css/style.css", "utf8"),
  readFile("assets/js/app.js", "utf8"),
  readFile("assets/js/webllm-worker.js", "utf8"),
  readFile("README.md", "utf8"),
  readFile("docs/UI-DESIGN-SYSTEM.md", "utf8"),
  readFile("assets/js/model-engine-core.js", "utf8"),
]);

const requiredModules = [
  "chat", "coding", "image", "audio", "video",
  "text", "data", "assistant", "personal", "knowledge", "navigation",
];

for (const module of requiredModules) {
  assert.ok(app.includes(module + ":"), `Missing capability module: ${module}`);
}

assert.ok(html.includes('id="app"') || html.includes('id="workspace"') || html.includes('id="capabilityGrid"'),
  "Application shell markup was not found.");


assert.ok(html.includes('class="sidebar-navigation"') &&
  html.includes('class="nav-section"') &&
  html.includes('aria-label="AI Studio"') &&
  html.includes('aria-label="Creative Studio"') &&
  html.includes('aria-label="Intelligence"') &&
  html.includes('aria-label="Assistant"'),
  "Sidebar must use the professional grouped navigation structure.");
assert.ok(html.includes('class="nav-status nav-status-planned"') &&
  html.includes('class="nav-status nav-status-alpha"') &&
  html.includes('class="workspace-status-dot"'),
  "Sidebar must expose consistent module maturity and workspace status indicators.");
assert.ok(!html.includes('<kbd>01</kbd>') && !html.includes('<kbd>05</kbd>'),
  "Decorative numeric navigation badges must be removed.");
assert.ok(css.includes("var(--layout-sidebar)") &&
  css.includes(".sidebar-navigation{") &&
  css.includes(".nav-section{") &&
  css.includes(".workspace-status-dot{") &&
  css.includes(".profile-label{"),
  "Professional sidebar and topbar layout rules are missing.");

assert.ok(html.includes('id="menuToggle"') && html.includes('aria-controls="sidebar"'),
  "The workspace menu button must be connected accessibly to the sidebar.");
assert.ok(app.includes('sidebarPreferenceKey = "lokal-ai-sidebar-collapsed"') &&
  app.includes('localStorage.setItem(sidebarPreferenceKey, collapsed ? "1" : "0")') &&
  app.includes('localStorage.getItem(sidebarPreferenceKey) === "1"'),
  "Desktop sidebar collapse preference must persist and restore in the browser.");
assert.ok(app.includes('window.matchMedia("(min-width: 801px)")') &&
  app.includes('appShell.classList.toggle("sidebar-collapsed"'),
  "The hamburger must collapse and restore the sidebar on desktop while preserving responsive mobile behavior.");
assert.ok(css.includes("@media(min-width:801px)") &&
  css.includes(".app-shell.sidebar-collapsed .sidebar") &&
  css.includes(".app-shell.sidebar-collapsed .main-area"),
  "Desktop sidebar collapse must hide navigation and expand the workspace.");

assert.ok(css.includes('body[data-theme="light"] .sidebar') &&
  css.includes('body[data-theme="colorful"] .sidebar'),
  "Redesigned navigation must be styled consistently in all three themes.");
assert.ok(app.includes('<strong>11</strong> kemampuan AI'),
  "Overview search must display the correct localized capability count.");

const registryScriptIndex = html.indexOf('assets/js/model-engine-core.js?v=');
const appScriptIndex = html.indexOf('assets/js/app.js?v=');
assert.ok(registryScriptIndex >= 0 && appScriptIndex > registryScriptIndex,
  "The Model Engine registry must load before the application script.");
assert.ok(modelEngineCore.includes('id: "local-webllm"') &&
  modelEngineCore.includes('id: "openai"') &&
  modelEngineCore.includes('id: "anthropic"') &&
  modelEngineCore.includes('id: "google"'),
  "The Model Engine registry must list the local provider and the three cloud integration targets.");
assert.ok(modelEngineCore.includes('availability: "gateway-required"') &&
  modelEngineCore.includes("function attachRuntime") &&
  modelEngineCore.includes("function clearRuntime"),
  "Cloud providers must remain gated until a secure gateway is available, with a shared runtime lifecycle.");
assert.ok(app.includes('function renderModelEngineWorkspace()') &&
  app.includes('modelEngine.attachRuntime("local-webllm"') &&
  app.includes('modelEngine.clearRuntime(runtimeToUnload)'),
  "The Model Engine dashboard must report and manage the shared local WebLLM runtime.");
assert.ok(app.includes("Gateway diperlukan") &&
  app.includes("Kredensial tidak disimpan di browser."),
  "The Model Engine UI must disclose cloud gateway and credential requirements.");

assert.ok(html.includes('data-theme-choice="dark"') && html.includes('data-theme-choice="light"') &&
  html.includes('data-theme-choice="colorful"'), "The theme picker must expose Dark, Light, and Colorful modes.");
assert.ok(app.includes('["dark","light","colorful"].includes(theme)') &&
  app.includes('localStorage.setItem("lokal-ai-theme", selectedTheme)') &&
  app.includes('document.addEventListener("change"'), "Theme selection must be validated, persistent, and available from Settings.");
assert.ok(css.includes('body[data-theme="colorful"]') && css.includes(".theme-menu") &&
  css.includes(".theme-swatch-colorful"), "The Colorful theme and three-theme picker styles are missing.");
assert.ok(app.includes('id="themeSetting" class="theme-setting-select"') ||
  app.includes('id="themeSetting"'), "Settings must expose the current theme selector.");

assert.ok(css.includes(".chat-layout") && css.includes(".chat-composer"),
  "Premium chat workspace styles are missing.");

assert.ok(css.includes("font-size:max(12px,1em)"),
  "Interface typography must keep a minimum 12px readable size.");
assert.ok(css.includes(".main-area{width:calc(100% - 258px)") &&
  css.includes(".module-page{width:100%;max-width:none") &&
  css.includes(".chat-page{width:100%;max-width:none"),
  "Desktop workspaces must use the available full content width.");
assert.ok(css.includes(".main-area{width:100%;margin-left:0}"),
  "Mobile workspace must expand to the viewport without desktop sidebar offset.");

assert.ok(app.includes("function renderCodingWorkspace()") && app.includes("function bindCodingWorkspace()"),
  "AI Coding workspace rendering and event bindings are missing.");
assert.ok(app.includes("async function submitCodingTask()"),
  "AI Coding generation flow is missing.");
assert.ok(app.includes('value="generate"') && app.includes('value="explain"') &&
  app.includes('value="debug"') && app.includes('value="review"') &&
  app.includes('value="refactor"') && app.includes('value="document"'),
  "AI Coding task modes are incomplete.");
assert.ok(app.includes("messages: [codingSystemMessage, ...(buildPersonalContextMessage() ? [buildPersonalContextMessage()] : []), ...codingMessages.slice(1, -1).slice(-16)]"),
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
assert.ok(app.includes("function buildPivotSummary(") && app.includes("function renderPivotTable()") && app.includes("dataPivotRows") && app.includes("dataPivotColumns"),
  "Pivot table analysis and controls are missing.");
assert.ok(app.includes("function parseDataDate(") && app.includes("function buildDateTrendSummary(") && app.includes("function renderDateTrend()") && app.includes("function summarizeTrendHighlights(") && app.includes("function exportDateTrendReport()") && app.includes("dataTrendChart") && app.includes("dataTrendExport") && app.includes("dataTrendFormat") && app.includes("dataTrendGranularity"),
  "Explicit date parsing and date trend analysis are missing.");
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
assert.ok(app.includes("function detectIqrOutliers(") && app.includes("function calculatePearsonCorrelation(") && app.includes("function renderDecisionSupport()"), "Decision support calculations and UI are missing.");
assert.ok(css.includes(".data-decision-panel") && css.includes(".data-correlation-table"), "Decision support styles are missing.");
assert.ok(app.includes("function buildDataInterpretationContext(") && app.includes("async function runDataInterpretation()"), "Local data interpretation integration is missing.");
assert.ok(app.includes("dataInterpretButton") && app.includes("dataInterpretResult"), "Data interpretation controls are missing.");
assert.ok(app.includes("dataInterpretFocus") && app.includes("dataInterpretQuestion") && app.includes("dataInterpretClear") && app.includes("dataInterpretExport"), "Data Intelligence follow-up, focus, clear, or export controls are missing.");
assert.ok(app.includes("function buildDataInterpretationMessages(") && app.includes("history.slice(-8)"), "Bounded follow-up history is missing.");
assert.ok(app.includes("function exportDataInterpretationReport(") && app.includes("text/markdown;charset=utf-8"), "Markdown analysis report export is missing.");
assert.ok(app.includes("dataInterpretationMessages.length = 0"), "Session history clearing is missing.");
assert.ok(app.includes("function buildAssistantMessages(") && app.includes("function renderAssistantWorkspace()") && app.includes("function bindAssistantWorkspace()"), "AI Assistant workspace implementation is missing.");
assert.ok(app.includes("assistantTaskForm") && app.includes("assistantTaskList") && app.includes("assistantPlanButton") && app.includes("assistantClearHistory"), "AI Assistant task and planning controls are missing.");
assert.ok(app.includes("if (assistantMessages.length > 12) assistantMessages.splice(0, assistantMessages.length - 12);"), "Assistant conversation history must be bounded.");
assert.ok(app.includes("Jangan menjalankan atau menandai tugas selesai") && app.includes("Tidak ada tindakan otomatis"), "AI Assistant must not execute or complete tasks automatically.");
assert.ok(app.includes("function buildDataInterpretationMessages(") && app.includes("max_tokens: 512") && app.includes("history.slice(-8)"), "Local interpretation must use bounded, isolated follow-up messages.");
assert.ok(app.includes("tidak ada baris mentah atau nilai individual yang disertakan"), "Interpretation context must disclose aggregate-only data.");

assert.ok(designSystem.includes("Dark") && designSystem.includes("Light") &&
  designSystem.includes("Colorful") && designSystem.includes("Checklist untuk modul baru"),
  "The shared UI design system must document all themes and module acceptance rules.");
assert.ok(designSystem.includes("minimum 12 px") &&
  designSystem.includes("Sidebar desktop") &&
  designSystem.includes("Responsivitas dan aksesibilitas"),
  "The design system must define typography, layout, responsiveness, and accessibility.");

assert.ok(readme.includes("Validation status") && readme.includes("real browser/WebGPU session"),
  "README must disclose that browser/WebGPU runtime validation is pending.");

assert.ok(app.includes("function assessKnowledgeTableStructure(")&&app.includes("function getKnowledgeTableCellOffset("),"AI Knowledge structure diagnostics and cell offsets are missing.");
assert.ok(app.includes("sourceLineNumber")&&app.includes("valueToken")&&app.includes("sourceSpan"),"AI Knowledge evidence trace is missing.");
assert.ok(app.includes("tableReviews")&&app.includes("Struktur tabel belum dikenali"),"Unrecognized tables must be surfaced for review.");
assert.ok(css.includes(".knowledge-table-audit-item"),"AI Knowledge table audit styles are missing.");
console.log("Lokal AI smoke checks passed.");
console.log(`Validated ${requiredModules.length} capability modules, shared WebLLM Chat/Coding/Text integration, local CSV analysis, Data Explorer column filters, grouped analytics, pivot analysis, explicit date parsing/trends, visual trend reports, IQR outlier detection, Pearson correlation, statistical findings, aggregate-only local interpretation, follow-up Data Intelligence sessions, and safe text/code output.`);

assert.ok(app.includes("function renderPersonalWorkspace()") && app.includes("function bindPersonalWorkspace()"), "Personal AI workspace is missing.");
assert.ok(app.includes("personalStorageEnabled = false") && app.includes("personalContextEnabled = false"), "Personal AI permissions must default to disabled.");
assert.ok(app.includes("buildPersonalContextMessage()") && app.includes("localStorage.removeItem(personalStorageKey)"), "Personal AI context and deletion controls are missing.");

assert.ok(app.includes("function renderKnowledgeWorkspace()") && app.includes("function bindKnowledgeWorkspace()"), "AI Knowledge workspace is missing.");
assert.ok(app.includes('id="knowledgeQuestionForm" class="knowledge-question-form"'),
  "AI Knowledge question form must use its full-width grid layout class.");
assert.ok(css.includes(".knowledge-question-form{") && css.includes(".knowledge-question-form textarea"),
  "AI Knowledge question controls must fill the available panel width.");
const semanticToggleMarkup = app.match(/<input id="knowledgeSemanticEnabled"[^>]*>/)?.[0] || "";
assert.ok(semanticToggleMarkup && !/\\schecked(?:\\s|>)/.test(semanticToggleMarkup),
  "AI Knowledge semantic search must default to unchecked and require explicit opt-in on a fresh session.");

assert.ok(app.includes("async function readKnowledgeFile(file, options={})") && app.includes("function findKnowledgeSources(pages,query,limit=5)"), "Local document extraction and source retrieval are missing.");
assert.ok(app.includes('page === "knowledge"') && app.includes('application/pdf'), "AI Knowledge navigation or PDF support is missing.");
assert.ok(app.includes("knowledgePages = []") && app.includes("knowledgePages=[]"), "Knowledge documents must remain session-only and clearable.");

assert.ok(app.includes("let knowledgePages = [], knowledgeDocuments = []"), "AI Knowledge must support an in-session document collection.");
assert.ok(app.includes("multiple accept=") && app.includes("knowledgeDocuments.length>=5"), "AI Knowledge must support a bounded multi-file import.");
assert.ok(app.includes("function renderKnowledgeDocumentList()") && app.includes("Hapus seluruh koleksi"), "Document management and deletion controls are missing.");
assert.ok(app.includes("KUTIPAN LINTAS DOKUMEN") && app.includes("item.documentName"), "Cross-document answers must retain source file identity.");

assert.ok(app.includes("knowledgeOcrEnabled") && app.includes("options.ocrEnabled"), "Scanned PDF OCR must require an explicit user opt-in.");
assert.ok(app.includes('createWorker("ind+eng"') && app.includes("shouldAttemptKnowledgeOcr(options.ocrEnabled,ocrAttempted)") && app.includes("maxAttempts=20"), "OCR must use bounded Indonesian/English processing.");
assert.ok(app.includes("finally{canvas.width=0;canvas.height=0;}"), "OCR canvas must be released even when processing fails.");
assert.ok(app.includes('if(!context)throw new Error("Canvas 2D tidak tersedia di browser ini.");'), "OCR must report when a 2D canvas context is unavailable.");
assert.ok(app.includes("catch(error){ocrError=ocrError||\"Worker OCR gagal ditutup: \"+error.message;}"), "OCR worker cleanup failures must be reported without discarding extracted pages.");
assert.ok(app.includes("BM25") || app.includes("documentFrequency"), "Knowledge retrieval must use term relevance scoring.");

assert.ok(app.includes('id="knowledgeSemanticEnabled"') && app.includes("enableKnowledgeSemantic(status,semanticToggle)"), "Semantic retrieval must require an explicit user opt-in.");
assert.ok(app.includes("findKnowledgeSourcesHybrid") && app.includes("buildKnowledgeEmbeddingSegments"), "AI Knowledge must support hybrid semantic and lexical retrieval.");
assert.ok(app.includes("Peringkat menggabungkan semantik lokal dan BM25"), "Semantic search must disclose hybrid ranking.");
assert.ok(app.includes("teks dokumen dan pertanyaan tetap diproses di browser"), "Semantic search must disclose local document/query processing.");
const embeddingWorker = await readFile("assets/js/knowledge-embedding-worker.js", "utf8");
assert.ok(embeddingWorker.includes("Xenova/paraphrase-multilingual-MiniLM-L12-v2") && embeddingWorker.includes('dtype: "q8"'), "Semantic worker must use the selected multilingual quantized embedding model.");
assert.ok(embeddingWorker.includes("batchSize = 8") && embeddingWorker.includes("message.texts"), "Semantic embeddings must be batched locally.");
console.log("AI Knowledge semantic opt-in, local processing disclosure, multilingual model selection, and bounded embedding worker checks passed.");

assert.ok(app.includes("similarity>=0.35"), "Semantic-only retrieval must reject low-confidence similarity scores.");
assert.ok(app.includes('file.disabled=knowledgeBusy') && app.includes('button.disabled=knowledgeBusy'), "Knowledge import and document controls must be locked while processing.");
console.log("AI Knowledge semantic confidence threshold and concurrent-operation safeguards passed.");

assert.ok(app.includes("Embedding pertanyaan gagal:") && app.includes("Beralih ke BM25."), "Failed semantic query embeddings must fall back to lexical retrieval.");
console.log("AI Knowledge query-time BM25 fallback guard passed.");

assert.ok(app.includes("function splitKnowledgeEmbeddingText(value,maxSegmentChars=360,overlapChars=60)"), "Semantic document chunks must be sentence-aware and overlapping.");
assert.ok(app.includes("buildKnowledgeEmbeddingSegments(pages,maxSegmentChars=360,maxSegments=600,overlapChars=60)"), "Semantic chunk preparation must have explicit size, overlap, and collection limits.");
assert.ok(embeddingWorker.includes("vector.length !== 384") && embeddingWorker.includes("Number.isFinite(Number(value))"), "Embedding worker must validate 384-dimensional finite vectors.");
console.log("AI Knowledge semantic chunking, source-page mapping, and vector-shape validation checks passed.");

assert.ok(embeddingWorker.includes('const MODEL_REVISION = "2c4055b"') && embeddingWorker.includes("revision: MODEL_REVISION"), "Semantic model artifacts must be pinned to a reviewed immutable revision.");
assert.ok(app.includes("knowledgeSemanticEnabled") && app.includes("semantic.disabled=knowledgeBusy||!knowledgePages.length"), "Semantic model download must stay unavailable until documents exist.");
assert.ok(app.includes('semanticToggle.checked=false;stopKnowledgeEmbeddingWorker()'), "Clearing the collection must release the semantic model worker.");
console.log("AI Knowledge model revision pinning and on-demand memory lifecycle checks passed.");

assert.ok(app.includes("inspectKnowledgeCitationMarkers(response,sourceList.length)") && app.includes("const citationAudit=supportAudit.markerAudit"), "AI Knowledge must validate citation references against the exact selected evidence list.");
assert.ok(app.includes("status=\"invalid\"") && app.includes("status=\"uncited\"") && app.includes("Tidak ada penanda [S#]"), "AI Knowledge must surface invalid and missing citation warnings.");
console.log("AI Knowledge citation integrity guard checks passed.");

assert.ok(app.includes('id="knowledgeTaskMode"') && app.includes('value="summary"') && app.includes('value="compare"'), "AI Knowledge must expose question, summary, and comparison modes.");
assert.ok(app.includes("selectKnowledgeSummarySources(knowledgePages,3,15)"), "Per-document summaries must use bounded representative source sections.");
assert.ok(app.includes("selectKnowledgeSourcesPerDocument(knowledgePages,candidates,2,10)"), "Document comparison must balance evidence across source files.");
assert.ok(app.includes("listKnowledgeDocumentCoverage(knowledgeDocuments,selected)") && app.includes("Dokumen yang tidak memiliki kutipan terpilih"), "Cross-document analysis must disclose files without selected evidence.");
assert.ok(app.includes("const candidateLimit=knowledgePages.length;") && app.includes("findKnowledgeSourcesHybrid(knowledgePages,prompt,queryResult.vectors[0],knowledgeSemanticVectors,knowledgeSemanticPageIndices,candidateLimit)"), "Knowledge workflows must rank the complete loaded collection before evidence selection.");
assert.ok(app.includes("selectKnowledgeSynthesisSources(knowledgePages,candidates,2,5)"), "Question mode must balance selected evidence across relevant documents without imposing a diversity cap on single-document answers.");
assert.ok(app.includes("Sintesis bukti dari semua dokumen yang relevan") && app.includes("Jangan menyebut dua hal bertentangan bila konteksnya berbeda"), "Knowledge synthesis must distinguish consistent evidence, contextual differences, and possible conflicts.");
assert.ok(app.includes("function annotateKnowledgePdfTableContinuations(pages)") && app.includes('type:"repeated-header"'), "PDF Knowledge must detect explicitly repeated table headers on consecutive pages.");
assert.ok(app.includes('type:"possible"') && app.includes("Kemungkinan lanjutan tabel halaman"), "PDF Knowledge must label uncertain table continuations as possible rather than confirmed.");
assert.ok(app.includes("Header tabel yang secara eksplisit ditandai berulang") && app.includes("Label kemungkinan lanjutan tabel bukan kepastian"), "Grounded synthesis must distinguish repeated headers from uncertain table continuation.");
assert.ok(app.includes("function verifyKnowledgeAnswerSupport(response,sources)") && app.includes("function splitKnowledgeAnswerClaims(response)"), "AI Knowledge must audit citations at the individual claim level.");
assert.ok(app.includes('status="supported"') && app.includes('status="partial"') && app.includes('status="weak"') && app.includes('status="uncited"') && app.includes('status="invalid"'), "Citation verification must distinguish evidence overlap, partial support, weak support, missing citations, and invalid references.");
assert.ok(app.includes("Pemeriksaan istilah, angka, tanggal, satuan, serta penanda konteks") && app.includes("Kecocokan kata atau nilai bukan bukti"), "Citation verification must disclose its lexical heuristic and semantic limitations.");
assert.ok(app.includes('className="knowledge-verification"'), "Knowledge answers must display claim-level verification feedback.");


console.log("AI Knowledge summary and cross-document comparison mode guard checks passed.");


assert.ok(app.includes("function extractKnowledgeDates(") && app.includes("function extractKnowledgeNumbers("),
  "AI Knowledge must inspect explicit dates and numeric values in cited claims.");
assert.ok(app.includes("function inspectKnowledgeClaimDetails(") && app.includes("function extractKnowledgeContextMarkers("),
  "AI Knowledge must inspect unit and context/exception markers.");
assert.ok(app.includes('code:"numberNotFound"') && app.includes('code:"unitMismatch"') &&
  app.includes('code:"dateNotFound"') && app.includes('code:"contextReview"'),
  "AI Knowledge must classify numeric, unit, date, and context review warnings.");
assert.ok(app.includes("supportAudit.flaggedCount") && app.includes("claim.details.flags.map"),
  "The claim-level panel must surface detailed verification warnings.");
assert.ok(app.includes("Kecocokan kata atau nilai bukan bukti"),
  "The verifier must disclose that numeric and lexical matches do not establish semantic correctness.");
console.log("AI Knowledge numerical, date, unit, and contextual verification guard checks passed.");


assert.ok(app.includes("function detectKnowledgeEvidenceConflicts(") && app.includes("function extractKnowledgeConflictContext("),
  "AI Knowledge must compare relevant numeric evidence across selected sources.");
assert.ok(app.includes('"potential-conflict"') && app.includes('"scope-difference"') && app.includes('"unit-difference"'),
  "AI Knowledge must distinguish possible conflicts, period/scope differences, and unit differences.");
assert.ok(app.includes("Konsistensi bukti antar-sumber") && app.includes("conflict.left.sourceNumber") && app.includes("conflict.right.sourceNumber"),
  "Cross-source review must show both source identities and evidence excerpts.");
console.log("AI Knowledge cross-source conflict detection guard checks passed.");


assert.ok(app.includes("function extractKnowledgeTableRows(") && app.includes("function classifyKnowledgeTableHeader("),
  "AI Knowledge must parse row-aware table evidence with explicit column roles.");
assert.ok(app.includes("identityKey!==b.identityKey") && app.includes("a.metricKey!==b.metricKey"),
  "Table values must only be compared when subject identity and metric both match.");
assert.ok(app.includes("rowIndex:record.rowIndex") && app.includes("columnHeader:record.columnHeader") &&
  app.includes("Baris tabel ") && app.includes("Kolom "),
  "Table conflict review must preserve and display row/column provenance.");
assert.ok(app.includes("periodUnclear") && app.includes("periodTokens"),
  "Table comparisons must distinguish explicit time-scope information.");
console.log("AI Knowledge subject-aware and table-aware evidence verification guard checks passed.");


assert.ok(app.includes("function buildKnowledgeTableHeaderStructure(") &&
  app.includes("function extractKnowledgeTableRows("),
  "AI Knowledge must detect hierarchical table headers before comparing row values.");
assert.ok(app.includes("headerDepth") && app.includes("headerRows") && app.includes("dataStartIndex"),
  "Table evidence must preserve header depth and data row boundaries.");
assert.ok(app.includes("identityInherited") && app.includes("Identitas diwariskan dari sel kosong/tergabung"),
  "Merged identity-cell inference must be disclosed for manual review.");
assert.ok(app.includes('text.includes("\\t")?[]:extractKnowledgeNumbers'),
  "Unrecognized tabular text must not fall back to generic prose number comparisons.");
console.log("AI Knowledge hierarchical header, merged cell, and uncertainty guard checks passed.");
