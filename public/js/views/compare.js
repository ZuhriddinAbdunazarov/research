import { MARS, MOON, EARTH, COMPARE_ROWS, prop } from '../data/bodies.js';
import { getChart, COLORS, chartCard } from '../ui/charts.js';
import { fmt, fmtSig, esc, cite, refBadge, term } from '../ui/format.js';
import { storeGet, storeSet } from '../services/api.js';

const SURFACE = [
  ['Atmosphere', 'Thin CO₂ atmosphere (≈ 636 Pa); dust storms, clouds, seasonal polar frost.', 'Essentially none — a tenuous exosphere (≈ 3 × 10⁻¹⁰ Pa).'],
  ['Surface', 'Iron-oxide dust over basalt; volcanoes, canyons, dried river valleys, sedimentary layers.', 'Regolith over anorthosite highlands and basaltic maria; impact craters everywhere.'],
  ['Water', 'Polar ice caps and widespread buried ice; evidence of ancient lakes and rivers.', 'Water ice in permanently shadowed polar craters; traces of water/hydroxyl in sunlit soil.'],
  ['Day length', 'Sol = 24 h 39 min 35 s — very Earth-like.', '≈ 29.5 Earth days from sunrise to sunrise (synodic month).'],
  ['Magnetic field', 'No global field today; crustal magnetisation in the southern highlands.', 'No global field today; local magnetic anomalies.'],
  ['Moons', 'Two small moons: Phobos and Deimos.', 'Itself a natural satellite of Earth.'],
];

