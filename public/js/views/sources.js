import { SOURCES, PRIMARY_SOURCES } from '../data/sources.js';
import { GLOSSARY } from '../data/glossary.js';
import { loadSnapshot, lastLiveUpdate } from '../services/ephemeris.js';
import { fetchJson } from '../services/api.js';
import { esc, fmtDate, fmtLocalTime } from '../ui/format.js';

export async function render(el, params) {
  el.innerHTML = `<div class="wrap">
    <div class="page-head">
      <div class="kicker violet">Transparency</div>
      <h1>Data Sources & Methodology</h1>
      <p>Where every number comes from, how it is processed, and what its limits are. Different NASA services provide different kinds of data — no single API provides everything.</p>
    </div>

    <div class="glass card" id="status"><div class="section-title" style="margin:0 0 10px"><h2 style="font-size:18px">System status</h2></div><div id="statusBody" class="small">Checking…</div></div>

    <section class="section">
      <div class="section-title"><h2>Primary data sources</h2></div>
      <div class="grid g2">${PRIMARY_SOURCES.map(({ key, use, how }, i) => { const s = SOURCES[key]; return `
        <article class="glass src-card">
          <div class="kicker">${i + 1} · ${esc(s.org)}</div>
          <h3>${esc(s.title)}</h3>
          <p class="small muted" style="margin:0">${esc(use)}</p>
          <div class="how">${esc(how)}</div>
          <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)} ↗</a>
        </article>`; }).join('')}</div>
    </section>

    <section class="section glass card method">
      <div class="section-title"><h2>Data categories in this app</h2></div>
      <div class="table-scroll"><table class="ptable"><thead><tr><th>Badge</th><th>Meaning</th></tr></thead><tbody>
        <tr><td><span class="badge badge-live"><i></i>LIVE · JPL Horizons</span></td><td class="small">Requested from JPL Horizons at the moment you asked, through our server proxy.</td></tr>
        <tr><td><span class="badge badge-cache">CACHED · Horizons snapshot</span></td><td class="small">Real Horizons vectors (daily, 2020–2035) stored with the site and used when the live API cannot be reached. The retrieval date is shown. Times between daily samples are interpolated.</td></tr>
        <tr><td><span class="badge badge-ref">REFERENCE</span></td><td class="small">Static published constants (e.g. radius, mass) from NASA fact sheets. They are not measurements made live.</td></tr>
        <tr><td><span class="badge badge-calc">CALCULATED</span></td><td class="small">Derived by this app from the data above with the formulas shown (distance, light-time, phase, Mars time, weight).</td></tr>
        <tr><td><span class="badge badge-illus">ILLUSTRATIVE</span></td><td class="small">Visual aids where something is deliberately not to scale (e.g. body sizes, Moon offset).</td></tr>
      </tbody></table></div>
    </section>

    <section class="section glass card method">
      <div class="section-title"><h2>Mars ↔ Moon distance methodology</h2></div>
      <ol>
        <li><b>Query.</b> Our server calls the Horizons API three times (Earth 399, Moon 301, Mars 499) with identical parameters: <code>EPHEM_TYPE=VECTORS</code>, <code>CENTER=500@10</code> (Sun centre), <code>REF_SYSTEM=ICRF</code>, <code>REF_PLANE=ECLIPTIC</code> (J2000), <code>OUT_UNITS=KM-S</code>, <code>VEC_CORR=NONE</code> (geometric), <code>TIME_TYPE=UT</code>, and the same start/stop/step.</li>
        <li><b>Match.</b> The server checks that every row has the same Julian Date in all three tables and rejects the result otherwise.</li>
        <li><b>Compute.</b> D = √((x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²). Because both positions are in the same frame and units, the result does not depend on the choice of frame centre.</li>
        <li><b>Verify.</b> For single instants we also ask Horizons directly for Mars as seen from the Moon's centre (<code>CENTER=500@301</code>) and display the difference.</li>
        <li><b>Extremes.</b> For a period, the closest/farthest samples are refined with a second, ~100× finer query around each extreme because the Moon's monthly motion (±≈ 400 000 km) shifts them by hours.</li>
        <li><b>Units.</b> 1 au = 149 597 870.7 km (IAU 2012, exact); 1 mile = 1.609344 km; c = 299 792.458 km/s.</li>
        <li><b>Limits.</b> This is the <i>geometric</i> distance at one instant. It is not a spacecraft path length and not a travel time. Real trajectories are curved transfer orbits planned around launch windows.</li>
      </ol>
    </section>

    <section class="section glass card method">
      <div class="section-title"><h2>Other calculations</h2></div>
      <ul class="small muted" style="padding-left:18px">
        <li><b>Mars time & season</b> — NASA GISS Mars24 algorithm (Allison & McEwen 2000): Mars Sol Date, Coordinated Mars Time, solar longitude L<sub>s</sub>. <a href="https://www.giss.nasa.gov/tools/mars24/help/algorithm.html" target="_blank" rel="noopener">Algorithm ↗</a></li>
        <li><b>Lunar phase</b> — Sun–Moon–Earth angle from the same Horizons vectors; illuminated fraction (1 + cos i)/2.</li>
        <li><b>Weight</b> — Earth weight × (body surface gravity ÷ 9.80 m/s²).</li>
      </ul>
    </section>

    <section class="section">
      <div class="section-title"><h2>All references</h2></div>
      <div class="glass card table-scroll"><table class="ptable"><tbody>
        ${Object.values(SOURCES).map((s) => `<tr><th scope="row">${esc(s.title)}<span class="note">${esc(s.org)}</span></th><td class="small">${esc(s.kind)}<br><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></td></tr>`).join('')}
        <tr><th scope="row">Book/ images reused<span class="note">NASA/JPL-Caltech, public domain</span></th><td class="small">PIA24542, PIA00407, PIA17936, PIA22329, S69-39961, NHQ202211160030 (from this repository's Junior Astronaut Handbook)</td></tr>
      </tbody></table></div>
    </section>

    <section class="section" id="glossary">
      <div class="section-title"><h2>Glossary</h2></div>
      <div class="glass card"><dl style="margin:0;display:grid;gap:12px">${Object.entries(GLOSSARY).map(([k, v]) => `<div id="term-${esc(k.replace(/\s+/g, '-'))}" style="scroll-margin-top:90px"><dt style="font-weight:600;text-transform:capitalize">${esc(k)}</dt><dd style="margin:2px 0 0;color:var(--text-2);font-size:14px">${esc(v)}</dd></div>`).join('')}</dl></div>
    </section>
  </div>`;

  const t = params.get('term');
  if (t) setTimeout(() => { const n = document.getElementById(`term-${t.replace(/\s+/g, '-')}`); n?.scrollIntoView({ behavior: 'smooth' }); n?.animate([{ background: 'rgba(139,124,246,.25)' }, { background: 'transparent' }], { duration: 2200 }); }, 200);

  // status
  const body = el.querySelector('#statusBody');
  const rows = [];
  try { const s = await loadSnapshot(); rows.push(`✔ Horizons snapshot: ${s.n} daily epochs, retrieved ${fmtDate(s.meta.retrievedAt, false)}`); } catch (e) { rows.push(`✖ Horizons snapshot: ${esc(e.message)}`); }
  try { const h = await fetchJson('api/health', { timeout: 8000 }); rows.push(`✔ API proxy online (NASA key: ${esc(h.nasaKey)})`); } catch { rows.push('✖ API proxy not reachable — live Horizons and APOD disabled; cached data is used. Run <code>npm start</code> or deploy the Netlify functions.'); }
  const last = lastLiveUpdate();
  rows.push(`Last successful live Horizons update in this browser: ${last ? fmtLocalTime(last) : 'none yet'}`);
  body.innerHTML = rows.map((r) => `<div>${r}</div>`).join('');
}
