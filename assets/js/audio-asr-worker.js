import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";

const MODEL_ID = "onnx-community/whisper-tiny";
let transcriber = null;
let loadingPromise = null;
let loadEpoch = 0;

function postError(requestId, error) {
  const message = error && error.message ? error.message : "Proses transkripsi lokal gagal.";
  self.postMessage({ type: "error", requestId, message });
}

function reportProgress(requestId, epoch, info) {
  if (epoch !== loadEpoch || !info || typeof info !== "object") return;
  if (info.status === "progress_total") {
    self.postMessage({
      type: "model-progress",
      requestId,
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
      requestId,
      stage: info.status,
      file: typeof info.file === "string" ? info.file : ""
    });
  }
}

async function loadModel(requestId) {
  const epoch = loadEpoch;
  if (!loadingPromise) {
    const promise = (async () => {
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline("automatic-speech-recognition", MODEL_ID, {
        device: "wasm",
        dtype: "q8",
        progress_callback: (info) => reportProgress(requestId, epoch, info)
      });
    })();
    loadingPromise = promise;
  }

  const promise = loadingPromise;
  try {
    const loadedTranscriber = await promise;
    if (epoch !== loadEpoch || loadingPromise !== promise) {
      if (loadedTranscriber && typeof loadedTranscriber.dispose === "function") {
        await loadedTranscriber.dispose();
      }
      return;
    }
    transcriber = loadedTranscriber;
    self.postMessage({
      type: "model-ready",
      requestId,
      model: MODEL_ID,
      runtime: "WebAssembly CPU · q8"
    });
  } catch (error) {
    if (epoch === loadEpoch && loadingPromise === promise) {
      loadingPromise = null;
      transcriber = null;
      postError(requestId, error);
    }
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
    loadEpoch += 1;
    const currentTranscriber = transcriber;
    transcriber = null;
    loadingPromise = null;
    if (currentTranscriber && typeof currentTranscriber.dispose === "function") {
      Promise.resolve(currentTranscriber.dispose()).catch(() => {});
    }
    self.postMessage({ type: "disposed", requestId });
  }
});
