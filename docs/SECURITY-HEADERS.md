# Deploying the response headers

The public GitHub Pages demo at https://chrisjstonenz.github.io/SJA/ cannot set custom HTTP response headers. Its hash-based HTML CSP and referrer policy remain useful, but cannot prevent another site from framing the demo. A `_headers` file or a `frame-ancestors` meta tag would not fix that hosting limitation.

The existing Cloudflare Worker is the deployable fix. It applies the policy in [src/security-policy.js](../src/security-policy.js) to pages, assets, redirects and errors. `assets.run_worker_first: true` keeps requests from bypassing the Worker. This includes CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, HSTS, no-referrer, restricted browser permissions and cross-origin protections. Asset-service exceptions return a generic, non-cacheable error with the same policy.

## The six requested headers

| Header | Worker configuration | Live GitHub Pages result |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=31536000`; public HTTP requests also receive a 308 HTTPS redirect | Present: `max-age=31556952`, exceeding one year |
| `Content-Security-Policy` | Default deny; local scripts/styles and contact JSON; no framing, objects or form submission | No HTTP header; the export has a hash-based meta policy |
| `X-Frame-Options` | `DENY`, matching CSP `frame-ancestors 'none'` | Missing |
| `X-Content-Type-Options` | `nosniff`; correct asset content types retained | Missing |
| `Referrer-Policy` | `no-referrer` | No HTTP header; the export has a matching meta policy |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Missing |

The HTTPS redirect preserves the path/query and uses the request URL rather than forwarded headers. Only loopback hosts retain HTTP for local development. HSTS is effective only after a browser receives it over HTTPS; the redirect adds initial upgrade behavior without relying on a hosting default. No `includeSubDomains` or preload policy is added to a shared review hostname.

The HTTP checker reports every header mismatch on a response. It accepts an HSTS maximum age of at least one year, so a longer valid host policy is not incorrectly reported as weaker.

## Required Cloudflare access

The current cloud environment has no Cloudflare login or API-token binding. Wrangler's `whoami` confirms it is not authenticated. Deployment has not happened, and the Pages address still has the host's header limitations.

Supply these through cloud environment settings, never in chat or tracked files:

- **Environment variable:** `CLOUDFLARE_ACCOUNT_ID`, the account that should own this review Worker.
- **Secret:** `CLOUDFLARE_API_TOKEN`, scoped to that account with Workers Scripts Edit and Account Settings Read permissions. No production-domain or DNS permission is required for the `workers.dev` review address. The secret's allowed HTTPS destination is `api.cloudflare.com`.

These missing requirements have been saved in the environment configuration draft. Review and save the values there, then publish the environment as prompted. Saving the draft alone does not create credentials, apply them to the running environment or deploy the website.

An already authenticated developer machine can instead use its existing Wrangler login. There is no need to add GitHub secrets or create another deployment workflow.

## Deploy and verify

From `/workspace/SJA`, with the required bindings available:

```sh
npm test
npm run check
npm run deploy
```

Use the actual HTTPS `workers.dev` address printed by Wrangler; the account-specific hostname cannot be determined before deployment. Then run:

```sh
npm run check:headers -- https://ACTUAL-WORKER-HOSTNAME/
```

The checker examines real HTTP response headers on pages, static assets and an absent route, including HEAD responses. It rejects missing or weakened protections and unsafe redirects. Append `--check-post` to also confirm an empty POST to this static Worker's home URL returns 405; this is opt-in for other sites. The Node.js 24 command uses the configured environment proxy and system certificate trust while preserving TLS verification. A passing check verifies delivery; a successful dry run only verifies the bundle. In a network-restricted cloud environment, add the exact returned Worker hostname to allowed domains before verification. Do not use insecure TLS flags.

Only promote the new public review URL after this check passes and the existing browser checks confirm the contact links, portrait and layout still work. Keep the current Pages demo available during the transition. This deployment does not change `sjamortgages.co.nz` or its DNS.

## Validation completed

- 38 Node/Worker/security/verifier tests passed, including independent checks of all six requested header policies, rejection of each missing or weakened header, stronger/invalid HSTS values, public HTTPS upgrades and protected exception responses.
- 8 browser checks passed, covering contacts, layout, accessibility and CSP enforcement.
- The real local Worker passed 17 header checks across 19 HTTP requests, including clean-URL redirects, GET/HEAD, 404 and empty POST/405.
- A direct `workerd` runtime check confirmed a public HTTP URL returns 308 to its HTTPS equivalent with the same path/query.
- The Cloudflare deployment dry run passed. The live Pages address correctly failed HTTP-header verification; no replacement public Worker address has been deployed or verified yet.
