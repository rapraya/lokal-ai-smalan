(function (global) {
  "use strict";

  const providers = [
    {
      id: "local-webllm",
      name: "Model lokal",
      family: "WebLLM · WebGPU",
      category: "local",
      availability: "available",
      description: "Model dijalankan di browser pada perangkat pengguna. Unduhan runtime dan model tetap memerlukan internet.",
      privacy: "Inferensi lokal setelah model selesai dimuat.",
      capabilities: ["chat", "coding", "text", "knowledge", "assistant", "data-interpretation"],
      models: [
        { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 · 1B · 4-bit", memoryEstimateMB: 879.04 },
        { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 · 3B · 4-bit", memoryEstimateMB: 2263.69 }
      ]
    },
    {
      id: "openai",
      name: "OpenAI",
      family: "GPT",
      category: "cloud",
      availability: "gateway-required",
      description: "Provider cloud untuk model GPT melalui secure AI Gateway.",
      privacy: "Memerlukan autentikasi gateway dan persetujuan pengiriman data."
    },
    {
      id: "anthropic",
      name: "Anthropic",
      family: "Claude",
      category: "cloud",
      availability: "gateway-required",
      description: "Provider cloud untuk keluarga model Claude melalui API resmi.",
      privacy: "Belum tersambung. Membutuhkan adapter dan gateway server-side."
    },
    {
      id: "google",
      name: "Google",
      family: "Gemini",
      category: "cloud",
      availability: "gateway-required",
      description: "Provider cloud untuk keluarga model Gemini melalui API resmi.",
      privacy: "Belum tersambung. Membutuhkan adapter dan gateway server-side."
    }
  ];

  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  let activeRuntime = null;
  let gatewayState = {
    configured: false,
    authenticated: false,
    status: "not-configured",
    message: "Gateway AI cloud belum disiapkan. Tidak ada provider cloud yang menerima permintaan.",
    allowedModels: []
  };

  function validateClient(client) {
    return Boolean(
      client &&
      client.chat &&
      client.chat.completions &&
      typeof client.chat.completions.create === "function"
    );
  }

  function attachRuntime(providerId, client, modelId) {
    const provider = providerMap.get(providerId);
    if (!provider) throw new Error("Provider tidak dikenal.");
    const localProvider = provider.id === "local-webllm" && provider.availability === "available";
    const openAiProvider = provider.id === "openai" &&
      gatewayState.configured && gatewayState.authenticated && gatewayState.status === "ready";
    if (!localProvider && !openAiProvider) {
      throw new Error("Provider ini belum tersedia atau gateway belum terautentikasi.");
    }
    if (!validateClient(client)) throw new Error("Runtime tidak memenuhi kontrak chat.completions.");
    if (typeof modelId !== "string" || !modelId.trim()) throw new Error("Identitas model tidak valid.");
    const normalizedModelId = modelId.trim();
    if (activeRuntime && activeRuntime.client !== client) {
      throw new Error("Runtime lain masih aktif. Lepaskan sesi aktif sebelum mengganti provider.");
    }
    if (localProvider && !provider.models.some((model) => model.id === normalizedModelId)) {
      throw new Error("Model lokal tidak terdaftar dalam katalog Model Engine.");
    }

    activeRuntime = {
      providerId,
      modelId: normalizedModelId,
      client,
      activatedAt: Date.now()
    };
    return getSnapshot();
  }

  function clearRuntime(client) {
    if (client && activeRuntime && activeRuntime.client !== client) return false;
    activeRuntime = null;
    return true;
  }

  function getClient() {
    return activeRuntime ? activeRuntime.client : null;
  }

  async function checkGateway(options = {}) {
    const basePath = String(options.basePath || "/api").replace(/\/+$/, "");
    const fetchImpl = options.fetch || global.fetch.bind(global);
    gatewayState = {
      configured: false,
      authenticated: false,
      status: "checking",
      message: "Memeriksa koneksi secure gateway…",
      allowedModels: []
    };
    try {
      const response = await fetchImpl(basePath + "/health", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "manual",
        headers: { accept: "application/json" }
      });
      if (response.type === "opaqueredirect" || response.status === 0) {
        gatewayState = { ...gatewayState, status: "session-required", message: "Login Cloudflare Access diperlukan. Buka halaman login gateway, lalu periksa kembali." };
        return { ...gatewayState, allowedModels: [] };
      }
      let result = {};
      try { result = await response.json(); } catch (_) {}
      if (response.status === 401) {
        gatewayState = { ...gatewayState, status: "session-required", message: "Sesi Cloudflare Access diperlukan. Masuk ke workspace terlebih dahulu." };
      } else if (response.status === 403) {
        gatewayState = { ...gatewayState, status: "access-denied", message: "Akun ini belum diizinkan menggunakan gateway." };
      } else if (response.status === 404) {
        gatewayState = { ...gatewayState, status: "not-deployed", message: "Endpoint gateway belum dipasang pada domain aplikasi." };
      } else if (!response.ok || result.configured !== true || result.authenticated !== true) {
        gatewayState = { ...gatewayState, status: "not-configured", message: result.error?.message || "Gateway belum dikonfigurasi di server." };
      } else {
        gatewayState = {
          configured: true,
          authenticated: true,
          status: "ready",
          message: "Secure gateway siap. Permintaan cloud tetap memerlukan pilihan pengguna.",
          allowedModels: Array.isArray(result.allowedModels)
            ? result.allowedModels.filter((model) => typeof model === "string")
            : []
        };
      }
    } catch (_) {
      gatewayState = { ...gatewayState, status: "unreachable", message: "Gateway belum dapat dijangkau dari sesi browser ini." };
    }
    return { ...gatewayState, allowedModels: gatewayState.allowedModels.slice() };
  }

  async function* readGatewayStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        buffer += decoder.decode(item.value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = frame.split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .join("\n");
          if (!data || data === "[DONE]") continue;
          let chunk;
          try { chunk = JSON.parse(data); } catch (_) { continue; }
          if (chunk.error) throw new Error(chunk.error.message || "Gateway AI mengalami kesalahan.");
          yield chunk;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  function createOpenAIClient(options = {}) {
    if (!gatewayState.configured || !gatewayState.authenticated || gatewayState.status !== "ready") {
      throw new Error("Secure gateway belum siap. Periksa status gateway dan sesi akses terlebih dahulu.");
    }
    const basePath = String(options.basePath || "/api").replace(/\/+$/, "");
    const fetchImpl = options.fetch || global.fetch.bind(global);
    return {
      chat: {
        completions: {
          async create(params) {
            const model = String(params.model || "");
            if (!gatewayState.allowedModels.includes(model)) {
              throw new Error("Model GPT tidak termasuk allowlist gateway.");
            }
            const response = await fetchImpl(basePath + "/v1/chat/completions", {
              method: "POST",
              credentials: "same-origin",
              cache: "no-store",
              redirect: "error",
              headers: {
                "content-type": "application/json",
                accept: params.stream ? "text/event-stream" : "application/json"
              },
              body: JSON.stringify({
                model,
                messages: params.messages,
                max_tokens: params.max_tokens,
                stream: params.stream === true
              })
            });
            if (!response.ok) {
              let message = "Gateway AI tidak dapat memproses permintaan.";
              try {
                const error = await response.json();
                message = error.error?.message || message;
              } catch (_) {}
              throw new Error(message);
            }
            if (params.stream) {
              if (!response.body) throw new Error("Gateway tidak mengirim aliran jawaban.");
              return readGatewayStream(response);
            }
            return response.json();
          }
        }
      },
      async unload() {}
    };
  }

  function getSnapshot() {
    return {
      activeProviderId: activeRuntime ? activeRuntime.providerId : null,
      activeModelId: activeRuntime ? activeRuntime.modelId : null,
      hasActiveRuntime: Boolean(activeRuntime),
      activatedAt: activeRuntime ? activeRuntime.activatedAt : null,
      gateway: {
        ...gatewayState,
        allowedModels: gatewayState.allowedModels.slice()
      },
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        family: provider.family,
        category: provider.category,
        availability: provider.id === "openai" && gatewayState.status === "ready"
          ? "available"
          : provider.availability,
        description: provider.description,
        privacy: provider.privacy,
        capabilities: provider.capabilities ? provider.capabilities.slice() : [],
        models: provider.models ? provider.models.map((model) => ({ ...model })) : [],
        runtimeStatus: provider.id === "local-webllm"
          ? (activeRuntime && activeRuntime.providerId === provider.id ? "ready" : "idle")
          : provider.id === "openai"
            ? (gatewayState.status === "ready" ? "gateway-ready" : "gateway-required")
            : "gateway-required",
        active: Boolean(activeRuntime && activeRuntime.providerId === provider.id)
      }))
    };
  }

  global.LokalAIModelEngine = Object.freeze({
    version: "0.2.1",
    getSnapshot,
    getClient,
    attachRuntime,
    clearRuntime,
    checkGateway,
    createOpenAIClient
  });
})(window);
