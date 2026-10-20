import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.SJA_BASE_URL || 'http://127.0.0.1:8787';
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.SJA_BROWSER_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  mkdirSync('test-results', { recursive: true });
});
after(async () => { await browser?.close(); });

test('desktop loads all assets without script errors or external requests', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], failed = [], external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  page.on('request', (request) => { if (!request.url().startsWith(base)) external.push(request.url()); });
  const response = await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  assert.match(response.headers()['x-robots-tag'], /noindex/);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('.hero-art img').evaluate((image) => image.complete && image.naturalWidth > 0), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(external, []);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.screenshot({ path: 'test-results/desktop-opening.png' });
  await page.close();
});

test('phone and tablet layouts fit and mobile navigation works with keyboard', async () => {
  const page = await browser.newPage();
  for (const width of [320, 390, 600, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Homepage overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Open menu' }).click();
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('#main-nav a[href="#about"]').click();
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
  await page.goto(base);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.screenshot({ path: 'test-results/mobile-opening.png' });
  await page.close();
});

test('unverified contacts never produce invented phone or email destinations', async () => {
  const page = await browser.newPage();
  await page.route('**/contact.json', (route) => route.fulfill({ json: { phone: '', email: '' } }));
  await page.goto(base, { waitUntil: 'networkidle' });
  const trigger = page.locator('.hero-actions [data-contact]').first();
  await trigger.click();
  assert.equal(await page.locator('#contact-dialog').evaluate((element) => element.open), true);
  assert.equal(await page.locator('#contact-pending').isVisible(), true);
  assert.equal(await page.locator('#call-link').isVisible(), false);
  assert.equal(await page.locator('#email-link').isVisible(), false);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#contact-dialog').evaluate((element) => element.open), false);
  assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
  await page.close();
});

test('verified contact configuration creates correct call and meeting email links', async () => {
  const page = await browser.newPage();
  await page.route('**/contact.json', (route) => route.fulfill({ json: { phone: '+64 00 000 0000', phoneDisplay: 'Test contact', email: 'sue@example.test' } }));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('[data-goal="Buying my first home"]').click();
  await page.locator('#meeting-place').selectOption('A phone or video conversation');
  assert.equal(await page.locator('#call-link').getAttribute('href'), 'tel:+64000000000');
  const email = await page.locator('#email-link').getAttribute('href');
  assert.match(email, /^mailto:sue@example\.test\?/);
  const query = new URLSearchParams(email.split('?')[1]);
  assert.match(query.get('body'), /Buying my first home/);
  assert.match(query.get('body'), /A phone or video conversation/);
  assert.equal(await page.locator('#contact-pending').isVisible(), false);
  await page.close();
});

test('FAQs expand, digital explanation opens, review routes and links resolve', async () => {
  const page = await browser.newPage();
  await page.goto(base);
  const faq = page.locator('details').first();
  await faq.locator('summary').click();
  assert.equal(await faq.evaluate((element) => element.open), true);
  await page.locator('.digital-copy a').click();
  assert.equal(await page.locator('#open-banking-question').evaluate((element) => element.open), true);
  const review = await page.goto(`${base}/review.html`);
  assert.equal(review.status(), 200);
  assert.equal(await page.getByRole('checkbox').count(), 9);
  await page.getByRole('checkbox').first().check();
  assert.equal(await page.getByRole('checkbox').first().isChecked(), true);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Review overflow at ${width}px`);
  }
  const links = await page.locator('a[href^="#"]').evaluateAll((items) => items.map((item) => item.getAttribute('href').slice(1)).filter(Boolean));
  for (const id of links) assert.equal(await page.locator(`[id="${id}"]`).count(), 1, `Missing review anchor ${id}`);
  const missing = await page.request.get(`${base}/not-a-real-page`);
  assert.equal(missing.status(), 404);
  await page.close();
});

test('main and review pages have no serious accessibility findings', async () => {
  const page = await browser.newPage();
  const axe = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
  for (const path of ['/', '/review.html']) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(axe);
    const result = await page.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    const violations = result.violations.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.map((node) => node.target) }));
    assert.deepEqual(violations, [], `Accessibility issues at ${path}: ${JSON.stringify(violations)}`);
  }
  await page.close();
});
