import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const EXPECTED_ORIGIN = "https://ai.smalan.sch.id";
const EXPECTED_ROUTE = "ai.smalan.sch.id/api/*";
const EXPECTED_ZONE = "smalan.sch.id";
const APPROVED_MODELS = new Set([
  "gpt-6-astra",
  "gpt-6.1-sol",
  "gpt-6.1-terra",
  "gpt-6-luna"
]);

function isPlaceholder(value) {
  return typeof value !== "string" || !value.trim() || /replace[_ -]?with|placeholder|example\.com/i.test(value);
}

function validateConfig(config) {
  const errors = [];
  const warnings = [];
  const vars = config && config.vars && typeof config.vars === "object" ? config.vars : {};

  if (!config || typeof config !== "object") {
    return { errors: ["wrangler.jsonc tidak berisi objek konfigurasi yang valid."], warnings };
  }

  if (config.name !== "lokal-ai-gateway") errors.push("Nama Worker harus lokal-ai-gateway.");
  if (config.workers_dev !== false) errors.push("workers_dev harus false; gateway produksi hanya boleh dipanggil melalui route API yang dilindungi.");

  if (vars.APP_ORIGIN !== EXPECTED_ORIGIN) {
    errors.push("APP_ORIGIN harus tepat https://ai.smalan.sch.id.");
  }
  if (isPlaceholder(vars.ACCESS_TEAM_DOMAIN) || !/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(String(vars.ACCESS_TEAM_DOMAIN || ""))) {
    errors.push("ACCESS_TEAM_DOMAIN belum diisi dengan team domain Cloudflare Access yang benar.");
  }
  if (isPlaceholder(vars.ACCESS_AUD) || String(vars.ACCESS_AUD).length < 10) {
    errors.push("ACCESS_AUD belum diisi dengan Application Audience (AUD) yang sebenarnya.");
  }

  const emails = String(vars.ALLOWED_EMAILS || "").split(",").map((email) => email.trim()).filter(Boolean);
  if (!emails.length || emails.some((email) => isPlaceholder(email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
    errors.push("ALLOWED_EMAILS harus berisi satu atau lebih alamat email pengguna yang diizinkan, dipisahkan koma.");
  }

  const models = String(vars.OPENAI_ALLOWED_MODELS || "").split(",").map((model) => model.trim()).filter(Boolean);
  if (!models.length || models.some((model) => !APPROVED_MODELS.has(model))) {
    errors.push("OPENAI_ALLOWED_MODELS berisi ID model kosong atau belum termasuk allowlist model yang ditinjau.");
  }
  if (Object.hasOwn(vars, "OPENAI_API_KEY")) {
    errors.push("OPENAI_API_KEY tidak boleh berada di vars. Simpan hanya sebagai Worker Secret.");
  }

  const routes = Array.isArray(config.routes) ? config.routes : [];
  if (routes.length !== 1 || routes[0].pattern !== EXPECTED_ROUTE || routes[0].zone_name !== EXPECTED_ZONE) {
    errors.push("Route harus hanya ai.smalan.sch.id/api/* dengan zone smalan.sch.id.");
  }

  const limiters = Array.isArray(config.ratelimits) ? config.ratelimits : [];
  const chatLimiter = limiters.find((limiter) => limiter && limiter.name === "CHAT_LIMITER");
  if (!chatLimiter) {
    errors.push("Binding CHAT_LIMITER belum tersedia.");
  } else {
    const namespaceId = String(chatLimiter.namespace_id || "");
    const limit = Number(chatLimiter.simple && chatLimiter.simple.limit);
    const period = Number(chatLimiter.simple && chatLimiter.simple.period);
    if (!/^[1-9]\d*$/.test(namespaceId)) errors.push("CHAT_LIMITER namespace_id harus berupa bilangan bulat positif dalam bentuk string.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) errors.push("CHAT_LIMITER limit harus antara 1 dan 10 permintaan.");
    if (![10, 60].includes(period)) errors.push("CHAT_LIMITER period hanya boleh 10 atau 60 detik.");
  }

  warnings.push("Cloudflare Access tetap harus dibuat untuk ai.smalan.sch.id/api/* saja, dengan Allow policy untuk daftar email yang sama.");
  warnings.push("Set OPENAI_API_KEY sebagai Worker Secret dan pastikan namanya muncul pada npx wrangler secret list.");
  warnings.push("Rate limit Worker bersifat perkiraan per lokasi Cloudflare; tetapkan juga usage/spending controls pada proyek OpenAI.");
  return { errors, warnings };
}

async function main() {
  const configPath = new URL("../wrangler.jsonc", import.meta.url);
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    console.error("Tidak dapat membaca gateway/wrangler.jsonc:", error.message);
    process.exitCode = 1;
    return;
  }

  const result = validateConfig(config);
  if (result.errors.length) {
    console.error("\nGateway belum siap di-deploy. Perbaiki hal berikut:");
    for (const error of result.errors) console.error(" - " + error);
    console.error("\nBelum ada perubahan pada Cloudflare.");
    process.exitCode = 1;
    return;
  }

  console.log("Konfigurasi statis gateway lulus pemeriksaan.");
  for (const warning of result.warnings) console.log("Periksa manual: " + warning);
  console.log("\nPemeriksaan ini tidak menghubungi Cloudflare dan tidak melakukan deployment.");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) await main();

export { validateConfig };
