const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 32;
const MAX_MESSAGE_CHARS = 16_000;
const MAX_TOTAL_CHARS = 48_000;
const MAX_OUTPUT_TOKENS = 2_048;
const DEFAULT_MODELS = ["gpt-6.1-sol", "gpt-6-luna"];
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let jwksCache = { url: "", expiresAt: 0, keys: [] };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders
    }
  });
}

function csv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJwtPart(value) {
  return JSON.parse(decoder.decode(base64UrlToBytes(value)));
}

async function getAccessKeys(teamDomain, fetchImpl) {
  const url = "https://" + teamDomain + "/cdn-cgi/access/certs";
  const now = Date.now();
  if (jwksCache.url === url && jwksCache.expiresAt > now && jwksCache.keys.length) {
    return jwksCache.keys;
  }
  const response = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Access signing keys are temporarily unavailable.");
  const document = await response.json();
  if (!Array.isArray(document.keys) || document.keys.length === 0) {
    throw new Error("Access signing keys are invalid.");
  }
  jwksCache = { url, keys: document.keys, expiresAt: now + 10 * 60 * 1000 };
  return jwksCache.keys;
}

async function verifyAccessAssertion(request, env, fetchImpl) {
  const assertion = request.headers.get("cf-access-jwt-assertion");
  const teamDomain = String(env.ACCESS_TEAM_DOMAIN || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const audience = String(env.ACCESS_AUD || "").trim();
  const allowedEmails = csv(env.ALLOWED_EMAILS).map((email) => email.toLowerCase());

  if (!assertion) {
    return { ok: false, status: 401, message: "Autentikasi Cloudflare Access diperlukan." };
  }
  if (!teamDomain || !audience || allowedEmails.length === 0) {
    return { ok: false, status: 503, message: "Autentikasi gateway belum dikonfigurasi." };
  }

  try {
    const parts = assertion.split(".");
    if (parts.length !== 3) throw new Error("Malformed JWT");
    const header = decodeJwtPart(parts[0]);
    const claims = decodeJwtPart(parts[1]);
    if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported JWT algorithm");

    const keys = await getAccessKeys(teamDomain, fetchImpl);
    const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) throw new Error("Signing key not found");

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signingInput = encoder.encode(parts[0] + "." + parts[1]);
    const signature = base64UrlToBytes(parts[2]);
    const validSignature = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      signingInput
    );
    if (!validSignature) throw new Error("Invalid JWT signature");

    const nowSeconds = Math.floor(Date.now() / 1000);
    const issuer = "https://" + teamDomain;
    const audienceMatches = Array.isArray(claims.aud)
      ? claims.aud.includes(audience)
      : claims.aud === audience;
    if (claims.iss !== issuer || !audienceMatches) throw new Error("Invalid issuer or audience");
    if (!Number.isFinite(claims.exp) || claims.exp <= nowSeconds) throw new Error("Expired JWT");
    if (Number.isFinite(claims.nbf) && claims.nbf > nowSeconds + 30) throw new Error("JWT not active");
    if (typeof claims.sub !== "string" || !claims.sub.trim()) throw new Error("Missing subject");

    const email = String(claims.email || "").toLowerCase();
    if (!email || !allowedEmails.includes(email)) {
      return { ok: false, status: 403, message: "Akun ini belum diizinkan menggunakan AI Gateway." };
    }

    return { ok: true, identity: { subject: claims.sub, email } };
  } catch (_) {
    return { ok: false, status: 401, message: "Sesi akses tidak valid atau sudah kedaluwarsa." };
  }
}

function getAllowedModels(env) {
  const configured = csv(env.OPENAI_ALLOWED_MODELS);
  return configured.length ? configured : DEFAULT_MODELS;
}

function validateChatRequest(payload, allowedModels) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Format permintaan tidak valid." };
  }
  const model = String(payload.model || "").trim();
  if (!model || !allowedModels.includes(model)) {
    return { ok: false, message: "Model yang diminta tidak tersedia pada gateway ini." };
  }
  if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > MAX_MESSAGES) {
    return { ok: false, message: "Jumlah pesan tidak valid." };
  }

  const instructions = [];
  const input = [];
  let totalChars = 0;

  for (const message of payload.messages) {
    if (!message || !["system", "developer", "user", "assistant"].includes(message.role)) {
      return { ok: false, message: "Peran pesan tidak didukung." };
    }
    if (typeof message.content !== "string" || !message.content.trim()) {
      return { ok: false, message: "Isi pesan harus berupa teks." };
    }
    const content = message.content.trim();
    if (content.length > MAX_MESSAGE_CHARS) return { ok: false, message: "Salah satu pesan terlalu panjang." };
    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) return { ok: false, message: "Total konteks melebihi batas gateway." };

    if (message.role === "system" || message.role === "developer") instructions.push(content);
    else input.push({ role: message.role, content });
  }

  if (input.length === 0) return { ok: false, message: "Pesan pengguna belum tersedia." };
  const requestedTokens = Number(payload.max_tokens ?? payload.max_output_tokens ?? 768);
  if (!Number.isFinite(requestedTokens) || requestedTokens <= 0) {
    return { ok: false, message: "Batas token keluaran tidak valid." };
  }
  const maxOutputTokens = Math.min(MAX_OUTPUT_TOKENS, Math.max(64, Math.floor(requestedTokens)));

  return {
    ok: true,
    request: {
      model,
      input,
      ...(instructions.length ? { instructions: instructions.join("\n\n") } : {}),
      max_output_tokens: maxOutputTokens,
      stream: payload.stream === true,
      store: false
    }
  };
}

