import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const app = await readFile("assets/js/app.js", "utf8");
const start = app.indexOf("  function findKnowledgeSources(");
const sourceStart = app.indexOf("  function groupKnowledgeSourcesBySection(");
const end = app.indexOf("\n  function bindKnowledgeWorkspace()", start);
assert.ok(start >= 0 && sourceStart >= 0 && end > start, "Knowledge source retrieval functions are missing.");
const source = app.slice(sourceStart, end) + "\n({ findKnowledgeSources, groupKnowledgeSourcesBySection, cosineSimilarity, splitKnowledgeEmbeddingText, buildKnowledgeEmbeddingSegments, findKnowledgeSourcesHybrid, selectKnowledgeSummarySources, selectKnowledgeSourcesPerDocument, selectKnowledgeSynthesisSources, listKnowledgeDocumentCoverage, inspectKnowledgeCitationMarkers, splitKnowledgeAnswerClaims, verifyKnowledgeAnswerSupport, detectKnowledgeEvidenceConflicts, extractKnowledgeTableRows })";
const api = vm.runInNewContext(source, vm.createContext({}));
const pages = [
  { page: 1, documentName: "Pedoman.pdf", text: "Pendidikan karakter dan pembelajaran di sekolah." },
  { page: 2, documentName: "Anggaran.pdf", text: "Analisis anggaran dan laporan keuangan tahunan." },
  { page: 3, documentName: "Program.pdf", text: "Strategi pembelajaran berbasis proyek untuk peserta didik. Strategi pembelajaran diterapkan secara konsisten." },
  { page: 4, documentName: "Program.pdf", text: "Rencana kegiatan ekstrakurikuler dan jadwal." },
  { page: 5, documentName: "Evaluasi.pdf", text: "Evaluasi pembelajaran dan capaian peserta didik." },
  { page: 6, documentName: "Kurikulum.pdf", text: "Kurikulum dan pembelajaran aktif di kelas." }
];
const ranked = api.findKnowledgeSources(pages, "strategi pembelajaran peserta didik");
assert.equal(ranked[0].page, 3, "BM25 should rank the strongest lexical match first.");
assert.equal(ranked[0].documentName, "Program.pdf", "Retrieved excerpts must retain their source document.");
assert.ok(ranked[0].score > 0 && ranked[0].matchedTerms >= 2, "Retrieved source should expose positive relevance and matched terms.");
const headingOnlyMatch = api.findKnowledgeSources([
  { page: 1, section: "Kebijakan Kehadiran", text: "Peserta didik datang sesuai jadwal." }
], "kebijakan");
assert.equal(headingOnlyMatch.length, 1, "Relevant section headings may surface otherwise weak lexical passages.");
assert.deepEqual(Array.from(headingOnlyMatch[0].matchedSectionTerms), ["kebijakan"]);
const groupedSections = api.groupKnowledgeSourcesBySection([
  { page: 1, section: "Tujuan", documentName: "A.pdf", text: "A" },
  { page: 2, section: "TUJUAN", documentName: "B.pdf", text: "B" },
  { page: 3, section: "Ruang Lingkup", documentName: "C.pdf", text: "C" }
]);
assert.equal(groupedSections.length, 2, "Equivalent headings should be grouped across documents.");
assert.deepEqual(Array.from(groupedSections[0].items, item => item.sourceNumber), [1, 2], "Grouping must preserve original citation numbering.");
assert.equal(groupedSections[1].heading, "Ruang Lingkup");
const synthesisPages = [
  { documentId: 1, documentName: "A.pdf", page: 1, text: "A1" },
  { documentId: 1, documentName: "A.pdf", page: 2, text: "A2" },
  { documentId: 1, documentName: "A.pdf", page: 3, text: "A3" },
  { documentId: 2, documentName: "B.pdf", page: 1, text: "B1" },
  { documentId: 2, documentName: "B.pdf", page: 2, text: "B2" },
  { documentId: 3, documentName: "C.pdf", page: 1, text: "C1" }
];
const synthesisCandidates = [
  { index: 0, score: 0.99 }, { index: 1, score: 0.98 }, { index: 2, score: 0.97 },
  { index: 3, score: 0.90 }, { index: 4, score: 0.89 }, { index: 5, score: 0.85 }
];
const synthesisSelection = api.selectKnowledgeSynthesisSources(synthesisPages, synthesisCandidates, 2, 5);
assert.deepEqual(Array.from(synthesisSelection, item => item.index), [0, 1, 3, 4, 5],
  "Multi-document synthesis should limit each document's dominance while retaining ranked evidence.");
assert.equal(new Set(synthesisSelection.map(item => item.documentName)).size, 3,
  "Relevant evidence from all represented documents should remain eligible.");
const singleDocumentSelection = api.selectKnowledgeSynthesisSources(
  synthesisPages.slice(0, 3),
  [{ index: 0, score: 0.9 }, { index: 1, score: 0.8 }, { index: 2, score: 0.7 }],
  2,
  5
);
assert.equal(singleDocumentSelection.length, 3,
  "Single-document answers should not lose relevant excerpts to an unnecessary diversity cap.");


assert.ok(ranked.length <= 5, "Retrieval must be bounded to five source chunks.");
assert.deepEqual(Array.from(api.findKnowledgeSources(pages, "astronomi galaksi")), []);
assert.deepEqual(Array.from(api.findKnowledgeSources(pages, "apa dan yang")), [], "Stop words alone must not produce matches.");
const across = api.findKnowledgeSources(pages, "pembelajaran");
assert.ok(new Set(across.map(item => item.documentName)).size >= 3, "Cross-document search should retrieve evidence from multiple documents.");
console.log("AI Knowledge tests passed: BM25 relevance, source identity, cross-document retrieval, bounded excerpts, and no-match handling.");

