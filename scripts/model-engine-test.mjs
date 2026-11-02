import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("assets/js/model-engine-core.js", "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);

const engine = context.window.LokalAIModelEngine;
assert.ok(engine, "The Model Engine registry must be exposed by the browser core.");
assert.equal(engine.version, "0.1.0");

const initial = engine.getSnapshot();
assert.equal(initial.hasActiveRuntime, false);
assert.equal(initial.activeProviderId, null);
assert.equal(initial.providers.length, 4);
assert.deepEqual(
  Array.from(initial.providers.map((provider) => provider.id)),
  ["local-webllm", "openai", "anthropic", "google"]
);
assert.equal(initial.providers.filter((provider) => provider.category === "local").length, 1);
assert.equal(initial.providers.filter((provider) => provider.category === "cloud").length, 3);
assert.equal(initial.gateway.configured, false);
assert.equal(initial.gateway.status, "not-configured");

const localProvider = initial.providers.find((provider) => provider.id === "local-webllm");
assert.equal(localProvider.availability, "available");
assert.equal(localProvider.models.length, 2);
assert.equal(localProvider.runtimeStatus, "idle");

for (const providerId of ["openai", "anthropic", "google"]) {
  assert.throws(
    () => engine.attachRuntime(providerId, {}, "model-test"),
    /belum tersedia/
  );
}

assert.throws(() => engine.attachRuntime("unknown", {}, "model-test"), /tidak dikenal/);
assert.throws(() => engine.attachRuntime("local-webllm", {}, "model-test"), /kontrak chat/);
assert.throws(
  () => engine.attachRuntime("local-webllm", { chat: { completions: {} } }, "model-test"),
  /kontrak chat/
);
assert.throws(
  () => engine.attachRuntime("local-webllm", { chat: { completions: { create() {} } } }, ""),
  /Identitas model/
);

const fakeClient = {
  chat: { completions: { create() { return "test"; } } },
  unload() {}
};
engine.attachRuntime("local-webllm", fakeClient, "Llama-3.2-1B-Instruct-q4f16_1-MLC");
assert.equal(engine.getClient(), fakeClient);

const active = engine.getSnapshot();
assert.equal(active.hasActiveRuntime, true);
assert.equal(active.activeProviderId, "local-webllm");
assert.equal(active.activeModelId, "Llama-3.2-1B-Instruct-q4f16_1-MLC");
assert.equal(active.providers.find((provider) => provider.id === "local-webllm").runtimeStatus, "ready");
assert.equal(active.providers.find((provider) => provider.id === "local-webllm").active, true);

const otherClient = { chat: { completions: { create() {} } } };
assert.equal(engine.clearRuntime(otherClient), false, "A different caller must not clear the active runtime.");
assert.equal(engine.getClient(), fakeClient);
assert.equal(engine.clearRuntime(fakeClient), true);
assert.equal(engine.getClient(), null);
assert.equal(engine.getSnapshot().hasActiveRuntime, false);

assert.ok(!source.includes("localStorage"), "The provider registry must not store credentials or runtime data in browser storage.");
assert.ok(!source.includes("fetch("), "The provider registry must not make cloud calls directly from the frontend.");

console.log("Model Engine registry tests passed: provider catalogue, local runtime contract, cloud gateway gate, and lifecycle cleanup.");
