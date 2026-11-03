import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";

const MODEL_ID = "onnx-community/whisper-tiny";
let transcriber = null;
let loadingPromise = null;

function postError(requestId, error) {
  const message = error && error.message ? error.message : "Proses transkripsi lokal gagal.";
  self.postMessage({ type: "error", requestId, message });
}

function reportProgress(info) {
  if (!info || typeof info !== "object") return;
  if (info.status === "progress_total") {
    self.postMessage({
      type: "model-progress",
      progress: Number.isFinite(info.progress) ? info.progress : null,
      loaded: Number.isFinite(info.loaded) ? info.loaded : null,
      total: Number.isFinite(info.total) ? info.total : null,
      stage: "download"
    });
    return;
  }
  if (info.status === "initiate" || info.status === "download") {
    self.postMessage({
      type: "model-stage",
      stage: info.status,
      file: typeof info.file === "string" ? info.file : ""
    });
  }
}

async function loadModel(requestId) {
  if (!loadingPromise) {
    loadingPromise = (async () => {
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline("automatic-speech-recognition", MODEL_ID, {
        device: "wasm",
        dtype: "q8",
        progress_callback: reportProgress
      });
    })();
  }

  try {
    transcriber = await loadingPromise;
    self.postMessage({
      type: "model-ready",
      requestId,
      model: MODEL_ID,
      runtime: "WebAssembly CPU · q8"
    });
  } catch (error) {
    loadingPromise = null;
    transcriber = null;
    postError(requestId, error);
  }
}

async function transcribe(requestId, payload) {
  if (!transcriber) {
    postError(requestId, new Error("Model belum siap. Muat model Whisper Tiny terlebih dahulu."));
    return;
  }
  if (!(payload.audio instanceof Float32Array) || payload.audio.length < 16000) {
    postError(requestId, new Error("Rentang audio terlalu pendek atau format sampel tidak valid."));
    return;
  }

  try {
    self.postMessage({
      type: "transcription-stage",
      requestId,
      stage: "inference"
    });
    const options = {
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true
    };
    if (payload.language === "id") options.language = "indonesian";
    if (payload.language === "en") options.language = "english";

    const result = await transcriber(payload.audio, options);
    const chunks = Array.isArray(result && result.chunks)
      ? result.chunks.map((chunk) => ({
          text: typeof chunk.text === "string" ? chunk.text : "",
          timestamp: Array.isArray(chunk.timestamp) ? chunk.timestamp : null
        }))
      : [];
    const text = result && typeof result.text === "string" ? result.text.trim() : "";
    self.postMessage({
      type: "transcription-result",
      requestId,
      text,
      chunks
    });
  } catch (error) {
    postError(requestId, error);
  }
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  const requestId = typeof message.requestId === "number" ? message.requestId : 0;
  if (message.type === "load-model") {
    loadModel(requestId);
  } else if (message.type === "transcribe") {
    transcribe(requestId, message.payload || {});
  } else if (message.type === "dispose") {
    if (transcriber && typeof transcriber.dispose === "function") {
      Promise.resolve(transcriber.dispose()).catch(() => {});
    }
    transcriber = null;
    loadingPromise = null;
    self.postMessage({ type: "disposed", requestId });
  }
});
