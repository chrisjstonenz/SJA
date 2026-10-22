import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { workerSecurityHeaders } from '../src/security-policy.js';

function assertSecurityHeaders(response) {
  for (const [name, value] of Object.entries(workerSecurityHeaders)) {
    assert.equal(response.headers.get(name), value, `${response.status}: ${name}`);
  }
}

test('review pages remain non-indexable and restrict scripts to local assets', async () => {
  const response = await worker.fetch(new Request('https://demo.example/'), {
    ASSETS: { fetch: () => new Response('<h1>SJA concept</h1>', { headers: { 'Content-Type': 'text/html' } }) }
  });
  assert.equal(response.status, 200);
  assertSecurityHeaders(response);
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
  assertSecurityHeaders(response);
  assert.equal(await response.text(), 'Not found');
});

test('asset type and privacy protections survive worker processing', async () => {
  const response = await worker.fetch(new Request('https://demo.example/contact.json'), {
    ASSETS: { fetch: () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }) }
  });
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assertSecurityHeaders(response);
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
    assertSecurityHeaders(response);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(assetRequests, 0);
});

test('security headers override weaker asset policies on successes, redirects, cache responses and errors', async () => {
  for (const status of [200, 301, 304, 404, 500]) {
    const body = status === 304 ? null : 'Asset response';
    const response = await worker.fetch(new Request('https://demo.example/resource'), {
      ASSETS: { fetch: () => new Response(body, {
        status,
        headers: {
          Location: '/resource-next',
          'Content-Type': 'text/plain',
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Security-Policy': 'default-src *'
        }
      }) }
    });
    assert.equal(response.status, status);
    assertSecurityHeaders(response);
    assert.equal(response.headers.get('Content-Type'), 'text/plain');
    assert.equal(response.headers.get('Location'), '/resource-next');
    assert.equal(await response.text(), body || '');
  }
});

test('HEAD requests reach the asset binding unchanged and preserve a bodyless response', async () => {
  const request = new Request('https://demo.example/review', { method: 'HEAD' });
  let forwarded;
  const response = await worker.fetch(request, {
    ASSETS: { fetch: (incoming) => {
      forwarded = incoming;
      return new Response(null, { headers: { 'Content-Type': 'text/html', 'Content-Length': '123' } });
    } }
  });
  assert.equal(forwarded, request);
  assert.equal(forwarded.method, 'HEAD');
  assert.equal(response.status, 200);
  assertSecurityHeaders(response);
  assert.equal(response.headers.get('Content-Length'), '123');
  assert.equal(await response.text(), '');
});

test('asset exceptions become generic protected errors without leaking internals', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(new Request('https://demo.example/', { method }), {
      ASSETS: { fetch: () => { throw new Error('private upstream details and credentials'); } }
    });
    assert.equal(response.status, 500);
    assertSecurityHeaders(response);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Content-Type'), 'text/plain; charset=utf-8');
    assert.equal(await response.text(), method === 'HEAD' ? '' : 'Service unavailable');
  }
});
