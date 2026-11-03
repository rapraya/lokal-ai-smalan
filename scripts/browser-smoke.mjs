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

  assert.deepEqual(runtimeErrors, [], "The desktop and mobile journeys must not produce uncaught browser errors.");
  console.log("Browser smoke passed: desktop navigation, colorful theme persistence, sidebar collapse, mobile menu, AI Chat, disabled cloud provider, and local Image Studio loading/transforms/resizing/export/cleanup.");
} finally {
  await browser.close();
}
