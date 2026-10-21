import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetDataURL, inlineJSON, secureStaticHTML } from '../scripts/security.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
let fixture;
before(() => {
  execFileSync(process.execPath, ['scripts/export-demo.mjs'], { cwd: root });
  fixture = mkdtempSync(join(tmpdir(), 'sja-security-'));
  mkdirSync(join(fixture, 'public/assets'), { recursive: true });
  writeFileSync(join(fixture, 'public/assets/safe.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(join(fixture, 'private.svg'), 'not a public asset');
  symlinkSync(join(fixture, 'private.svg'), join(fixture, 'public/assets/link.svg'));
});
after(() => { if (fixture) rmSync(fixture, { recursive: true, force: true }); });

test('contact JSON cannot break out of its inert script element', () => {
  const input = { email: '</script><script>globalThis.injected=true</script>', text: '<>&\u2028\u2029' };
  const encoded = inlineJSON(input);
  assert.equal(encoded.includes('<'), false);
  assert.equal(encoded.includes('>'), false);
  assert.equal(encoded.includes('&'), false);
  assert.deepEqual(JSON.parse(encoded), input);
  const html = `<meta charset="utf-8"><script type="application/json">${encoded}</script>`;
  assert.equal([...html.matchAll(/<script\b/g)].length, 1);
});

test('exported assets cannot traverse outside the public asset directory or follow escaping symlinks', () => {
  const publicRoot = join(fixture, 'public');
  assert.match(assetDataURL('/assets/safe.svg', publicRoot), /^data:image\/svg\+xml;base64,/);
  for (const path of ['/assets/../../private.svg', '/assets/%2e%2e/%2e%2e/private.svg', '/assets/link.svg']) {
    assert.throws(() => assetDataURL(path, publicRoot), /inside public\/assets/);
  }
  assert.throws(() => assetDataURL('/assets/..\\private.svg', publicRoot), /Invalid asset path/);
  assert.throws(() => assetDataURL('https://example.test/image.svg', publicRoot), /Invalid asset path/);
});

test('both portable and Pages exports authorize exact script/style contents without unsafe-inline', () => {
  for (const path of ['artifacts/SJA-demo.html', 'artifacts/SJA-review.html', '.pages/index.html', '.pages/review.html']) {
    const html = readFileSync(join(root, path), 'utf8');
    const policies = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/g)];
    assert.equal(policies.length, 1, path);
    const policy = policies[0][1];
    assert.match(policy, /default-src 'none'/);
    assert.match(policy, /connect-src 'none'/);
    assert.match(policy, /object-src 'none'/);
    assert.match(policy, /base-uri 'none'/);
    assert.match(policy, /form-action 'none'/);
    assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|frame-ancestors/);
    assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<style>'));
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
    for (const match of html.matchAll(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
      const digest = createHash('sha256').update(match[2]).digest('base64');
      assert.ok(policy.includes(`'sha256-${digest}'`), `Unmatched ${match[1]} hash in ${path}`);
    }
    assert.doesNotMatch(html, /(?:src|href)="\/assets\//);
  }
});

test('static CSP does not silently accept duplicate policies or missing placement', () => {
  assert.throws(() => secureStaticHTML('<html></html>'), /charset/);
  const once = secureStaticHTML('<meta charset="utf-8"><p>Review</p>');
  assert.throws(() => secureStaticHTML(once), /Duplicate/);
  assert.match(once, /script-src 'none'/);
});
