const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";

let extractor = null;
let loadingPromise = null;
let busy = false;

async function loadExtractor(requestId) {
  if (extractor) return extractor;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const { pipeline } = await import(TRANSFORMERS_URL);
      return pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
        progress_callback: (event) => {
          self.postMessage({
            requestId,
            type: "progress",
            stage: "download",
            status: event.status || "",
            file: event.file || "",
            progress: Number.isFinite(event.progress) ? event.progress : null
          });
        }
      });
    })().catch((error) => {
      loadingPromise = null;
      throw error;
    });
  }
  extractor = await loadingPromise;
  return extractor;
}

async function embedTexts(requestId, texts) {
  if (!Array.isArray(texts) || texts.length > 600 || texts.some((text) => typeof text !== "string")) {
    throw new Error("Daftar teks embedding tidak valid atau melebihi 600 segmen.");
  }
  const model = await loadExtractor(requestId);
  const vectors = [];
  const batchSize = 8;

  for (let offset = 0; offset < texts.length; offset += batchSize) {
    const batch = texts.slice(offset, offset + batchSize);
    const output = await model(batch, { pooling: "mean", normalize: true });
    const values = output.tolist();
    if (!Array.isArray(values) || values.length !== batch.length || values.some((vector) => !Array.isArray(vector) || vector.length !== 384 || vector.some((value) => !Number.isFinite(Number(value))))) {
      throw new Error("Model embedding menghasilkan vektor 384 dimensi yang tidak valid.");
    }
    vectors.push(...values.map((vector) => vector.map(Number)));
    self.postMessage({
      requestId,
      type: "progress",
      stage: "embedding",
      completed: Math.min(offset + batch.length, texts.length),
      total: texts.length
    });
  }
  return vectors;
}

self.addEventListener("message", async (event) => {
  const message = event.data || {};
  const requestId = message.requestId;
  if (!Number.isInteger(requestId) || busy) {
    if (Number.isInteger(requestId)) {
      self.postMessage({ requestId, type: "error", message: "Worker embedding sedang memproses permintaan lain." });
    }
    return;
  }

  busy = true;
  try {
    if (message.type === "init") {
      await loadExtractor(requestId);
      self.postMessage({ requestId, type: "ready" });
    } else if (message.type === "embed") {
      const vectors = await embedTexts(requestId, message.texts);
      self.postMessage({ requestId, type: "embedded", vectors });
    } else {
      throw new Error("Jenis permintaan embedding tidak dikenal.");
    }
  } catch (error) {
    self.postMessage({ requestId, type: "error", message: error?.message || "Proses embedding gagal." });
  } finally {
    busy = false;
  }
});