const helperStart = app.indexOf("  function chunkKnowledgeText(");
const helperEnd = app.indexOf("\n  async function readKnowledgeFile(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Knowledge extraction helpers are missing.");
const extractionSource = app.slice(helperStart, helperEnd) + "\n({ chunkKnowledgeText, limitKnowledgeExcerpt, shouldAttemptKnowledgeOcr, detectKnowledgeHeading, applyKnowledgeSectionMetadata, buildKnowledgeTableHeaderStructure, extractKnowledgePdfLayout, annotateKnowledgePdfTableContinuations })";
const extraction = vm.runInNewContext(extractionSource, vm.createContext({}));

assert.equal(extraction.shouldAttemptKnowledgeOcr(false, 0), false, "OCR must remain disabled unless explicitly enabled.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 0), true, "OCR should be available before the attempt limit.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 19), true, "The twentieth OCR attempt should be allowed.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 20), false, "OCR must stop after 20 attempts per document.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 21), false, "OCR must remain stopped after the limit.");
assert.equal(extraction.detectKnowledgeHeading("# Tujuan dan Ruang Lingkup"), "Tujuan dan Ruang Lingkup", "Markdown headings should be recognized.");
assert.equal(extraction.detectKnowledgeHeading("2.1 Persyaratan Peserta"), "2.1 Persyaratan Peserta", "Numbered section headings should be recognized.");
assert.equal(extraction.detectKnowledgeHeading("KEBIJAKAN KEHADIRAN"), "KEBIJAKAN KEHADIRAN", "Short uppercase headings should be recognized.");
assert.equal(extraction.detectKnowledgeHeading("Peserta didik mengikuti pembelajaran setiap hari."), "", "Ordinary prose must not be misclassified as a heading.");
const structuredPages = extraction.applyKnowledgeSectionMetadata([
  { page: 1, text: "# Tujuan\nIsi bagian tujuan." },
  { page: 2, text: "Lanjutan bagian tujuan." },
  { page: 3, text: "## Ruang Lingkup\nIsi bagian ruang lingkup." }
]);
assert.deepEqual(Array.from(structuredPages, page => page.section), ["Tujuan", "Tujuan", "Ruang Lingkup"]);
assert.deepEqual(Array.from(structuredPages, page => page.hasSectionHeading), [true, false, true], "Section metadata should carry forward until a new heading is found.");
const positionedTable = extraction.extractKnowledgePdfLayout([
  { str: "Nama", transform: [1, 0, 0, 10, 10, 100], width: 24, height: 10 },
  { str: "Nilai", transform: [1, 0, 0, 10, 150, 100], width: 30, height: 10 },
  { str: "Siswa A", transform: [1, 0, 0, 10, 10, 80], width: 50, height: 10 },
  { str: "95", transform: [1, 0, 0, 10, 150, 80], width: 12, height: 10 },
  { str: "Siswa B", transform: [1, 0, 0, 10, 10, 60], width: 50, height: 10 },
  { str: "87", transform: [1, 0, 0, 10, 150, 60], width: 12, height: 10 }
]);
assert.equal(positionedTable.layoutAware, true, "PDF text with coordinates should use layout-aware extraction.");
assert.equal(positionedTable.tableRows, 3, "Repeated aligned columns should be detected as potential table rows.");
assert.equal(positionedTable.tableBlocks.length, 1, "A contiguous aligned row sequence should form one table block.");
assert.equal(positionedTable.tableBlocks[0].columnCount, 2);
assert.deepEqual(Array.from(positionedTable.tableBlocks[0].headerCells), ["Nama", "Nilai"]);
assert.equal(positionedTable.tableBlocks[0].headerKey, "nama|nilai");

const hierarchicalPositionedTable = extraction.extractKnowledgePdfLayout([
  { str: "Identitas", transform: [1, 0, 0, 10, 10, 140], width: 60, height: 10 },
  { str: "Capaian", transform: [1, 0, 0, 10, 200, 140], width: 55, height: 10 },
  { str: "Nama", transform: [1, 0, 0, 10, 10, 120], width: 28, height: 10 },
  { str: "Kelas", transform: [1, 0, 0, 10, 100, 120], width: 30, height: 10 },
  { str: "Jumlah Siswa", transform: [1, 0, 0, 10, 200, 120], width: 80, height: 10 },
  { str: "Andi", transform: [1, 0, 0, 10, 10, 100], width: 25, height: 10 },
  { str: "XI IPA 1", transform: [1, 0, 0, 10, 100, 100], width: 55, height: 10 },
  { str: "30", transform: [1, 0, 0, 10, 200, 100], width: 12, height: 10 },
  { str: "Budi", transform: [1, 0, 0, 10, 10, 80], width: 25, height: 10 },
  { str: "XI IPA 2", transform: [1, 0, 0, 10, 100, 80], width: 55, height: 10 },
  { str: "28", transform: [1, 0, 0, 10, 200, 80], width: 12, height: 10 }
]);
assert.equal(hierarchicalPositionedTable.tableBlocks.length, 1,
  "A lower-width merged heading row should attach to the detailed header row below it.");
