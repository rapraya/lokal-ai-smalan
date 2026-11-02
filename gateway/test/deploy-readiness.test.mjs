import assert from "node:assert/strict";
import { validateConfig } from "../scripts/deploy-readiness-check.mjs";

const valid = {
  name: "lokal-ai-gateway",
  workers_dev: false,
  vars: {
    APP_ORIGIN: "https://ai.smalan.sch.id",
    ACCESS_TEAM_DOMAIN: "smalan.cloudflareaccess.com",
    ACCESS_AUD: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ALLOWED_EMAILS: "admin@smalan.sch.id,operator@smalan.sch.id",
    OPENAI_ALLOWED_MODELS: "gpt-6.1-sol,gpt-6-luna"
  },
  routes: [{
    pattern: "ai.smalan.sch.id/api/*",
    zone_name: "smalan.sch.id"
  }],
  ratelimits: [{
    name: "CHAT_LIMITER",
    namespace_id: "1001",
    simple: { limit: 10, period: 60 }
  }]
};

assert.deepEqual(validateConfig(valid).errors, []);
assert.equal(validateConfig(valid).warnings.length, 3);

const placeholderDomain = structuredClone(valid);
placeholderDomain.vars.ACCESS_TEAM_DOMAIN = "REPLACE_WITH_YOUR_TEAM.cloudflareaccess.com";
assert.ok(validateConfig(placeholderDomain).errors.some((error) => error.includes("ACCESS_TEAM_DOMAIN")));

const placeholderAud = structuredClone(valid);
placeholderAud.vars.ACCESS_AUD = "REPLACE_WITH_ACCESS_APPLICATION_AUD";
assert.ok(validateConfig(placeholderAud).errors.some((error) => error.includes("ACCESS_AUD")));

const invalidEmail = structuredClone(valid);
invalidEmail.vars.ALLOWED_EMAILS = "not-an-email";
assert.ok(validateConfig(invalidEmail).errors.some((error) => error.includes("ALLOWED_EMAILS")));

const publicWorker = structuredClone(valid);
publicWorker.workers_dev = true;
assert.ok(validateConfig(publicWorker).errors.some((error) => error.includes("workers_dev")));

const broadRoute = structuredClone(valid);
broadRoute.routes[0].pattern = "ai.smalan.sch.id/*";
assert.ok(validateConfig(broadRoute).errors.some((error) => error.includes("Route harus hanya")));

const secretInVars = structuredClone(valid);
secretInVars.vars.OPENAI_API_KEY = "must-not-be-public";
assert.ok(validateConfig(secretInVars).errors.some((error) => error.includes("OPENAI_API_KEY")));

const unknownModel = structuredClone(valid);
unknownModel.vars.OPENAI_ALLOWED_MODELS = "gpt-unknown";
assert.ok(validateConfig(unknownModel).errors.some((error) => error.includes("OPENAI_ALLOWED_MODELS")));

const excessiveLimit = structuredClone(valid);
excessiveLimit.ratelimits[0].simple.limit = 100;
assert.ok(validateConfig(excessiveLimit).errors.some((error) => error.includes("CHAT_LIMITER limit")));

console.log("Gateway deployment readiness tests passed: Access, route scope, secrets, model allowlist, and rate limits.");
