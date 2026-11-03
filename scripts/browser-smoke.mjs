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

  await desktop.locator('.nav-link[data-page="audio"]').click();
  await desktop.waitForSelector('.audio-lab-page');
  assert.match(await desktop.locator('.audio-lab-page').innerText(), /LOCAL AUDIO EDITOR/);
  const sampleRate = 24000;
  const audioFrames = sampleRate;
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
    return duration && duration.textContent === '00:01' && exportButton && !exportButton.disabled;
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
  assert.ok(playbackStart >= 0.19 && playbackStart <= 0.25, 'Preview must begin at the selected trim start.');
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
  await desktop.locator('#audioClearButton').click();
  assert.equal(await desktop.locator('#audioLoadedPanel').isVisible(), false);
  assert.equal(await desktop.locator('#audioExportButton').isDisabled(), true);

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

  assert.deepEqual(runtimeErrors, [], "The desktop and mobile journeys must not produce uncaught browser errors.");
  console.log("Browser smoke passed: desktop/mobile navigation, theme persistence, sidebar, AI Chat/cloud gate, Image Studio transforms and exports, and Audio Lab decode/waveform/trim/playback/WAV export/cleanup.");
} finally {
  await browser.close();
}