assert.equal(hierarchicalPositionedTable.tableBlocks[0].headerDepth, 2);
assert.deepEqual(Array.from(hierarchicalPositionedTable.tableBlocks[0].columnHeaders), [
  "Identitas Nama", "Identitas Kelas", "Capaian Jumlah Siswa"
]);
assert.equal(hierarchicalPositionedTable.tableBlocks[0].dataStartLine, 2);
assert.equal(hierarchicalPositionedTable.tableRows, 4,
  "The hierarchical header row should be included in the table block without losing data rows.");

const normalizedHeaderStructure = extraction.buildKnowledgeTableHeaderStructure([
  ["Identitas", "", "Capaian"],
  ["Nama", "Kelas", "Jumlah Siswa"],
  ["Andi", "XI IPA 1", "30"]
], 3);
assert.equal(normalizedHeaderStructure.headerDepth, 2);
assert.deepEqual(Array.from(normalizedHeaderStructure.headers), [
  "Identitas Nama", "Identitas Kelas", "Capaian Jumlah Siswa"
]);

const multiPageTables = extraction.annotateKnowledgePdfTableContinuations([
  { page: 4, tableBlocks: [
    { startLine: 3, endLine: 12, lineCount: 13, rowCount: 10, columnCount: 2, columnStarts: [10, 150], headerCells: ["Nama", "Nilai"], headerKey: "nama|nilai" }
  ] },
  { page: 5, tableBlocks: [
    { startLine: 0, endLine: 8, lineCount: 9, rowCount: 9, columnCount: 2, columnStarts: [10, 150], headerCells: ["Nama", "Nilai"], headerKey: "nama|nilai" }
  ] }
]);
assert.equal(multiPageTables[1].repeatedTableHeader, true, "A matching header at the top of the next page should be recognized as repeated.");
assert.equal(multiPageTables[1].tableContinuation.type, "repeated-header");
assert.equal(multiPageTables[1].tableContinuation.fromPage, 4);
assert.deepEqual(Array.from(multiPageTables[1].tableContinuation.header), ["Nama", "Nilai"]);
const possibleContinuation = extraction.annotateKnowledgePdfTableContinuations([
  { page: 8, tableBlocks: [
    { startLine: 4, endLine: 9, lineCount: 10, rowCount: 6, columnCount: 2, columnStarts: [12, 155], headerCells: ["Nama", "Nilai"], headerKey: "nama|nilai" }
  ] },
  { page: 9, tableBlocks: [
    { startLine: 0, endLine: 5, lineCount: 6, rowCount: 6, columnCount: 2, columnStarts: [12, 155], headerCells: ["Siswa C", "88"], headerKey: "siswa c|88" }
  ] }
]);
assert.equal(possibleContinuation[1].tableContinuation.type, "possible",
  "Aligned columns at adjacent page edges without a repeated header must be labeled only as a possible continuation.");
const unrelatedPages = extraction.annotateKnowledgePdfTableContinuations([
  { page: 1, tableBlocks: [{ startLine: 5, endLine: 8, lineCount: 9, rowCount: 4, columnCount: 2, columnStarts: [10, 150], headerKey: "nama|nilai", headerCells: ["Nama", "Nilai"] }] },
  { page: 3, tableBlocks: [{ startLine: 0, endLine: 3, lineCount: 4, rowCount: 4, columnCount: 2, columnStarts: [10, 150], headerKey: "nama|nilai", headerCells: ["Nama", "Nilai"] }] }
]);
assert.equal(unrelatedPages[1].tableContinuation, null, "Non-consecutive pages must not be linked as a table continuation.");

assert.ok(positionedTable.text.includes("Nama\tNilai"));
assert.ok(positionedTable.text.includes("Siswa A\t95"));
assert.equal(positionedTable.text.split("\n").length, 3, "PDF row boundaries should be preserved.");
const plainLayout = extraction.extractKnowledgePdfLayout([
  { str: "Paragraf pertama", hasEOL: true },
  { str: "Paragraf kedua", hasEOL: true }
]);
assert.equal(plainLayout.layoutAware, false, "Text without position metadata should retain the safe fallback path.");
assert.equal(plainLayout.tableRows, 0, "Unpositioned text must not be labeled as a table.");
assert.ok(plainLayout.text.includes("Paragraf pertama\nParagraf kedua"));



const exactChunks = extraction.chunkKnowledgeText("x".repeat(90000));
assert.equal(exactChunks.reduce((sum, item) => sum + item.text.length, 0), 90000);
assert.equal(exactChunks.length, 50);
assert.equal(exactChunks.textTruncated, false, "Exactly 90,000 characters should not be marked truncated.");
const overLimitChunks = extraction.chunkKnowledgeText("x".repeat(90001));
assert.equal(overLimitChunks.reduce((sum, item) => sum + item.text.length, 0), 90000);
assert.equal(overLimitChunks.textTruncated, true, "Text beyond 90,000 characters must be marked truncated.");
assert.equal(overLimitChunks.at(-1).page, 50, "Text chunk numbering should remain sequential.");

const fullPage = extraction.limitKnowledgeExcerpt("x".repeat(15000), 20000);
assert.equal(fullPage.text.length, 12000);
assert.equal(fullPage.truncated, true, "PDF page excerpts above 12,000 characters must be marked truncated.");
const finalPage = extraction.limitKnowledgeExcerpt("x".repeat(15000), 5000);
assert.equal(finalPage.text.length, 5000, "PDF excerpts must respect the remaining document-wide character budget.");
assert.equal(finalPage.truncated, true);
const exactPage = extraction.limitKnowledgeExcerpt("x".repeat(12000), 12000);
assert.equal(exactPage.truncated, false, "An exact per-page limit should not be marked truncated.");
const exhausted = extraction.limitKnowledgeExcerpt("remaining text", 0);
assert.equal(exhausted.text, "");
assert.equal(exhausted.truncated, true);
console.log("AI Knowledge extraction tests passed: TXT/Markdown chunk boundaries, 90,000-character document cap, 12,000-character PDF page cap, remaining-budget enforcement, and truncation metadata.");


