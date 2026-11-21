// Netlify Function (v2) — JPL Horizons proxy. Same logic as server.mjs /api/ephemeris.
import { getEphemeris, parseRequest, InputError } from '../../lib/horizons.mjs';

export default async (req) => {
  const url = new URL(req.url);
  let q;
  try { q = parseRequest(url.searchParams); } catch (e) {
    return Response.json({ error: e.message }, { status: e instanceof InputError ? 400 : 500 });
  }
  try {
    const data = await getEphemeris(q);
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) {
    return Response.json({ error: `Could not retrieve ephemeris from JPL Horizons: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: ['/api/ephemeris', '/explorer/api/ephemeris'] };
