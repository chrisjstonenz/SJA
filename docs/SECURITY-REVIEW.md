# SJA demo security review

Reviewed 21 October 2026 (New Zealand client date).

## Scope and result

This review covers the public HTML, JavaScript, CSS, SVG assets, generated portable/GitHub Pages demos, Cloudflare Worker, export tooling and GitHub Pages workflow. The starting baseline was commit `c2fe607`; the fixes described below are the subsequent hardening changes.

The current product is a public static presentation. It has no login, submitted enquiry form, file upload, payment handling, banking connection, LLM integration or application API backend. It does not collect user financial information. Telephone and email links open the visitor's own applications.

No high/critical issue or remotely exploitable injection entry point was demonstrated in the inspected application. The findings below are configuration-bound weaknesses and defence-in-depth gaps. This is a scoped code review and targeted validation, not a penetration-test guarantee.

## Findings and changes

| Finding | Risk and boundary | Implemented change |
| --- | --- | --- |
| Email configuration accepted URI query delimiters | **Low; configuration-bound.** The old mailbox regex accepted `sue@example.com?bcc=audit%40example.net&x=`, which added a `bcc` field to the generated `mailto:` URI. The published contact configuration was benign, and visitors had no demonstrated way to alter it remotely. | [public/app.js](../public/app.js) validates a mailbox rather than a general URI, rejecting query/header delimiters. Contact text uses safe DOM text operations. |
| Embedded JSON protection verified and extended | **Existing protection, not a discovered breakout.** The original exporter already escaped `<`, which prevented a `</script>` breakout. Export data is repository-controlled. | [scripts/security.mjs](../scripts/security.mjs) centralises that protection, also escapes other HTML-significant characters and Unicode line separators, and adds a regression test preserving the original data. |
| Export asset paths needed a filesystem boundary | **Low; build-time hardening.** A permissive local asset loader could include files outside the intended asset directory if authored paths or symlinks were malicious. No public path-to-file endpoint exists. | The exporter resolves real paths, confines files to `public/assets`, rejects unsupported/path-delimiter cases and restricts accepted image extensions. Symlink escapes are checked against resolved paths. |
| Static exports lacked an enforced content policy | **Low; defence in depth.** No working DOM XSS sink was demonstrated, but injected content would have had fewer browser restrictions. | `secureStaticHTML` emits an early SHA-256 hash-based CSP for the exact exported scripts/styles. It permits no `unsafe-inline` or `unsafe-eval`, disables script/style attributes, connections, objects, embedded child frames, workers, base URLs and form submissions, and permits embedded image data only. A `no-referrer` meta policy is included. |
| Worker responses needed consistent security headers and method restriction | **Low; defence in depth.** The Worker is static, with no mutation endpoint. | [src/security-policy.js](../src/security-policy.js) centralises CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, no-referrer, HSTS, Permissions Policy and cross-origin policies. [src/worker.js](../src/worker.js) applies them and rejects methods other than GET/HEAD with 405. |
| CI build and deployment privileges could be reduced | **Medium hardening; build/deployment boundary.** The old job ran dependency setup hooks with deployment permissions available. No compromised package or successful exploit was found. | [.github/workflows/pages.yml](../.github/workflows/pages.yml) separates build and deployment jobs, uses narrowly scoped permissions, pins official actions to commit SHAs and disables persisted checkout credentials. Build/tests/export use Node built-ins without an npm dependency installation. [.gitignore](../.gitignore) covers common secret-bearing environment-file variants. |

## Browser injection and external content

- Dynamic contact text and goal descriptions are inserted as text. Goal and meeting content used in the email body is URL-encoded. Constant HTML fragments were replaced with safe DOM operations; there is no dynamic HTML-rendering sink for visitor input.
- No `eval`, dynamically constructed function, `document.write`, query/hash-to-HTML path, cross-window message handler or untrusted storage-to-HTML path was found in the inspected client code.
- External web references use HTTPS; the only other intended external schemes are the validated phone/email links. New-tab links use `noopener` and `noreferrer`. Third-party pages and PDFs are linked, not executed or rendered into the site's DOM at runtime.
- All three local SVGs were parsed and checked: no script, event handler, `foreignObject`, active embedded document, external reference or animation was found. Sue's portrait is a locally retained original WebP, not a remote runtime dependency.
- Generated exports contain the assets they need; they do not need a third-party script, font service or runtime API. The Worker version allows same-origin assets/contact configuration under its separate policy.

