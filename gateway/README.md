# Lokal AI SMALAN — Secure AI Gateway

This gateway is a server-side Cloudflare Worker. It is deliberately separate from the static browser application so provider credentials never enter the frontend bundle.

## Current scope

- Cloudflare Access JWT signature, issuer, audience, expiry, and email allowlist validation.
- Same-origin endpoints: `/api/health`, `/api/v1/models`, and `/api/v1/chat/completions`.
- OpenAI Responses API adapter normalized to the existing Chat Completions shape used by Lokal AI workspaces.
- Streaming and non-streaming text responses.
- Fixed model allowlist, bounded request body/context/output, 90-second upstream timeout, and per-user Cloudflare rate-limit binding.
- Upstream request uses `store: false`; gateway does not log prompts or provider credentials.
- Cloud provider access fails closed when the Access identity, API key, or rate limiter is not configured.

This is backend code and automated test coverage. It is not deployed or connected to the public application yet.

## Hosting and routing model

The intended deployment is:

- Static Lokal AI application: `https://ai.smalan.sch.id`
- Gateway path on the same hostname: `https://ai.smalan.sch.id/api/*`
- Cloudflare Access protects the application hostname and authenticates users.
- A Cloudflare Worker route handles only `ai.smalan.sch.id/api/*`.
- The Worker validates the `Cf-Access-Jwt-Assertion` header at the origin before any protected endpoint is served.

Using the same hostname avoids a separate browser CORS trust boundary. The Cloudflare DNS zone for `smalan.sch.id` must be active/proxied through Cloudflare for this route-based setup. Do not deploy the route until the hostname and Access application have been configured.

## Cloudflare Access prerequisites

1. Add `ai.smalan.sch.id` as a Cloudflare Access self-hosted application.
2. Create a deny-by-default policy that allows only the intended SMALAN user identities. Do not use a broad public `Everyone` policy for an API that spends paid provider credits.
3. Configure an identity provider such as Google or another supported IdP.
4. Record the Access team domain and this application's Audience (AUD) tag.
5. The gateway independently verifies the JWT signature against the team's Access signing-key endpoint, checks issuer/audience/time claims, and checks the email against `ALLOWED_EMAILS`. A header by itself is never trusted.

Cloudflare Access documentation:
- [Publish a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

## Configuration

1. Install Node.js 22 or newer and Wrangler 4.36.0 or newer.
2. From the repository root, enter `gateway`.
3. Review `wrangler.jsonc` and replace the Access team domain, AUD value, and allowed email list. These are configuration values, not provider secrets.
4. Set the real provider key as a Worker secret. Do not paste it into source files:

```powershell
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
```

Wrangler prompts for the secret value. The key is stored by Cloudflare as an encrypted Worker secret; it is not written to the Git repository.

5. Configure the Worker route after the zone and Access application are ready. Add the following to `wrangler.jsonc`:

```jsonc
"routes": [
  {
    "pattern": "ai.smalan.sch.id/api/*",
    "zone_name": "smalan.sch.id"
  }
]
```

6. Deploy only after reviewing the Access policy, origin, allowed identities, and secret:

```powershell
npx wrangler deploy
```

7. While signed in through Cloudflare Access, open `https://ai.smalan.sch.id/api/health`. It should return authenticated gateway status and the configured model allowlist. If the Access assertion or configuration is absent, the gateway must reject the request.

## OpenAI model and usage controls

The initial allowlist is:

- `gpt-6.1-sol` — default balance of capability and cost.
- `gpt-6-luna` — lower-cost/high-volume option.

The IDs are server allowlist entries, not arbitrary user-provided model names. Update them only after reviewing the current OpenAI model catalogue, capabilities, and project pricing.

The gateway caps output at 2,048 tokens and applies a Cloudflare per-user rate limit of 10 requests per 60 seconds. Cloudflare's Worker rate limiter is approximate and local to each Cloudflare location; it is not a strict global spend cap. Also configure provider-side project usage/spending controls and monitor API usage. Do not treat a rate limiter alone as a guaranteed monthly budget.

- [OpenAI API models](https://developers.openai.com/api/docs/models)
- [OpenAI API authentication and API overview](https://developers.openai.com/api/reference/overview)
- [OpenAI API key safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [Cloudflare Worker rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

## Local automated tests

From the repository root:

```powershell
node gateway/test/worker.test.mjs
```

Or from the gateway directory:

```powershell
npm test
```

The tests use generated temporary signing keys and a mocked OpenAI endpoint. They do not require a real Cloudflare account or OpenAI API key and do not make external API calls.

## Not enabled yet

- No real OpenAI API key is stored in this repository.
- No Cloudflare Access application or Worker has been created/deployed from this code.
- No DNS route has been changed.
- No public frontend request is sent to OpenAI by this release until the gateway route, Access policy, and secrets are configured.
- Claude and Gemini adapters are future work; they remain unavailable.
- No automatic local-to-cloud fallback is allowed.
