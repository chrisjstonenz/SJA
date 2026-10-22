# SJA Mortgages website concept

A blue-and-white presentation demo for Sue: goal-led lending information, prominent call/email actions, a meeting at a convenient location, and a proposed digital lending experience. This is review copy, not a live financial advice service or a completed compliance approval.

The application follows the same Cloudflare Workers structure as HunukuWeb: static assets in `public/`, a small Worker in `src/worker.js`, and configuration in `wrangler.jsonc`. It has no framework build step, database or server-side contact form. The site now uses the user-supplied **SJA Header.svg** brand master, its exact blues and Georgia/Arial styling, and Sue’s original portrait from her existing About page. See [brand asset provenance](docs/BRAND-ASSETS.md). The architectural illustration remains original concept artwork.

## Run locally

Use Node.js 24 and the existing checkout. Cloud tasks already have an isolated environment; a separate Git worktree is unnecessary.

```sh
cd /workspace/SJA
npm ci
npm run dev
```

The development server listens on port **8787**. The wrapper in `scripts/cloudflare.mjs` keeps Wrangler's configuration/cache under the ignored `.wrangler/` directory when the cloud machine's home directory is read-only. Dependencies are pinned in `package-lock.json`.

## Validate

```sh
npm test
npm run check
```

`npm test` runs the Worker tests. `npm run check` checks JavaScript syntax and performs a Cloudflare deployment **dry run**, writing generated output to `.output/`; it does not publish anything.

`npm run check:headers -- https://YOUR-DEPLOYED-HOST/` verifies the actual HTTP security headers on a deployed Worker, including error responses. It intentionally fails against the current GitHub Pages address, which cannot supply these custom headers. See [deploying the response headers](docs/SECURITY-HEADERS.md) for the required account access and deployment steps.

With the development server running in another terminal:

```sh
npm run test:browser
```

Browser checks exercise responsive layouts, navigation, contact states, review controls, asset loading, and automated accessibility checks. Screenshots are written to the ignored `test-results/` directory. The runner uses `/usr/bin/chromium` when available, or Playwright's installed Chromium. Set `SJA_BROWSER_PATH` to use another Chromium executable and `SJA_BASE_URL` to test a different development server. Automated accessibility checks complement a human review of the finished site.

## Make a portable review demo

```sh
npm run demo
```

This generates:

- `artifacts/SJA-demo.html` — the self-contained website concept.
- `artifacts/SJA-review.html` — the companion copy, source and launch review.
- `.pages/index.html`, `.pages/review.html` and `.pages/.nojekyll` — the static GitHub Pages export.

Keep both files from `artifacts/` together and open `SJA-demo.html` directly in a browser. The export embeds the CSS, JavaScript, supplied logo, Sue’s portrait and illustration, so it needs no local server or internet connection. `artifacts/` and `.pages/` are generated and ignored by Git; regenerate them after source changes.

## Contact details

`public/contact.json` uses Sue’s mobile number and email from the existing website, retrieved on 21 October 2026:

```json
{
  "phone": "+64276187878",
  "phoneDisplay": "027 618 7878",
  "email": "sue@sjamortgages.co.nz"
}
```

These are the **same mobile number and email address as Sue’s current website**. Phone and email calls to action become direct `tel:` and `mailto:` links. The general conversation buttons offer a meeting preference and a prefilled email. If contact configuration is missing or invalid, the demo explains that instead of inventing a destination.

Once configured, the call action uses a `tel:` link and the meeting action opens the visitor's email application with a suggested message. Re-run the tests and regenerate the demo after changing the JSON. There is no submission endpoint, personal financial data collection, analytics, or bank connection. Digital tools and open banking remain a conditional proposal until Sue confirms the actual service and provider.

## Review the copy and sources

Read [docs/CONTENT-REVIEW.md](docs/CONTENT-REVIEW.md) and the demo's **Review notes** page before presentation or publication. They distinguish proposed wording from verified information and track the remaining checks.

Website access was restored after the initial prototype. The concept now draws on SJA’s published experience, services, contact details and disclosure documents, with new wording from the brief. [Design research](docs/DESIGN-RESEARCH.md) records comparisons with Squirrel, Loan Market and enable.me. The content review checks current official FMA disclosure and fair-dealing guidance, with final factual approval and document corrections still for Sue. It is not legal signoff or FMA approval. Open banking remains a conditional proposal until the actual provider and service are confirmed.

## Publish a review demo

`.github/workflows/pages.yml` prepares the static export and deploys it to GitHub Pages on a push to `main`, or a manual workflow run. Its build job uses only Node built-ins, without installing dependencies, runs the Worker/security tests, and generates `.pages/`. A separate deployment job receives the Pages permissions; actions are pinned to exact commits.

GitHub Pages is now configured to use GitHub Actions. The review demo is at **https://chrisjstonenz.github.io/SJA/**. A successful deployment reports that URL in its job/environment output; the workflow also provides a downloadable two-page review artifact. Pushes to `main` republish the static export. For a fresh instance of this project, enable **Settings → Pages → Source → GitHub Actions** if automatic enablement is denied.

For the Hunuku-style Cloudflare deployment, `npm run deploy` publishes the Worker and assets using an authorised Cloudflare account. Keep the dry run (`npm run check`) separate from that explicit publishing step. The Worker adds restrictive security headers and requests that search engines do not index the pages. The static export adds a hash-based Content Security Policy and a no-referrer policy through HTML metadata. GitHub Pages cannot apply the Worker’s response headers, including anti-framing protection; use a host or proxy that supports those headers for equivalent production protection. Neither a CSP nor no-index metadata makes a public demo private. See [the security review](docs/SECURITY-REVIEW.md) for findings, fixes, prompt-injection scope and remaining hosting limitations.
