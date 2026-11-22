// Netlify Function (v2) — NASA image pass-through for the Mission Mars game.
// images-assets.nasa.gov sends no CORS headers, so a WebGL game cannot load its pictures directly.
// Only images from the NASA Image and Video Library and APOD are allowed (no open proxy).
const ALLOWED = ['images-assets.nasa.gov', 'apod.nasa.gov'];

export default async (req) => {
  const target = new URL(req.url).searchParams.get('url') || '';
  let u;
  try { u = new URL(target); } catch { return new Response('Bad "url" parameter', { status: 400 }); }
  if (u.protocol !== 'https:' || !ALLOWED.includes(u.hostname) || !/\.(jpe?g|png)$/i.test(u.pathname)) {
    return new Response(`Only JPG/PNG images from ${ALLOWED.join(' or ')} are allowed`, { status: 400 });
  }
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return new Response(`NASA image HTTP ${r.status}`, { status: 502 });
    return new Response(r.body, {
      headers: {
        'Content-Type': r.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(`NASA image unavailable: ${e.message}`, { status: 502 });
  }
};

export const config = { path: ['/api/image', '/explorer/api/image'] };
