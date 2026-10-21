import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

test('review pages remain non-indexable and restrict scripts to local assets', async () => {
  const response = await worker.fetch(new Request('https://demo.example/'), {
    ASSETS: { fetch: () => new Response('<h1>SJA concept</h1>', { headers: { 'Content-Type': 'text/html' } }) }
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<h1>SJA concept</h1>');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
  assert.match(response.headers.get('Content-Security-Policy'), /script-src 'self'/);
  assert.match(response.headers.get('Content-Security-Policy'), /form-action 'none'/);
  assert.match(response.headers.get('Content-Security-Policy'), /object-src 'none'/);
  assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.match(response.headers.get('Content-Security-Policy'), /base-uri 'none'/);
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
});

test('missing pages keep their 404 status rather than pretending to be application routes', async () => {
  const response = await worker.fetch(new Request('https://demo.example/missing'), {
    ASSETS: { fetch: () => new Response('Not found', { status: 404 }) }
  });
  assert.equal(response.status, 404);
  assert.equal(await response.text(), 'Not found');
});

test('asset type and privacy protections survive worker processing', async () => {
  const response = await worker.fetch(new Request('https://demo.example/contact.json'), {
    ASSETS: { fetch: () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }) }
  });
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.match(response.headers.get('Permissions-Policy'), /geolocation=\(\)/);
});

test('the static Worker refuses methods that could submit or change data', async () => {
  let assetRequests = 0;
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const response = await worker.fetch(new Request('https://demo.example/api/contact', { method }), {
      ASSETS: { fetch: () => { assetRequests++; return new Response('unexpected'); } }
    });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(assetRequests, 0);
});