## Prompt injection

There is no model, assistant, retrieval pipeline or AI tool-calling feature in this application, so no direct or indirect application prompt-injection execution path was identified. Text in the research documents is ordinary content, not a model instruction channel.

This result does not extend to a future AI feature. External websites, PDFs, SVG metadata and user-supplied documents would need to remain untrusted data; their text must not be allowed to control system instructions, credentials, tool calls or outbound requests. The current review does not establish any future model integration as secure.

## Validation and limits

- `npm audit` reported **0 vulnerabilities across 94 audited packages** at review time. The declared dependencies are development tools; an advisory scan is not proof that every dependency is harmless.
- Structural checks verified the public markup, external-link protections and inactive SVG content. A targeted scan of 27 tracked/new text files found no private-key, GitHub-token, AWS-access-key or API-secret signature; this is not a full historical secret audit.
- Node and browser regression coverage includes malicious contact values, script-boundary payloads, path/symlink escapes, injected scripts/handlers, external requests, base URLs and form submissions. **Final results: 8/8 Node/Worker/security tests and 8/8 browser checks passed, with no skips.** The browser observed enforcement events for injected scripts, event handlers, external image/frame requests, fetch connections, base tags and form submissions, while the intended demo continued to function. The Cloudflare deployment dry run also passed. A clean publishing copy without `node_modules` passed all 8 Node/security tests and generated the demo without installing dependencies.
- Sensitive-path checks for `.env`, `.git`, package and source files returned 404 on the tested local/demo paths. A remote traversal probe returned 503, which is inconclusive and was not treated as evidence of file disclosure or successful traversal protection.
- The remote browser check encountered the environment's proxy certificate-trust failure. TLS verification was preserved. Verified HTTPS fetches worked; local browser security tests exercise the generated demo, rather than proving every aspect of remote delivery.

## Hosting differences and remaining risk

**GitHub Pages does not run the Cloudflare Worker and does not serve its security headers.** The exported meta CSP and referrer policy are active in the Pages build, but meta cannot supply `frame-ancestors`, X-Frame-Options, `nosniff`, Permissions Policy, COOP or CORP. The Worker header implementation must not be described as deployed to Pages.

Cross-origin framing remains possible on Pages. Its present impact is low because the demo has no login, financial-data form or authenticated action. Enforcing the stronger response headers requires a production host/proxy that supports them, such as the existing Cloudflare Worker implementation; that Worker deployment has not been performed as part of this review.

The subsequent security-header follow-up adds a generic, non-cacheable Worker response for asset-service exceptions, preserving the full policy even on that failure path. Complete-header regression checks now cover successful responses, redirects, 304s, 404s, 405s, upstream 500s and thrown exceptions. `npm run check:headers -- <site-URL>` verifies real HTTP headers across pages, assets and missing routes, including HEAD and redirect hops; an optional `--check-post` verifies an empty POST is rejected. See [deployment steps and current authentication blocker](SECURITY-HEADERS.md). The Pages limitation remains until an authenticated Worker deployment is verified.

A further check of the six requested headers confirmed their Worker values are already restrictive. Public HTTP requests now receive a 308 upgrade to HTTPS before assets are served, preserving path/query; loopback HTTP remains available for development. Tests independently enforce the six policy requirements and reject each missing/weakened response header. The verifier accepts valid HSTS durations of at least one year and lists all mismatches on a response. The live Pages host has a valid one-year-plus HSTS header but still lacks the other five requested HTTP headers.

The review demo is intentionally publicly viewable; no-index metadata is not access control. GitHub authentication is still required to change the repository. At review time, `main` had no branch protection and the Pages environment had no reviewer requirement. Those optional repository/environment protections remain an owner-side decision; this review did not change account settings. Before adding authentication, application submission, payments, uploads or AI features, reassess their new trust boundaries and data-handling requirements.
