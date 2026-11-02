import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const app = await readFile("assets/js/app.js", "utf8");
const start = app.indexOf("  function buildAssistantMessages(");
const end = app.indexOf("  function renderAssistantTasks()", start);
assert.ok(start >= 0 && end > start, "AI Assistant message builder was not found.");
const source = app.slice(start, end) + "\n({ buildAssistantMessages })";
const api = vm.runInNewContext(source, vm.createContext({}));

const tasks = [
  { title: "Susun agenda rapat", completed: false },
  { title: "Kirim laporan", completed: true },
  { title: "x".repeat(200), completed: false }
];
const history = [
  { role: "user", content: "Pertanyaan lama 1" },
  { role: "assistant", content: "Jawaban lama 1" },
  { role: "user", content: "Pertanyaan lama 2" },
  { role: "assistant", content: "Jawaban lama 2" },
  { role: "user", content: "Pertanyaan lama 3" },
  { role: "assistant", content: "Jawaban lama 3" },
  { role: "user", content: "Pertanyaan yang harus dipangkas" }
];
const messages = api.buildAssistantMessages(tasks, history, "Tentukan prioritas", "plan");
assert.equal(messages[0].role, "system");
assert.ok(messages[0].content.includes("Buat rencana kerja yang realistis"));
assert.equal(messages.length, 8);
assert.equal(messages[1].content, "Jawaban lama 1");
assert.equal(messages[6].content, "Pertanyaan yang harus dipangkas");
assert.ok(messages[7].content.includes("Tentukan prioritas"));
assert.ok(messages[7].content.includes('"completed":true'));
assert.ok(messages[7].content.includes('"title":"' + "x".repeat(160) + '"'));
assert.ok(messages[0].content.includes("Jangan mengklaim telah menjalankan tindakan"));
assert.ok(messages[7].content.includes("Jangan menjalankan atau menandai tugas selesai"));

const manyTasks = Array.from({ length: 70 }, (_, index) => ({ title: "Task " + index, completed: false }));
const bounded = api.buildAssistantMessages(manyTasks, [], "review", "review");
assert.equal(JSON.parse(bounded[1].content.split("Daftar tugas yang dipilih pengguna (JSON):\n")[1].split("\n\n")[0]).length, 50);
const chat = api.buildAssistantMessages([], [], "Apa langkah berikut?", "chat");
assert.ok(chat[0].content.includes("Jawab pertanyaan pengguna"));
assert.ok(chat[1].content.includes("Apa langkah berikut?"));
assert.ok(chat[1].content.length < 700);
console.log("AI Assistant tests passed: bounded task context, bounded history, focus modes, and no-action guardrails.");
