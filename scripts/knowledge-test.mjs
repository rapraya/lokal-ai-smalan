import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const app = await readFile("assets/js/app.js", "utf8");
const start = app.indexOf("  function findKnowledgeSources(");
const end = app.indexOf("\n  function bindKnowledgeWorkspace()", start);
assert.ok(start >= 0 && end > start, "Knowledge source retrieval function is missing.");
const source = app.slice(start, end) + "\n({ findKnowledgeSources })";
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
const helperEnd = app.indexOf("\\n  async function readKnowledgeFile(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Knowledge extraction helpers are missing.");
const extractionSource = app.slice(helperStart, helperEnd) + "\\n({ chunkKnowledgeText, limitKnowledgeExcerpt })";
const extraction = vm.runInNewContext(extractionSource, vm.createContext({}));

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
