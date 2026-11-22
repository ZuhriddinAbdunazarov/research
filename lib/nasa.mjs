// NASA Open APIs used by the Mission Mars game (the key stays on the server: NASA_API_KEY).
// Docs: https://api.nasa.gov/ (DONKI, InSight) · https://ccmc.gsfc.nasa.gov/tools/DONKI/
import { fetchRetry } from './http.mjs';

const TYPES = new Set(['FLR', 'CME', 'GST', 'SEP']);
const day = (d) => d.toISOString().slice(0, 10);

/** DONKI space weather (solar flares FLR, coronal mass ejections CME, geomagnetic storms GST, particle events SEP).
 *  Tries api.nasa.gov with the key first, then NASA CCMC's own DONKI server (no key). Max 30 days. */
export async function getDonki(type, apiKey, days = 30) {
  type = String(type || 'FLR').toUpperCase();
  if (!TYPES.has(type)) throw new Error('type must be FLR, CME, GST or SEP');
  const end = new Date(), start = new Date(end.getTime() - Math.min(30, Math.max(1, days)) * 86400000);
  const q = `startDate=${day(start)}&endDate=${day(end)}`;
  const urls = [
    { src: 'api.nasa.gov DONKI', url: `https://api.nasa.gov/DONKI/${type}?${q}&api_key=${encodeURIComponent(apiKey || 'DEMO_KEY')}` },
    { src: 'NASA CCMC DONKI', url: `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/${type}?${q}` },
  ];
  const errors = [];
  for (const { src, url } of urls) {
    try {
      const r = await fetchRetry(url, { timeoutMs: 25000, retries: 1 });
      if (!r.ok) { errors.push(`${src}: HTTP ${r.status}`); continue; }
      const items = await r.json();
      if (!Array.isArray(items)) { errors.push(`${src}: unexpected response`); continue; }
      return { type, startDate: day(start), endDate: day(end), items, meta: { source: src, retrievedAt: new Date().toISOString() } };
    } catch (e) { errors.push(`${src}: ${e.message}`); }
  }
  throw new Error(errors.join(' · '));
}

/** Real Mars weather measured by NASA's InSight lander (Elysium Planitia). The mission ended in 2022;
 *  the API returns its last published week of sols. */
export async function getInsight(apiKey) {
  const r = await fetchRetry(`https://api.nasa.gov/insight_weather/?feedtype=json&ver=1.0&api_key=${encodeURIComponent(apiKey || 'DEMO_KEY')}`, { timeoutMs: 25000, retries: 2 });
  if (!r.ok) throw new Error(`InSight HTTP ${r.status}`);
  const j = await r.json();
  const sols = (j.sol_keys || []).map((k) => {
    const s = j[k] || {};
    return {
      sol: Number(k), date: (s.First_UTC || '').slice(0, 10), season: s.Season || null,
      tempMinC: s.AT?.mn ?? null, tempAvgC: s.AT?.av ?? null, tempMaxC: s.AT?.mx ?? null,
      pressurePa: s.PRE?.av ?? null, windMs: s.HWS?.av ?? null, windDir: s.WD?.most_common?.compass_point ?? null,
    };
  });
  if (!sols.length) throw new Error('InSight returned no sols');
  return { sols, meta: { source: 'NASA InSight Mars Weather Service API (api.nasa.gov)', lander: 'InSight, Elysium Planitia', retrievedAt: new Date().toISOString() } };
}