export async function render(el) {
  const charts = [];
  const rows = COMPARE_ROWS.map((r) => ({ ...r, a: prop(MARS, r.key), b: prop(MOON, r.key) }));

  el.innerHTML = `<div class="wrap">
    <div class="page-head">
      <div class="kicker violet">Comparison dashboard</div>
      <h1>Mars vs Moon</h1>
      <p>Two very different worlds that both matter for human exploration: the Moon is a three-day trip away; Mars is a planet with an atmosphere, seasons and a complex water history. All values are static reference constants ${refBadge()} from NASA fact sheets.</p>
    </div>

    <div class="grid g2">
      ${rows.map((r) => {
        const ratio = r.a.value / r.b.value;
        const pa = r.log ? Math.log10(r.a.value) : r.a.value, pb = r.log ? Math.log10(r.b.value) : r.b.value;
        const shift = r.log ? Math.min(pa, pb) - 1 : 0;
        const wa = ((pa - shift) / (pa - shift + pb - shift)) * 100;
        return `<div class="glass vs">
          <div class="side" style="color:var(--mars-2)">${esc(r.a.display ?? fmtSig(r.a.value, 5))}</div>
          <div class="mid"><b>${esc(r.label)}</b>${esc(r.unit)}<br><span class="num">Mars ÷ Moon = ${ratio > 1000 ? ratio.toExponential(2) : fmt(ratio, 2)}</span></div>
          <div class="side r" style="color:var(--moon-2)">${esc(r.b.display ?? fmtSig(r.b.value, 5))}</div>
          <div class="ratio-bar" title="${r.log ? 'Log-scaled share' : 'Linear share'}"><span class="a" style="width:${wa}%"></span><span class="b" style="width:${100 - wa}%"></span></div>
        </div>`;
      }).join('')}
    </div>
    <p class="small dim" style="margin-top:8px"><span class="legend-dot" style="background:var(--mars)"></span>Mars <span class="legend-dot" style="background:var(--moon-2);margin-left:10px"></span>Moon · bars for mass and pressure use a log scale because the values differ by orders of magnitude. Sources: ${cite('marsFact')} · ${cite('moonFact')}</p>

    <section class="section grid g2">
      ${chartCard({ id: 'cSize', title: 'Size & gravity relative to Earth', desc: 'Each value divided by Earth\'s value (Earth = 1). Mars is about half Earth\'s diameter; the Moon about a quarter.', units: 'dimensionless ratio (body ÷ Earth)', source: `NASA NSSDCA fact sheets — ${cite('marsFact', 'Mars')}, ${cite('moonFact', 'Moon')}, ${cite('earthFact', 'Earth')}` })}
      ${chartCard({ id: 'cTemp', title: 'Surface temperature ranges', desc: 'Floating bars from typical minimum to maximum. The Moon\'s range is wider because it has no atmosphere to retain or spread heat.', units: '°C', source: `NASA Science — ${cite('marsFacts', 'Mars facts')}, ${cite('moonFacts', 'Moon facts')}` })}
    </section>

    <section class="section split">
      <div class="glass card">
        <div class="section-title" style="margin-bottom:10px"><h2 style="font-size:19px">Your weight on each world</h2><span class="badge badge-calc">CALCULATED</span></div>
        <p class="small muted">Weight scales with surface gravity (mass stays the same). Enter your Earth weight:</p>
        <div class="controls" style="margin-bottom:14px">
          <label class="field">Weight on Earth<input type="number" id="w" min="1" max="1000" value="${storeGet('mm:w', 70)}"></label>
          <label class="field">Unit<select id="wu"><option value="kg">kg (weight as kg-force)</option><option value="lb">lb</option></select></label>
        </div>
        <div class="weight-out" id="wout"></div>
        <p class="small dim" style="margin-top:12px">Ratios: Mars ${fmt(3.73 / 9.8, 3)} g, Moon ${fmt(1.62 / 9.8, 3)} g (g = 9.80 m/s²). A ${term('escape velocity')} comparison: Mars 5.03 km/s, Moon 2.38 km/s, Earth 11.19 km/s.</p>
      </div>
      <div class="glass card">
        <div class="section-title" style="margin-bottom:10px"><h2 style="font-size:19px">Surface & environment</h2></div>
        <div class="table-scroll"><table class="ptable"><thead><tr><th></th><th style="color:var(--mars-2)">Mars</th><th style="color:var(--moon-2)">Moon</th></tr></thead><tbody>
          ${SURFACE.map(([k, a, b]) => `<tr><th scope="row" style="width:22%">${k}</th><td class="small">${a}</td><td class="small">${b}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="small dim" style="margin-top:8px">${cite('marsScience')} · ${cite('moonScience')}</p>
      </div>
    </section>

    <section class="section">
      ${chartCard({ id: 'cOrbit', title: 'Rotation and orbital periods', desc: 'Mars spins about once per Earth day but takes 1.88 years to orbit the Sun. The Moon rotates exactly once per orbit (tidal locking).', units: 'Earth days (log scale)', source: `${cite('marsFact', 'Mars fact sheet')}, ${cite('moonFact', 'Moon fact sheet')}`, cls: 'short' })}
    </section>
  </div>`;

  // weight calculator
  const w = el.querySelector('#w'), wu = el.querySelector('#wu'), out = el.querySelector('#wout');
  const paintW = () => {
    const v = Number(w.value);
    if (!(v > 0 && v <= 1000)) { out.innerHTML = '<div style="grid-column:1/-1" class="dim">Enter a value between 1 and 1000.</div>'; return; }
    storeSet('mm:w', v);
    const u = wu.value;
    out.innerHTML = [['Earth', 9.8, '#4a90e2'], ['Mars', 3.73, 'var(--mars-2)'], ['Moon', 1.62, 'var(--moon-2)']].map(([n, g, c]) => `<div><span class="dim small">${n}</span><b style="color:${c}">${fmt((v * g) / 9.8, 1)} ${u}</b></div>`).join('');
  };
  w.addEventListener('input', paintW); wu.addEventListener('change', paintW); paintW();

  try {
    const Chart = await getChart();
    const E = (k) => prop(EARTH, k).value;
    charts.push(new Chart(el.querySelector('#cSize'), {
      type: 'bar',
      data: {
        labels: ['Diameter', 'Mass', 'Density', 'Surface gravity', 'Escape velocity'],
        datasets: [
          { label: 'Mars', data: ['diameter', 'mass', 'density', 'gravity', 'escape'].map((k) => prop(MARS, k).value / E(k)), backgroundColor: COLORS.mars, borderRadius: 4 },
          { label: 'Moon', data: ['diameter', 'mass', 'density', 'gravity', 'escape'].map((k) => prop(MOON, k).value / E(k)), backgroundColor: COLORS.moon, borderRadius: 4 },
        ],
      },
      options: { scales: { y: { beginAtZero: true, max: 1, title: { display: true, text: 'fraction of Earth' } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, 3)} × Earth` } } } },
    }));
    charts.push(new Chart(el.querySelector('#cTemp'), {
      type: 'bar',
      data: {
        labels: ['Mars (poles winter → equator summer)', 'Moon (night → day, equator)', 'Moon (permanently shadowed craters)'],
        datasets: [{ label: 'Temperature range', data: [[-153, 20], [-130, 120], [-246, -246 + 4]], backgroundColor: [COLORS.mars, COLORS.moon, COLORS.violet], borderRadius: 4 }],
      },
      options: { indexAxis: 'y', scales: { x: { title: { display: true, text: '°C' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => (c.dataIndex === 2 ? 'As low as ≈ −246 °C' : `${c.raw[0]} °C to ${c.raw[1]} °C`) } } } },
    }));
    charts.push(new Chart(el.querySelector('#cOrbit'), {
      type: 'bar',
      data: {
        labels: ['Sidereal rotation', 'Solar day', 'Orbital period'],
        datasets: [
          { label: 'Mars', data: [24.6229 / 24, 24.6597 / 24, 686.98], backgroundColor: COLORS.mars, borderRadius: 4 },
          { label: 'Moon', data: [27.3217, 29.53, 27.3217], backgroundColor: COLORS.moon, borderRadius: 4 },
        ],
      },
      options: { indexAxis: 'y', scales: { x: { type: 'logarithmic', title: { display: true, text: 'Earth days (log)' } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.x, 3)} days` } } } },
    }));
  } catch (e) {
    el.querySelectorAll('.chart-box').forEach((b) => { b.innerHTML = `<div class="state state-error">${esc(e.message)}</div>`; });
  }

  return () => charts.forEach((c) => c.destroy());
}
