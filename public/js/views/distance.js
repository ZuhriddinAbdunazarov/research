// Mars ↔ Moon distance calculator (JPL Horizons, matching timestamps, common frame).
import { CONST } from '../data/bodies.js';
import { getStateAt, getSeries, findExtrema, distance, lastLiveUpdate, kmTo } from '../services/ephemeris.js';
import { getChart, COLORS, chartCard } from '../ui/charts.js';
import { fmt, fmtDate, fmtLocalTime, fmtDuration, distText, fmtDistance, esc, cite, term, modeBadge, loading, errorBox } from '../ui/format.js';
import { storeGet, storeSet } from '../services/api.js';

const DAY = 86400000;
const SPEEDS = [
  { name: 'Speed of light', kms: CONST.C_KM_S, note: 'Radio signals. Exact by definition.' },
  { name: 'Parker Solar Probe (record, 2024)', kms: 192, note: '≈ 692 000 km/h at perihelion — fastest human-made object, relative to the Sun.' },
  { name: 'New Horizons launch speed', kms: 16.26, note: 'Fastest launch from Earth (2006), ≈ 58 500 km/h.' },
  { name: 'Apollo 10 (fastest crewed)', kms: 11.08, note: '≈ 39 900 km/h relative to Earth (1969).' },
  { name: 'Commercial airliner', kms: 0.25, note: '≈ 900 km/h, for scale only.' },
];
const toUTCInput = (d) => d.toISOString().slice(0, 16);
const fromUTCInput = (s) => new Date(`${s}:00Z`);
const toDateInput = (d) => d.toISOString().slice(0, 10);

