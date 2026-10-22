// Static Cloudflare Worker, following the asset-based HunukuWeb structure.
// This review build has no form endpoint, analytics or banking connection.
import { workerSecurityHeaders } from './security-policy.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    // HSTS only protects visits after a successful HTTPS response. Enforce the
    // initial upgrade too, while retaining HTTP for local development.
    if (url.protocol === 'http:' && !loopback) {
      url.protocol = 'https:';
      return new Response(null, {
        status: 308,
        headers: { ...workerSecurityHeaders, Location: url.href }
      });
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', {
        status: 405,
        headers: { ...workerSecurityHeaders, Allow: 'GET, HEAD' }
      });
    }
    let response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch {
      // Keep the policy on failures too, without exposing internal error details.
      response = new Response(request.method === 'HEAD' ? null : 'Service unavailable', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(workerSecurityHeaders)) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};
