import { pathToFileURL } from 'node:url';
import { workerSecurityHeaders } from '../src/security-policy.js';

const redirects = new Set([301, 302, 303, 307, 308]);
const resources = [
  ['', ['text/html']],
  ['review.html', ['text/html']],
  ['styles.css', ['text/css']],
  ['review.css', ['text/css']],
  ['app.js', ['text/javascript', 'application/javascript']],
  ['contact.json', ['application/json']],
  ['assets/sja-header.svg', ['image/svg+xml']]
];

function siteURL(input) {
  const url = new URL(input);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('Use HTTPS for public sites, or HTTP on a loopback host for development.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The site URL must not contain credentials, a query, or a fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function assertHeaders(response) {
  const failures = [];
  for (const [name, expected] of Object.entries(workerSecurityHeaders)) {
    const actual = response.headers.get(name);
    if (name === 'Strict-Transport-Security') {
      const maxAge = actual?.split(';').map((part) => part.trim()).filter((part) => /^max-age\s*=/i.test(part)) ?? [];
      const value = maxAge.length === 1 && /^max-age\s*=\s*(\d+)$/i.exec(maxAge[0]);
      if (!value || !Number.isSafeInteger(Number(value[1])) || Number(value[1]) < 31536000) {
        failures.push(`${name} must specify one max-age of at least 31536000 seconds.`);
      }
    } else if (actual !== expected) {
      failures.push(`${name} does not match the Worker security policy.`);
    }
  }
  if (failures.length) throw new Error(failures.join(' '));
  const policy = response.headers.get('Content-Security-Policy');
  for (const directive of ["default-src 'none'", "script-src 'self'", "frame-ancestors 'none'"]) {
    if (!policy.split(';').map((part) => part.trim()).includes(directive)) {
      throw new Error(`Content-Security-Policy must enforce ${directive}.`);
    }
  }
  if (/unsafe-inline|unsafe-eval/.test(policy)) throw new Error('Content-Security-Policy permits unsafe scripts.');
}

// This checks HTTP response headers, including redirects; HTML metadata cannot
// satisfy these checks. POST is opt-in and sends no data to the site's home URL.
export async function verifyHeaders(input, { checkPost = false, onResult = () => {}, fetchImpl = fetch } = {}) {
  const base = siteURL(input);
  let requests = 0;
  let checks = 0;

  async function check(path, method, expectedStatus, contentTypes) {
    let url = new URL(path, base);
    const label = `${method} ${url.pathname}`;
    try {
      for (let hop = 0; hop <= 5; hop++) {
        const response = await fetchImpl(url, {
          method,
          redirect: 'manual',
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
          ...(method === 'POST' ? { body: '' } : {})
        });
        requests++;
        try {
          assertHeaders(response);
          if (redirects.has(response.status)) {
            if (method === 'POST') throw new Error('POST must return 405 without redirecting.');
            const location = response.headers.get('Location');
            if (!location) throw new Error('Redirect has no Location header.');
            const next = new URL(location, url);
            if (next.origin !== base.origin || next.username || next.password) {
              throw new Error('Refusing a redirect outside the original origin or containing credentials.');
            }
            if (hop === 5) throw new Error('Too many redirects.');
            url = next;
            continue;
          }
          if (response.status !== expectedStatus) {
            throw new Error(`Expected ${expectedStatus}, received ${response.status}.`);
          }
          if (contentTypes) {
            const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
            if (!contentTypes.includes(type)) throw new Error(`Expected Content-Type ${contentTypes.join(' or ')}.`);
          }
          if (method === 'POST' && response.headers.get('Allow') !== 'GET, HEAD') {
            throw new Error('405 must declare Allow: GET, HEAD.');
          }
          const body = await response.arrayBuffer();
          if (method === 'HEAD' && body.byteLength !== 0) throw new Error('HEAD returned a body.');
          if (method === 'GET' && expectedStatus === 200 && body.byteLength === 0) {
            throw new Error('GET returned an empty resource.');
          }
          checks++;
          onResult(`${label}: ${response.status}, security headers verified`);
          return;
        } finally {
          if (response.body && !response.bodyUsed) await response.body.cancel();
        }
      }
    } catch (error) {
      const code = error.cause?.code ? ` (${error.cause.code})` : '';
      throw new Error(`${label}: ${error.message}${code}`, { cause: error });
    }
  }

  for (const [path, types] of resources) {
    for (const method of ['GET', 'HEAD']) await check(path, method, 200, types);
  }
  for (const method of ['GET', 'HEAD']) await check('__sja_header_check_missing__', method, 404);
  if (checkPost) await check('', 'POST', 405, ['text/plain']);
  return { checks, requests };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const checkPost = args.includes('--check-post');
  const urls = args.filter((arg) => arg !== '--check-post');
  if (urls.length !== 1 || urls[0].startsWith('--')) {
    console.error('Usage: npm run check:headers -- <site-URL> [--check-post]');
    process.exitCode = 1;
  } else {
    try {
      const result = await verifyHeaders(urls[0], { checkPost, onResult: console.log });
      console.log(`Passed ${result.checks} checks across ${result.requests} HTTP requests.`);
    } catch (error) {
      console.error(`Header verification failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