const readerStart = app.indexOf("  async function readKnowledgeFile(");
const readerEnd = app.indexOf("\n  function findKnowledgeSources(", readerStart);
assert.ok(readerStart >= 0 && readerEnd > readerStart, "Knowledge PDF reader function is missing.");
const readerSource = app.slice(helperStart, readerEnd) + "\n({ readKnowledgeFile })";
const readerApi = vm.runInNewContext(readerSource, vm.createContext({ Uint8Array }));

function makePdf(pageTexts, render = async () => {}, recognize = async () => ({ data: { text: "hasil OCR" } }), terminate = async () => {}) {
  const pages = pageTexts.map((value) => ({
    getTextContent: async () => ({ items: value ? [{ str: value }] : [] }),
    getViewport: () => ({ width: 100, height: 120 }),
    render: () => ({ promise: render() })
  }));
  const pdfjs = { getDocument: () => ({ promise: Promise.resolve({
    numPages: pages.length,
    getPage: async (number) => pages[number - 1]
  }) }) };
  let canvas;
  let workerTerminated = false;
  const dependencies = {
    pdfjs,
    loadOcr: async () => ({ createWorker: async () => ({
      recognize,
      terminate: async () => { workerTerminated = true; await terminate(); }
    }) }),
    createCanvas: () => {
      canvas = {
        width: 0,
        height: 0,
        getContext: () => ({})
      };
      return canvas;
    }
  };
  return { dependencies, getCanvas: () => canvas, wasWorkerTerminated: () => workerTerminated };
}

const pdfFile = { name: "scan.pdf", size: 100, arrayBuffer: async () => new ArrayBuffer(8) };
const nativePdf = makePdf(["Teks PDF asli"]);
const nativePages = await readerApi.readKnowledgeFile(pdfFile, { dependencies: nativePdf.dependencies, ocrEnabled: false });
assert.equal(nativePages[0].text, "Teks PDF asli");
assert.equal(nativePages.ocrCount, 0);
assert.equal(nativePages.ocrSkipped, false, "OCR-disabled imports must not be marked as skipped.");
const structuredPdf = {
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 1,
    getPage: async () => ({
      getTextContent: async () => ({ items: [
        { str: "BAB I TUJUAN", hasEOL: true },
        { str: "Isi tujuan dokumen.", hasEOL: true }
      ] })
    })
  }) })
};
const structuredPdfPages = await readerApi.readKnowledgeFile(pdfFile, {
  dependencies: { pdfjs: structuredPdf }, ocrEnabled: false
});
assert.match(structuredPdfPages[0].text, /\n/, "PDF.js line boundaries should be retained for heading detection.");
assert.equal(extraction.applyKnowledgeSectionMetadata(structuredPdfPages)[0].section, "BAB I TUJUAN");
const makePositionedTablePage = () => [
  { str: "Nama", transform: [1, 0, 0, 10, 10, 100], width: 24, height: 10 },
  { str: "Nilai", transform: [1, 0, 0, 10, 150, 100], width: 30, height: 10 },
  { str: "Siswa A", transform: [1, 0, 0, 10, 10, 80], width: 50, height: 10 },
  { str: "95", transform: [1, 0, 0, 10, 150, 80], width: 12, height: 10 }
];
const multiPagePdf = {
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 2,
    getPage: async () => ({
      getTextContent: async () => ({ items: makePositionedTablePage() })
    })
  }) })
};
const importedTablePages = await readerApi.readKnowledgeFile(pdfFile, {
  dependencies: { pdfjs: multiPagePdf }, ocrEnabled: false
});
assert.equal(importedTablePages.length, 2);
assert.equal(importedTablePages[0].tableBlocks.length, 1, "PDF import should attach reconstructed table blocks to each source page.");
assert.equal(importedTablePages[1].tableContinuation.type, "repeated-header",
  "The real PDF import path should annotate a repeated header on the consecutive page.");
assert.equal(importedTablePages[1].tableContinuation.fromPage, 1);



const scannedPdf = makePdf(["", "Teks PDF asli"]);
const scannedPages = await readerApi.readKnowledgeFile(pdfFile, { dependencies: scannedPdf.dependencies, ocrEnabled: true });
assert.equal(scannedPages.length, 2);
assert.equal(scannedPages[0].text, "hasil OCR");
assert.equal(scannedPages[0].ocr, true);
assert.equal(scannedPages[1].ocr, false);
assert.equal(scannedPages.ocrCount, 1);
assert.equal(scannedPages.ocrSkipped, false);
assert.equal(scannedPdf.getCanvas().width, 0, "OCR canvas width must be reset after recognition.");
assert.equal(scannedPdf.getCanvas().height, 0, "OCR canvas height must be reset after recognition.");
assert.equal(scannedPdf.wasWorkerTerminated(), true, "OCR worker must be terminated after processing.");

const cleanupFailurePdf = makePdf([""], async () => {}, async () => ({ data: { text: "teks tetap tersedia" } }), async () => { throw new Error("cleanup gagal"); });
const cleanupFailurePages = await readerApi.readKnowledgeFile(pdfFile, { dependencies: cleanupFailurePdf.dependencies, ocrEnabled: true });
assert.equal(cleanupFailurePages[0].text, "teks tetap tersedia", "Worker cleanup failure must not discard extracted OCR text.");
assert.match(cleanupFailurePages.ocrNotice, /Worker OCR gagal ditutup/);

