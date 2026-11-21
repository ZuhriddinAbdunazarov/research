// Netlify Function (v2) — NASA APOD proxy. Set NASA_API_KEY in the Netlify site environment.
import { getApod } from '../../lib/apod.mjs';

export default async () => {
  try {
    const data = await getApod(process.env.NASA_API_KEY);
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) {
    return Response.json({ error: `NASA APOD unavailable: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: ['/api/apod', '/explorer/api/apod'] };
