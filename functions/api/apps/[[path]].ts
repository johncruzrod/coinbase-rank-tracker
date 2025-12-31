/**
 * Cloudflare Pages Function - Crypto App Rankings API Proxy
 *
 * Handles /api/apps/* requests.
 * Proxies to VPC backend with API key authentication.
 * Uses CF Cache API for edge caching (5 min TTL - data updates hourly).
 */

interface Env {
  API_KEY: string;
  BACKEND_URL: string;
}

// Cache for 5 minutes at edge (backend updates hourly, this protects from traffic spikes)
const CACHE_TTL_SECONDS = 300;

// Cloudflare-specific types (not in standard lib)
declare const caches: { default: Cache };

interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, env, params } = context;

  const pathParts = params.path as string[];
  const subPath = pathParts ? pathParts.join('/') : '';

  // Get query string from original request
  const url = new URL(request.url);
  const queryString = url.search;

  const backendUrl = env.BACKEND_URL || 'https://api.genvise.com';
  const targetUrl = `${backendUrl}/api/cryptoapp/${subPath}${queryString}`;

  // Build cache key from upstream URL (shared across all users)
  const cacheKey = new Request(targetUrl, { method: 'GET' });
  const cache = caches.default;

  // 1. Check cache first (only for GET requests)
  if (request.method === 'GET') {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache', 'HIT');
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers,
      });
    }
  }

  // 2. Cache miss - fetch from origin
  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.API_KEY,
      },
    });

    const responseData = await backendResponse.text();

    // 3. Store successful GET responses in cache
    if (request.method === 'GET' && backendResponse.ok) {
      const cacheHeaders = new Headers();
      cacheHeaders.set('Content-Type', 'application/json');
      cacheHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);

      const cacheable = new Response(responseData, {
        status: backendResponse.status,
        headers: cacheHeaders,
      });

      // Non-blocking cache write
      context.waitUntil?.(cache.put(cacheKey, cacheable));
    }

    // 4. Return fresh response
    return new Response(responseData, {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=600`,
      },
    });
  } catch (error) {
    console.error('Backend request failed:', error);
    return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
