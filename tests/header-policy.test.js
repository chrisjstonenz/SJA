import test from 'node:test';
import assert from 'node:assert/strict';
import { workerSecurityHeaders } from '../src/security-policy.js';

// These expectations are independent of the policy object used by the Worker
// and HTTP verifier, so weakening that shared object cannot make both pass.
const headers = new Headers(workerSecurityHeaders);

test('HSTS requires at least one year without claiming control of subdomains or preloading', () => {
  const policy = headers.get('Strict-Transport-Security');
  assert.equal(typeof policy, 'string');
  const directives = policy.split(';').map((part) => part.trim());
  const ages = directives.filter((part) => /^max-age=/i.test(part));
  assert.equal(ages.length, 1);
  assert.match(ages[0], /^max-age=\d+$/i);
  assert.ok(Number(ages[0].split('=')[1]) >= 31536000);
  assert.doesNotMatch(policy, /includeSubDomains|preload/i);
});

test('CSP permits the current local assets and contact API while denying unneeded execution and embedding', () => {
  const policy = headers.get('Content-Security-Policy');
  assert.equal(typeof policy, 'string');
  const directives = new Map();
  for (const part of policy.split(';').map((value) => value.trim()).filter(Boolean)) {
    const [name, ...sources] = part.split(/\s+/);
    assert.equal(directives.has(name), false, `Duplicate CSP directive: ${name}`);
    directives.set(name, sources);
  }
  const expected = {
    'default-src': ["'none'"],
    'script-src': ["'self'"],
    'script-src-attr': ["'none'"],
    'style-src': ["'self'"],
    'style-src-attr': ["'none'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'worker-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'frame-ancestors': ["'none'"]
  };
  for (const [name, sources] of Object.entries(expected)) {
    assert.deepEqual(directives.get(name), sources, name);
  }
  for (const name of ['script-src-elem', 'style-src-elem']) {
    if (directives.has(name)) assert.deepEqual(directives.get(name), ["'self'"], name);
  }
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|\*/i);
});

test('framing protection denies all embedding, including the same origin', () => {
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
});

test('content types are protected against MIME sniffing', () => {
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
});

test('referrer policy prevents disclosing the page URL to other destinations', () => {
  assert.equal(headers.get('Referrer-Policy'), 'no-referrer');
});

test('permissions policy denies camera, microphone and location even to the page itself', () => {
  const policy = headers.get('Permissions-Policy');
  assert.equal(typeof policy, 'string');
  const directives = policy.split(',').map((part) => part.trim());
  for (const feature of ['camera', 'microphone', 'geolocation']) {
    const matches = directives.filter((part) => part.startsWith(`${feature}=`));
    assert.deepEqual(matches, [`${feature}=()`], feature);
  }
});
