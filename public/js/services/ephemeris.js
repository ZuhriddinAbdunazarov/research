// Ephemeris service: LIVE JPL Horizons (via our proxy) with a transparent fallback to the
// cached Horizons snapshot (data/ephemeris-snapshot.json). Every result carries `meta.mode`
// ('live' | 'snapshot') so the UI can label it honestly.
import { cachedJson, fetchJson, storeGet, storeSet, ApiError } from './api.js';
import { CONST } from '../data/bodies.js';

const API = 'api/ephemeris';
let snapshotPromise = null;

export const BODY_KEYS = ['earth', 'moon', 'mars'];

// ---------- vector helpers ----------
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const norm = (v) => Math.hypot(v[0], v[1], v[2]);
/** D = √((x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²) */
export const distance = (a, b) => norm(sub(a, b));

export const kmTo = (km, unit) => (unit === 'mi' ? km / CONST.MILE_KM : unit === 'au' ? km / CONST.AU_KM : km);
export const lightSeconds = (km) => km / CONST.C_KM_S;

// ---------- snapshot ----------
export function loadSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = fetchJson('data/ephemeris-snapshot.json', { timeout: 60000 }).then((s) => {
      if (!s?.bodies?.mars || !Number.isFinite(s.jd0) || !Number.isInteger(s.n)) throw new ApiError('Ephemeris snapshot is malformed.');
      for (const k of BODY_KEYS) if (s.bodies[k].length !== s.n * 3) throw new ApiError(`Snapshot body ${k} has wrong length.`);
      return s;
    });
    snapshotPromise.catch(() => { snapshotPromise = null; });
  }
  return snapshotPromise;
}

export const dateToJd = (d) => d.getTime() / 86400000 + 2440587.5;
export const jdToDate = (jd) => new Date((jd - 2440587.5) * 86400000);

export function snapshotRange(s) {
  return { start: jdToDate(s.jd0), stop: jdToDate(s.jd0 + s.n - 1) };
}

/** 4-point Lagrange interpolation of daily snapshot vectors at Date `d`. */
export function snapshotStateAt(s, d) {
  const x = dateToJd(d) - s.jd0;
  if (x < 0 || x > s.n - 1) return null;
  let i0 = Math.floor(x) - 1;
  i0 = Math.max(0, Math.min(s.n - 4, i0));
  const t = x - i0;
  // Lagrange basis for nodes 0,1,2,3
  const L = [
    -((t - 1) * (t - 2) * (t - 3)) / 6,
    (t * (t - 2) * (t - 3)) / 2,
    -(t * (t - 1) * (t - 3)) / 2,
    (t * (t - 1) * (t - 2)) / 6,
  ];
  const out = {};
  for (const k of BODY_KEYS) {
    const a = s.bodies[k];
    const v = [0, 0, 0];
    for (let j = 0; j < 4; j++) {
      const base = (i0 + j) * 3;
      v[0] += L[j] * a[base];
      v[1] += L[j] * a[base + 1];
      v[2] += L[j] * a[base + 2];
    }
    out[k] = v;
  }
  return out;
}

function snapshotMeta(s) {
  return { ...s.meta, mode: 'snapshot', center: s.meta.center, frame: s.meta.frame };
}

// ---------- live ----------
function markLive(meta) {
  storeSet('mm:lastLive', meta.retrievedAt);
}
export const lastLiveUpdate = () => storeGet('mm:lastLive');

function validateLive(d, expectedRows) {
  if (!d || !Array.isArray(d.times) || !d.bodies) throw new ApiError('Malformed ephemeris response.');
  for (const k of BODY_KEYS) {
    const arr = d.bodies[k];
    if (!Array.isArray(arr) || arr.length !== d.times.length) throw new ApiError(`Ephemeris for ${k} is missing or misaligned.`);
    if (arr.some((v) => !Array.isArray(v) || v.length !== 3 || v.some((n) => !Number.isFinite(n)))) throw new ApiError(`Ephemeris for ${k} has invalid numbers.`);
  }
  if (expectedRows && d.times.length < expectedRows) throw new ApiError('Ephemeris response has too few rows.');
  return d;
}

async function liveSeries(start, stop, steps, { verify = false, signal } = {}) {
  const q = new URLSearchParams({ start: start.toISOString(), stop: stop.toISOString(), steps: String(steps) });
  if (verify) q.set('verify', '1');
  const d = validateLive(await cachedJson(`${API}?${q}`, { timeout: 120000, signal }, { ttlMs: 6 * 3600_000 }), 1);
  markLive(d.meta);
  return d;
}

/**
 * Positions of Earth, Moon, Mars at one instant.
 * @returns {Promise<{time:Date, bodies:{earth,moon,mars}, meta, verification, liveError?:string}>}
 */
