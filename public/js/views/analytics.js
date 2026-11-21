import { MARS, MOON, EARTH, CONST, prop } from '../data/bodies.js';
import { MISSIONS } from '../data/missions.js';
import { snapshotDaily, distance, norm } from '../services/ephemeris.js';
import { getChart, COLORS, chartCard } from '../ui/charts.js';
import { fmt, fmtDate, esc, cite, loading, errorBox } from '../ui/format.js';

export async function render(el) {
  const charts = [];
  el.innerHTML = `<div class="wrap">
    <div class="page-head">
      <div class="kicker violet">Analytics dashboard</div>
      <h1>Scientific Data Analytics</h1>
      <p>Interactive charts built from JPL Horizons ephemerides and NASA reference data. Every chart states its units, source and time range.</p>
    </div>
    <div id="kpis" class="grid g4">${loading('Loading Horizons snapshot…')}</div>
    <section class="section grid" id="ephemCharts"></section>
    <section class="section grid g2">
      ${chartCard({ id: 'aGrav', title: 'Surface gravity comparison', desc: 'Acceleration due to gravity at the surface (equatorial for Mars).', units: 'm/s²', source: `NASA NSSDCA — ${cite('earthFact', 'Earth')}, ${cite('marsFact', 'Mars')}, ${cite('moonFact', 'Moon')}`, cls: 'short' })}
      ${chartCard({ id: 'aTemp', title: 'Temperature comparison', desc: 'Representative minimum, mean (where defined) and maximum surface temperatures.', units: '°C', source: `NASA Science — ${cite('marsFacts', 'Mars facts')}, ${cite('moonFacts', 'Moon facts')}; ${cite('marsFact', 'Mars fact sheet')} (mean)`, cls: 'short' })}
      ${chartCard({ id: 'aMissions', title: 'Missions in this explorer by decade', desc: 'Launch decade of the curated missions listed in the Missions section (not a census of all missions ever flown).', units: 'number of missions / programmes', source: 'MARS × MOON mission list — official agency pages linked per mission', range: '1960s – 2020s', cls: 'short' })}
      ${chartCard({ id: 'aOrbit', title: 'Orbital information', desc: 'Orbital eccentricity — how far each orbit departs from a circle. Mars\' eccentric orbit explains its unequal seasons and the large swing in Earth–Mars distance.', units: 'dimensionless (0 = circle)', source: `${cite('marsFact', 'Mars')}, ${cite('moonFact', 'Moon')}, ${cite('earthFact', 'Earth')} fact sheets`, cls: 'short' })}
    </section>
  </div>`;

  let Chart;
  try { Chart = await getChart(); } catch (e) {
    el.querySelectorAll('.chart-box').forEach((b) => { b.innerHTML = errorBox(e.message); });
    el.querySelector('#kpis').innerHTML = errorBox(e.message);
    return;
  }

  // ---- static charts ----
  charts.push(new Chart(el.querySelector('#aGrav'), {
    type: 'bar',
    data: { labels: ['Earth', 'Mars', 'Moon'], datasets: [{ label: 'Surface gravity', data: [prop(EARTH, 'gravity').value, prop(MARS, 'gravity').value, prop(MOON, 'gravity').value], backgroundColor: [COLORS.earth, COLORS.mars, COLORS.moon], borderRadius: 6 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} m/s² (${fmt(c.parsed.y / 9.8 * 100, 1)} % of Earth)` } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'm/s²' } } } },
  }));
  charts.push(new Chart(el.querySelector('#aTemp'), {
    type: 'bar',
    data: {
      labels: ['Mars', 'Moon (equator)', 'Moon (shadowed polar craters)'],
      datasets: [
        { label: 'Minimum', data: [-153, -130, -246], backgroundColor: COLORS.earth, borderRadius: 4 },
        { label: 'Mean', data: [-63, null, null], backgroundColor: COLORS.violet, borderRadius: 4 },
        { label: 'Maximum', data: [20, 120, null], backgroundColor: COLORS.mars, borderRadius: 4 },
      ],
    },
    options: { scales: { y: { title: { display: true, text: '°C' } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y} °C` } } } },
  }));
  const decades = {};
  MISSIONS.forEach((m) => { const d = `${m.launch.slice(0, 3)}0s`; decades[d] ??= { mars: 0, moon: 0 }; decades[d][m.target]++; });
  const dk = Object.keys(decades).sort();
  charts.push(new Chart(el.querySelector('#aMissions'), {
    type: 'bar',
    data: { labels: dk, datasets: [{ label: 'Mars', data: dk.map((d) => decades[d].mars), backgroundColor: COLORS.mars, borderRadius: 4 }, { label: 'Moon', data: dk.map((d) => decades[d].moon), backgroundColor: COLORS.moon, borderRadius: 4 }] },
    options: { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'missions' } } } },
  }));
  charts.push(new Chart(el.querySelector('#aOrbit'), {
    type: 'bar',
    data: { labels: ['Earth (around Sun)', 'Mars (around Sun)', 'Moon (around Earth)'], datasets: [{ label: 'Eccentricity', data: [0.0167, prop(MARS, 'ecc').value, prop(MOON, 'ecc').value], backgroundColor: [COLORS.earth, COLORS.mars, COLORS.moon], borderRadius: 6 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, title: { display: true, text: 'eccentricity' } } } },
  }));

  // ---- ephemeris-derived charts ----
  try {
    const s = await snapshotDaily();
    const n = s.times.length;
    const mm = new Float64Array(n), em = new Float64Array(n), rMars = new Float64Array(n), rEarth = new Float64Array(n), eMoon = new Float64Array(n);
    let iMin = 0, iMax = 0;
    for (let i = 0; i < n; i++) {
      const b = { earth: s.bodies.earth[i], moon: s.bodies.moon[i], mars: s.bodies.mars[i] };
      mm[i] = distance(b.mars, b.moon); em[i] = distance(b.earth, b.mars);
      rMars[i] = norm(b.mars); rEarth[i] = norm(b.earth); eMoon[i] = distance(b.earth, b.moon);
      if (mm[i] < mm[iMin]) iMin = i; if (mm[i] > mm[iMax]) iMax = i;
    }
    // local minima of Earth–Mars distance ≈ close approaches
    const approaches = [];
    for (let i = 1; i < n - 1; i++) if (em[i] < em[i - 1] && em[i] <= em[i + 1]) approaches.push(i);
    const range = `${fmtDate(s.times[0], false)} → ${fmtDate(s.times[n - 1], false)} (daily)`;
    const src = `NASA/JPL Horizons, cached snapshot retrieved ${fmtDate(s.meta.retrievedAt, false)} (${Object.entries(s.meta.ephemerisSources || {}).map(([k, v]) => `${k}: ${v}`).join(', ')})`;
    const nowIdx = Math.max(0, Math.min(n - 1, Math.round((Date.now() - s.times[0]) / 86400000)));

    el.querySelector('#kpis').innerHTML = `
      <div class="glass stat violet"><div class="label">Closest Mars ↔ Moon (in range)</div><div class="value" style="font-size:22px">${fmt(mm[iMin] / 1e6, 2)}<small>M km</small></div><div class="foot num">${fmtDate(s.times[iMin], false)} · daily sampling</div></div>
      <div class="glass stat mars"><div class="label">Farthest Mars ↔ Moon (in range)</div><div class="value" style="font-size:22px">${fmt(mm[iMax] / 1e6, 2)}<small>M km</small></div><div class="foot num">${fmtDate(s.times[iMax], false)} · daily sampling</div></div>
      <div class="glass stat"><div class="label">Farthest ÷ closest</div><div class="value" style="font-size:22px">${fmt(mm[iMax] / mm[iMin], 2)}<small>×</small></div><div class="foot">Why the distance must never be treated as constant</div></div>
      <div class="glass stat moon"><div class="label">Earth–Mars close approaches</div><div class="value" style="font-size:22px">${approaches.length}</div><div class="foot">${approaches.map((i) => s.times[i].toISOString().slice(0, 7)).join(' · ')}</div></div>`;

    el.querySelector('#ephemCharts').innerHTML = `
      ${chartCard({ id: 'aDist', title: 'Mars ↔ Moon distance history', desc: `Daily geometric distance between the centres of Mars and the Moon. Minima occur near Mars oppositions, about every 26 months (synodic period 779.94 days). The marker shows today.`, units: 'million km (left axis)', source: src, range, cls: 'tall' })}
      <div class="grid g2">
        ${chartCard({ id: 'aDiff', title: 'Moon\'s contribution: (Mars–Moon) − (Earth–Mars)', desc: 'Difference between the Mars–Moon and Earth–Mars distances. It oscillates every lunar month within ± the Earth–Moon distance — proof that the Moon is never at "the same distance as Earth" from Mars.', units: 'thousand km', source: src, range: 'first 2 years of the snapshot (daily)' })}
        ${chartCard({ id: 'aHelio', title: 'Heliocentric distance of Earth and Mars', desc: 'Distance of each planet from the Sun. Mars varies between ~1.38 and ~1.67 au because of its eccentric orbit; Earth stays near 1 au.', units: 'au (1 au = 149 597 870.7 km)', source: src, range })}
      </div>`;

    const sample = (arr, step, f) => { const out = []; for (let i = 0; i < n; i += step) out.push({ x: +s.times[i], y: f(arr[i], i) }); return out; };
    const xDate = { type: 'linear', min: +s.times[0], max: +s.times[n - 1], ticks: { callback: (v) => new Date(v).toISOString().slice(0, 4), maxRotation: 0, autoSkipPadding: 24 } };
    const tipDate = { title: (it) => fmtDate(new Date(it[0].parsed.x), false) };
    charts.push(new Chart(el.querySelector('#aDist'), {
      type: 'line',
      data: { datasets: [
        { label: 'Mars ↔ Moon', data: sample(mm, 1, (v) => v / 1e6), borderColor: COLORS.violet, backgroundColor: 'rgba(139,124,246,0.1)', fill: true, pointRadius: 0, borderWidth: 1.5 },
        { label: 'Earth ↔ Mars', data: sample(em, 4, (v) => v / 1e6), borderColor: 'rgba(74,144,226,0.7)', borderDash: [4, 4], pointRadius: 0, borderWidth: 1 },
        { label: 'Today', data: [{ x: +s.times[nowIdx], y: mm[nowIdx] / 1e6 }], showLine: false, pointRadius: 6, pointStyle: 'rectRot', pointBackgroundColor: COLORS.sun, borderColor: '#fff' },
      ] },
      options: { interaction: { mode: 'nearest', axis: 'x', intersect: false }, scales: { x: xDate, y: { title: { display: true, text: 'million km' } } }, plugins: { tooltip: { callbacks: { ...tipDate, label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, 3)} M km` } } } },
    }));
    const diffN = Math.min(n, 731);
    const diff = []; for (let i = 0; i < diffN; i++) diff.push({ x: +s.times[i], y: (mm[i] - em[i]) / 1e3 });
    charts.push(new Chart(el.querySelector('#aDiff'), {
      type: 'line',
      data: { datasets: [{ label: '(Mars–Moon) − (Earth–Mars)', data: diff, borderColor: COLORS.moon, pointRadius: 0, borderWidth: 1.2 }] },
      options: { scales: { x: { ...xDate, max: diff.at(-1).x, ticks: { ...xDate.ticks, callback: (v) => new Date(v).toISOString().slice(0, 7) } }, y: { title: { display: true, text: 'thousand km' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { ...tipDate, label: (c) => `${fmt(c.parsed.y, 1)} thousand km` } } } },
    }));
    charts.push(new Chart(el.querySelector('#aHelio'), {
      type: 'line',
      data: { datasets: [
        { label: 'Mars', data: sample(rMars, 3, (v) => v / CONST.AU_KM), borderColor: COLORS.mars, pointRadius: 0, borderWidth: 1.5 },
        { label: 'Earth', data: sample(rEarth, 3, (v) => v / CONST.AU_KM), borderColor: COLORS.earth, pointRadius: 0, borderWidth: 1.5 },
      ] },
      options: { interaction: { mode: 'nearest', axis: 'x', intersect: false }, scales: { x: xDate, y: { title: { display: true, text: 'au' } } }, plugins: { tooltip: { callbacks: { ...tipDate, label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, 4)} au` } } } },
    }));
  } catch (e) {
    el.querySelector('#kpis').innerHTML = errorBox(`Ephemeris data unavailable: ${e.message}`);
    el.querySelector('#ephemCharts').innerHTML = '';
  }

  return () => charts.forEach((c) => c.destroy());
}
