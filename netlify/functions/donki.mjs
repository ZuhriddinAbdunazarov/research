// Netlify Function (v2) — NASA DONKI space weather for the Mission Mars game: /api/donki?type=FLR|CME|GST|SEP
import { getDonki } from '../../lib/nasa.mjs';

export default async (req) => {
  const type = new URL(req.url).searchParams.get('type') || 'FLR';
  try {
    const data = await getDonki(type, process.env.NASA_API_KEY);
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=1800', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return Response.json({ error: `NASA DONKI unavailable: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: ['/api/donki', '/explorer/api/donki'] };