const ocrUnavailablePdf = makePdf([""]);
const unavailableDependencies = { ...ocrUnavailablePdf.dependencies, loadOcr: async () => { throw new Error("OCR tidak tersedia"); } };
await assert.rejects(
  readerApi.readKnowledgeFile(pdfFile, { dependencies: unavailableDependencies, ocrEnabled: true }),
  /OCR tidak berhasil: OCR tidak tersedia/
);
console.log("AI Knowledge PDF/OCR integration tests passed: native text, OCR extraction, metadata, canvas cleanup, worker termination, cleanup warnings, and OCR load errors.");


assert.equal(api.cosineSimilarity([1, 0], [1, 0]), 1, "Identical normalized embeddings should have cosine similarity 1.");
assert.equal(api.cosineSimilarity([1, 0], [0, 1]), 0, "Orthogonal embeddings should have cosine similarity 0.");
assert.equal(api.cosineSimilarity([0, 0], [1, 0]), -1, "Zero vectors must not produce a false similarity.");

const longParagraph = Array.from({ length: 30 }, (_, index) =>
  "Kalimat " + (index + 1) + " membahas kebijakan pembelajaran, pendampingan peserta didik, dan evaluasi kegiatan."
).join(" ");
const sentenceChunks = api.splitKnowledgeEmbeddingText(longParagraph, 220, 40);
assert.ok(sentenceChunks.length > 1, "Long page text must be split into several embedding segments.");
assert.ok(sentenceChunks.every(chunk => chunk.length <= 220), "Semantic segments must respect the configured character limit.");
assert.ok(sentenceChunks[0].endsWith("."), "Semantic segments should prefer complete sentence boundaries.");
const originalWords = longParagraph.split(" ");
const segmentedWords = sentenceChunks.join(" ").split(" ");
let segmentWordIndex = 0;
for (const word of originalWords) {
  const found = segmentedWords.indexOf(word, segmentWordIndex);
  assert.ok(found >= segmentWordIndex, "Chunk overlap must not drop original words.");
  segmentWordIndex = found + 1;
}
assert.ok(sentenceChunks.length > 1 && sentenceChunks[1].length > 0, "Overlapping chunks must remain non-empty.");

const segmented = api.buildKnowledgeEmbeddingSegments([
  { text: longParagraph },
  { text: "Catatan tambahan untuk halaman berikutnya." }
], 120, 2, 20);
assert.equal(segmented.texts.length, 2);
assert.deepEqual(Array.from(segmented.pageIndices), [0, 0]);
assert.ok(segmented.texts.every(chunk => chunk.length <= 120), "Embedding segments must respect the minimum supported character window.");
assert.equal(segmented.truncated, true, "Embedding segments must be bounded.");
const completeSegments = api.buildKnowledgeEmbeddingSegments([{ text: longParagraph }], 120, 100, 20);
assert.ok(completeSegments.texts.length > 2);
assert.ok(completeSegments.texts.every(chunk => chunk.length <= 120));
assert.equal(completeSegments.truncated, false);

assert.deepEqual(
  JSON.parse(JSON.stringify(api.inspectKnowledgeCitationMarkers("Klaim didukung [S1] dan [S2].", 2))),
  { used: [1, 2], invalid: [], missing: false }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(api.inspectKnowledgeCitationMarkers("Klaim merujuk [S4].", 2))),
  { used: [4], invalid: [4], missing: false },
  "References outside the supplied evidence list must be flagged."
);
assert.deepEqual(
  JSON.parse(JSON.stringify(api.inspectKnowledgeCitationMarkers("Jawaban tanpa referensi.", 2))),
  { used: [], invalid: [], missing: true },
  "Answers without source markers must be flagged."
);
const citationEvidence = [
  {
    documentName: "Pedoman.pdf",
    section: "Program Pembelajaran",
    text: "Program pembelajaran meningkatkan capaian peserta didik melalui evaluasi berkala."
  }
];
const supportedAudit = api.verifyKnowledgeAnswerSupport(
  "Program pembelajaran meningkatkan capaian peserta didik [S1].",
  citationEvidence
);
assert.equal(supportedAudit.claimCount, 1);
assert.equal(supportedAudit.claims[0].status, "supported",
  "Claims with strong lexical overlap against their cited excerpt should be marked textually supported.");
assert.equal(supportedAudit.counts.supported, 1);
const partialAudit = api.verifyKnowledgeAnswerSupport(
  "Program pembelajaran meningkatkan kompetensi siswa melalui pendampingan intensif [S1].",
  [{ text: "Program pembelajaran rutin dilaksanakan dengan evaluasi semester." }]
);
assert.equal(partialAudit.claims[0].status, "partial",
  "Claims with limited but non-zero lexical overlap should require manual review.");
const weakAudit = api.verifyKnowledgeAnswerSupport(
  "Pemerintah menetapkan anggaran tahunan meningkat drastis [S1].",
  citationEvidence
);
assert.equal(weakAudit.claims[0].status, "weak",
  "A valid source marker alone must not imply that the excerpt supports the claim.");
const uncitedAudit = api.verifyKnowledgeAnswerSupport(
  "Kegiatan ekstrakurikuler meningkatkan kehadiran peserta setiap semester.",
  citationEvidence
);
assert.equal(uncitedAudit.claims[0].status, "uncited",
  "Factual-looking statements without source markers must be flagged.");
