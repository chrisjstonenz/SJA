# SJA: verified financial-advice website comparison

Research date: 21 October 2026 (New Zealand client date).

## Method and access

After the environment network settings were applied, all three homepages below returned HTTP 200 over verified HTTPS. This review inspected their current server-delivered headings, navigation, calls to action, explanatory copy and disclosure links. It does not claim a full rendered visual, mobile-usability, performance or regulatory audit. Initial proxy-403 failures have been superseded by these successful fetches.

## Actual findings

| Site and source | Verified patterns on its homepage | Useful direction for SJA |
| --- | --- | --- |
| [Squirrel](https://www.squirrel.co.nz/) | Separates customer intentions into “Get a mortgage”, “Grow your money”, and “Fund your project”. Mortgage navigation then distinguishes first-home buyers, moving house, refinance, property investment, new build and business owners, with practical guides/calculators. A dedicated contact section pairs “Call now” with “Send us a message”. “Meet our friendly mortgage advisers” supplies a human introduction. Navigation exposes mortgage disclosures and legal information. | Organise Sue's services around the visitor's goal, explain her role personally, and repeat equally clear phone/email actions after helpful information. Keep disclosures accessible without overwhelming the main journey. |
| [Loan Market NZ](https://www.loanmarket.co.nz/) | Repeats “Enquire Now” and “Get Started”; “What path are you on?” links first home, next home, refinance, investment and construction goals. The “Why choose a Loan Market adviser?” section uses short, plain-language benefits including “Keeping it simple”. Homepage links expose a telephone action, adviser enquiry, calculators, publicly available disclosure, privacy and feedback/complaints. | Let a visitor recognise their situation quickly, explain how Sue helps in short concrete terms, and make the next conversation an easy step. Support trust with actual disclosure information, rather than unverified badges or promises. |
| [enable.me](https://www.enable.me/) | Repeats “Book a Consultation” across navigation and page content alongside telephone contact. Describes personal goals and continued support, offers a “MEET MY COACH” route, and separates service explanations from educational resources. Contact navigation includes adviser and location choices. Footer links expose disclosure, privacy and complaints information. | Emphasise a conversation with Sue about the visitor's own goals and a convenient meeting arrangement. Use a clear primary action and let informative sections lead back to it. |

The quoted labels above are brief evidence of interface patterns, not proposed SJA copy. The sites also display their own reviews, lender/access statements, fees or other business claims. None of those particulars should be carried across to SJA without independent evidence and approval. Observing a claim on a competitor's site is not a regulatory endorsement of that claim.

## Implications for the SJA concept

1. Use goal-based service cards and short explanations instead of a dense catalogue of loan products.
2. Keep Sue visible as the adviser and the person to contact. Pair call/email actions and repeat them at natural decision points.
3. Explain what the visitor can expect from the conversation and application process. The convenient-location offer should remain explicit.
4. Make public disclosure, privacy and complaint information easy to find. Verify actual identity, scope, relationships and fees before publishing facts.
5. Add practical information that resolves hesitation, while avoiding complicated calculators or forms unless they have a clear, supported purpose.
6. Use the requested navy, blue and white palette as SJA's own direction. This report makes no unverified assertion about competitors' visual palettes.
7. Keep open-banking/digital-process language conditional until Sue confirms the actual tools and evidence. These comparison pages do not establish SJA's provider, security model or turnaround.

## Hunuku implementation reference

The parent agent identified and cloned `HunukuWeb` at `/tmp/sja-hunuku-reference`. Its inspected `wrangler.jsonc` uses Cloudflare Workers with `public` assets and `src/worker.js`. This is the source of the same-structure implementation choice, rather than a guess based on the public website. The comparison review above did not require modifying that reference or the SJA application.

## Local evidence

The fetched HTML and extracted text are saved outside the checkout under `/workspace/scratch/` as `www-squirrel-co-nz.html/.txt`, `www-loanmarket-co-nz.html/.txt` and `www-enable-me.html/.txt`. No repository files were changed for this research update.
