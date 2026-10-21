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
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(workerSecurityHeaders)) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};
