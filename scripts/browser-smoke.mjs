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
  assert.match(await desktop.locator(".app-shell").getAttribute("class"), /sidebar-collapsed/);
  assert.equal(await desktop.locator("#menuToggle").getAttribute("aria-expanded"), "false");
  assert.equal(await desktop.locator("#menuToggle").getAttribute("aria-label"), "Tampilkan sidebar");

  await desktop.locator("#menuToggle").click();
  assert.doesNotMatch(await desktop.locator(".app-shell").getAttribute("class"), /sidebar-collapsed/);
  assert.equal(await desktop.locator("#menuToggle").getAttribute("aria-expanded"), "true");

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
        let calls = 0;
        export async function pipeline(task, model, options) {
          if (task !== "automatic-speech-recognition" || model !== "onnx-community/whisper-tiny") {
            throw new Error("Unexpected ASR pipeline configuration.");
          }
          if (options.device !== "wasm" || options.dtype !== "q8") {
            throw new Error("ASR must use q8 WebAssembly inference.");
          }
          if (typeof options.progress_callback === "function") {
            options.progress_callback({ status: "progress_total", progress: 100, loaded: 100, total: 100 });
          }
          const transcriber = async (audio, settings) => {
            if (!(audio instanceof Float32Array) || audio.length < 1) throw new Error("Expected resampled Float32Array audio.");
            if (settings.task !== "transcribe" || settings.chunk_length_s !== 30 || settings.stride_length_s !== 5) {
              throw new Error("Unexpected ASR generation settings.");
            }
            calls += 1;
            if (calls === 4) await new Promise((resolve) => setTimeout(resolve, 5000));
            const language = settings.language || "auto";
            const text = "Halo, ini uji transkripsi " + language + ".";
            return { text, chunks: [{ text, timestamp: [0, 0.5] }] };
          };
          transcriber.dispose = async () => {};
          return transcriber;
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
  const mobileHasHorizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(mobileHasHorizontalOverflow, false, "Audio Lab must not introduce horizontal page overflow on mobile.");
  await mobile.locator("#menuToggle").click();
  await mobile.locator('.nav-link[data-page="video"]').click();
  await mobile.waitForSelector(".video-studio-page");
  assert.equal(await mobile.locator(".video-studio-grid").isVisible(), true, "Video Studio controls must remain available on mobile.");
  const videoHasHorizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(videoHasHorizontalOverflow, false, "Video Studio must not introduce horizontal page overflow on mobile.");

  assert.deepEqual(runtimeErrors, [], "The desktop and mobile journeys must not produce uncaught browser errors.");
  console.log("Browser smoke passed: desktop/mobile navigation, theme persistence, sidebar, AI Chat/cloud gate, Image Studio transforms/exports, Audio Lab WAV editing and mocked Whisper ASR load/progress/transcription/cancellation, and Video Studio metadata/frame PNG export/cleanup.");
} finally {
  await browser.close();
}
