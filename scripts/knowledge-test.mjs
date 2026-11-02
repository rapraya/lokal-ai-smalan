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
  { page: 3, documentName: "Program.pdf", text: "Strategi pembelajaran berbasis proyek untuk peserta didik." },
  { page: 4, documentName: "Program.pdf", text: "Rencana kegiatan ekstrakurikuler dan jadwal." },
  { page: 5, documentName: "Evaluasi.pdf", text: "Evaluasi pembelajaran dan capaian peserta didik." },
  { page: 6, documentName: "Kurikulum.pdf", text: "Kurikulum dan pembelajaran aktif di kelas." }
];
const ranked = api.findKnowledgeSources(pages, "strategi pembelajaran peserta didik");
assert.equal(ranked[0].page, 3, "The strongest lexical match should rank first.");
assert.equal(ranked[0].documentName, "Program.pdf", "Retrieved excerpts must retain their source document.");
assert.ok(ranked.length <= 5, "Retrieval must be bounded to five source chunks.");
assert.deepEqual(Array.from(api.findKnowledgeSources(pages, "astronomi galaksi")), []);
assert.deepEqual(Array.from(api.findKnowledgeSources(pages, "apa dan yang")), [], "Stop words alone must not produce matches.");
const across = api.findKnowledgeSources(pages, "pembelajaran");
assert.ok(new Set(across.map(item => item.documentName)).size >= 3, "Cross-document search should retrieve evidence from multiple documents.");
console.log("AI Knowledge tests passed: lexical ranking, source identity, cross-document retrieval, bounded excerpts, and no-match handling.");