function normalizeOpenAiError(status) {
  if (status === 401 || status === 403) return "Autentikasi provider gagal. Periksa konfigurasi kredensial server.";
  if (status === 429) return "Batas penggunaan provider tercapai. Periksa kuota dan batas proyek OpenAI.";
  if (status === 400) return "Provider menolak format permintaan atau model yang dipilih.";
  if (status >= 500) return "Layanan provider sedang mengalami gangguan. Coba lagi nanti.";
  return "Permintaan ke provider tidak berhasil.";
}

function getResponseText(result) {
  if (typeof result.output_text === "string") return result.output_text;
  const fragments = [];
  for (const item of Array.isArray(result.output) ? result.output : []) {
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (part.type === "output_text" && typeof part.text === "string") fragments.push(part.text);
      if (part.type === "refusal" && typeof part.refusal === "string") fragments.push(part.refusal);
    }
  }
  return fragments.join("");
}

function normalizeUsage(usage) {
  if (!usage || typeof usage !== "object") return undefined;
  const promptTokens = Number(usage.input_tokens || 0);
  const completionTokens = Number(usage.output_tokens || 0);
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens
  };
}

function makeChatCompletion(result, model) {
  const usage = normalizeUsage(result.usage);
  return {
    id: result.id || ("chatcmpl-gateway-" + crypto.randomUUID()),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: result.model || model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: getResponseText(result) },
      finish_reason: result.status === "incomplete" ? "length" : "stop"
    }],
    ...(usage ? { usage } : {})
  };
}

function makeStreamChunk(id, created, model, delta, finishReason = null, usage) {
  return {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: finishReason
      ? [{ index: 0, delta: {}, finish_reason: finishReason }]
      : [{ index: 0, delta: { content: delta }, finish_reason: null }],
    ...(usage ? { usage } : {})
  };
}

function parseSseFrame(frame) {
  const lines = frame.split("\n");
  let event = "";
  const data = [];
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  const raw = data.join("\n");
  if (raw === "[DONE]") return { event: event || "done", data: null };
  try {
    return { event, data: JSON.parse(raw) };
  } catch (_) {
    return null;
  }
}

function makeStreamingResponse(upstream, model, controller, onFinish) {
  const id = "chatcmpl-gateway-" + crypto.randomUUID();
  const created = Math.floor(Date.now() / 1000);
  let started = false;
  let finished = false;

  const stream = new ReadableStream({
    async start(output) {
      const reader = upstream.getReader();
      let buffer = "";
      const emit = (chunk) => output.enqueue(encoder.encode("data: " + JSON.stringify(chunk) + "\n\n"));
      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          buffer += decoder.decode(item.value, { stream: true }).replace(/\r\n/g, "\n");
          let boundary;
          while ((boundary = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const parsed = parseSseFrame(frame);
            if (!parsed || !parsed.data) continue;
            const event = parsed.event;
            const data = parsed.data;

            if (event === "response.output_text.delta" || event === "response.refusal.delta") {
              const delta = typeof data.delta === "string" ? data.delta : "";
              if (!delta) continue;
              started = true;
              emit(makeStreamChunk(id, created, model, delta));
            } else if (event === "response.failed" || event === "error") {
              throw new Error("Provider gagal memproses permintaan.");
            } else if (event === "response.completed") {
              const response = data.response || {};
              emit(makeStreamChunk(id, created, response.model || model, "", "stop", normalizeUsage(response.usage)));
              output.enqueue(encoder.encode("data: [DONE]\n\n"));
              finished = true;
            }
          }
        }
        if (!finished) {
          if (!started) throw new Error("Provider tidak menghasilkan keluaran teks.");
          emit(makeStreamChunk(id, created, model, "", "stop"));
          output.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
        output.close();
      } catch (error) {
        output.error(error);
      } finally {
        reader.releaseLock();
        onFinish();
      }
    },
    cancel(reason) {
      controller.abort(reason || "Client cancelled the stream.");
      onFinish();
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-content-type-options": "nosniff",
      "x-accel-buffering": "no"
    }
  });
}