const invalidAudit = api.verifyKnowledgeAnswerSupport(
  "Program pembelajaran meningkatkan capaian peserta didik [S4].",
  citationEvidence
);
assert.equal(invalidAudit.claims[0].status, "invalid");
assert.deepEqual(Array.from(invalidAudit.claims[0].invalid), [4]);
const multiClaimAudit = api.verifyKnowledgeAnswerSupport(
  "Program pembelajaran meningkatkan capaian peserta didik [S1].\nKegiatan ekstrakurikuler meningkatkan kehadiran peserta setiap semester.",
  citationEvidence
);
assert.equal(multiClaimAudit.claimCount, 2, "Claim verification should inspect separate sentences independently.");
assert.equal(multiClaimAudit.counts.supported, 1);
assert.equal(multiClaimAudit.counts.uncited, 1);
const shortAudit = api.verifyKnowledgeAnswerSupport("Kesimpulan utama [S1].", citationEvidence);
assert.equal(shortAudit.claims[0].status, "limited",
  "Very short claims should be labeled unassessed rather than assumed supported.");

const normalizedValueAudit = api.verifyKnowledgeAnswerSupport(
  "Jumlah bantuan mencapai Rp 1.500.000 pada 1 September 2026 [S1].",
  [{ text: "Jumlah bantuan adalah Rp 1500000 pada 01/09/2026." }]
);
assert.equal(normalizedValueAudit.claims[0].details.flags.length, 0,
  "Equivalent Indonesian thousands separators, currency values, and date formats should normalize without a warning.");
const numberMismatchAudit = api.verifyKnowledgeAnswerSupport(
  "Capaian mencapai 25 persen pada tahun 2026 [S1].",
  [{ text: "Capaian tercatat 20 persen pada tahun 2025." }]
);
assert.ok(numberMismatchAudit.claims[0].details.flags.some(flag => flag.code === "numberNotFound"),
  "A numeric value absent from the cited excerpt should be flagged.");
assert.ok(numberMismatchAudit.claims[0].details.flags.some(flag => flag.code === "dateNotFound"),
  "An explicit year absent from the cited excerpt should be flagged.");
const unitMismatchAudit = api.verifyKnowledgeAnswerSupport(
  "Berat sampel mencapai 10 kg [S1].",
  [{ text: "Berat sampel tercatat 10 gram." }]
);
assert.ok(unitMismatchAudit.claims[0].details.flags.some(flag => flag.code === "unitMismatch"),
  "The same numeric value with a different unit should require review.");
const contextMismatchAudit = api.verifyKnowledgeAnswerSupport(
  "Peserta didik tidak wajib mengikuti kegiatan tersebut [S1].",
  [{ text: "Peserta didik wajib mengikuti kegiatan tersebut, kecuali pada kondisi tertentu." }]
);
assert.ok(contextMismatchAudit.claims[0].details.flags.some(flag => flag.code === "contextReview"),
  "Differences in negation, obligation, and exception markers should require contextual review.");

const evidenceConflicts = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "Rekap-A.pdf", page: 2, text: "Jumlah peserta didik aktif mencapai 120 orang." },
  { sourceNumber: 2, documentName: "Rekap-B.pdf", page: 4, text: "Jumlah peserta didik aktif mencapai 95 orang." }
]);
assert.equal(evidenceConflicts.counts.potentialConflict, 1,
  "Different values with sufficiently similar concepts and units should be raised as a potential conflict.");
assert.equal(evidenceConflicts.conflicts[0].left.sourceNumber, 1);
assert.equal(evidenceConflicts.conflicts[0].right.sourceNumber, 2);
assert.equal(evidenceConflicts.conflicts[0].left.value, "120 orang");
assert.equal(evidenceConflicts.conflicts[0].right.value, "95 orang");

const scopedEvidenceDifferences = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "Rekap-2024.pdf", page: 1, text: "Jumlah peserta didik aktif pada tahun 2024 mencapai 120 orang." },
  { sourceNumber: 2, documentName: "Rekap-2025.pdf", page: 1, text: "Jumlah peserta didik aktif pada tahun 2025 mencapai 95 orang." }
]);
assert.equal(scopedEvidenceDifferences.counts.scopeDifference, 1,
  "Different explicit years should be labeled as a scope/period difference rather than a direct conflict.");
assert.equal(scopedEvidenceDifferences.counts.potentialConflict, 0);

const unrelatedEvidence = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "Siswa.pdf", text: "Jumlah peserta didik aktif mencapai 120 orang." },
  { sourceNumber: 2, documentName: "Anggaran.pdf", text: "Jumlah anggaran operasional mencapai 95 rupiah." }
]);
assert.equal(unrelatedEvidence.total, 0,
  "Different subjects with insufficient shared context must not be compared as conflicting facts.");

const unitEvidenceDifferences = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "Data-A.pdf", text: "Berat sampel laboratorium adalah 10 kilogram." },
  { sourceNumber: 2, documentName: "Data-B.pdf", text: "Berat sampel laboratorium adalah 10 gram." }
]);
assert.equal(unitEvidenceDifferences.counts.unitDifference, 1,
  "The same numeric value with different recognized units should be separated from value conflicts.");

const tableRowConflicts = api.detectKnowledgeEvidenceConflicts([
  {
    sourceNumber: 1, documentName: "Daftar-A.pdf", page: 3,
    text: "Nama\tKelas\tJumlah Siswa\nAndi\tXI IPA 1\t30\nBudi\tXI IPA 2\t28"
  },
  {
    sourceNumber: 2, documentName: "Daftar-B.pdf", page: 5,
    text: "Nama\tKelas\tJumlah Peserta Didik\nAndi\tXI IPA 1\t32\nBudi\tXI IPA 2\t27"
  }
]);
assert.equal(tableRowConflicts.counts.potentialConflict, 2,
  "Only matching subject and class rows with the same metric should be compared across tables.");
