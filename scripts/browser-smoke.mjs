import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const baseURL = "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const runtimeErrors = [];

try {
  const desktop = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  desktop.on("pageerror", (error) => runtimeErrors.push(error.message));

  const response = await desktop.goto(baseURL, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200, "The preview page must load successfully.");
  await desktop.waitForSelector(".app-shell");
  await desktop.waitForSelector("#menuToggle");

  assert.equal(await desktop.locator("body").getAttribute("data-theme"), "dark");
  assert.equal(await desktop.locator("#menuToggle").getAttribute("aria-expanded"), "true");

  await desktop.locator("#themeToggle").click();
  assert.equal(await desktop.locator("#themeMenu").isVisible(), true);
  await desktop.locator('[data-theme-choice="colorful"]').click();
  assert.equal(await desktop.locator("body").getAttribute("data-theme"), "colorful");
  assert.equal(await desktop.locator('[data-theme-choice="colorful"]').getAttribute("aria-checked"), "true");

  await desktop.locator("#menuToggle").click();
  await desktop.waitForFunction(() => {
    const shell = document.querySelector(".app-shell");
    const toggle = document.querySelector("#menuToggle");
    return shell?.classList.contains("sidebar-collapsed")
      && toggle?.getAttribute("aria-expanded") === "false";
  });
  assert.equal(await desktop.locator("#menuToggle").getAttribute("aria-label"), "Tampilkan sidebar");

  await desktop.locator("#menuToggle").click();
  await desktop.waitForFunction(() => {
    const shell = document.querySelector(".app-shell");
    const toggle = document.querySelector("#menuToggle");
    return !shell?.classList.contains("sidebar-collapsed")
      && toggle?.getAttribute("aria-expanded") === "true";
  });

  await desktop.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await desktop.locator("body").getAttribute("data-theme"), "colorful", "Theme preference must persist across reloads.");

  await desktop.locator('.nav-link[data-page="chat"]').click();
  await desktop.waitForSelector(".chat-page");
  assert.match(await desktop.locator(".chat-page").innerText(), /AI Chat/);
  await desktop.waitForFunction(() => {
    const option = document.querySelector('#chatProviderSelect option[value="openai"]');
    return option && option.disabled;
  });
  assert.equal(await desktop.locator('#chatProviderSelect option[value="openai"]').isDisabled(), true,
    "Cloud GPT must remain unavailable when the production gateway is not deployed.");

  await desktop.locator('.nav-link[data-page="image"]').click();
  await desktop.waitForSelector('.image-studio-page');
  assert.match(await desktop.locator('.image-studio-page').innerText(), /LOCAL IMAGE EDITOR/);
  const pngFixture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAF0lEQVR4nGP4z8DwHwwZ/v8HIyABZgEAqm8O8tH19KMAAAAASUVORK5CYII=', 'base64');
  await desktop.locator('#imageFileInput').setInputFiles({ name: 'smalan-test.png', mimeType: 'image/png', buffer: pngFixture });
  await desktop.waitForFunction(() => {
    const image = document.querySelector('#imagePreview');
    return image && image.complete && image.naturalWidth === 3 && image.naturalHeight === 2;
  });
  assert.equal(await desktop.locator('#imageSourceDimensions').innerText(), '3 × 2 px');
  assert.equal(await desktop.locator('#imageExportButton').isEnabled(), true);

  await desktop.locator('[data-image-action="rotate-right"]').click();
  assert.equal(await desktop.locator('#imageWidth').inputValue(), '2');
  assert.equal(await desktop.locator('#imageHeight').inputValue(), '3');
  await desktop.locator('[data-image-action="flip-x"]').click();
  assert.equal(await desktop.locator('[data-image-action="flip-x"]').getAttribute('aria-pressed'), 'true');
  await desktop.locator('[data-image-action="reset"]').click();
  assert.equal(await desktop.locator('#imageWidth').inputValue(), '3');
  assert.equal(await desktop.locator('#imageHeight').inputValue(), '2');

  await desktop.locator('#imageWidth').fill('6');
  assert.equal(await desktop.locator('#imageHeight').inputValue(), '4', 'Aspect-ratio lock must update the paired dimension.');
  const pngDownloadEvent = desktop.waitForEvent('download');
  await desktop.locator('#imageExportButton').click();
  const pngDownload = await pngDownloadEvent;
  assert.equal(pngDownload.suggestedFilename(), 'smalan-test-edited.png');
  const pngOutput = await readFile(await pngDownload.path());
  assert.equal(pngOutput.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(pngOutput.readUInt32BE(16), 6, 'Exported PNG width must match the selected output width.');
  assert.equal(pngOutput.readUInt32BE(20), 4, 'Exported PNG height must match the locked aspect ratio.');

  await desktop.locator('#imageFormat').selectOption('image/jpeg');
  await desktop.locator('#imageQuality').fill('0.7');
  assert.equal(await desktop.locator('#imageQualityValue').innerText(), '70%');
  const imageDownloadEvent = desktop.waitForEvent('download');
  await desktop.locator('#imageExportButton').click();
  const downloadedImage = await imageDownloadEvent;
  assert.equal(downloadedImage.suggestedFilename(), 'smalan-test-edited.jpg');
  const jpegOutput = await readFile(await downloadedImage.path());
  assert.deepEqual(Array.from(jpegOutput.subarray(0, 3)), [0xff, 0xd8, 0xff], 'JPEG export must contain a valid JPEG signature.');
  await desktop.locator('#imageClearButton').click();
  assert.equal(await desktop.locator('#imagePreviewContainer').isVisible(), false);
  assert.equal(await desktop.locator('#imageExportButton').isDisabled(), true);

  await desktop.context().route("https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      headers: { "access-control-allow-origin": "*" },
      body: `
        export const env = { backends: { onnx: { wasm: { numThreads: 0 } } } };
        let asrCalls = 0;
        let ttsCalls = 0;
        export async function pipeline(task, model, options) {
          if (typeof options.progress_callback === "function") {
            options.progress_callback({ status: "progress_total", progress: 100, loaded: 100, total: 100 });
          }
          if (task === "automatic-speech-recognition" && model === "onnx-community/whisper-tiny") {
            if (options.device !== "wasm" || options.dtype !== "q8") {
              throw new Error("ASR must use q8 WebAssembly inference.");
            }
            const transcriber = async (audio, settings) => {
              if (!(audio instanceof Float32Array) || audio.length < 1) throw new Error("Expected resampled Float32Array audio.");
              if (settings.task !== "transcribe" || settings.chunk_length_s !== 30 || settings.stride_length_s !== 5) {
                throw new Error("Unexpected ASR generation settings.");
              }
              asrCalls += 1;
              if (asrCalls === 4) await new Promise((resolve) => setTimeout(resolve, 5000));
              const language = settings.language || "auto";
              const text = "Halo, ini uji transkripsi " + language + ".";
              const timestamp = asrCalls === 3 ? [0.95, 1.2] : [0, 0.5];
              return { text, chunks: [{ text, timestamp }] };
            };
            transcriber.dispose = async () => {};
            return transcriber;
          }
          if (task === "text-to-speech" && model === "payam1394/traxlate-mms-tts-ind") {
            if (options.device !== "wasm" || options.dtype !== "q8") {
              throw new Error("TTS must use q8 WebAssembly inference.");
            }
            const synthesizer = async (text) => {
              if (typeof text !== "string" || !text.trim() || text.length > 500) {
                throw new Error("TTS expected a nonempty text of at most 500 characters.");
              }
              ttsCalls += 1;
              if (ttsCalls === 2) await new Promise((resolve) => setTimeout(resolve, 5000));
              return { audio: new Float32Array(8000).fill(0.2), sampling_rate: 16000 };
            };
            synthesizer.dispose = async () => {};
            return synthesizer;
          }
          throw new Error("Unexpected Transformers.js pipeline configuration: " + task + " · " + model);
        }
      `
    });
  });
  await desktop.locator('.nav-link[data-page="audio"]').click();
  await desktop.waitForSelector('.audio-lab-page');
  assert.match(await desktop.locator('.audio-lab-page').innerText(), /LOCAL AUDIO & SPEECH AI/);
  const sampleRate = 24000;
  const audioFrames = sampleRate * 2;
  const wavFixture = Buffer.alloc(44 + audioFrames * 2);
  wavFixture.write('RIFF', 0);
  wavFixture.writeUInt32LE(36 + audioFrames * 2, 4);
  wavFixture.write('WAVE', 8);
  wavFixture.write('fmt ', 12);
  wavFixture.writeUInt32LE(16, 16);
  wavFixture.writeUInt16LE(1, 20);
  wavFixture.writeUInt16LE(1, 22);
  wavFixture.writeUInt32LE(sampleRate, 24);
  wavFixture.writeUInt32LE(sampleRate * 2, 28);
  wavFixture.writeUInt16LE(2, 32);
  wavFixture.writeUInt16LE(16, 34);
  wavFixture.write('data', 36);
  wavFixture.writeUInt32LE(audioFrames * 2, 40);
  for (let frame = 0; frame < audioFrames; frame += 1) {
    const sample = Math.round(Math.sin(2 * Math.PI * 440 * frame / sampleRate) * 0.3 * 32767);
    wavFixture.writeInt16LE(sample, 44 + frame * 2);
  }
  await desktop.locator('#audioFileInput').setInputFiles({ name: 'sine-test.wav', mimeType: 'audio/wav', buffer: wavFixture });
  await desktop.waitForFunction(() => {
    const duration = document.querySelector('#audioWaveformDuration');
    const exportButton = document.querySelector('#audioExportButton');
    return duration && duration.textContent === '00:02' && exportButton && !exportButton.disabled;
  });
  assert.match(await desktop.locator('#audioSourceDetails').innerText(), /24[.,]000 Hz/);
  assert.equal(await desktop.locator('#audioLoadedPanel').isVisible(), true);
  const waveformHasPixels = await desktop.locator('#audioWaveform').evaluate((canvas) => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) return true;
    return false;
  });
  assert.equal(waveformHasPixels, true, 'Audio waveform canvas must be drawn after decoding.');
  await desktop.waitForFunction(() => {
    const player = document.querySelector('#audioPlayer');
    return player && player.readyState >= 1;
  });
  await desktop.locator('#audioTrimStart').fill('0.2');
  await desktop.locator('#audioTrimEnd').fill('0.8');
  assert.match(await desktop.locator('#audioSelectionDuration').innerText(), /0\.60 detik/);
  await desktop.locator('#audioPreviewSelectionButton').click();
  const playbackStart = await desktop.locator('#audioPlayer').evaluate((player) => player.currentTime);
  assert.ok(playbackStart >= 0.15 && playbackStart <= 0.5, 'Preview must begin at the selected trim start.');
  await desktop.locator('#audioPlayer').evaluate((player) => player.pause());

  const wavDownloadEvent = desktop.waitForEvent('download');
  await desktop.locator('#audioExportButton').click();
  const wavDownload = await wavDownloadEvent;
  assert.equal(wavDownload.suggestedFilename(), 'sine-test-trimmed.wav');
  const trimmedWav = await readFile(await wavDownload.path());
  assert.equal(trimmedWav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(trimmedWav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(trimmedWav.readUInt16LE(20), 1, 'WAV export must use PCM encoding.');
  assert.equal(trimmedWav.readUInt16LE(22), 1, 'WAV export must preserve the mono channel count.');
  assert.equal(trimmedWav.readUInt32LE(24), sampleRate, 'WAV export must preserve the decoded sample rate.');
  assert.equal(trimmedWav.readUInt32LE(40), 14400 * 2, 'WAV payload must contain exactly the selected 0.6-second range.');
  assert.equal(trimmedWav.length, 44 + 14400 * 2, 'WAV output must contain a complete PCM16 header and payload.');

  await desktop.locator('#audioAsrLoadButton').click();
  await desktop.waitForFunction(() => {
    const status = document.querySelector('#audioAsrModelStatus');
    const progress = document.querySelector('#audioAsrProgress');
    return status && (/Whisper Tiny siap/.test(status.textContent) ||
      status.dataset.state === "error") && progress;
  });
  const asrModelStatusText = await desktop.locator('#audioAsrModelStatus').innerText();
  assert.match(asrModelStatusText, /Whisper Tiny siap/,
    "Local ASR worker must load its mocked Transformers.js pipeline. Actual status: " + asrModelStatusText);
  assert.equal(await desktop.locator('#audioAsrProgress').evaluate((progress) => progress.value), 100);
  assert.equal(await desktop.locator('#audioAsrTranscribeButton').isDisabled(), true,
    "A range shorter than one second must remain unavailable for transcription.");
  await desktop.locator('#audioTrimStart').fill('0');
  await desktop.locator('#audioTrimEnd').fill('1');
  assert.equal(await desktop.locator('#audioAsrTranscribeButton').isEnabled(), true,
    "A ready local ASR model and a one-second audio range must enable transcription.");
  await desktop.locator('#audioAsrLanguage').selectOption('id');
  await desktop.locator('#audioAsrTranscribeButton').click();
  await desktop.waitForFunction(() => {
    const output = document.querySelector('#audioAsrOutput');
    const status = document.querySelector('#audioAsrStatus');
    const modelStatus = document.querySelector('#audioAsrModelStatus');
    return (output && output.value.includes("Halo, ini uji transkripsi indonesian.")) ||
      (status && status.dataset.state === "error") ||
      (modelStatus && modelStatus.dataset.state === "error");
  });
  const asrTranscriptStatusText = await desktop.locator('#audioAsrStatus').innerText();
  const asrModelStatusAfterInference = await desktop.locator('#audioAsrModelStatus').innerText();
  const asrTranscriptOutput = await desktop.locator('#audioAsrOutput').inputValue();
  assert.ok(asrTranscriptOutput.includes("Halo, ini uji transkripsi indonesian."),
    "Local ASR worker must return the mocked transcript. Status: " + asrTranscriptStatusText +
    " · Model: " + asrModelStatusAfterInference);
  assert.match(await desktop.locator('#audioAsrOutputMeta').innerText(), /kata · 1 bagian/);
  assert.match(await desktop.locator('#audioAsrStatus').innerText(), /Transkripsi selesai/);
  assert.equal(await desktop.locator('#audioAsrAppend').isChecked(), true,
    "Sequential transcription must append to the previous result by default.");

  await desktop.locator('#audioTrimStart').fill('1');
  await desktop.locator('#audioTrimEnd').fill('2');
  await desktop.locator('#audioAsrLanguage').selectOption('en');
  await desktop.locator('#audioAsrTranscribeButton').click();
  await desktop.waitForFunction(() => {
    const output = document.querySelector('#audioAsrOutput');
    return output && output.value.includes("Halo, ini uji transkripsi english.");
  });
  const appendedTranscript = await desktop.locator('#audioAsrOutput').inputValue();
  assert.ok(appendedTranscript.includes("Halo, ini uji transkripsi indonesian.") &&
    appendedTranscript.includes("[00:01.0–00:01.5] Halo, ini uji transkripsi english."),
    "Appending a second range must retain the first transcript and apply the selected-range timestamp offset.");
  assert.match(await desktop.locator('#audioAsrOutputMeta').innerText(), /2 bagian/);

  const txtDownloadEvent = desktop.waitForEvent('download');
  await desktop.locator('#audioAsrTextButton').click();
  const transcriptTextDownload = await txtDownloadEvent;
  assert.equal(transcriptTextDownload.suggestedFilename(), 'sine-test-transcript.txt');
  const transcriptText = await readFile(await transcriptTextDownload.path(), 'utf8');
  assert.ok(transcriptText.includes("Halo, ini uji transkripsi indonesian.") &&
    transcriptText.includes("Halo, ini uji transkripsi english."));

  const srtDownloadEvent = desktop.waitForEvent('download');
  await desktop.locator('#audioAsrSrtButton').click();
  const transcriptSrtDownload = await srtDownloadEvent;
  assert.equal(transcriptSrtDownload.suggestedFilename(), 'sine-test-transcript.srt');
  const transcriptSrt = await readFile(await transcriptSrtDownload.path(), 'utf8');
  assert.ok(transcriptSrt.includes("00:00:00,000 --> 00:00:00,500") &&
    transcriptSrt.includes("00:00:01,000 --> 00:00:01,500") &&
    transcriptSrt.includes("Halo, ini uji transkripsi english."),
    "SRT export must contain ordered, timestamped subtitle cues from both selected ranges.");

  await desktop.locator('#audioAsrAppend').uncheck();
  await desktop.locator('#audioTrimStart').fill('0');
  await desktop.locator('#audioTrimEnd').fill('1');
  await desktop.locator('#audioAsrLanguage').selectOption('auto');
  await desktop.locator('#audioAsrTranscribeButton').click();
  await desktop.waitForFunction(() => {
    const output = document.querySelector('#audioAsrOutput');
    return output && output.value.includes("Halo, ini uji transkripsi auto.");
  });
  const replacedTranscript = await desktop.locator('#audioAsrOutput').inputValue();
  assert.ok(replacedTranscript.includes("Halo, ini uji transkripsi auto.") &&
    !replacedTranscript.includes("indonesian.") && !replacedTranscript.includes("english."),
    "Disabling append must replace earlier transcript segments instead of duplicating them.");
  assert.match(await desktop.locator('#audioAsrOutputMeta').innerText(), /1 bagian/);
  const boundarySrtEvent = desktop.waitForEvent('download');
  await desktop.locator('#audioAsrSrtButton').click();
  const boundarySrtDownload = await boundarySrtEvent;
  const boundarySrt = await readFile(await boundarySrtDownload.path(), 'utf8');
  assert.ok(boundarySrt.includes("00:00:00,950 --> 00:00:01,000"),
    "Subtitle cue end times must be clamped to the exact selected source-range boundary.");

  await desktop.locator('#audioTrimStart').fill('0');
  await desktop.locator('#audioTrimEnd').fill('0.6');
  assert.equal(await desktop.locator('#audioAsrTranscribeButton').isDisabled(), true,
    "ASR must prevent selections shorter than one second.");
  assert.match(await desktop.locator('#audioAsrRangeHint').innerText(), /minimal 1 detik/);
  await desktop.locator('#audioTrimEnd').fill('1');

  await desktop.locator('#audioAsrLanguage').selectOption('en');
  await desktop.locator('#audioAsrTranscribeButton').click();
  await desktop.waitForFunction(() => {
    const cancel = document.querySelector('#audioAsrCancelButton');
    const status = document.querySelector('#audioAsrStatus');
    return cancel && !cancel.hidden && status && /CPU browser/.test(status.textContent);
  });
  await desktop.locator('#audioAsrCancelButton').click();
  assert.match(await desktop.locator('#audioAsrStatus').innerText(), /Proses dibatalkan/);
  assert.equal(await desktop.locator('#audioAsrLoadButton').isEnabled(), true,
    "Cancelling ASR must terminate its worker and allow a clean reload.");
  await desktop.locator('#audioAsrClearButton').click();
  assert.equal(await desktop.locator('#audioAsrOutput').inputValue(), "");
  assert.equal(await desktop.locator('#audioAsrSrtButton').isDisabled(), true);

  assert.equal(await desktop.locator('#audioTtsLoadButton').isDisabled(), true,
    "TTS model loading must remain disabled until the noncommercial license is acknowledged.");
  assert.equal(await desktop.locator('#audioTtsGenerateButton').isDisabled(), true);
  assert.match(await desktop.locator('.audio-tts-card').innerText(), /CC BY-NC 4\.0/);
  assert.match(await desktop.locator('.audio-tts-card').innerText(), /nonkomersial/i);
  assert.equal(await desktop.locator('#audioTtsLicense').isChecked(), false);
  await desktop.locator('#audioTtsLicense').check();
  assert.equal(await desktop.locator('#audioTtsLoadButton').isEnabled(), true);
  await desktop.locator('#audioTtsLoadButton').click();
  await desktop.waitForFunction(() => {
    const status = document.querySelector('#audioTtsModelStatus');
    const progress = document.querySelector('#audioTtsProgress');
    return status && (/MMS Indonesian TTS siap/.test(status.textContent) ||
      status.dataset.state === "error") && progress;
  });
  const ttsModelStatus = await desktop.locator('#audioTtsModelStatus').innerText();
  assert.match(ttsModelStatus, /MMS Indonesian TTS siap/,
    "Local Indonesian TTS worker must load the mocked Transformers.js pipeline. Actual status: " + ttsModelStatus);
  assert.equal(await desktop.locator('#audioTtsProgress').evaluate((progress) => progress.value), 100);
  assert.equal(await desktop.locator('#audioTtsGenerateButton').isDisabled(), true,
    "TTS requires nonempty source text.");
  await desktop.locator('#audioTtsInput').fill("Selamat pagi, peserta didik SMALAN.");
  assert.equal(await desktop.locator('#audioTtsGenerateButton').isEnabled(), true);
  await desktop.locator('#audioTtsGenerateButton').click();
  await desktop.waitForFunction(() => {
    const output = document.querySelector('#audioTtsOutput');
    const player = document.querySelector('#audioTtsPlayer');
    return output && !output.hidden && player && player.src.startsWith("blob:") &&
      document.querySelector('#audioTtsStatus')?.dataset.state === "success";
  });
  assert.match(await desktop.locator('#audioTtsOutputMeta').innerText(), /16[.,]000 Hz/);
  const ttsDownloadEvent = desktop.waitForEvent('download');
  await desktop.locator('#audioTtsDownloadButton').click();
  const ttsDownload = await ttsDownloadEvent;
  assert.equal(ttsDownload.suggestedFilename(), 'lokal-ai-speech-id.wav');
  const ttsWav = await readFile(await ttsDownload.path());
  assert.equal(ttsWav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(ttsWav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(ttsWav.readUInt16LE(20), 1, 'TTS download must use PCM WAV encoding.');
  assert.equal(ttsWav.readUInt16LE(22), 1, 'TTS WAV output must be mono.');
  assert.equal(ttsWav.readUInt32LE(24), 16000, 'TTS WAV output must preserve the generated sample rate.');
  assert.equal(ttsWav.readUInt16LE(34), 16, 'TTS WAV output must use 16-bit PCM samples.');
  assert.equal(ttsWav.readUInt32LE(40), 8000 * 2, 'TTS WAV payload must match the generated 0.5-second waveform.');
  assert.equal(ttsWav.length, 44 + 8000 * 2, 'TTS WAV output must contain a valid PCM16 header and payload.');

  await desktop.locator('#audioTtsGenerateButton').click();
  await desktop.waitForFunction(() => {
    const cancel = document.querySelector('#audioTtsCancelButton');
    const status = document.querySelector('#audioTtsStatus');
    return cancel && !cancel.hidden && status && /menyintesis suara/.test(status.textContent);
  });
  await desktop.locator('#audioTtsCancelButton').click();
  assert.match(await desktop.locator('#audioTtsStatus').innerText(), /Proses dibatalkan/);
  assert.equal(await desktop.locator('#audioTtsLoadButton').isEnabled(), true,
    "Cancelling TTS must terminate its worker and allow a clean model reload.");
  await desktop.locator('#audioTtsClearButton').click();
  assert.equal(await desktop.locator('#audioTtsOutput').isVisible(), false);
  assert.equal(await desktop.locator('#audioTtsDownloadButton').isDisabled(), true);

  await desktop.locator('#audioClearButton').click();
  assert.equal(await desktop.locator('#audioLoadedPanel').isVisible(), false);
  assert.equal(await desktop.locator('#audioExportButton').isDisabled(), true);

  await desktop.locator('.nav-link[data-page="video"]').click();
  await desktop.waitForSelector('.video-studio-page');
  assert.match(await desktop.locator('.video-studio-page').innerText(), /LOCAL VIDEO TOOLS/);
  const videoFixture = await desktop.evaluate(async () => {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext("2d");
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    });
    const stopped = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
    recorder.start(100);
    for (let frame = 0; frame < 12; frame += 1) {
      context.fillStyle = frame % 2 ? "#f08b42" : "#234f91";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(frame * 8, 20, 24, 24);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: "video/webm" });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  assert.ok(videoFixture && videoFixture.length > 0, "Chromium must be able to create the WebM smoke fixture.");
  await desktop.locator('#videoFileInput').setInputFiles({
    name: 'smalan-test.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(videoFixture)
  });
  await desktop.waitForFunction(() => {
    const details = document.querySelector('#videoSourceDetails');
    const capture = document.querySelector('#videoCaptureButton');
    return details && /160 × 90 px/.test(details.textContent) && capture && !capture.disabled;
  });
  assert.equal(await desktop.locator('#videoLoadedPanel').isVisible(), true);
  assert.match(await desktop.locator('#videoSourceDetails').innerText(), /160 × 90 px/);
  await desktop.locator('#videoFrameTime').fill('0.5');
  const captureTime = desktop.waitForFunction(() => {
    const player = document.querySelector('#videoPlayer');
    const preview = document.querySelector('#videoFrameResult');
    return player && preview && !preview.hidden && player.currentTime >= 0.45 && player.currentTime <= 1.0;
  });
  await desktop.locator('#videoCaptureButton').click();
  await captureTime;
  assert.equal(await desktop.locator('#videoDownloadButton').isEnabled(), true);
  const frameDownloadEvent = desktop.waitForEvent('download');
  await desktop.locator('#videoDownloadButton').click();
  const frameDownload = await frameDownloadEvent;
  assert.equal(frameDownload.suggestedFilename(), 'smalan-test-frame-0-50.png');
  const frameOutput = await readFile(await frameDownload.path());
  assert.equal(frameOutput.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(frameOutput.readUInt32BE(16), 160, 'Captured frame PNG width must match video metadata.');
  assert.equal(frameOutput.readUInt32BE(20), 90, 'Captured frame PNG height must match video metadata.');
  await desktop.locator('#videoClearButton').click();
  assert.equal(await desktop.locator('#videoLoadedPanel').isVisible(), false);
  assert.equal(await desktop.locator('#videoCaptureButton').isDisabled(), true);

  // Exercise local chat model recovery with a deterministic WebLLM/Worker double.
  const recovery = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  recovery.on("pageerror", (error) => runtimeErrors.push(error.message));
  await recovery.addInitScript(() => {
    window.__fakeWorkers = [];
    window.__webllmInitCount = 0;
    window.__loadedModels = [];
    window.__runtimeUnloadCalls = 0;
    window.__failRuntimeUnload = false;
    window.__holdRuntimeUnload = false;
    window.__releaseRuntimeUnload = null;
    window.__workspaceFailures = { coding: 1, text: 1 };
    window.__generationInterrupted = false;
    window.__crashDuringGeneration = false;
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: { requestAdapter: async () => ({}) }
    });
    window.Worker = class extends EventTarget {
      constructor() {
        super();
        this.terminated = false;
        window.__fakeWorkers.push(this);
      }
      terminate() { this.terminated = true; }
    };
  });
  await recovery.route("https://esm.run/@mlc-ai/web-llm@0.2.87", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      headers: { "access-control-allow-origin": "*" },
      body: `
        export async function CreateWebWorkerMLCEngine(worker, model, options) {
          window.__webllmInitCount += 1;
          window.__loadedModels.push(model);
          if (window.__webllmInitCount === 1) {
            setTimeout(() => worker.dispatchEvent(new ErrorEvent("error", {
              message: "simulated worker startup failure"
            })), 0);
            return new Promise(() => {});
          }
          return {
            chat: { completions: { create: async (params) => {
              const system = params.messages?.[0]?.content || "";
              if (!params.stream && system.includes("Jawab hanya berdasarkan kutipan dokumen")) {
                return await new Promise((resolve) => {
                  window.__resolveKnowledgeGeneration = () => resolve({
                    choices: [{ message: { content: "Analisis uji selesai [S1]." } }]
                  });
                });
              }
              const workspace = system.includes("Lokal AI Coding") ? "coding"
                : system.includes("Text & Language") ? "text" : "";
              if (workspace && window.__workspaceFailures[workspace] > 0) {
                window.__workspaceFailures[workspace] -= 1;
                throw new Error("simulated " + workspace + " task failure");
              }
              let rejectCrashGeneration;
              const crashGeneration = new Promise((_, reject) => { rejectCrashGeneration = reject; });
              window.__rejectCrashGeneration = rejectCrashGeneration;
              return {
                async *[Symbol.asyncIterator]() {
                  yield { choices: [{ delta: { content: "Jawaban uji berhasil." } }] };
                  if ([...(params.messages || [])].reverse().find((message) => message.role === "user")?.content?.includes("Uji crash worker")) {
                    await crashGeneration;
                  }
                  if ([...(params.messages || [])].reverse().find((message) => message.role === "user")?.content?.includes("Uji pembatalan generasi")) {
                    await new Promise((resolve) => {
                      const waitForInterrupt = () => window.__generationInterrupted ? resolve() : setTimeout(waitForInterrupt, 5);
                      waitForInterrupt();
                    });
                    if (!window.__generationInterrupted) yield { choices: [{ delta: { content: "Teks setelah pembatalan." } }] };
                  }
                }
              };
            } } },
            interruptGenerate: () => {
              window.__generationInterrupted = true;
              if (window.__resolveKnowledgeGeneration) {
                const resolve = window.__resolveKnowledgeGeneration;
                window.__resolveKnowledgeGeneration = null;
                resolve();
              }
              if (window.__crashDuringGeneration && window.__rejectCrashGeneration) window.__rejectCrashGeneration(new Error("simulated worker termination"));
            },
            unload: async () => {
              window.__runtimeUnloadCalls += 1;
              if (window.__holdRuntimeUnload) {
                await new Promise((resolve) => { window.__releaseRuntimeUnload = resolve; });
              }
              if (window.__failRuntimeUnload) throw new Error("simulated runtime unload failure");
            }
          };
        }
      `
    });
  });
  const recoveryResponse = await recovery.goto(baseURL, { waitUntil: "domcontentloaded" });
  assert.equal(recoveryResponse?.status(), 200);
  await recovery.locator('.nav-link[data-page="chat"]').click();
  await recovery.waitForSelector("#chatLoadButton");
  await recovery.locator("#chatLoadButton").click();
  await recovery.waitForFunction(() => {
    const status = document.querySelector("#chatEngineStatus");
    const button = document.querySelector("#chatLoadButton");
    return status && /Gagal memuat model/.test(status.textContent) && button && !button.disabled;
  });
  assert.equal(await recovery.locator("#chatUnloadButton").isVisible(), false,
    "A failed initialization must not leave a phantom active model session.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), false,
    "A failed initialization must not register an active Model Engine runtime.");
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers.length), 1);
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers[0].terminated), true,
    "A failed initialization must terminate its worker.");

  await recovery.locator("#chatLoadButton").click();
  await recovery.waitForFunction(() => {
    const status = document.querySelector("#chatEngineStatus");
    return status && /Model siap/.test(status.textContent);
  });
  assert.equal(await recovery.locator("#chatUnloadButton").isVisible(), true,
    "A retry after initialization failure must establish a usable runtime.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), true,
    "A successful retry must register the active Model Engine runtime.");
  await recovery.locator("#chatInput").fill("Uji pemulihan model");
  await recovery.locator("#chatSendButton").click();
  await recovery.waitForFunction(() => document.querySelector("#chatMessages")?.innerText.includes("Jawaban uji berhasil."));
  await recovery.locator("#chatInput").fill("Uji pembatalan generasi");
  await recovery.locator("#chatSendButton").click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#chatStopButton");
    return stop && !stop.hidden && document.querySelector("#chatMessages")?.innerText.includes("Jawaban uji berhasil.");
  });
  await recovery.locator("#chatStopButton").click();
  await recovery.waitForFunction(() => {
    const messages = document.querySelector("#chatMessages")?.innerText || "";
    const send = document.querySelector("#chatSendButton");
    return messages.includes("Generasi dihentikan oleh pengguna.") && send && !send.disabled;
  });
  assert.match(await recovery.locator("#chatEngineStatus").innerText(), /Model siap/,
    "Cancelling a response must keep the shared local model runtime ready.");
  // Knowledge uses a non-streaming completion; the mock resolves it only after interruptGenerate.
  await recovery.locator('.nav-link[data-page="knowledge"]').click();
  await recovery.waitForSelector("#knowledgeQuestionForm");
  await recovery.locator("#knowledgeFile").setInputFiles({
    name: "knowledge-stop-fixture.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Kebijakan sekolah mengutamakan keselamatan peserta didik dan layanan yang transparan.")
  });
  await recovery.waitForFunction(() => document.querySelector("#knowledgeQuestion")?.disabled === false);
  await recovery.locator("#knowledgeQuestion").fill("Apa prinsip utama kebijakan?");
  await recovery.locator("#knowledgeAsk").click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#knowledgeStopButton");
    return stop && !stop.hidden && typeof window.__resolveKnowledgeGeneration === "function";
  });
  await recovery.locator("#knowledgeStopButton").click();
  await recovery.waitForFunction(() =>
    /Analisis dokumen dihentikan/.test(document.querySelector("#knowledgeStatus")?.textContent || "")
    && document.querySelector("#knowledgeAnswer")?.textContent.includes("Generasi dihentikan oleh pengguna.")
  );
  await recovery.locator('.nav-link[data-page="home"]').click();
  await recovery.locator('.nav-link[data-page="knowledge"]').click();
  await recovery.waitForFunction(() =>
    /Analisis dokumen dihentikan/.test(document.querySelector("#knowledgeStatus")?.textContent || "")
    && document.querySelector("#knowledgeAnswer")?.textContent.includes("Generasi dihentikan oleh pengguna.")
  );

  // Data Analyst streams a response; verify Stop and history restoration after navigation.
  await recovery.evaluate(() => { window.__generationInterrupted = false; });
  await recovery.locator('.nav-link[data-page="data"]').click();
  await recovery.waitForSelector("#dataFileInput");
  await recovery.locator("#dataFileInput").setInputFiles({
    name: "data-stop-fixture.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("kelas,jumlah\nX,10\nY,20\nZ,30\n")
  });
  await recovery.waitForFunction(() => document.querySelector("#dataAnalysis")?.hidden === false);
  await recovery.locator("#dataInterpretQuestion").fill("Uji pembatalan generasi");
  await recovery.locator("#dataInterpretButton").click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#dataInterpretStopButton");
    return stop && !stop.hidden && (document.querySelector("#dataInterpretResult")?.textContent || "").includes("Jawaban uji berhasil.");
  });
  await recovery.locator("#dataInterpretStopButton").click();
  await recovery.waitForFunction(() =>
    /Interpretasi dihentikan/.test(document.querySelector("#dataInterpretStatus")?.textContent || "")
    && document.querySelector("#dataInterpretResult")?.textContent.includes("Generasi dihentikan oleh pengguna.")
  );
  await recovery.locator('.nav-link[data-page="home"]').click();
  await recovery.locator('.nav-link[data-page="data"]').click();
  await recovery.waitForFunction(() =>
    /Interpretasi dihentikan|Riwayat interpretasi sesi dipulihkan/.test(document.querySelector("#dataInterpretStatus")?.textContent || "")
    && document.querySelector("#dataInterpretResult")?.textContent.includes("Generasi dihentikan oleh pengguna.")
  );

  await recovery.evaluate(() => {
    window.__generationInterrupted = false;
    window.__crashDuringGeneration = true;
  });
  await recovery.locator("#chatInput").fill("Uji crash worker");
  await recovery.locator("#chatSendButton").click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#chatStopButton");
    return stop && !stop.hidden && document.querySelector("#chatMessages")?.innerText.includes("Jawaban uji berhasil.");
  });
  await recovery.evaluate(() => {
    const worker = window.__fakeWorkers[1];
    worker.dispatchEvent(new ErrorEvent("error", { message: "simulated worker crash during generation" }));
  });
  await recovery.waitForFunction(() => {
    const status = document.querySelector("#chatEngineStatus");
    const button = document.querySelector("#chatLoadButton");
    const messages = document.querySelector("#chatMessages")?.innerText || "";
    return status && /Worker model mengalami kesalahan/.test(status.textContent)
      && button && !button.disabled && messages.includes("worker model gagal");
  });
  // The worker error is reported before the interrupted stream necessarily settles.
  // Wait for generation cleanup before attempting to reload and submit again.
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#chatStopButton");
    return stop && stop.hidden;
  });
  await recovery.evaluate(() => { window.__crashDuringGeneration = false; });
  assert.equal(await recovery.locator("#chatUnloadButton").isVisible(), false,
    "A crashed worker must clear the active model controls.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), false,
    "A crashed worker must release the active Model Engine runtime.");
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers[1].terminated), true,
    "A crashed worker must be terminated.");

  await recovery.locator("#chatLoadButton").click();
  await recovery.waitForFunction(() => /Model siap/.test(document.querySelector("#chatEngineStatus")?.textContent || ""));
  assert.equal(await recovery.locator("#chatUnloadButton").isVisible(), true,
    "The model must be loadable again after a worker crash.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), true,
    "A recovered worker must register a fresh Model Engine runtime.");
  // A hidden Stop control only proves the failed worker cannot be interrupted;
  // wait until the shared generation lock is released and Chat is enabled.
  await recovery.waitForFunction(() => {
    const send = document.querySelector("#chatSendButton");
    return send && !send.disabled;
  });
  await recovery.evaluate(() => { window.__generationInterrupted = false; });
  await recovery.locator("#chatInput").fill("Uji generasi Chat setelah pemulihan worker.");
  await recovery.locator("#chatSendButton").click();
  await recovery.waitForFunction(() => {
    const messages = document.querySelector("#chatMessages")?.innerText || "";
    const send = document.querySelector("#chatSendButton");
    const stop = document.querySelector("#chatStopButton");
    const promptIndex = messages.lastIndexOf("Uji generasi Chat setelah pemulihan worker.");
    const answerIndex = messages.lastIndexOf("Jawaban uji berhasil.");
    return promptIndex >= 0 && answerIndex > promptIndex
      && send && !send.disabled && stop && stop.hidden;
  });
  assert.match(await recovery.locator("#chatEngineStatus").innerText(), /Model siap/,
    "A recovered worker must accept a fresh Chat generation without stale failure state.");

  // A task-level failure in Coding or Text must not mark the shared model as failed.
  await recovery.locator('.nav-link[data-page="coding"]').click();
  await recovery.waitForSelector("#codingForm");
  await recovery.locator("#codingInput").fill("Buat fungsi sederhana untuk uji isolasi.");
  await recovery.locator("#codingRunButton").click();
  await recovery.waitForFunction(() => /Generasi gagal: simulated coding task failure/.test(
    document.querySelector("#codingStatus")?.textContent || ""));
  assert.match(await recovery.locator("#chatEngineStatus").innerText(), /Model siap/,
    "A Coding task error must not mark the shared model runtime as failed.");
  await recovery.locator("#codingRunButton").click();
  await recovery.waitForFunction(() => {
    const run = document.querySelector("#codingRunButton");
    return run && !run.disabled && document.querySelector("#codingOutput")?.textContent.includes("Jawaban uji berhasil.");
  });
  assert.match(await recovery.locator("#chatEngineStatus").innerText(), /Model siap/);
  await recovery.locator("#codingInput").fill("Uji pembatalan generasi");
  await recovery.locator("#codingRunButton").click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#codingStopButton");
    return stop && !stop.hidden && document.querySelector("#codingOutput")?.textContent.includes("Jawaban uji berhasil.");
  });
  assert.equal(await recovery.locator("#chatUnloadButton").isDisabled(), true,
    "The shared local runtime must not be unloadable during Coding generation.");
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 0,
    "A Coding generation must not trigger runtime cleanup.");
  await recovery.locator("#codingStopButton").click();
  await recovery.waitForFunction(() => /Proses dihentikan oleh pengguna/.test(document.querySelector("#codingStatus")?.textContent || ""));
  assert.match(await recovery.locator("#codingOutput").innerText(), /Generasi dihentikan oleh pengguna/);
  await recovery.evaluate(() => { window.__generationInterrupted = false; });

  await recovery.locator('.nav-link[data-page="text"]').click();
  await recovery.waitForSelector("#textForm");
  await recovery.locator("#textInput").fill("Teks uji isolasi modul bahasa.");
  await recovery.locator("#textRunButton").click();
  await recovery.waitForFunction(() => /Proses gagal: simulated text task failure/.test(
    document.querySelector("#textStatus")?.textContent || ""));
  assert.match(await recovery.locator("#chatEngineStatus").innerText(), /Model siap/,
    "A Text task error must not mark the shared model runtime as failed.");
  await recovery.locator("#textRunButton").click();
  await recovery.waitForFunction(() => document.querySelector("#textOutput")?.textContent.includes("Jawaban uji berhasil."));
  assert.match(await recovery.locator("#chatEngineStatus").innerText(), /Model siap/);
  await recovery.locator("#textInput").fill("Uji pembatalan generasi");
  await recovery.locator("#textRunButton").click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#textStopButton");
    return stop && !stop.hidden && document.querySelector("#textOutput")?.textContent.includes("Jawaban uji berhasil.");
  });
  assert.equal(await recovery.locator("#chatUnloadButton").isDisabled(), true,
    "The shared local runtime must not be unloadable during Text generation.");
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 0,
    "A Text generation must not trigger runtime cleanup.");
  await recovery.locator("#textStopButton").click();
  await recovery.waitForFunction(() => /Proses dihentikan oleh pengguna/.test(document.querySelector("#textStatus")?.textContent || ""));
  assert.match(await recovery.locator("#textOutput").innerText(), /Generasi dihentikan oleh pengguna/);
  await recovery.evaluate(() => { window.__generationInterrupted = false; });

  // Assistant must register against the shared runtime so Chat can interrupt it safely.
  await recovery.locator('.nav-link[data-page="assistant"]').click();
  await recovery.waitForSelector("#assistantPlanButton");
  await recovery.locator("#assistantPrompt").fill("Uji pembatalan generasi");
  await recovery.locator("#assistantPlanButton").click();
  await recovery.waitForFunction(() => {
    const run = document.querySelector("#assistantPlanButton");
    return run && run.disabled
      && document.querySelector("#assistantResponse")?.textContent.includes("Jawaban uji berhasil.");
  });
  await recovery.locator('.nav-link[data-page="chat"]').click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#chatStopButton");
    return stop && !stop.hidden && document.querySelector("#chatUnloadButton")?.disabled;
  });
  await recovery.locator("#chatStopButton").click();
  await recovery.waitForFunction(() => {
    const stop = document.querySelector("#chatStopButton");
    const send = document.querySelector("#chatSendButton");
    return stop && stop.hidden && send && !send.disabled
      && document.querySelector("#chatUnloadButton") && !document.querySelector("#chatUnloadButton").disabled;
  });
  await recovery.locator('.nav-link[data-page="assistant"]').click();
  await recovery.waitForFunction(() => /dihentikan/i.test(document.querySelector("#assistantStatus")?.textContent || "")
    && document.querySelector("#assistantResponse")?.textContent.includes("Generasi dihentikan oleh pengguna."));
  await recovery.locator('.nav-link[data-page="chat"]').click();

  await recovery.locator("#chatUnloadButton").click();
  await recovery.waitForFunction(() => {
    const button = document.querySelector("#chatLoadButton");
    return button && !button.hidden && !button.disabled;
  });
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers[2].terminated), true,
    "Normal model unload must terminate the worker.");
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 1,
    "Normal model unload must invoke the WebLLM runtime unload hook before worker termination.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), false,
    "Normal model unload must release the Model Engine runtime.");
  await recovery.locator("#chatModelSelect").selectOption("Llama-3.2-3B-Instruct-q4f16_1-MLC");
  await recovery.locator("#chatLoadButton").click();
  await recovery.waitForFunction(() => /Model siap/.test(document.querySelector("#chatEngineStatus")?.textContent || ""));
  assert.equal(await recovery.evaluate(() => window.__loadedModels.at(-1)), "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    "Reloading after unload must initialize the newly selected model.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().activeModelId), "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    "The Model Engine registry must track the newly selected model.");
  await recovery.locator("#chatUnloadButton").click();
  await recovery.waitForFunction(() => {
    const button = document.querySelector("#chatLoadButton");
    return button && !button.hidden && !button.disabled;
  });
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers[3].terminated), true,
    "Switching model must release the previous worker before the next session.");
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 2,
    "Each normal model session must invoke its own runtime unload hook exactly once.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), false,
    "Unloading the replacement model must leave no active Model Engine runtime.");

  // A rejected WebLLM unload hook must not leak the Worker or Model Engine registration.
  await recovery.locator("#chatLoadButton").click();
  await recovery.waitForFunction(() => /Model siap/.test(document.querySelector("#chatEngineStatus")?.textContent || ""));
  await recovery.evaluate(() => { window.__failRuntimeUnload = true; });
  await recovery.locator("#chatUnloadButton").click();
  await recovery.waitForFunction(() => {
    const button = document.querySelector("#chatLoadButton");
    return button && !button.hidden && !button.disabled;
  });
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 3,
    "A failed unload hook must still be invoked exactly once.");
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers[4].terminated), true,
    "A rejected unload hook must not prevent Worker termination.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), false,
    "A rejected unload hook must not leave a registered runtime.");
  assert.equal(await recovery.locator("#chatUnloadButton").isVisible(), false,
    "A rejected unload hook must restore the unloaded Chat controls.");

  // Verify that the failed cleanup does not poison a subsequent fresh model session.
  await recovery.evaluate(() => { window.__failRuntimeUnload = false; });
  await recovery.locator("#chatLoadButton").click();
  await recovery.waitForFunction(() => /Model siap/.test(document.querySelector("#chatEngineStatus")?.textContent || ""));
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), true,
    "A fresh model session must load after a rejected unload hook.");
  await recovery.locator("#chatUnloadButton").click();
  await recovery.waitForFunction(() => {
    const button = document.querySelector("#chatLoadButton");
    return button && !button.hidden && !button.disabled;
  });
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers[5].terminated), true,
    "The fresh session must also terminate cleanly.");
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 4,
    "The subsequent normal unload must invoke its own unload hook exactly once.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), false,
    "The subsequent normal unload must leave the runtime registry empty.");

  // Repeated unload requests during an in-flight cleanup must be idempotent.
  await recovery.locator("#chatLoadButton").click();
  await recovery.waitForFunction(() => /Model siap/.test(document.querySelector("#chatEngineStatus")?.textContent || ""));
  await recovery.evaluate(() => { window.__holdRuntimeUnload = true; });
  await recovery.locator("#chatUnloadButton").click();
  await recovery.waitForFunction(() => window.__runtimeUnloadCalls === 5 && typeof window.__releaseRuntimeUnload === "function");
  assert.equal(await recovery.locator("#chatUnloadButton").isDisabled(), true,
    "The unload control must be disabled while runtime cleanup is pending.");
  await recovery.evaluate(() => {
    document.querySelector("#chatUnloadButton").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 5,
    "A duplicate unload request must not invoke the runtime hook twice.");
  await recovery.evaluate(() => {
    window.__releaseRuntimeUnload();
    window.__holdRuntimeUnload = false;
  });
  await recovery.waitForFunction(() => {
    const button = document.querySelector("#chatLoadButton");
    return button && !button.hidden && !button.disabled;
  });
  assert.equal(await recovery.evaluate(() => window.__fakeWorkers[6].terminated), true,
    "The in-flight unload must terminate its Worker exactly once.");
  assert.equal(await recovery.evaluate(() => window.LokalAIModelEngine.getSnapshot().hasActiveRuntime), false,
    "Duplicate unload requests must leave the Model Engine registry empty.");
  assert.equal(await recovery.evaluate(() => window.__runtimeUnloadCalls), 5,
    "The runtime unload hook must run exactly once for the session.");
  await recovery.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on("pageerror", (error) => runtimeErrors.push(error.message));
  const mobileResponse = await mobile.goto(baseURL, { waitUntil: "domcontentloaded" });
  assert.equal(mobileResponse?.status(), 200);
  await mobile.waitForSelector(".app-shell");
  assert.equal(await mobile.locator("#menuToggle").isVisible(), true, "The mobile menu button must be visible.");

  await mobile.locator("#menuToggle").click();
  assert.match(await mobile.locator("#sidebar").getAttribute("class"), /open/);
  assert.match(await mobile.locator("#sidebarOverlay").getAttribute("class"), /show/);
  assert.equal(await mobile.locator("#menuToggle").getAttribute("aria-expanded"), "true");

  await mobile.locator("#sidebarOverlay").click({ position: { x: 300, y: 300 } });
  assert.doesNotMatch(await mobile.locator("#sidebar").getAttribute("class"), /open/);
  assert.equal(await mobile.locator("#menuToggle").getAttribute("aria-expanded"), "false");

  await mobile.locator("#menuToggle").click();
  await mobile.locator('.nav-link[data-page="audio"]').click();
  await mobile.waitForSelector(".audio-lab-page");
  assert.equal(await mobile.locator(".audio-lab-grid").isVisible(), true, "Audio Lab controls must remain available on mobile.");
  assert.equal(await mobile.locator(".audio-tts-grid").isVisible(), true, "Indonesian TTS controls must remain available on mobile.");
  const mobileHasHorizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(mobileHasHorizontalOverflow, false, "Audio Lab must not introduce horizontal page overflow on mobile.");
  await mobile.locator("#menuToggle").click();
  await mobile.locator('.nav-link[data-page="video"]').click();
  await mobile.waitForSelector(".video-studio-page");
  assert.equal(await mobile.locator(".video-studio-grid").isVisible(), true, "Video Studio controls must remain available on mobile.");
  const videoHasHorizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(videoHasHorizontalOverflow, false, "Video Studio must not introduce horizontal page overflow on mobile.");

  assert.deepEqual(runtimeErrors, [], "The desktop and mobile journeys must not produce uncaught browser errors.");
  console.log("Browser smoke passed: desktop/mobile navigation, theme persistence, sidebar, AI Chat/cloud gate and local model recovery, mocked Knowledge non-stream cancellation and navigation restoration, mocked Data Analyst streaming cancellation and history restoration, Coding/Text task-error isolation on the shared runtime, Image Studio transforms/exports, Audio Lab WAV editing, mocked Whisper ASR, Indonesian TTS license/load/synthesis/WAV export/cancel/cleanup, and Video Studio metadata/frame PNG export/cleanup.");
} finally {
  await browser.close();
}