async function readBodyLimited(request, maximumBytes) {
  if (!request.body) return { ok: true, text: "" };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel("Request body exceeds gateway limit.");
        return { ok: false };
      }
      chunks.push(item.value);
    }
  } finally {
    try { reader.releaseLock(); } catch (_) {}
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: decoder.decode(merged) };
}

async function handleChatCompletion(request, env, identity, fetchImpl) {
  if (!env.OPENAI_API_KEY) return json({ error: { message: "Provider OpenAI belum dikonfigurasi di server." } }, 503);
  if (!env.CHAT_LIMITER || typeof env.CHAT_LIMITER.limit !== "function") {
    return json({ error: { message: "Rate limiter gateway belum dikonfigurasi." } }, 503);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: { message: "Permintaan terlalu besar." } }, 413);
  const raw = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!raw.ok) return json({ error: { message: "Permintaan terlalu besar." } }, 413);

  let payload;
  try {
    payload = JSON.parse(raw.text);
  } catch (_) {
    return json({ error: { message: "JSON permintaan tidak valid." } }, 400);
  }

  const normalized = validateChatRequest(payload, getAllowedModels(env));
  if (!normalized.ok) return json({ error: { message: normalized.message } }, 400);

  const rateResult = await env.CHAT_LIMITER.limit({ key: identity.subject });
  if (!rateResult.success) {
    return json({ error: { message: "Batas permintaan sementara tercapai. Coba kembali setelah satu menit." } }, 429, { "retry-after": "60" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("Provider timeout"), 90_000);
  let upstream;
  try {
    upstream = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.OPENAI_API_KEY,
        "content-type": "application/json",
        accept: normalized.request.stream ? "text/event-stream" : "application/json"
      },
      body: JSON.stringify(normalized.request),
      signal: controller.signal
    });
  } catch (_) {
    clearTimeout(timeout);
    return json({ error: { message: "Gateway tidak dapat menghubungi provider. Periksa koneksi atau coba lagi." } }, 502);
  }

  if (!upstream.ok) {
    clearTimeout(timeout);
    const message = normalizeOpenAiError(upstream.status);
    return json({ error: { message } }, upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : 400);
  }

  if (normalized.request.stream) {
    if (!upstream.body) {
      clearTimeout(timeout);
      return json({ error: { message: "Provider tidak mengirim aliran respons." } }, 502);
    }
    return makeStreamingResponse(upstream.body, normalized.request.model, controller, () => clearTimeout(timeout));
  }

  try {
    const result = await upstream.json();
    return json(makeChatCompletion(result, normalized.request.model), 200, {
      "x-request-id": upstream.headers.get("x-request-id") || ""
    });
  } catch (_) {
    return json({ error: { message: "Respons provider tidak dapat dibaca." } }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function handleRequest(request, env, deps = {}) {
  const fetchImpl = deps.fetch || fetch;
  const url = new URL(request.url);
  const path = url.pathname;
  const appOrigin = String(env.APP_ORIGIN || "").trim().replace(/\/+$/, "");
  const origin = request.headers.get("origin");

  if (!appOrigin) return json({ error: { message: "Origin aplikasi belum dikonfigurasi." } }, 503);
  if (origin && origin !== appOrigin) return json({ error: { message: "Origin tidak diizinkan." } }, 403);
  if (request.method === "OPTIONS") {
    if (!origin || origin !== appOrigin) return json({ error: { message: "Origin tidak diizinkan." } }, 403);
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": appOrigin,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
        "vary": "Origin"
      }
    });
  }

  if (!["GET", "POST"].includes(request.method)) {
    return json({ error: { message: "Metode tidak diizinkan." } }, 405, { allow: "GET, POST, OPTIONS" });
  }

  const auth = await verifyAccessAssertion(request, env, fetchImpl);
  if (!auth.ok) return json({ error: { message: auth.message } }, auth.status);

  if (path === "/api/health" && request.method === "GET") {
    return json({
      status: "ready",
      authenticated: true,
      provider: "openai",
      configured: Boolean(env.OPENAI_API_KEY && env.CHAT_LIMITER),
      allowedModels: getAllowedModels(env)
    });
  }

  if (path === "/api/v1/models" && request.method === "GET") {
    return json({
      object: "list",
      data: getAllowedModels(env).map((id) => ({ id, object: "model", owned_by: "openai" }))
    });
  }

  if (path === "/api/v1/chat/completions" && request.method === "POST") {
    return handleChatCompletion(request, env, auth.identity, fetchImpl);
  }

  return json({ error: { message: "Endpoint tidak ditemukan." } }, 404);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};

export {
  DEFAULT_MODELS,
  handleRequest,
  getResponseText,
  makeChatCompletion,
  normalizeUsage,
  parseSseFrame,
  validateChatRequest,
  verifyAccessAssertion
};
