import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { workerSecurityHeaders } from '../src/security-policy.js';
import { verifyHeaders } from '../scripts/verify-headers.mjs';

const contentTypes = {
  '/': 'text/html', '/review': 'text/html', '/styles.css': 'text/css',
  '/review.css': 'text/css', '/app.js': 'text/javascript',
  '/contact.json': 'application/json', '/assets/sja-header.svg': 'image/svg+xml'
};

async function fixture(t, override = () => false) {
  const seen = [];
  const server = createServer((request, response) => {
    seen.push({ method: request.method, path: request.url });
    for (const [name, value] of Object.entries(workerSecurityHeaders)) response.setHeader(name, value);
    if (override(request, response)) return;
    if (request.method === 'POST') {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain' });
      return response.end('Method not allowed');
    }
    if (request.url === '/review.html') {
      response.writeHead(307, { Location: '/review' });
      return response.end();
    }
    const type = contentTypes[request.url];
    response.writeHead(type ? 200 : 404, type ? { 'Content-Type': type } : {});
    response.end(type ? 'fixture resource' : '');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return { url: `http://127.0.0.1:${server.address().port}/`, seen };
}

test('the HTTP verifier checks assets, redirects, missing routes and opt-in empty POST', async (t) => {
  const { url, seen } = await fixture(t);
  const result = await verifyHeaders(url, { checkPost: true });
  assert.deepEqual(result, { checks: 17, requests: 19 });
  assert.ok(seen.some((request) => request.method === 'GET' && request.path === '/review'));
  assert.ok(seen.some((request) => request.method === 'HEAD' && request.path === '/review'));
  assert.deepEqual(seen.filter((request) => request.method === 'POST'), [{ method: 'POST', path: '/' }]);
});

test('the HTTP verifier rejects missing headers even when the page includes a meta policy', async (t) => {
  const { url } = await fixture(t, (_request, response) => {
    response.removeHeader('Content-Security-Policy');
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<meta http-equiv="Content-Security-Policy" content="default-src none">');
    return true;
  });
  await assert.rejects(verifyHeaders(url), /Content-Security-Policy/);
});

const weakenedHeaders = {
  'Strict-Transport-Security': 'max-age=0',
  'Content-Security-Policy': "default-src *; script-src 'unsafe-inline'; frame-ancestors *",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'none',
  'Referrer-Policy': 'unsafe-url',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)'
};

for (const [name, weakened] of Object.entries(weakenedHeaders)) {
  for (const missing of [true, false]) {
    test(`the HTTP verifier rejects ${missing ? 'missing' : 'weakened'} ${name}`, async (t) => {
      const { url } = await fixture(t, (_request, response) => {
        if (missing) response.removeHeader(name);
        else response.setHeader(name, weakened);
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<h1>Presentation concept</h1>');
        return true;
      });
      await assert.rejects(verifyHeaders(url), new RegExp(name));
    });
  }
}

test('the HTTP verifier accepts an HSTS duration longer than the one-year minimum', async (t) => {
  const { url } = await fixture(t, (_request, response) => {
    response.setHeader('Strict-Transport-Security', 'max-age=63072000');
    return false;
  });
  const result = await verifyHeaders(url);
  assert.deepEqual(result, { checks: 16, requests: 18 });
});

test('the HTTP verifier rejects malformed and duplicate HSTS max-age directives', async (t) => {
  for (const value of ['max-age=-1', 'max-age=31536000seconds', 'max-age=31536000; max-age=0']) {
    const { url } = await fixture(t, (_request, response) => {
      response.setHeader('Strict-Transport-Security', value);
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end('Presentation concept');
      return true;
    });
    await assert.rejects(verifyHeaders(url), /Strict-Transport-Security/);
  }
});

test('the HTTP verifier checks headers on redirects and refuses off-origin redirects', async (t) => {
  for (const missingHeader of [true, false]) {
    const { url } = await fixture(t, (_request, response) => {
      if (missingHeader) response.removeHeader('X-Frame-Options');
      response.writeHead(302, { Location: 'https://example.invalid/' });
      response.end();
      return true;
    });
    await assert.rejects(verifyHeaders(url), missingHeader ? /X-Frame-Options/ : /outside the original origin/);
  }
});

test('the HTTP verifier rejects wrong resource types and false-success missing routes', async (t) => {
  for (const path of ['/app.js', '/__sja_header_check_missing__']) {
    const { url, seen } = await fixture(t, (request, response) => {
      if (request.url !== path) return false;
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end('fallback HTML');
      return true;
    });
    await assert.rejects(verifyHeaders(url), path === '/app.js' ? /Expected Content-Type/ : /Expected 404, received 200/);
    assert.equal(seen.some((request) => request.method === 'POST'), false);
  }
});

test('the HTTP verifier rejects insecure public URLs and credential-bearing URLs before fetching', async () => {
  let requests = 0;
  const fetchImpl = () => { requests++; throw new Error('unexpected fetch'); };
  for (const url of ['http://example.com/', 'ftp://example.com/', 'https://user:password@example.com/', 'https://example.com/?token=value']) {
    await assert.rejects(verifyHeaders(url, { fetchImpl }), /HTTPS|credentials/);
  }
  assert.equal(requests, 0);
});
