// Unit tests: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVectors, parseRequest, InputError, jdToIso } from '../lib/horizons.mjs';
import { marsTime } from '../public/js/services/marsTime.js';
import { snapshotStateAt, distance, dateToJd, jdToDate } from '../public/js/services/ephemeris.js';
import { lunarPhase } from '../public/js/services/moonPhase.js';

const snap = JSON.parse(readFileSync(new URL('../public/data/ephemeris-snapshot.json', import.meta.url)));

test('parseVectors reads the Horizons CSV block', () => {
  const r = `Target body name: Mars (499)   {source: mar099}\nReference frame : Ecliptic of J2000.0\n$$SOE\n2461366.000000000, A.D. 2026-Nov-21 12:00:00.0000,  1.0E+08,  -2.5E+07,  3.0E+05,\n$$EOE\n`;
  const p = parseVectors(r);
  assert.deepEqual(p.jd, [2461366]);
  assert.deepEqual(p.xyz, [[1e8, -2.5e7, 3e5]]);
  assert.equal(p.source, 'mar099');
  assert.equal(jdToIso(2461366), '2026-11-21T12:00:00.000Z');
});

test('parseVectors throws on error text', () => {
  assert.throws(() => parseVectors('Cannot interpret date'), /no ephemeris table/);
});

test('parseRequest validates input', () => {
  const q = parseRequest(new URLSearchParams('start=2026-01-01T00:00:00Z&stop=2026-02-01T00:00:00Z&steps=31'));
  assert.equal(q.steps, 31);
  assert.throws(() => parseRequest(new URLSearchParams('start=nonsense')), InputError);
  assert.throws(() => parseRequest(new URLSearchParams('start=2026-01-02&stop=2026-01-01')), InputError);
  assert.throws(() => parseRequest(new URLSearchParams('start=2026-01-01&stop=2026-01-02&steps=99999')), InputError);
  assert.throws(() => parseRequest(new URLSearchParams('start=1800-01-01')), InputError);
});

test('Mars24 algorithm matches the published worked example (2000-01-06 00:00 UTC)', () => {
  // Reference values from https://www.giss.nasa.gov/tools/mars24/help/algorithm.html (Appendix, example C)
  const m = marsTime(new Date(Date.UTC(2000, 0, 6)));
  assert.ok(Math.abs(m.Ls - 277.18758) < 0.01, `Ls=${m.Ls}`);
  assert.ok(Math.abs(m.msd - 44795.99971) < 0.001, `MSD=${m.msd}`);
  assert.ok(Math.abs(m.mtc - 23.99304) < 0.01, `MTC=${m.mtc}`);
});

test('snapshot interpolation is exact at nodes and smooth between them', () => {
  const i = 1000;
  const t = jdToDate(snap.jd0 + i);
  const st = snapshotStateAt(snap, t);
  assert.deepEqual(st.mars.map(Math.round), snap.bodies.mars.slice(3 * i, 3 * i + 3));
  const mid = snapshotStateAt(snap, new Date(t.getTime() + 12 * 3600e3));
  const a = snapshotStateAt(snap, t), b = snapshotStateAt(snap, new Date(t.getTime() + 24 * 3600e3));
  // Earth–Moon distance stays in its physical range
  const em = distance(mid.earth, mid.moon);
  assert.ok(em > 356000 && em < 407000, `Earth-Moon ${em}`);
  assert.ok(distance(a.mars, mid.mars) < distance(a.mars, b.mars));
  assert.equal(snapshotStateAt(snap, new Date(Date.UTC(1990, 0, 1))), null);
});

test('lunar phase from ephemeris: 2024-04-08 eclipse new moon & 2024-04-23 full moon', () => {
  const n = snapshotStateAt(snap, new Date(Date.UTC(2024, 3, 8, 18, 21)));
  const f = snapshotStateAt(snap, new Date(Date.UTC(2024, 3, 23, 23, 49)));
  assert.ok(lunarPhase(n.earth, n.moon).illuminated < 0.01);
  assert.ok(lunarPhase(f.earth, f.moon).illuminated > 0.99);
  assert.equal(lunarPhase(f.earth, f.moon).name, 'Full Moon');
});

test('Earth–Mars distance at the 2020-10-06 close approach ≈ 62.07 million km', () => {
  const st = snapshotStateAt(snap, new Date(Date.UTC(2020, 9, 6, 14, 18)));
  const d = distance(st.earth, st.mars);
  assert.ok(Math.abs(d - 62.07e6) < 0.05e6, `d=${d}`);
});
