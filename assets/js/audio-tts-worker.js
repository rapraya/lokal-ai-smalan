import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";

const MODEL_ID = "payam1394/traxlate-mms-tts-ind";
const MAX_TEXT_LENGTH = 500;
const MAX_AUDIO_SECONDS = 90;
let synthesizer = null;
let loadingPromise = null;
let activeLoadRequestId = 0;

function postError(requestId, error) {
  const message = error && error.message ? error.message : "Sintesis suara lokal gagal.";
  self.postMessage({ type: "error", requestId, message });
}

function reportProgress(info) {
  if (!info || typeof info !== "object") return;
  if (info.status === "progress_total") {
    self.postMessage({
      type: "model-progress",
      requestId: activeLoadRequestId,
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
      requestId: activeLoadRequestId,
      stage: info.status,
      file: typeof info.file === "string" ? info.file : ""
    });
  }
}

async function loadModel(requestId) {
  activeLoadRequestId = requestId;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline("text-to-speech", MODEL_ID, {
        device: "wasm",
        dtype: "q8",
        progress_callback: reportProgress
      });
    })();
  }

  try {
    synthesizer = await loadingPromise;
    self.postMessage({
      type: "model-ready",
      requestId,
      model: MODEL_ID,
      runtime: "WebAssembly CPU · q8"
    });
  } catch (error) {
    loadingPromise = null;
    synthesizer = null;
    postError(requestId, error);
  }
}

async function synthesize(requestId, payload) {
  if (!synthesizer) {
    postError(requestId, new Error("Model belum siap. Muat model TTS terlebih dahulu."));
    return;
  }
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text || text.length > MAX_TEXT_LENGTH) {
    postError(requestId, new Error("Teks wajib berisi 1–500 karakter."));
    return;
  }

  try {
    self.postMessage({ type: "synthesis-stage", requestId });
    const result = await synthesizer(text);
    const audio = result && result.audio;
    const samplingRate = result && result.sampling_rate;
    if (!(audio instanceof Float32Array) || audio.length < 1 ||
      !Number.isFinite(samplingRate) || samplingRate < 8000 || samplingRate > 48000) {
      throw new Error("Output model tidak memiliki waveform atau sample rate yang valid.");
    }
    if (audio.length > samplingRate * MAX_AUDIO_SECONDS) {
      throw new Error("Audio hasil melebihi batas 90 detik untuk satu proses.");
    }
    self.postMessage({
      type: "synthesis-result",
      requestId,
      audio,
      samplingRate
    }, [audio.buffer]);
  } catch (error) {
    postError(requestId, error);
  }
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  const requestId = typeof message.requestId === "number" ? message.requestId : 0;
  if (message.type === "load-model") {
    loadModel(requestId);
  } else if (message.type === "synthesize") {
    synthesize(requestId, message.payload || {});
  } else if (message.type === "dispose") {
    if (synthesizer && typeof synthesizer.dispose === "function") {
      Promise.resolve(synthesizer.dispose()).catch(() => {});
    }
    synthesizer = null;
    loadingPromise = null;
    self.postMessage({ type: "disposed", requestId });
  }
});