assert.ok(tableRowConflicts.conflicts.every(item => item.evidenceType === "table"));
assert.deepEqual(
  Array.from(tableRowConflicts.conflicts, item => item.left.identity).sort(),
  ["Andi · XI IPA 1", "Budi · XI IPA 2"],
  "Table conflict results must retain the exact row identity."
);
assert.ok(tableRowConflicts.conflicts.every(item => item.left.rowIndex > 0 && item.right.rowIndex > 0),
  "Table evidence must retain data row positions.");

const differentSubjectRows = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "A.pdf", page: 1, text: "Nama\tKelas\tNilai\nAndi\tX-1\t80" },
  { sourceNumber: 2, documentName: "B.pdf", page: 1, text: "Nama\tKelas\tNilai\nBudi\tX-1\t60" }
]);
assert.equal(differentSubjectRows.total, 0,
  "Different named subjects must never be reported as conflicting table rows.");

const differentClassRows = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "A.pdf", page: 1, text: "Nama\tKelas\tNilai\nAndi\tX-1\t80" },
  { sourceNumber: 2, documentName: "B.pdf", page: 1, text: "Nama\tKelas\tNilai\nAndi\tX-2\t60" }
]);
assert.equal(differentClassRows.total, 0,
  "The same subject in a different class must not be compared as the same table record.");

const tablePeriodRows = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "A.pdf", page: 1, text: "Indikator\t2024\nPeserta didik aktif\t120" },
  { sourceNumber: 2, documentName: "B.pdf", page: 1, text: "Indikator\t2025\nPeserta didik aktif\t95" }
]);
assert.equal(tablePeriodRows.counts.scopeDifference, 1,
  "A table with the same row indicator but different year columns must be labeled as a scope difference.");
assert.equal(tablePeriodRows.counts.potentialConflict, 0);

const rowPeriodColumns = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "A.pdf", page: 1, text: "Kelas\tTahun\tJumlah Siswa\nXI IPA 1\t2024\t30" },
  { sourceNumber: 2, documentName: "B.pdf", page: 1, text: "Kelas\tTahun\tJumlah Siswa\nXI IPA 1\t2025\t32" }
]);
assert.equal(rowPeriodColumns.counts.scopeDifference, 1,
  "A year stored in a table row must be treated as a period dimension, not as a comparable metric value.");

const tableExtractor = api.extractKnowledgeTableRows({
  sourceNumber: 4, documentName: "Jejak.pdf", page: 7,
  text: "Nama\tKelas\tJumlah Siswa\nSiti\tXII-1\t33"
});
assert.equal(tableExtractor.records.length, 1);
assert.equal(tableExtractor.records[0].identityLabel, "Siti · XII-1");
assert.equal(tableExtractor.records[0].columnHeader, "Jumlah Siswa");
assert.equal(tableExtractor.records[0].rowIndex, 1);
assert.equal(tableExtractor.records[0].unit, "orang");

const hierarchicalTableConflicts = api.detectKnowledgeEvidenceConflicts([
  {
    sourceNumber: 1, documentName: "Rekap-Hierarki-A.pdf", page: 3,
    text: "Identitas\t\tCapaian\nNama\tKelas\tJumlah Siswa\nAndi\tXI IPA 1\t30"
  },
  {
    sourceNumber: 2, documentName: "Rekap-Hierarki-B.pdf", page: 4,
    text: "Identitas\t\tCapaian\nNama\tKelas\tJumlah Siswa\nAndi\tXI IPA 1\t32"
  }
]);
assert.equal(hierarchicalTableConflicts.counts.potentialConflict, 1,
  "Hierarchical group headers should normalize to the same subject and metric columns across source files.");
assert.equal(hierarchicalTableConflicts.conflicts[0].left.headerDepth, 2);
assert.equal(hierarchicalTableConflicts.conflicts[0].left.columnHeader, "identitas capaian nama kelas jumlah siswa");
assert.equal(hierarchicalTableConflicts.conflicts[0].left.identity, "Andi · XI IPA 1");

const mergedIdentityTable = api.extractKnowledgeTableRows({
  sourceNumber: 5, documentName: "Rekap-Gabungan.pdf", page: 8,
  text: "Nama\tKelas\tJumlah Siswa\nSiti\tXII-1\t33\n\t\t34"
});
assert.equal(mergedIdentityTable.records.length, 2,
  "A vertically merged identity cell should carry to subsequent non-empty data rows.");
assert.equal(mergedIdentityTable.records[1].identityLabel, "Siti · XII-1");
assert.equal(mergedIdentityTable.records[1].identityInherited, true,
  "Inherited identity must be explicitly marked for human review.");
assert.equal(mergedIdentityTable.records[1].rowIndex, 2);

const unrecognizedTable = api.detectKnowledgeEvidenceConflicts([
  { sourceNumber: 1, documentName: "A.pdf", text: "Kolom A\tKolom B\nAlpha\t120" },
  { sourceNumber: 2, documentName: "B.pdf", text: "Kolom A\tKolom B\nAlpha\t95" }
]);
assert.equal(unrecognizedTable.total, 0,
  "Unrecognized tabular layouts must not fall back to context-only prose conflict detection.");

