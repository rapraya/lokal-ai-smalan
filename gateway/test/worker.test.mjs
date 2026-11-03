import assert from "node:assert/strict";
import { handleRequest, makeChatCompletion, parseSseFrame, validateChatRequest } from "../src/worker.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const testModel = "gpt-6.1-sol";
const appOrigin = "https://ai.smalan.sch.id";
const teamDomain = "gateway-test.cloudflareaccess.com";
const audience = "test-access-audience";
const email = "admin@smalan.sch.id";

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function makeAccessToken(privateKey, claims = {}) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "gateway-test-key" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({
    iss: "https://" + teamDomain,
    aud: [audience],
    sub: "access-subject-001",
    email,
    iat: now,
    nbf: now - 5,
    exp: now + 300,
    ...claims
  }));
  const input = header + "." + payload;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, encoder.encode(input));
  return input + "." + Buffer.from(signature).toString("base64url");
}

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
}, true, ["sign", "verify"]);
const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
publicJwk.kid = "gateway-test-key";
publicJwk.alg = "RS256";
publicJwk.use = "sig";

const accessToken = await makeAccessToken(keyPair.privateKey);
const env = {
  APP_ORIGIN: appOrigin,
  ACCESS_TEAM_DOMAIN: teamDomain,
  ACCESS_AUD: audience,
  ALLOWED_EMAILS: email,
  OPENAI_API_KEY: "test-secret-never-use-in-production",
  OPENAI_ALLOWED_MODELS: testModel,
  CHAT_LIMITER: { async limit() { return { success: true }; } }
};
let upstreamCalls = 0;
let lastUpstreamRequest = null;

async function fakeFetch(url, options = {}) {
  if (url === "https://" + teamDomain + "/cdn-cgi/access/certs") {
    return Response.json({ keys: [publicJwk] });
  }
  if (url === "https://api.openai.com/v1/responses") {
    upstreamCalls += 1;
    lastUpstreamRequest = {
      url,
      options,
      payload: JSON.parse(options.body)
    };
    return Response.json({
      id: "resp_test_001",
      object: "response",
      status: "completed",
      model: testModel,
      output_text: "Halo dari GPT.",
      usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 }
    });
  }
  throw new Error("Unexpected network request: " + url);
}

function makeRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("origin", appOrigin);
  if (options.auth !== false) headers.set("cf-access-jwt-assertion", accessToken);
  if (options.body !== undefined) headers.set("content-type", "application/json");
  return new Request("https://ai.smalan.sch.id" + path, {
    method: options.method || (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
}

const validPayload = {
  model: testModel,
  messages: [
    { role: "system", content: "Jawab dalam Bahasa Indonesia." },
    { role: "user", content: "Sapa saya." }
  ],
  max_tokens: 768,
  stream: false
};

const normalized = validateChatRequest(validPayload, [testModel]);
assert.equal(normalized.ok, true);
assert.equal(normalized.request.model, testModel);
assert.equal(normalized.request.instructions, "Jawab dalam Bahasa Indonesia.");
assert.deepEqual(normalized.request.input, [{ role: "user", content: "Sapa saya." }]);
assert.equal(normalized.request.max_output_tokens, 768);
assert.equal(normalized.request.store, false);

assert.equal(validateChatRequest({ ...validPayload, model: "unapproved-model" }, [testModel]).ok, false);
assert.equal(validateChatRequest({ ...validPayload, messages: [{ role: "tool", content: "x" }] }, [testModel]).ok, false);
assert.equal(validateChatRequest({ ...validPayload, messages: [{ role: "user", content: "x".repeat(16_001) }] }, [testModel]).ok, false);
assert.equal(validateChatRequest({ ...validPayload, messages: [{ role: "user", content: "x" }], max_tokens: 10_000 }, [testModel]).request.max_output_tokens, 2_048);

const completion = makeChatCompletion({
  id: "resp_test",
  model: testModel,
  status: "completed",
  output_text: "Jawaban uji.",
  usage: { input_tokens: 3, output_tokens: 4 }
}, testModel);
assert.equal(completion.object, "chat.completion");
assert.equal(completion.choices[0].message.content, "Jawaban uji.");
assert.deepEqual(completion.usage, { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 });

const parsedFrame = parseSseFrame('event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"halo"}');
assert.equal(parsedFrame.event, "response.output_text.delta");
assert.equal(parsedFrame.data.delta, "halo");

const noAuth = await handleRequest(makeRequest("/api/health", { auth: false }), env, { fetch: fakeFetch });
assert.equal(noAuth.status, 401, "Requests without a Cloudflare Access assertion must be rejected.");

const wrongOrigin = new Request("https://ai.smalan.sch.id/api/health", {
  headers: { origin: "https://attacker.example" }
});
assert.equal((await handleRequest(wrongOrigin, env, { fetch: fakeFetch })).status, 403);

const health = await handleRequest(makeRequest("/api/health"), env, { fetch: fakeFetch });
assert.equal(health.status, 200);
const healthJson = await health.json();
assert.equal(healthJson.authenticated, true);
assert.equal(healthJson.configured, true);
assert.deepEqual(healthJson.allowedModels, [testModel]);

const modelList = await handleRequest(makeRequest("/api/v1/models"), env, { fetch: fakeFetch });
assert.equal(modelList.status, 200);
assert.deepEqual((await modelList.json()).data.map((model) => model.id), [testModel]);

const nonStreaming = await handleRequest(makeRequest("/api/v1/chat/completions", { body: validPayload }), env, { fetch: fakeFetch });
assert.equal(nonStreaming.status, 200);
assert.equal(nonStreaming.headers.get("cache-control"), "no-store, max-age=0");
const nonStreamingJson = await nonStreaming.json();
assert.equal(nonStreamingJson.choices[0].message.content, "Halo dari GPT.");
assert.equal(nonStreamingJson.usage.total_tokens, 20);
assert.equal(lastUpstreamRequest.options.headers.authorization, "Bearer " + env.OPENAI_API_KEY);
assert.equal(lastUpstreamRequest.payload.store, false);
assert.equal(lastUpstreamRequest.payload.stream, false);
assert.equal(lastUpstreamRequest.payload.max_output_tokens, 768);

const beforeRejectedModel = upstreamCalls;
const rejectedModel = await handleRequest(makeRequest("/api/v1/chat/completions", {
  body: { ...validPayload, model: "not-allowlisted" }
}), env, { fetch: fakeFetch });
assert.equal(rejectedModel.status, 400);
assert.equal(upstreamCalls, beforeRejectedModel, "Unapproved model names must never reach OpenAI.");

const limitedEnv = {
  ...env,
  CHAT_LIMITER: { async limit() { return { success: false }; } }
};
const beforeRateLimit = upstreamCalls;
const rateLimited = await handleRequest(makeRequest("/api/v1/chat/completions", { body: validPayload }), limitedEnv, { fetch: fakeFetch });
assert.equal(rateLimited.status, 429);
assert.equal(upstreamCalls, beforeRateLimit, "Rate-limited requests must not reach OpenAI.");

const noKeyEnv = { ...env, OPENAI_API_KEY: "" };
const missingKey = await handleRequest(makeRequest("/api/v1/chat/completions", { body: validPayload }), noKeyEnv, { fetch: fakeFetch });
assert.equal(missingKey.status, 503);

const noLimiterEnv = { ...env, CHAT_LIMITER: null };
const missingLimiter = await handleRequest(makeRequest("/api/v1/chat/completions", { body: validPayload }), noLimiterEnv, { fetch: fakeFetch });
assert.equal(missingLimiter.status, 503);

const notAllowedToken = await makeAccessToken(keyPair.privateKey, { email: "not-allowed@example.com" });
const denied = await handleRequest(new Request("https://ai.smalan.sch.id/api/health", {
  headers: { origin: appOrigin, "cf-access-jwt-assertion": notAllowedToken }
}), env, { fetch: fakeFetch });
assert.equal(denied.status, 403);

const badAudienceToken = await makeAccessToken(keyPair.privateKey, { aud: ["different-audience"] });
const badAudience = await handleRequest(new Request("https://ai.smalan.sch.id/api/health", {
  headers: { origin: appOrigin, "cf-access-jwt-assertion": badAudienceToken }
}), env, { fetch: fakeFetch });
assert.equal(badAudience.status, 401);

const expiredToken = await makeAccessToken(keyPair.privateKey, { exp: Math.floor(Date.now() / 1000) - 10 });
const expired = await handleRequest(new Request("https://ai.smalan.sch.id/api/health", {
  headers: { origin: appOrigin, "cf-access-jwt-assertion": expiredToken }
}), env, { fetch: fakeFetch });
assert.equal(expired.status, 401);

const streamingFetch = async (url, options = {}) => {
  if (url === "https://" + teamDomain + "/cdn-cgi/access/certs") return Response.json({ keys: [publicJwk] });
  if (url !== "https://api.openai.com/v1/responses") throw new Error("Unexpected stream request URL.");
  upstreamCalls += 1;
  const encoderLocal = new TextEncoder();
  const frames = [
    'event: response.output_text.delta\r\ndata: {"type":"response.output_text.delta","delta":"Halo"}\r\n\r\n',
    'event: response.output_text.delta\r\ndata: {"type":"response.output_text.delta","delta":" streaming"}\r\n\r\n',
    'event: response.completed\r\ndata: {"type":"response.completed","response":{"id":"resp_stream","model":"' + testModel + '","status":"completed","usage":{"input_tokens":5,"output_tokens":2}}}\r\n\r\n'
  ].join("");
  const streamBytes = encoderLocal.encode(frames);
  const splitAt = frames.indexOf("\r\n\r\n") + 1;
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(streamBytes.slice(0, splitAt));
      controller.enqueue(streamBytes.slice(splitAt));
      controller.close();
    }
  }), { headers: { "content-type": "text/event-stream" } });
};
const streamPayload = { ...validPayload, stream: true };
const streamed = await handleRequest(makeRequest("/api/v1/chat/completions", { body: streamPayload }), env, { fetch: streamingFetch });
assert.equal(streamed.status, 200);
assert.equal(streamed.headers.get("content-type").includes("text/event-stream"), true);
const streamText = await streamed.text();
assert.ok(streamText.includes('"content":"Halo"'));
assert.ok(streamText.includes('"content":" streaming"'));
assert.ok(streamText.includes("data: [DONE]"));

const optionsResponse = await handleRequest(new Request("https://ai.smalan.sch.id/api/health", {
  method: "OPTIONS",
  headers: { origin: appOrigin }
}), env, { fetch: fakeFetch });
assert.equal(optionsResponse.status, 204);

console.log("Gateway tests passed: Access JWT, allowlist, origin, request bounds, OpenAI Responses mapping, streaming, rate limit, and fail-closed configuration.");
