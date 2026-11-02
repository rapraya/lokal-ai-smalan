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
      description: "Provider cloud untuk model GPT dan kemampuan yang tersedia melalui API resmi.",
      privacy: "Belum tersambung. Membutuhkan gateway server-side dan persetujuan pengiriman data."
    },
    {
      id: "anthropic",
      name: "Anthropic",
      family: "Claude",
      category: "cloud",
      availability: "gateway-required",
      description: "Provider cloud untuk keluarga model Claude melalui API resmi.",
      privacy: "Belum tersambung. Membutuhkan gateway server-side dan persetujuan pengiriman data."
    },
    {
      id: "google",
      name: "Google",
      family: "Gemini",
      category: "cloud",
      availability: "gateway-required",
      description: "Provider cloud untuk keluarga model Gemini melalui API resmi.",
      privacy: "Belum tersambung. Membutuhkan gateway server-side dan persetujuan pengiriman data."
    }
  ];

  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  let activeRuntime = null;

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
    if (provider.category !== "local" || provider.availability !== "available") {
      throw new Error("Provider ini belum tersedia pada runtime browser.");
    }
    if (!validateClient(client)) {
      throw new Error("Runtime tidak memenuhi kontrak chat.completions.");
    }
    if (typeof modelId !== "string" || !modelId.trim()) {
      throw new Error("Identitas model tidak valid.");
    }

    activeRuntime = {
      providerId,
      modelId: modelId.trim(),
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

  function getSnapshot() {
    return {
      activeProviderId: activeRuntime ? activeRuntime.providerId : null,
      activeModelId: activeRuntime ? activeRuntime.modelId : null,
      hasActiveRuntime: Boolean(activeRuntime),
      activatedAt: activeRuntime ? activeRuntime.activatedAt : null,
      gateway: {
        configured: false,
        status: "not-configured",
        message: "Gateway AI cloud belum disiapkan. Tidak ada provider cloud yang menerima permintaan."
      },
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        family: provider.family,
        category: provider.category,
        availability: provider.availability,
        description: provider.description,
        privacy: provider.privacy,
        capabilities: provider.capabilities ? provider.capabilities.slice() : [],
        models: provider.models ? provider.models.map((model) => ({ ...model })) : [],
        runtimeStatus: provider.id === "local-webllm"
          ? (activeRuntime ? "ready" : "idle")
          : "gateway-required",
        active: Boolean(activeRuntime && activeRuntime.providerId === provider.id)
      }))
    };
  }

  global.LokalAIModelEngine = Object.freeze({
    version: "0.1.0",
    getSnapshot,
    getClient,
    attachRuntime,
    clearRuntime
  });
})(window);