assert.ok(numberMismatchAudit.flaggedCount > 0 && numberMismatchAudit.detailCounts.numberNotFound > 0,
  "The audit summary should expose claim-level detail warning counts.");


const summaryPages = [
  ...[1, 2, 3, 4, 5].map(page => ({ documentId: 10, documentName: "Panduan.pdf", page, text: "Isi halaman panduan " + page })),
  ...[1, 2].map(page => ({ documentId: 11, documentName: "Kebijakan.md", page, text: "Isi bagian kebijakan " + page }))
];
const summarySelection = api.selectKnowledgeSummarySources(summaryPages, 3, 15);
assert.deepEqual(Array.from(summarySelection, page => [page.documentName, page.page]), [
  ["Panduan.pdf", 1], ["Panduan.pdf", 3], ["Panduan.pdf", 5],
  ["Kebijakan.md", 1], ["Kebijakan.md", 2]
], "Document summaries should sample early, middle, and late pages while keeping short documents complete.");
assert.ok(summarySelection.every(page => Number.isInteger(page.index)), "Summary sources must preserve original page indices.");

const comparisonPages = [
  { documentId: 20, documentName: "A.pdf", page: 1, text: "A1" },
  { documentId: 20, documentName: "A.pdf", page: 2, text: "A2" },
  { documentId: 20, documentName: "A.pdf", page: 3, text: "A3" },
  { documentId: 21, documentName: "B.pdf", page: 1, text: "B1" },
  { documentId: 21, documentName: "B.pdf", page: 2, text: "B2" },
  { documentId: 21, documentName: "B.pdf", page: 3, text: "B3" },
  { documentId: 22, documentName: "C.pdf", page: 1, text: "C1" }
];
const comparisonCandidates = [
  { index: 1, score: 0.9 }, { index: 0, score: 0.8 }, { index: 2, score: 0.7 },
  { index: 4, score: 0.6 }, { index: 3, score: 0.5 }, { index: 5, score: 0.4 }
];
const comparisonSelection = api.selectKnowledgeSourcesPerDocument(comparisonPages, comparisonCandidates, 2, 10);
assert.deepEqual(Array.from(comparisonSelection, page => page.documentName), ["A.pdf", "A.pdf", "B.pdf", "B.pdf"]);
assert.deepEqual(Array.from(comparisonSelection, page => page.page), [2, 1, 2, 1]);
assert.ok(comparisonSelection.every(page => Number.isInteger(page.index)), "Comparison excerpts must retain original indices.");
const comparisonCoverage = api.listKnowledgeDocumentCoverage([
  { id: 20, name: "A.pdf" }, { id: 21, name: "B.pdf" }, { id: 22, name: "C.pdf" }
], comparisonSelection);
assert.deepEqual(Array.from(comparisonCoverage.included, doc => doc.name), ["A.pdf", "B.pdf"]);
assert.deepEqual(Array.from(comparisonCoverage.missing, doc => doc.name), ["C.pdf"], "Documents without selected evidence must be reported.");

const sevenDocuments = Array.from({ length: 7 }, (_, index) => ({
  page: 1, documentName: "Dokumen-" + (index + 1) + ".txt", documentId: index + 1,
  text: "Pembelajaran dan evaluasi program sekolah."
}));
assert.equal(api.findKnowledgeSources(sevenDocuments, "pembelajaran", 10).length, 7, "Extended lexical retrieval should expose candidates across more than five documents.");
assert.equal(api.findKnowledgeSourcesHybrid(sevenDocuments, "pembelajaran", [1, 0], [], [], 10).length, 7,
  "Hybrid retrieval must pass its extended candidate limit to BM25 for comparison mode.");
console.log("AI Knowledge document-level RAG tests passed: representative summaries, per-file comparison quotas, source coverage warnings, and expanded candidate retrieval.");

const semanticPages = [
  { page: 8, documentName: "Beasiswa.pdf", text: "Prosedur pengajuan bantuan pendidikan bagi peserta didik." },
  { page: 2, documentName: "Agenda.pdf", text: "Jadwal latihan olahraga dan kegiatan ekstrakurikuler." }
];
const semanticRanked = api.findKnowledgeSourcesHybrid(
  semanticPages,
  "dukungan finansial untuk belajar",
  [1, 0],
  [[0.98, 0.02], [0.05, 0.99]],
  [0, 1]
);
assert.equal(semanticRanked[0].documentName, "Beasiswa.pdf", "Semantic ranking should find related wording without exact keyword overlap.");
assert.equal(semanticRanked[0].page, 8, "Semantic results must retain the original source page.");
assert.equal(semanticRanked.length, 1, "Weak semantic-only matches must be excluded by the confidence threshold.");
assert.ok(semanticRanked[0].semanticScore > 0.9);
const unrelatedOnly = api.findKnowledgeSourcesHybrid(
  semanticPages,
  "galaksi dan astronomi",
  [1, 0],
  [[0, 1], [0.1, 0.99]],
  [0, 1]
);
assert.deepEqual(Array.from(unrelatedOnly), [], "Weak semantic similarity without lexical matches must not manufacture source evidence.");

const hybridFallback = api.findKnowledgeSourcesHybrid(
  pages,
  "strategi pembelajaran peserta didik",
  [1, 0],
  [],
  []
);
assert.equal(hybridFallback[0].page, 3, "Hybrid retrieval must preserve BM25 relevance when no page embeddings exist.");
assert.ok(hybridFallback.length > 0);
console.log("AI Knowledge semantic retrieval tests passed: cosine similarity, bounded page segments, semantic synonym ranking, source identity, and BM25 fallback.");
