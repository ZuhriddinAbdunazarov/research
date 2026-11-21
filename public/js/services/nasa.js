// NASA Image and Video Library (images-api.nasa.gov — public, CORS-enabled, no key) and APOD (via our proxy).
import { cachedJson, fetchJson, ApiError, storeGet, storeSet } from './api.js';

const IMAGES_API = 'https://images-api.nasa.gov/search';

function pick(links, rel, sizeHint) {
  if (!Array.isArray(links)) return null;
  const imgs = links.filter((l) => l.render === 'image' && typeof l.href === 'string');
  const bySize = sizeHint && imgs.find((l) => l.href.includes(`~${sizeHint}.`));
  return (bySize || imgs.find((l) => l.rel === rel) || imgs[0])?.href || null;
}

/** Normalise one Collection+JSON item; returns null if it lacks the fields we need. */
function normalise(item) {
  const d = item?.data?.[0];
  if (!d || !d.nasa_id || !d.title) return null;
  const thumb = pick(item.links, 'preview', 'thumb');
  if (!thumb) return null;
  return {
    nasaId: d.nasa_id,
    title: d.title,
    description: (d.description_508 || d.description || '').replace(/<[^>]*>/g, '').trim(),
    date: d.date_created || null,
    center: d.center || null,
    credit: d.photographer || d.secondary_creator || d.center || 'NASA',
    keywords: d.keywords || [],
    thumb,
    medium: pick(item.links, 'alternate', 'medium') || thumb,
    large: pick(item.links, 'alternate', 'large') || pick(item.links, 'alternate', 'medium') || thumb,
    pageUrl: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`,
  };
}

/** Search NASA images. Returns { items, totalHits, hasNext, query, retrievedAt }. */
export async function searchImages(query, { page = 1, pageSize = 24, yearStart, signal } = {}) {
  const q = new URLSearchParams({ q: query, media_type: 'image', page: String(page), page_size: String(pageSize) });
  if (yearStart) q.set('year_start', String(yearStart));
  const body = await cachedJson(`${IMAGES_API}?${q}`, { timeout: 25000, signal }, { ttlMs: 60 * 60_000 });
  const c = body?.collection;
  if (!c || !Array.isArray(c.items)) throw new ApiError('Unexpected response from the NASA Image Library.');
  return {
    items: c.items.map(normalise).filter(Boolean),
    totalHits: c.metadata?.total_hits ?? null,
    hasNext: Array.isArray(c.links) && c.links.some((l) => l.rel === 'next'),
    query,
    retrievedAt: new Date().toISOString(),
  };
}

/** First usable image for a query (used for mission cards). Persisted in localStorage for 7 days. */
export async function firstImage(query, { signal } = {}) {
  const key = `mm:img:${query}`;
  const hit = storeGet(key);
  if (hit && Date.now() - hit.t < 7 * 86400_000) return hit.v;
  const r = await searchImages(query, { pageSize: 5, signal });
  const v = r.items[0] || null;
  storeSet(key, { v, t: Date.now() });
  return v;
}

/** Astronomy Picture of the Day through our server proxy (API key stays server-side). */
export async function getApod({ signal } = {}) {
  const a = await cachedJson('api/apod', { timeout: 120000, signal }, { ttlMs: 60 * 60_000 });
  if (!a || typeof a.title !== 'string') throw new ApiError('Unexpected APOD response.');
  return a;
}

export { fetchJson };
