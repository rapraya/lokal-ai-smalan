import assert from "node:assert/strict";
import { chromium } from "playwright";

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
  console.log("Browser smoke passed: desktop navigation, colorful theme persistence, sidebar collapse, mobile menu, AI Chat, and disabled cloud provider state.");
} finally {
  await browser.close();
}
