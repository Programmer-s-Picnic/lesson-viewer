/**
 * OPTIONAL Cloudflare Worker proxy for a private/self-hosted Judge0 server.
 *
 * Create Worker secrets instead of putting keys in browser JavaScript:
 *   JUDGE0_URL          e.g. https://your-judge0.example.com
 *   JUDGE0_AUTH_TOKEN   optional
 *
 * Then set the Browser IDE's Compiler settings URL to your Worker URL.
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const incoming = new URL(request.url);
    const upstreamBase = (env.JUDGE0_URL || '').replace(/\/$/, '');
    if (!upstreamBase) return new Response('JUDGE0_URL is not configured', { status: 500, headers: cors });

    const upstream = new URL(upstreamBase + incoming.pathname + incoming.search);
    const headers = new Headers(request.headers);
    if (env.JUDGE0_AUTH_TOKEN) headers.set('X-Auth-Token', env.JUDGE0_AUTH_TOKEN);

    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow'
    });

    const out = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) out.set(key, value);
    return new Response(response.body, { status: response.status, headers: out });
  }
};
