// Static Cloudflare Worker, following the asset-based HunukuWeb structure.
// This review build has no form endpoint, analytics or banking connection.
import { workerSecurityHeaders } from './security-policy.js';

export default {
  async fetch(request, env) {
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
