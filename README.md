# SJA Mortgages website concept

A blue-and-white presentation demo for Sue: goal-led lending information, prominent call/email actions, a meeting at a convenient location, and a proposed digital lending experience. This is review copy, not a live financial advice service or a completed compliance approval.

The application follows the same Cloudflare Workers structure as HunukuWeb: static assets in `public/`, a small Worker in `src/worker.js`, and configuration in `wrangler.jsonc`. It has no framework build step, database or server-side contact form. The architectural SVG is original artwork supplied with the demo.

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

Keep both files from `artifacts/` together and open `SJA-demo.html` directly in a browser. The export embeds the CSS, JavaScript and illustration, so it needs no local server or internet connection. `artifacts/` and `.pages/` are generated and ignored by Git; regenerate them after source changes.

## Contact details

`public/contact.json` is intentionally empty:

```json
{
  "phone": "",
  "phoneDisplay": "",
  "email": ""
}
```

Use the **same verified phone number and email address as Sue's current website**. The current site could not be retrieved because requests returned a network-proxy 403, so this concept does not invent those details. Until they are verified and entered, the contact actions open an explanatory review dialog rather than pretending to call or email Sue.

Once configured, the call action uses a `tel:` link and the meeting action opens the visitor's email application with a suggested message. Re-run the tests and regenerate the demo after changing the JSON. There is no submission endpoint, personal financial data collection, analytics, or bank connection. Digital tools and open banking remain a conditional proposal until Sue confirms the actual service and provider.

## Review the copy and sources

Read [docs/CONTENT-REVIEW.md](docs/CONTENT-REVIEW.md) and the demo's **Review notes** page before presentation or publication. They distinguish proposed wording from verified information and track the remaining checks.

Access to the existing SJA site, comparison sites and current official FMA material was blocked during this work. Existing-site copy and contact details therefore remain unverified, and competitor findings must not be presented as completed research. The concept's new copy follows the user's brief. The FMA review is issue-spotting rather than confirmation against current retrieved guidance or an assertion that the site is launch-compliant. Confirm Sue's advice scope, disclosures, licensing details, fees/commissions, complaints information, contact details and digital-service claims before a live launch.

## Publish a review demo

`.github/workflows/pages.yml` prepares the static export and deploys it to GitHub Pages on a push to `main`, or a manual workflow run. It installs the pinned dependencies, runs the Worker tests, and generates `.pages/`.

In the GitHub repository, set **Settings → Pages → Source → GitHub Actions** before running the workflow. A successful deployment reports the actual review URL in its job/environment output. No live URL is claimed until that run succeeds; creating the workflow alone does not publish the demo. No automatic deployment was performed as part of creating this concept.

For the Hunuku-style Cloudflare deployment, `npm run deploy` publishes the Worker and assets using an authorised Cloudflare account. Keep the dry run (`npm run check`) separate from that explicit publishing step. The Worker adds review-oriented security headers and requests that search engines do not index the pages. The static export also marks the concept for no indexing, but neither approach makes a public demo private.
