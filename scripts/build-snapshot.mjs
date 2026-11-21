// Builds public/data/ephemeris-snapshot.json from REAL JPL Horizons vectors.
// The snapshot lets the site work offline / on static hosting; the UI always labels it as
// "cached Horizons snapshot" with its retrieval date, never as live data.
//   node scripts/build-snapshot.mjs [startYear] [endYear]
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEphemeris, FRAME } from '../lib/horizons.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const y0 = Number(process.argv[2] || 2020);
const y1 = Number(process.argv[3] || 2035);

const allJd = [];
const bodies = { earth: [], moon: [], mars: [] };
let meta = null;

// Horizons limits table length; fetch one year (daily rows) at a time, sequentially (be polite to JPL).
for (let y = y0; y <= y1; y++) {
  const start = new Date(Date.UTC(y, 0, 1));
  const stop = new Date(Date.UTC(y + 1, 0, 1));
  const days = Math.round((stop - start) / 86400000);
  process.stdout.write(`Horizons ${y} (${days} d)… `);
  const d = await getEphemeris({ start, stop, steps: days, verify: false });
  const skipLast = y < y1 ? 1 : 0; // next year starts on the same instant
  for (let i = 0; i < d.jd.length - skipLast; i++) {
    allJd.push(d.jd[i]);
    for (const k of Object.keys(bodies)) for (const c of d.bodies[k][i]) bodies[k].push(Math.round(c));
  }
  meta = d.meta;
  console.log('ok');
}

const out = {
  meta: {
    source: 'NASA/JPL Horizons API',
    endpoint: meta.endpoint,
    center: FRAME.centerName,
    frame: FRAME.frameName,
    refSystem: FRAME.refSystem,
    units: 'km (rounded to 1 km)',
    timeScale: 'UT',
    correction: FRAME.correction,
    ephemerisSources: meta.ephemerisSources,
    stepDays: 1,
    retrievedAt: new Date().toISOString(),
    note: 'Daily geometric heliocentric vectors. Intermediate times use 4-point Lagrange interpolation (error ≲ 100 km).',
  },
  jd0: allJd[0],
  n: allJd.length,
  bodies,
};
// sanity: equally spaced
for (let i = 1; i < allJd.length; i++) if (Math.abs(allJd[i] - allJd[i - 1] - 1) > 1e-6) throw new Error(`Gap at index ${i}`);

const file = path.join(ROOT, 'public', 'data', 'ephemeris-snapshot.json');
await writeFile(file, JSON.stringify(out));
console.log(`Wrote ${out.n} epochs → ${file}`);
