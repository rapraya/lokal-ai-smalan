import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const app = await readFile("assets/js/app.js", "utf8");
const start = app.indexOf("  function findKnowledgeSources(");
const end = app.indexOf("\n  function bindKnowledgeWorkspace()", start);
assert.ok(start >= 0 && end > start, "Knowledge source retrieval function is missing.");
const source = app.slice(start, end) + "\n({ findKnowledgeSources, cosineSimilarity, splitKnowledgeEmbeddingText, buildKnowledgeEmbeddingSegments, findKnowledgeSourcesHybrid })";
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
assert.ok(ranked.length <= 5, "Retrieval must be bounded to five source chunks.");
assert.deepEqual(Array.from(api.findKnowledgeSources(pages, "astronomi galaksi")), []);
assert.deepEqual(Array.from(api.findKnowledgeSources(pages, "apa dan yang")), [], "Stop words alone must not produce matches.");
const across = api.findKnowledgeSources(pages, "pembelajaran");
assert.ok(new Set(across.map(item => item.documentName)).size >= 3, "Cross-document search should retrieve evidence from multiple documents.");
console.log("AI Knowledge tests passed: BM25 relevance, source identity, cross-document retrieval, bounded excerpts, and no-match handling.");

const helperStart = app.indexOf("  function chunkKnowledgeText(");
const helperEnd = app.indexOf("\n  async function readKnowledgeFile(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Knowledge extraction helpers are missing.");
const extractionSource = app.slice(helperStart, helperEnd) + "\n({ chunkKnowledgeText, limitKnowledgeExcerpt, shouldAttemptKnowledgeOcr })";
const extraction = vm.runInNewContext(extractionSource, vm.createContext({}));

assert.equal(extraction.shouldAttemptKnowledgeOcr(false, 0), false, "OCR must remain disabled unless explicitly enabled.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 0), true, "OCR should be available before the attempt limit.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 19), true, "The twentieth OCR attempt should be allowed.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 20), false, "OCR must stop after 20 attempts per document.");
assert.equal(extraction.shouldAttemptKnowledgeOcr(true, 21), false, "OCR must remain stopped after the limit.");

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