export async function render(el, params) {
  const ctl = new AbortController();
  const cleanups = [() => ctl.abort()];
  let unit = storeGet('mm:unit', 'km');
  let customKms = storeGet('mm:speed', 30);
  let state = null; // current instant result
  let period = null; // { series, ext }
  let chart = null;

  const now = new Date(); now.setUTCSeconds(0, 0);
  const initial = params.get('t') ? new Date(params.get('t')) : now;
  const t0 = Number.isNaN(initial.getTime()) ? now : initial;

  el.innerHTML = `<div class="wrap">
    <div class="page-head">
      <div class="kicker violet">Core tool · NASA/JPL Horizons</div>
      <h1>Mars ↔ Moon Distance Calculator</h1>
      <p>The distance between Mars and Earth's Moon changes every minute: Mars and Earth orbit the Sun at different speeds, and the Moon circles Earth. This tool asks JPL Horizons for the positions of all three bodies at <em>the same instant</em> and in <em>the same reference frame</em>, then computes the straight-line (${term('geometric distance')}) separation.</p>
    </div>

    <div class="glass card">
      <div class="controls">
        <label class="field">Date & time (UTC)<input type="datetime-local" id="dt" value="${toUTCInput(t0)}" min="1950-01-01T00:00" max="2099-12-30T23:59" step="60"></label>
        <div style="display:flex;gap:8px;align-items:end"><button class="btn" id="nowBtn">Now</button><button class="btn btn-primary" id="calcBtn" style="flex:1">Calculate</button></div>
        <div class="field" style="text-transform:none;letter-spacing:0">
          <span style="font-size:12px;color:var(--text-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Units</span>
          <div class="seg" role="group" aria-label="Distance unit" id="unitSeg">
            <button data-u="km">Kilometres</button><button data-u="mi">Miles</button><button data-u="au">AU</button>
          </div>
        </div>
      </div>
    </div>

    <div class="section split" style="margin-top:16px">
      <div class="glass dist-hero" id="result" aria-live="polite">${loading('Requesting Horizons vectors…')}</div>
      <div class="glass card">
        <div class="section-title" style="margin-bottom:8px"><h2 style="font-size:17px">Ecliptic plane view</h2><span class="badge badge-illus">MOON OFFSET EXAGGERATED</span></div>
        <canvas class="orbit-canvas" id="orbit" role="img" aria-label="Top-down view of Sun, Earth, Moon and Mars positions"></canvas>
        <p class="small dim" style="margin:8px 0 0">Positions are real (Horizons, ecliptic J2000, viewed from ecliptic north; +x toward the March equinox). The Earth–Moon separation (≈ 0.0026 au) would be invisible at this scale, so it is drawn 40× larger. Paths show the analysis period below.</p>
      </div>
    </div>

    <section class="section">
      <div class="section-title"><h2>Calculation methodology</h2><span class="badge badge-calc">TRANSPARENT MATH</span></div>
      <div class="glass card" id="method">${loading()}</div>
    </section>

    <section class="section">
      <div class="section-title"><h2>Distance over a period</h2><span class="dim">Closest & farthest approach, refined to minutes</span></div>
      <div class="glass card">
        <div class="controls">
          <label class="field">From (UTC)<input type="date" id="pStart" min="1950-01-01" max="2099-12-30"></label>
          <label class="field">To (UTC)<input type="date" id="pEnd" min="1950-01-02" max="2099-12-31"></label>
          <div class="chip-row" id="presets">
            <button class="chip" data-p="60">±60 days</button><button class="chip" data-p="365">±1 year</button><button class="chip" data-p="1100">±3 years</button>
          </div>
          <button class="btn btn-primary" id="periodBtn">Analyse period</button>
        </div>
        <div id="periodOut" style="margin-top:16px"></div>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h2>Theoretical straight-line travel time</h2><span class="badge badge-calc">THEORETICAL</span></div>
      <div class="notice" style="margin-bottom:14px"><strong>This is not a mission duration.</strong> Dividing the straight-line distance by a constant speed ignores gravity: real spacecraft follow curved orbits around the Sun (e.g. a ${term('Hohmann transfer')}), must launch in specific windows, and accelerate/decelerate. For reference, actual NASA trips: Curiosity Earth→Mars 254 days (26 Nov 2011 → 6 Aug 2012), Perseverance 203 days (30 Jul 2020 → 18 Feb 2021), Apollo 11 Earth→lunar orbit ≈ 3 days.</div>
      <div class="glass card table-scroll" id="travel"></div>
    </section>
  </div>`;

  const $ = (s) => el.querySelector(s);
  const dtIn = $('#dt');

  // ---------- units ----------
  function paintUnits() { el.querySelectorAll('#unitSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.u === unit))); }
  paintUnits();
  $('#unitSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    unit = b.dataset.u; storeSet('mm:unit', unit); paintUnits();
    if (state) { paintResult(); paintTravel(); }
    if (period) paintPeriod();
  });

  // ---------- instant ----------
  async function calculate() {
    const t = fromUTCInput(dtIn.value);
    if (Number.isNaN(t.getTime())) { $('#result').innerHTML = errorBox('Please enter a valid date and time.'); return; }
    history.replaceState(null, '', `#/distance?t=${encodeURIComponent(t.toISOString())}`);
    $('#result').innerHTML = loading('Requesting Horizons vectors for Earth, Moon and Mars…');
    $('#calcBtn').disabled = true;
    try {
      const st = await getStateAt(t, { signal: ctl.signal, verify: true });
      const mm = distance(st.bodies.mars, st.bodies.moon);
      const em = distance(st.bodies.earth, st.bodies.mars);
      const eMoon = distance(st.bodies.earth, st.bodies.moon);
      let rate = null;
      if (st.next) rate = (distance(st.next.bodies.mars, st.next.bodies.moon) - mm) / ((st.next.time - st.time) / 1000);
      state = { ...st, mm, em, eMoon, rate };
      paintResult(); paintMethod(); paintTravel(); drawOrbit();
      if (!period) { setPeriodAround(t, 365); analysePeriod(); }
    } catch (e) {
      if (e.name === 'AbortError') return;
      state = null;
      $('#result').innerHTML = errorBox(e.message, true);
      $('#result [data-retry]')?.addEventListener('click', calculate);
      $('#method').innerHTML = errorBox('No positions available to show the calculation.');
    } finally { $('#calcBtn').disabled = false; }
  }

  function paintResult() {
    const s = state;
    const main = fmtDistance(s.mm, unit);
    const alt = ['km', 'mi', 'au'].filter((u) => u !== unit).map((u) => distText(s.mm, u)).join(' · ');
    const v = s.verification;
    const verifyLine = v?.distanceKm != null
      ? `<div class="notice violet small">✔ Independent check — Horizons queried for Mars as seen from the Moon's centre (CENTER=500@301): <span class="num">${fmt(v.distanceKm, 1)} km</span>, difference <span class="num">${fmt(Math.abs(v.distanceKm - s.mm), 3)} km</span>.</div>`
      : v?.error ? `<div class="notice small">Cross-check unavailable: ${esc(v.error)}</div>` : '';
    const last = lastLiveUpdate();
    $('#result').innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
        <div class="kicker">Mars ↔ Moon · centre to centre</div>${modeBadge(s.meta)}
      </div>
      <div class="dist-value">${main.value}<small>${main.unit}</small></div>
      <div class="muted num small">${alt}</div>
      <div class="grid" style="gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
        <div><div class="dim small">${term('light-time', 'Light-time')}</div><div class="num" style="font-size:18px">${fmtDuration(s.mm / CONST.C_KM_S)}</div></div>
        <div><div class="dim small">Rate of change</div><div class="num" style="font-size:18px">${s.rate == null ? '—' : `${s.rate > 0 ? '+' : ''}${fmt(s.rate, 2)} km/s`}</div><div class="dim small">${s.rate == null ? '' : s.rate > 0 ? 'separating' : 'approaching'}</div></div>
        <div><div class="dim small">Epoch</div><div class="num" style="font-size:14px">${fmtDate(s.time)}</div></div>
      </div>
      <table class="ptable"><tbody>
        <tr><th>Earth ↔ Mars</th><td class="num">${distText(s.em, unit)}</td></tr>
        <tr><th>Earth ↔ Moon</th><td class="num">${distText(s.eMoon, unit === 'au' ? 'km' : unit)}</td></tr>
        <tr><th>Mars–Moon minus Earth–Mars</th><td class="num">${fmt(s.mm - s.em, 0)} km <span class="note">The Moon can be up to ≈ 405 000 km nearer or farther from Mars than Earth is.</span></td></tr>
      </tbody></table>
      ${verifyLine}
      <div class="small dim">${s.meta.mode === 'live'
        ? `Retrieved from JPL Horizons ${fmtLocalTime(s.meta.retrievedAt)}${s.meta.cache ? ' (server cache)' : ''}.`
        : `Live Horizons request failed${s.liveError ? ` (${esc(s.liveError)})` : ''}. Showing cached Horizons snapshot (retrieved ${fmtDate(s.meta.retrievedAt, false)}), interpolated. Last successful live update: ${last ? fmtLocalTime(last) : 'none in this browser'}.`}</div>`;
  }

  function paintMethod() {
    const s = state;
    const m = s.meta;
    const r = (v) => fmt(v, 1).padStart(18);
    const [x1, y1, z1] = s.bodies.moon, [x2, y2, z2] = s.bodies.mars;
    $('#method').innerHTML = `
      <div class="split">
        <div>
          <ol class="method" style="padding-left:18px;color:var(--text-2);margin:0 0 12px">
            <li>Request <b>state vectors</b> (EPHEM_TYPE=VECTORS) for Earth (399), Moon (301) and Mars (499) from JPL Horizons.</li>
            <li>Use identical settings for all three: centre <b>${esc(m.centerName || m.center)}</b>, frame <b>${esc(m.frameName || m.frame)}</b>, units km, time scale ${term('UT')}, <b>geometric</b> positions (no light-time correction).</li>
            <li>Use the same timestamp for every body (verified row-by-row on the server).</li>
            <li>Subtract the vectors and take the Euclidean norm.</li>
          </ol>
          <p class="small dim">Ephemeris models: ${Object.entries(m.ephemerisSources || {}).map(([k, v]) => `${k} → ${esc(v)}`).join(', ') || '—'} (DE441 is JPL's planetary/lunar ephemeris; mar099 is the Mars-system solution). ${m.mode === 'snapshot' ? `Snapshot vectors are daily and interpolated with ${term('Lagrange interpolation')} (4-point; error ≲ 100 km, i.e. < 0.0002 % of the distance).` : ''}</p>
          <p class="small">${cite('horizons')} · ${cite('horizonsApi')}${m.exampleQuery ? ` · <a class="cite" href="${esc(m.exampleQuery)}" target="_blank" rel="noopener">Raw Horizons query (Mars)</a>` : ''}</p>
        </div>
        <div class="formula" aria-label="Distance formula with values"><span class="c">// heliocentric positions at ${fmtDate(s.time)} (km)</span>
<span class="m">Moon</span>  x₁ =${r(x1)}
      y₁ =${r(y1)}
      z₁ =${r(z1)}
<span class="k">Mars</span>  x₂ =${r(x2)}
      y₂ =${r(y2)}
      z₂ =${r(z2)}

D = √((x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²)
  = √((${fmt(x2 - x1, 0)})² + (${fmt(y2 - y1, 0)})² + (${fmt(z2 - z1, 0)})²)
  = <b>${fmt(s.mm, 1)} km</b>
  = ${fmt(s.mm / CONST.AU_KM, 7)} au   <span class="c">(1 au = 149 597 870.7 km)</span>
  = ${fmt(s.mm / CONST.MILE_KM, 0)} mi   <span class="c">(1 mi = 1.609344 km)</span>

t_light = D / c = ${fmt(s.mm / CONST.C_KM_S, 1)} s   <span class="c">(c = 299 792.458 km/s)</span></div>
      </div>`;
  }

  function paintTravel() {
    const s = state;
    const rows = [...SPEEDS, { name: 'Custom speed', kms: customKms, custom: true, note: 'Enter any constant speed.' }];
    $('#travel').innerHTML = `<table class="ptable travel-table"><thead><tr><th>Constant speed</th><th>km/s</th><th>Straight-line time for ${distText(s.mm, unit)}</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><th scope="row">${esc(r.name)}<span class="note">${esc(r.note)}</span></th>
        <td>${r.custom ? `<input type="number" id="customSpeed" min="0.001" max="299792" step="any" value="${customKms}" aria-label="Custom speed in km/s" style="max-width:120px">` : `<span class="num">${fmt(r.kms, 3)}</span>`}</td>
        <td class="num" ${r.custom ? 'id="customOut"' : ''}>${fmtDuration(s.mm / r.kms)}</td></tr>`).join('')}
    </tbody></table>
    <p class="small dim" style="margin-top:10px">Light-time uses c from ${cite('nistC', 'NIST')}. Other speeds are rounded public figures for scale and are not used for any prediction.</p>`;
    $('#customSpeed').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      if (v > 0 && v <= CONST.C_KM_S) { customKms = v; storeSet('mm:speed', v); $('#customOut').textContent = fmtDuration(s.mm / v); }
      else $('#customOut').textContent = 'Enter 0.001 – 299 792 km/s';
    });
  }

  // ---------- orbit canvas ----------
  const canvas = $('#orbit');
  function drawOrbit() {
    if (!state) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const b = state.bodies;
    let maxR = Math.max(Math.hypot(b.mars[0], b.mars[1]), Math.hypot(b.earth[0], b.earth[1]));
    if (period) period.series.bodies.mars.forEach((p) => { maxR = Math.max(maxR, Math.hypot(p[0], p[1])); });
    const sc = (Math.min(W, H) / 2 - 24) / maxR;
    const cx = W / 2, cy = H / 2;
    const P = (v) => [cx + v[0] * sc, cy - v[1] * sc];
    // AU rings
    g.strokeStyle = 'rgba(148,170,220,0.08)'; g.lineWidth = 1; g.font = '10px JetBrains Mono, monospace'; g.fillStyle = 'rgba(167,179,203,0.5)';
    for (let au = 0.5; au * CONST.AU_KM < maxR * 1.05; au += 0.5) { g.beginPath(); g.arc(cx, cy, au * CONST.AU_KM * sc, 0, 7); g.stroke(); g.fillText(`${au} au`, cx + au * CONST.AU_KM * sc + 3, cy - 3); }
    // paths
    if (period) {
      const path = (arr, col) => { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); arr.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
      path(period.series.bodies.earth, 'rgba(74,144,226,0.35)');
      path(period.series.bodies.mars, 'rgba(226,115,58,0.35)');
    }
    // Sun
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, 16); grd.addColorStop(0, '#fff6d8'); grd.addColorStop(0.4, COLORS.sun); grd.addColorStop(1, 'rgba(255,207,107,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill();
    const EXAG = 40;
    const moonDraw = b.earth.map((c, i) => c + (b.moon[i] - c) * EXAG);
    const [ex, ey] = P(b.earth), [mx, my] = P(b.mars), [lx, ly] = P(moonDraw);
    // line Mars–Moon
    g.setLineDash([5, 4]); g.strokeStyle = 'rgba(139,124,246,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(lx, ly); g.lineTo(mx, my); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(201,204,214,0.4)'; g.beginPath(); g.moveTo(ex, ey); g.lineTo(lx, ly); g.stroke();
    const dot = (x, y, r, col, label, dx = 8, dy = -8) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#e8edf7'; g.font = '600 11px Inter, sans-serif'; g.fillText(label, x + dx, y + dy); };
    dot(ex, ey, 5, COLORS.earth, 'Earth', 8, 14);
    dot(lx, ly, 3.5, '#c9ccd6', 'Moon (×40 offset)');
    dot(mx, my, 5, COLORS.mars, 'Mars');
    g.fillStyle = 'rgba(167,179,203,0.7)'; g.font = '10px JetBrains Mono, monospace';
    g.fillText(`${fmt(state.mm / 1e6, 2)} M km`, (lx + mx) / 2 + 6, (ly + my) / 2);
    g.fillText('Sun', cx + 10, cy + 18);
  }
  const ro = new ResizeObserver(() => drawOrbit());
  ro.observe(canvas);
  cleanups.push(() => ro.disconnect());

  // ---------- period ----------
  function setPeriodAround(t, days) {
    $('#pStart').value = toDateInput(new Date(Math.max(Date.UTC(1950, 0, 2), t.getTime() - days * DAY)));
    $('#pEnd').value = toDateInput(new Date(Math.min(Date.UTC(2099, 11, 30), t.getTime() + days * DAY)));
  }
  let periodToken = 0;
  async function analysePeriod() {
    const a = new Date(`${$('#pStart').value}T00:00:00Z`), b = new Date(`${$('#pEnd').value}T00:00:00Z`);
    const out = $('#periodOut');
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) { out.innerHTML = errorBox('Choose a valid period (start before end).'); return; }
    const days = (b - a) / DAY;
    if (days > 365.25 * 30) { out.innerHTML = errorBox('Please choose a period of at most 30 years.'); return; }
    const steps = Math.max(10, Math.min(2000, Math.round(days * 2)));
    const token = ++periodToken;
    out.innerHTML = loading(`Requesting ${steps + 1} matched epochs from Horizons (${fmt(days / steps * 24, 1)} h spacing) and refining extremes…`);
    $('#periodBtn').disabled = true;
    try {
      const series = await getSeries(a, b, steps, { signal: ctl.signal });
      const ext = await findExtrema(series, { signal: ctl.signal });
      if (token !== periodToken) return;
      period = { series, ext, days, steps };
      paintPeriod(); drawOrbit();
    } catch (e) {
      if (e.name === 'AbortError' || token !== periodToken) return;
      period = null;
      out.innerHTML = errorBox(e.message, true);
      out.querySelector('[data-retry]')?.addEventListener('click', analysePeriod);
    } finally { $('#periodBtn').disabled = false; }
  }

  async function paintPeriod() {
    const { series, ext, days, steps } = period;
    const out = $('#periodOut');
    const d = ext.distances;
    const mean = d.reduce((s, v) => s + v, 0) / d.length;
    const em = series.times.map((_, i) => distance(series.bodies.earth[i], series.bodies.mars[i]));
    const yUnit = unit === 'au' ? 'au' : unit === 'mi' ? 'million mi' : 'million km';
    const conv = (km) => (unit === 'au' ? kmTo(km, 'au') : kmTo(km, unit) / 1e6);
    const extCard = (label, e, cls) => `<div class="glass stat ${cls}"><div class="label">${label}</div><div class="value" style="font-size:22px">${fmtDistance(e.km, unit).value}<small>${fmtDistance(e.km, unit).unit}</small></div>
      <div class="foot"><span class="num">${fmtDate(e.time)}</span><span>${e.refined ? `· refined to ~${fmt(e.resolutionMin, 0)} min` : '· at sampling resolution'}</span></div></div>`;
    out.innerHTML = `
      <div class="grid g3" style="margin-bottom:16px">
        ${extCard('Closest Mars ↔ Moon distance', ext.min, 'violet')}
        ${extCard('Farthest Mars ↔ Moon distance', ext.max, 'mars')}
        <div class="glass stat"><div class="label">Mean over period ${modeBadge(series.meta)}</div><div class="value" style="font-size:22px">${fmtDistance(mean, unit).value}<small>${fmtDistance(mean, unit).unit}</small></div><div class="foot">${steps + 1} samples · ${fmt(days, 0)} days</div></div>
      </div>
      ${chartCard({ id: 'distChart', title: 'Mars ↔ Moon distance over time', desc: 'Geometric centre-to-centre distance at each epoch. The dashed line shows Earth ↔ Mars; the gap between them is the Moon\'s orbital offset (≤ ≈ 405 000 km).', units: `${yUnit} (y-axis), UTC date (x-axis)`, source: `NASA/JPL Horizons — ${series.meta.mode === 'live' ? 'live query' : `cached snapshot retrieved ${fmtDate(series.meta.retrievedAt, false)}`}`, range: `${fmtDate(series.times[0], false)} → ${fmtDate(series.times.at(-1), false)} (${fmt(days / steps * 24, 1)} h steps)`, cls: 'tall' })}
      ${series.liveError ? `<div class="notice small" style="margin-top:10px">Live query failed (${esc(series.liveError)}); showing cached Horizons snapshot.</div>` : ''}`;
    try {
      const Chart = await getChart();
      chart?.destroy();
      const ctx = out.querySelector('#distChart');
      if (!ctx) return;
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            { label: 'Mars ↔ Moon', data: series.times.map((t, i) => ({ x: +t, y: conv(d[i]) })), borderColor: COLORS.violet, backgroundColor: 'rgba(139,124,246,0.12)', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.2 },
            { label: 'Earth ↔ Mars', data: series.times.map((t, i) => ({ x: +t, y: conv(em[i]) })), borderColor: 'rgba(74,144,226,0.8)', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 },
            { label: 'Closest / farthest', data: [{ x: +ext.min.time, y: conv(ext.min.km) }, { x: +ext.max.time, y: conv(ext.max.km) }], showLine: false, pointRadius: 6, pointBackgroundColor: [COLORS.violet, COLORS.mars], borderColor: '#fff' },
            ...(state && state.time >= series.times[0] && state.time <= series.times.at(-1) ? [{ label: 'Selected instant', data: [{ x: +state.time, y: conv(state.mm) }], showLine: false, pointRadius: 6, pointStyle: 'rectRot', pointBackgroundColor: COLORS.sun, borderColor: '#fff' }] : []),
          ],
        },
        options: {
          interaction: { mode: 'nearest', axis: 'x', intersect: false },
          scales: {
            x: { type: 'linear', min: +series.times[0], max: +series.times.at(-1), ticks: { callback: (v) => new Date(v).toISOString().slice(0, days > 200 ? 7 : 10), maxRotation: 0, autoSkipPadding: 20 } },
            y: { title: { display: true, text: yUnit } },
          },
          plugins: { tooltip: { callbacks: { title: (it) => fmtDate(new Date(it[0].parsed.x)), label: (it) => `${it.dataset.label}: ${fmt(it.parsed.y, unit === 'au' ? 5 : 3)} ${yUnit}` } } },
        },
      });
    } catch (e) {
      out.querySelector('.chart-box').innerHTML = errorBox(e.message);
    }
  }
  cleanups.push(() => chart?.destroy());

  // ---------- events ----------
  $('#calcBtn').addEventListener('click', calculate);
  dtIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') calculate(); });
  $('#nowBtn').addEventListener('click', () => { const n = new Date(); n.setUTCSeconds(0, 0); dtIn.value = toUTCInput(n); calculate(); });
  $('#periodBtn').addEventListener('click', analysePeriod);
  $('#presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const t = fromUTCInput(dtIn.value);
    setPeriodAround(Number.isNaN(t.getTime()) ? new Date() : t, Number(b.dataset.p));
    analysePeriod();
  });
  setPeriodAround(t0, 365);
  calculate();

  return () => cleanups.forEach((f) => { try { f(); } catch { /* */ } });
}
