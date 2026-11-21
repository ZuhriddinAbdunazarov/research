// NASA/JPL Horizons client (server-side only: the Horizons API sends no CORS headers).
// Docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html
import { fetchRetry } from './http.mjs';
//
// Every body is requested with IDENTICAL settings so the vectors can be subtracted directly:
//   EPHEM_TYPE=VECTORS, CENTER=500@10 (Sun body centre), REF_SYSTEM=ICRF, REF_PLANE=ECLIPTIC
//   (ecliptic & mean equinox of J2000.0), OUT_UNITS=KM-S, VEC_CORR=NONE (geometric, no light-time),
//   TIME_TYPE=UT, and the same START/STOP/STEP so every row shares the same timestamp.

export const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

export const BODIES = {
  earth: { id: '399', name: 'Earth' },
  moon: { id: '301', name: 'Moon' },
  mars: { id: '499', name: 'Mars' },
};

export const FRAME = {
  center: '500@10',
  centerName: 'Sun (body centre, NAIF 10)',
  refSystem: 'ICRF',
  refPlane: 'ECLIPTIC',
  frameName: 'Ecliptic & mean equinox of J2000.0 (ICRF-aligned)',
  units: 'km',
  timeScale: 'UT',
  correction: 'Geometric states (no light-time or aberration correction)',
};

const MIN_TIME = Date.UTC(1950, 0, 1);
const MAX_TIME = Date.UTC(2099, 11, 31);
export const MAX_STEPS = 2000;

export class InputError extends Error {}

/** Validate and normalise client input. Returns { start: Date, stop: Date, steps: int }. */
export function parseRequest(params) {
  const start = new Date(params.get('start') || '');
  const stopRaw = params.get('stop');
  const stop = stopRaw ? new Date(stopRaw) : new Date(start.getTime() + 60_000);
  let steps = params.get('steps') == null ? 1 : Number(params.get('steps'));
  if (Number.isNaN(start.getTime())) throw new InputError('Parameter "start" must be an ISO-8601 date/time (UTC).');
  if (Number.isNaN(stop.getTime())) throw new InputError('Parameter "stop" must be an ISO-8601 date/time (UTC).');
  if (start < MIN_TIME || stop > MAX_TIME) throw new InputError('Dates must be between 1950-01-01 and 2099-12-31.');
  if (stop <= start) throw new InputError('"stop" must be later than "start".');
  if (!Number.isInteger(steps) || steps < 1 || steps > MAX_STEPS) throw new InputError(`"steps" must be an integer between 1 and ${MAX_STEPS}.`);
  const verify = params.get('verify') === '1';
  return { start, stop, steps, verify };
}

function hzTime(d) {
  // Horizons calendar format, minute precision is plenty for UI input but keep seconds.
  return `'${d.toISOString().slice(0, 19).replace('T', ' ')}'`;
}

function buildUrl(command, center, start, stop, steps) {
  const q = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${center}'`,
    START_TIME: hzTime(start),
    STOP_TIME: hzTime(stop),
    STEP_SIZE: `'${steps}'`, // integer = number of equal intervals → steps+1 rows
    REF_SYSTEM: `'${FRAME.refSystem}'`,
    REF_PLANE: `'${FRAME.refPlane}'`,
    VEC_TABLE: "'1'",
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    TIME_TYPE: "'UT'",
    CSV_FORMAT: "'YES'",
    VEC_LABELS: "'NO'",
  });
  return `${HORIZONS_API}?${q}`;
}

/** Parse the CSV block between $$SOE and $$EOE. Returns { jd:number[], xyz:number[][], source }. */
export function parseVectors(result) {
  const soe = result.indexOf('$$SOE');
  const eoe = result.indexOf('$$EOE');
  if (soe < 0 || eoe < 0) {
    const msg = result.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4).join(' ');
    throw new Error(`Horizons returned no ephemeris table: ${msg.slice(0, 300)}`);
  }
  const jd = [];
  const xyz = [];
  for (const line of result.slice(soe + 5, eoe).split('\n')) {
    const cols = line.split(',').map((s) => s.trim());
    if (cols.length < 5 || !cols[0]) continue;
    const t = Number(cols[0]);
    const v = [Number(cols[2]), Number(cols[3]), Number(cols[4])];
    if (!Number.isFinite(t) || v.some((n) => !Number.isFinite(n))) throw new Error('Malformed Horizons vector row.');
    jd.push(t);
    xyz.push(v);
  }
  if (!jd.length) throw new Error('Horizons ephemeris table was empty.');
  const src = /Target body name:\s*([^{\n]+)\{source:\s*([^}]+)\}/.exec(result);
  const frame = /Reference frame\s*:\s*([^\n]+)/.exec(result);
  return { jd, xyz, target: src ? src[1].trim() : null, source: src ? src[2].trim() : null, frame: frame ? frame[1].trim() : null };
}

