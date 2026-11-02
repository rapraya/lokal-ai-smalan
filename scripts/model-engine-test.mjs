import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("assets/js/model-engine-core.js", "utf8");
const context = { window: { fetch: globalThis.fetch } };
vm.runInNewContext(source, context);

const engine = context.window.LokalAIModelEngine;
assert.ok(engine, "The Model Engine registry must be exposed by the browser core.");
assert.equal(engine.version, "0.2.0");

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
assert.throws(() => engine.createOpenAIClient(), /gateway belum siap/);
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

const fakeLocalClient = {
  chat: { completions: { create() { return "local"; } } },
  unload() {}
};
engine.attachRuntime("local-webllm", fakeLocalClient, "Llama-3.2-1B-Instruct-q4f16_1-MLC");
assert.equal(engine.getClient(), fakeLocalClient);

const activeLocal = engine.getSnapshot();
assert.equal(activeLocal.hasActiveRuntime, true);
assert.equal(activeLocal.activeProviderId, "local-webllm");
assert.equal(activeLocal.activeModelId, "Llama-3.2-1B-Instruct-q4f16_1-MLC");
assert.equal(activeLocal.providers.find((provider) => provider.id === "local-webllm").runtimeStatus, "ready");
assert.equal(activeLocal.providers.find((provider) => provider.id === "local-webllm").active, true);

const otherClient = { chat: { completions: { create() {} } } };
assert.equal(engine.clearRuntime(otherClient), false, "A different caller must not clear the active runtime.");
assert.equal(engine.getClient(), fakeLocalClient);
assert.equal(engine.clearRuntime(fakeLocalClient), true);
assert.equal(engine.getClient(), null);
assert.equal(engine.getSnapshot().hasActiveRuntime, false);

const missingGateway = await engine.checkGateway({
  fetch: async () => new Response("Not found", { status: 404 })
});
assert.equal(missingGateway.status, "not-deployed");
assert.equal(missingGateway.configured, false);

const missingSession = await engine.checkGateway({
  fetch: async () => Response.json({ error: { message: "Login required" } }, { status: 401 })
});
assert.equal(missingSession.status, "session-required");
assert.throws(() => engine.createOpenAIClient(), /gateway belum siap/);

const deniedGateway = await engine.checkGateway({
  fetch: async () => Response.json({ error: { message: "Not allowed" } }, { status: 403 })
});
assert.equal(deniedGateway.status, "access-denied");

const readyGateway = await engine.checkGateway({
  fetch: async (url, init) => {
    assert.equal(url, "/api/health");
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.cache, "no-store");
    return Response.json({
      status: "ready",
      authenticated: true,
      configured: true,
      allowedModels: ["gpt-6.1-sol", "gpt-6-luna"]
    });
  }
});
assert.equal(readyGateway.status, "ready");
assert.equal(readyGateway.authenticated, true);
assert.deepEqual(Array.from(readyGateway.allowedModels), ["gpt-6.1-sol", "gpt-6-luna"]);
assert.equal(engine.getSnapshot().providers.find((provider) => provider.id === "openai").runtimeStatus, "gateway-ready");

const gatewayRequestOptions = [];
const fakeGatewayClient = engine.createOpenAIClient({
  fetch: async (url, init) => {
    gatewayRequestOptions.push({ url, init });
    return Response.json({
      id: "chatcmpl-gateway-test",
      object: "chat.completion",
      model: "gpt-6.1-sol",
      choices: [{ index: 0, message: { role: "assistant", content: "Jawaban GPT uji." }, finish_reason: "stop" }]
    });
  }
});
assert.throws(
  () => fakeGatewayClient.chat.completions.create({ model: "unapproved-model", messages: [{ role: "user", content: "test" }] }),
  /allowlist/
);

const response = await fakeGatewayClient.chat.completions.create({
  model: "gpt-6.1-sol",
  messages: [{ role: "user", content: "Halo." }],
  max_tokens: 256,
  stream: false
});
assert.equal(response.choices[0].message.content, "Jawaban GPT uji.");
assert.equal(gatewayRequestOptions[0].url, "/api/v1/chat/completions");
assert.equal(gatewayRequestOptions[0].init.credentials, "same-origin");
assert.equal(gatewayRequestOptions[0].init.cache, "no-store");
assert.equal(JSON.parse(gatewayRequestOptions[0].init.body).model, "gpt-6.1-sol");

const streamBody = [
  'data: {"id":"chunk-1","choices":[{"delta":{"content":"Halo"},"finish_reason":null}]}\n\n',
  'data: {"id":"chunk-2","choices":[{"delta":{"content":" GPT"},"finish_reason":null}]}\n\n',
  "data: [DONE]\n\n"
].join("");
const streamClient = engine.createOpenAIClient({
  fetch: async () => new Response(streamBody, {
    headers: { "content-type": "text/event-stream" }
  })
});
const stream = await streamClient.chat.completions.create({
  model: "gpt-6.1-sol",
  messages: [{ role: "user", content: "Halo." }],
  max_tokens: 256,
  stream: true
});
const streamedChunks = [];
for await (const chunk of stream) streamedChunks.push(chunk);
assert.equal(streamedChunks.length, 2);
assert.equal(streamedChunks[0].choices[0].delta.content, "Halo");
assert.equal(streamedChunks[1].choices[0].delta.content, " GPT");

const cloudClient = engine.createOpenAIClient({
  fetch: async () => Response.json({ choices: [{ message: { content: "cloud" } }] })
});
engine.attachRuntime("openai", cloudClient, "gpt-6.1-sol");
assert.equal(engine.getSnapshot().activeProviderId, "openai");
assert.equal(engine.getSnapshot().activeModelId, "gpt-6.1-sol");
assert.equal(engine.getSnapshot().providers.find((provider) => provider.id === "openai").active, true);
assert.equal(engine.clearRuntime(), true);

assert.ok(!source.includes("localStorage"), "The provider registry must not store credentials or runtime data in browser storage.");
assert.ok(!source.includes("api.openai.com"), "The browser client must call the same-origin gateway, not OpenAI directly.");
assert.ok(source.includes('credentials: "same-origin"'), "Gateway requests must use same-origin authenticated browser credentials.");

console.log("Model Engine tests passed: provider registry, local runtime, secure gateway discovery, GPT adapter, streaming, and lifecycle.");
