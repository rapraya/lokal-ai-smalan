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
  "text", "data", "assistant", "personal", "navigator",
];

for (const module of requiredModules) {
  assert.ok(app.includes(module + ":"), `Missing capability module: ${module}`);
}

assert.ok(html.includes('id="app"') || html.includes('id="workspace"') || html.includes('id="capabilityGrid"'),
  "Application shell markup was not found.");
assert.ok(css.includes(".chat-layout") && css.includes(".chat-composer"),
  "Premium chat workspace styles are missing.");

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
assert.ok(readme.includes("Runtime validation") || readme.includes("not yet been exercised"),
  "README must disclose that browser/GPU runtime validation is pending.");

console.log("Lokal AI smoke checks passed.");
console.log(`Validated ${requiredModules.length} capability modules and the initial WebLLM Chat integration contract.`);
