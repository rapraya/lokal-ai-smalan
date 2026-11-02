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
  { page: 1, text: "Pendidikan karakter dan pembelajaran di sekolah." },
  { page: 2, text: "Analisis anggaran dan laporan keuangan tahunan." },
  { page: 3, text: "Strategi pembelajaran berbasis proyek untuk peserta didik." },
  { page: 4, text: "Rencana kegiatan ekstrakurikuler dan jadwal." },
  { page: 5, text: "Evaluasi pembelajaran dan capaian peserta didik." },
  { page: 6, text: "Kurikulum dan pembelajaran aktif di kelas." }
];
const ranked = api.findKnowledgeSources(pages, "strategi pembelajaran peserta didik");
assert.equal(ranked[0].page, 3, "The strongest lexical match should rank first.");
assert.ok(ranked.length <= 5, "Retrieval must be bounded to five source chunks.");
assert.deepEqual(Array.from(api.findKnowledgeSources(pages, "astronomi galaksi")), []);
console.log("AI Knowledge tests passed: lexical ranking, bounded excerpts, and no-match handling.");
