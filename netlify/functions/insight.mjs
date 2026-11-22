// Netlify Function (v2) — real Mars weather from NASA InSight for the Mission Mars game: /api/insight
import { getInsight } from '../../lib/nasa.mjs';

export default async () => {
  try {
    const data = await getInsight(process.env.NASA_API_KEY);
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return Response.json({ error: `NASA InSight weather unavailable: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: ['/api/insight', '/explorer/api/insight'] };
