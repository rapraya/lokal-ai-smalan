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
- Cloudflare Access protects only the API application path `ai.smalan.sch.id/api/*`. The public static Lokal AI pages remain accessible without forcing every visitor to sign in.
- A Cloudflare Worker route handles only `ai.smalan.sch.id/api/*`.
- The Worker validates the `Cf-Access-Jwt-Assertion` header at the origin before any protected endpoint is served.

Using the same hostname avoids a separate browser CORS trust boundary. The Cloudflare DNS zone for `smalan.sch.id` must be active/proxied through Cloudflare for this route-based setup. Do not deploy the route until the hostname and Access application have been configured.

## Cloudflare Access prerequisites

1. In Zero Trust > Access controls > Applications, create a **Self-hosted** application and add the public hostname `ai.smalan.sch.id` with the path `/api/*`. Do not protect the whole hostname unless the product is intentionally changed to require login for every app page.
2. Attach a deny-by-default Allow policy that lists only the intended SMALAN user identities. Do not use a broad public `Everyone` policy for an API that spends paid provider credits. Cloudflare Access applications deny users by default unless an Allow policy matches.
3. Configure an identity provider such as Google or another supported IdP.
4. Record the Access team domain and this application's Audience (AUD) tag.
5. The gateway independently verifies the JWT signature against the team's Access signing-key endpoint, checks issuer/audience/time claims, and checks the email against `ALLOWED_EMAILS`. A header by itself is never trusted.

Cloudflare Access documentation:
- [Publish a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)


Cloudflare Access supports protecting only selected URL paths. Keep the `/api/*` path as the protected application boundary so the static workspace itself remains public. See [Cloudflare application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/).

## Configuration

1. Install Node.js 22 or newer and Wrangler 4.36.0 or newer.
2. From the repository root, enter `gateway`, then authenticate Wrangler:

```powershell
npx wrangler login
```

3. In `wrangler.jsonc`, replace only these placeholders with real configuration values:
   - `ACCESS_TEAM_DOMAIN`: your Cloudflare Access team domain, for example `your-team.cloudflareaccess.com`.
   - `ACCESS_AUD`: the Application Audience (AUD) tag copied from the Access application.
   - `ALLOWED_EMAILS`: exact approved user email addresses, separated by commas.

   Keep `APP_ORIGIN`, the API-only route, `workers_dev: false`, the model allowlist, and rate-limit settings unless a reviewed change is intended.

4. In Cloudflare Zero Trust, create a Self-hosted Access application for **only** `ai.smalan.sch.id/api/*`. Add a deny-by-default Allow policy for the same exact email identities. Do not protect the whole hostname; the public Lokal AI app pages should remain available without a login.

5. Set the provider credential as a Worker secret. Never paste it into `wrangler.jsonc`, JavaScript, or Git:

```powershell
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret list
```

   Wrangler prompts for the secret value. The list command should show the secret name without revealing its value.

6. Confirm the `smalan.sch.id` zone is active in this Cloudflare account and that `ai.smalan.sch.id` DNS is proxied through Cloudflare. The route `ai.smalan.sch.id/api/*` is already present in `wrangler.jsonc`; `workers_dev` is disabled so there is no alternate public preview endpoint.

7. Run the pre-deployment gate:

```powershell
npm run check:deploy
```

   This command validates the static config only. It does not log in to Cloudflare, verify Access policies, inspect the remote secret, or deploy anything. Resolve every reported error before continuing.

8. Deploy the Worker and API route only after the Access application, policy, zone, DNS proxy, and secret are ready:

```powershell
npm run deploy
```

9. Open `https://ai.smalan.sch.id/api/health` in a browser tab. On first visit, Cloudflare Access should prompt for sign-in and then return authenticated gateway status and the allowed-model list. In Lokal AI, the Model Engine also shows a **Buka login Cloudflare Access** link after detecting an Access redirect; after signing in, return to the app and select **Periksa ulang koneksi**. If identity or configuration is missing, the Worker must reject the request.

The Worker route intercepts only `/api/*`; it does not replace the static site root or modify unrelated application paths.

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
cd gateway
npm test
```

This runs both the mocked Access/OpenAI Worker tests and the deployment-readiness validator tests.

The tests use generated temporary signing keys and a mocked OpenAI endpoint. They do not require a real Cloudflare account or OpenAI API key and do not make external API calls.

## Not enabled yet

- No real OpenAI API key is stored in this repository.
- No Cloudflare Access application or Worker has been created/deployed from this code.
- No DNS route has been changed.
- No public frontend request is sent to OpenAI by this release until the gateway route, Access policy, and secrets are configured.
- Claude and Gemini adapters are future work; they remain unavailable.
- No automatic local-to-cloud fallback is allowed.