export async function getStateAt(date, { preferLive = true, verify = true, signal } = {}) {
  let liveError = null;
  if (preferLive) {
    try {
      const d = await liveSeries(date, new Date(date.getTime() + 60_000), 1, { verify, signal });
      return {
        time: new Date(d.times[0]),
        bodies: Object.fromEntries(BODY_KEYS.map((k) => [k, d.bodies[k][0]])),
        next: d.times.length > 1 ? { time: new Date(d.times[1]), bodies: Object.fromEntries(BODY_KEYS.map((k) => [k, d.bodies[k][1]])) } : null,
        meta: d.meta,
        verification: d.verification ? { ...d.verification, distanceKm: d.verification.distancesKm?.[0] } : null,
      };
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      liveError = e.message;
    }
  }
  const s = await loadSnapshot();
  const st = snapshotStateAt(s, date);
  if (!st) {
    const r = snapshotRange(s);
    throw new ApiError(`Live Horizons data is unavailable${liveError ? ` (${liveError})` : ''}, and ${date.toISOString().slice(0, 10)} is outside the cached snapshot (${r.start.toISOString().slice(0, 10)} – ${r.stop.toISOString().slice(0, 10)}).`);
  }
  const t2 = new Date(date.getTime() + 60_000);
  const st2 = snapshotStateAt(s, t2);
  return { time: date, bodies: st, next: st2 ? { time: t2, bodies: st2 } : null, meta: snapshotMeta(s), verification: null, liveError };
}

/**
 * Time series between two dates with `steps` equal intervals (steps+1 samples).
 * @returns {Promise<{times:Date[], bodies:{earth:number[][],moon:number[][],mars:number[][]}, meta, liveError?:string}>}
 */
export async function getSeries(start, stop, steps, { preferLive = true, signal } = {}) {
  let liveError = null;
  if (preferLive) {
    try {
      const d = await liveSeries(start, stop, steps, { signal });
      return { times: d.times.map((t) => new Date(t)), bodies: d.bodies, meta: d.meta };
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      liveError = e.message;
    }
  }
  const s = await loadSnapshot();
  const times = [];
  const bodies = { earth: [], moon: [], mars: [] };
  const dt = (stop - start) / steps;
  for (let i = 0; i <= steps; i++) {
    const t = new Date(start.getTime() + dt * i);
    const st = snapshotStateAt(s, t);
    if (!st) {
      const r = snapshotRange(s);
      throw new ApiError(`Live Horizons data is unavailable${liveError ? ` (${liveError})` : ''}, and the requested period extends outside the cached snapshot (${r.start.toISOString().slice(0, 10)} – ${r.stop.toISOString().slice(0, 10)}).`);
    }
    times.push(t);
    for (const k of BODY_KEYS) bodies[k].push(st[k]);
  }
  return { times, bodies, meta: snapshotMeta(s), liveError };
}

/** Full daily snapshot as arrays (for analytics / 3D orbits) — no network beyond the static file. */
export async function snapshotDaily() {
  const s = await loadSnapshot();
  const times = new Array(s.n);
  const bodies = { earth: new Array(s.n), moon: new Array(s.n), mars: new Array(s.n) };
  for (let i = 0; i < s.n; i++) {
    times[i] = jdToDate(s.jd0 + i);
    for (const k of BODY_KEYS) { const a = s.bodies[k]; bodies[k][i] = [a[3 * i], a[3 * i + 1], a[3 * i + 2]]; }
  }
  return { times, bodies, meta: snapshotMeta(s) };
}

/**
 * Find min & max Mars–Moon distance in a series, then refine each extremum with a finer query
 * (±1 coarse step, 96 sub-steps) — Moon's ~384 000 km wobble makes coarse sampling miss the true extremum.
 */
export async function findExtrema(series, { preferLive = true, signal } = {}) {
  const d = series.times.map((_, i) => distance(series.bodies.mars[i], series.bodies.moon[i]));
  let iMin = 0, iMax = 0;
  d.forEach((v, i) => { if (v < d[iMin]) iMin = i; if (v > d[iMax]) iMax = i; });
  const refine = async (i, pick) => {
    const a = series.times[Math.max(0, i - 1)];
    const b = series.times[Math.min(series.times.length - 1, i + 1)];
    if (b - a < 2 * 60_000) return { time: series.times[i], km: d[i], refined: false };
    try {
      const f = await getSeries(a, b, 96, { preferLive: preferLive && series.meta.mode === 'live', signal });
      let best = 0;
      const fd = f.times.map((_, j) => distance(f.bodies.mars[j], f.bodies.moon[j]));
      fd.forEach((v, j) => { if (pick(v, fd[best])) best = j; });
      return { time: f.times[best], km: fd[best], refined: true, resolutionMin: (b - a) / 96 / 60000 };
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      return { time: series.times[i], km: d[i], refined: false };
    }
  };
  const [min, max] = await Promise.all([refine(iMin, (v, b) => v < b), refine(iMax, (v, b) => v > b)]);
  return { distances: d, min, max };
}
