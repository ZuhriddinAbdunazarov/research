// NASA APOD (Astronomy Picture of the Day) via api.nasa.gov — key stays on the server.
// Docs: https://api.nasa.gov/ (APOD section) · https://github.com/nasa/apod-api
import { fetchRetry } from './http.mjs';

export async function getApod(apiKey) {
  const key = apiKey || 'DEMO_KEY';
  const res = await fetchRetry(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&thumbs=true`, { timeoutMs: 40000, retries: 2 });
  if (!res.ok) throw new Error(`APOD HTTP ${res.status}${res.status === 429 ? ' (rate limit — set NASA_API_KEY)' : ''}`);
  const a = await res.json();
  if (!a || typeof a.title !== 'string' || typeof a.date !== 'string') throw new Error('Unexpected APOD response shape.');
  return {
    title: a.title,
    date: a.date,
    explanation: a.explanation || '',
    mediaType: a.media_type,
    url: a.url,
    hdurl: a.hdurl || null,
    thumbnailUrl: a.thumbnail_url || null,
    copyright: a.copyright ? a.copyright.trim() : null,
    pageUrl: `https://apod.nasa.gov/apod/ap${a.date.slice(2).replaceAll('-', '')}.html`,
    meta: { source: 'NASA APOD API (api.nasa.gov)', keyType: key === 'DEMO_KEY' ? 'DEMO_KEY' : 'personal', retrievedAt: new Date().toISOString() },
  };
}