export const jdToIso = (jd) => new Date(Math.round((jd - 2440587.5) * 86400000)).toISOString();

// Limit concurrent requests to JPL (Horizons asks clients not to flood the service).
const MAX_CONCURRENT = 2;
let active = 0;
const waiting = [];
async function withSlot(fn) {
  if (active >= MAX_CONCURRENT) await new Promise((r) => waiting.push(r));
  active++;
  try { return await fn(); } finally { active--; waiting.shift()?.(); }
}

function fetchJson(url, timeoutMs = 30000) {
  return withSlot(() => fetchJsonNow(url, timeoutMs));
}

async function fetchJsonNow(url, timeoutMs) {
  const res = await fetchRetry(url, { timeoutMs, retries: 3, headers: { 'User-Agent': 'mars-moon-explorer/1.0' } });
  if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`Horizons error: ${body.error}`);
  if (typeof body.result !== 'string') throw new Error('Unexpected Horizons response shape.');
  return body;
}

/**
 * Fetch heliocentric vectors of Earth, Moon and Mars at identical timestamps.
 * If verify=true, also fetches Mars relative to the Moon's centre (500@301) as an independent cross-check.
 */
export async function getEphemeris({ start, stop, steps, verify }) {
  const keys = Object.keys(BODIES);
  const results = await Promise.all(keys.map((k) => fetchJson(buildUrl(BODIES[k].id, FRAME.center, start, stop, steps))));
  const parsed = results.map((r) => parseVectors(r.result));
  const n = parsed[0].jd.length;
  parsed.forEach((p, i) => {
    if (p.jd.length !== n || p.jd.some((t, j) => Math.abs(t - parsed[0].jd[j]) > 1e-9)) {
      throw new Error(`Timestamp mismatch between Horizons tables (${keys[i]}).`);
    }
  });
  const bodies = {};
  const sources = {};
  keys.forEach((k, i) => { bodies[k] = parsed[i].xyz; sources[k] = parsed[i].source; });

  let verification = null;
  if (verify) {
    try {
      const r = await fetchJson(buildUrl(BODIES.mars.id, '500@301', start, stop, steps));
      const p = parseVectors(r.result);
      verification = {
        description: 'Independent Horizons query: Mars position with the observer at the Moon\'s centre (CENTER=500@301).',
        distancesKm: p.xyz.map(([x, y, z]) => Math.hypot(x, y, z)),
      };
    } catch (e) {
      verification = { error: String(e.message || e) };
    }
  }

  return {
    meta: {
      source: 'NASA/JPL Horizons API',
      apiVersion: results[0].signature?.version || null,
      endpoint: HORIZONS_API,
      exampleQuery: buildUrl(BODIES.mars.id, FRAME.center, start, stop, steps),
      ...FRAME,
      ephemerisSources: sources,
      frameReported: parsed[0].frame,
      retrievedAt: new Date().toISOString(),
      mode: 'live',
    },
    times: parsed[0].jd.map(jdToIso),
    jd: parsed[0].jd,
    bodies,
    verification,
  };
}

/** Small LRU-ish in-memory cache. Ephemerides for a given query never change, so a long TTL is fine. */
export function createCache(max = 200, ttlMs = 12 * 3600_000) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return null;
      if (Date.now() - hit.t > ttlMs) { map.delete(key); return null; }
      map.delete(key); map.set(key, hit);
      return hit.v;
    },
    set(key, v) {
      map.set(key, { v, t: Date.now() });
      while (map.size > max) map.delete(map.keys().next().value);
    },
  };
}
