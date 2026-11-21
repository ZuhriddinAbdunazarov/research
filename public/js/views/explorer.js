// Mars Explorer & Moon Explorer (shared layout, body-specific sections).
import { MARS, MOON } from '../data/bodies.js';
import { MARS_FEATURES, MOON_FEATURES, MARS_TOPICS, MOON_TOPICS } from '../data/features.js';
import { SOURCES } from '../data/sources.js';
import { firstImage } from '../services/nasa.js';
import { getStateAt } from '../services/ephemeris.js';
import { marsTime, fmtMtc } from '../services/marsTime.js';
import { lunarPhase, phaseSvg } from '../services/moonPhase.js';
import { webglAvailable } from '../three/common.js';
import { fmt, fmtDate, esc, cite, term, refBadge, modeBadge, loading, errorBox } from '../ui/format.js';

const CFG = {
  mars: { body: MARS, features: MARS_FEATURES, topics: MARS_TOPICS, tex: 'assets/tex/mars.jpg', texSrc: 'nasa3d', accent: '#e2733a', kicker: 'mars', more: 'marsScience' },
  moon: { body: MOON, features: MOON_FEATURES, topics: MOON_TOPICS, tex: 'assets/tex/moon.jpg', texSrc: 'svsMoon', accent: '#9fb3d9', kicker: 'moon', more: 'moonScience' },
};

const TERM_KEYS = new Set(['escape velocity', 'sol', 'sidereal', 'synodic', 'semi-major axis', 'eccentricity', 'tidal locking', 'exosphere', 'permanently shadowed region']);

function propRow(p) {
  const v = p.display ?? (Math.abs(p.value) >= 1000 ? fmt(p.value, 1) : fmt(p.value, 4));
  const label = p.term && TERM_KEYS.has(p.term) ? `${esc(p.label)} <span class="term" tabindex="0" data-term="${esc(p.term)}">ⓘ</span>` : esc(p.label);
  return `<tr><th scope="row">${label}</th><td><span class="num">${esc(v)}</span><span class="u">${esc(p.unit)}</span>${p.note ? `<span class="note">${esc(p.note)}</span>` : ''}<span class="note">${cite(p.src)}</span></td></tr>`;
}

export async function render(el, params, which) {
  const c = CFG[which];
  const B = c.body;
  const ctl = new AbortController();
  const cleanups = [() => ctl.abort()];

  const extraNav = which === 'mars' ? '<a class="chip" href="#sec-atmo">Atmosphere</a><a class="chip" href="#sec-moons">Phobos & Deimos</a><a class="chip" href="#sec-time">Mars time & season</a>'
    : '<a class="chip" href="#sec-phase">Current phase</a>';

  el.innerHTML = `<div class="wrap">
    <div class="page-head">
      <div class="kicker ${c.kicker}">${which === 'mars' ? 'Planet · 4th from the Sun' : 'Natural satellite of Earth'}</div>
      <h1>${B.name} Explorer</h1>
      <p>${esc(B.tagline)}</p>
      <div class="chip-row" style="margin-top:14px">
        <a class="chip" href="#sec-geo">Geography</a><a class="chip" href="#sec-props">Physical properties</a>${extraNav}<a class="chip" href="#sec-topics">Science topics</a>
      </div>
    </div>

    <section class="split" id="sec-geo" style="scroll-margin-top:80px">
      <div class="glass" style="overflow:hidden;position:relative">
        <div class="globe-wrap" id="globe">
          <div class="globe-ui"><span>Drag to rotate · scroll/pinch to zoom · click a label</span><span>Texture: ${cite(c.texSrc, SOURCES[c.texSrc].title.split('—')[0].trim())}</span></div>
        </div>
      </div>
      <div class="grid" style="align-content:start">
        <div class="section-title" style="margin:0"><h2>Geography</h2><span class="dim">${c.features.length} features · real coordinates</span></div>
        <div class="feature-list" id="flist" role="list">
          ${c.features.map((f) => `<button class="feature-btn" data-f="${f.id}" aria-pressed="false" role="listitem"><span>${esc(f.name)}<br><small>${esc(f.type)}</small></span><small class="num">${fmt(Math.abs(f.lat), 1)}°${f.lat >= 0 ? 'N' : 'S'} ${fmt(Math.abs(f.lon), 1)}°${f.lon >= 0 ? 'E' : 'W'}</small></button>`).join('')}
        </div>
      </div>
    </section>
    <div class="glass feature-detail section" id="fdetail" style="margin-top:16px" aria-live="polite"></div>

    <section class="section" id="sec-props" style="scroll-margin-top:80px">
      <div class="section-title"><h2>Physical properties</h2>${refBadge()}<span class="dim">Static reference values with units and sources</span></div>
      <div class="glass card table-scroll"><table class="ptable">${B.props.map(propRow).join('')}</table></div>
    </section>

    ${which === 'mars' ? marsExtras() : moonExtras()}

    <section class="section" id="sec-topics" style="scroll-margin-top:80px">
      <div class="section-title"><h2>Science topics</h2></div>
      <div class="grid g2">${c.topics.map((t) => `<article class="glass topic"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>${cite(t.src)}</article>`).join('')}</div>
      <p class="small dim" style="margin-top:16px">More: ${cite(c.more)} · ${cite('pds', 'NASA Planetary Data System (raw mission data)')}</p>
    </section>
  </div>`;

  // in-page anchors shouldn't trigger the router
  el.querySelectorAll('a.chip[href^="#sec-"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    el.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  }));

  // globe
  let globe = null;
  const gw = el.querySelector('#globe');
  if (webglAvailable()) {
    try {
      const { createGlobe } = await import('../three/globe.js');
      globe = await createGlobe(gw, { texture: c.tex, features: c.features, accent: c.accent, onSelect: (id) => select(id, true) });
      if (ctl.signal.aborted) { globe.dispose(); globe = null; } else cleanups.push(() => globe.dispose());
    } catch (e) {
      console.warn(e);
      gw.insertAdjacentHTML('afterbegin', `<img src="${c.tex}" alt="${B.name} global map (NASA)" style="width:100%;height:100%;object-fit:cover">`);
    }
  } else {
    gw.insertAdjacentHTML('afterbegin', `<img src="${c.tex}" alt="${B.name} global map (NASA)" style="width:100%;height:100%;object-fit:contain">`);
  }

  const detail = el.querySelector('#fdetail');
  let selToken = 0;
  async function select(id, fromGlobe = false) {
    const f = c.features.find((x) => x.id === id) || c.features[0];
    const token = ++selToken;
    el.querySelectorAll('.feature-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f.id)));
    globe?.focus(f.id);
    detail.innerHTML = `<div class="split r">
      <div><div class="img" id="fimg"><div class="skeleton" style="width:100%;height:100%"></div></div><div id="fcap"></div></div>
      <div>
        <div class="kicker ${c.kicker}">${esc(f.type)}</div>
        <h3 style="font-size:24px;margin:6px 0 4px">${esc(f.name)}</h3>
        <div class="dim small num">${fmt(Math.abs(f.lat), 2)}°${f.lat >= 0 ? 'N' : 'S'}, ${fmt(Math.abs(f.lon), 2)}°${f.lon >= 0 ? 'E' : 'W'}</div>
        <div class="kv">${f.stats.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
        <p class="muted">${esc(f.text)}</p>
        <div class="small">${cite(f.src)} · <a href="#/gallery?q=${encodeURIComponent(f.query)}">More images →</a></div>
      </div></div>`;
    if (fromGlobe) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      const img = await firstImage(f.query, { signal: ctl.signal });
      if (token !== selToken) return;
      const box = detail.querySelector('#fimg');
      box.innerHTML = img
        ? `<a href="${esc(img.pageUrl)}" target="_blank" rel="noopener" title="${esc(img.title)}"><img src="${esc(img.medium)}" alt="${esc(img.title)}" onerror="this.src='${esc(img.thumb)}'"></a>`
        : '<div class="state state-empty" style="height:100%">No NASA image found for this feature.</div>';
      if (img) detail.querySelector('#fcap').innerHTML = (`<div class="small dim" style="margin:-6px 0 10px">${esc(img.title)} — ${esc(img.credit)} / NASA · <a href="${esc(img.pageUrl)}" target="_blank" rel="noopener">${esc(img.nasaId)}</a></div>`);
    } catch (e) {
      if (e.name === 'AbortError' || token !== selToken) return;
      detail.querySelector('#fimg').innerHTML = `<div class="state state-error" style="height:100%">Image unavailable: ${esc(e.message)}</div>`;
    }
  }
  el.querySelector('#flist').addEventListener('click', (e) => { const b = e.target.closest('.feature-btn'); if (b) select(b.dataset.f); });
  select(params.get('f') || c.features[0].id);
  if (params.get('f')) setTimeout(() => detail.scrollIntoView({ behavior: 'smooth' }), 300);
  const tab = params.get('tab');
  if (tab) setTimeout(() => el.querySelector(tab === 'moons' ? '#sec-moons' : '#sec-props')?.scrollIntoView({ behavior: 'smooth' }), 200);

  // body-specific dynamic parts
  if (which === 'mars') {
    const box = el.querySelector('#marsClock');
    const tick = () => {
      const m = marsTime(new Date());
      box.innerHTML = `
        <div class="glass stat mars"><div class="label"><span>Coordinated Mars Time (MTC)</span> <span class="badge badge-calc">CALCULATED</span></div><div class="value">${fmtMtc(m.mtc)}</div><div class="foot">Mean solar time at Mars' prime meridian (Airy-0)</div></div>
        <div class="glass stat mars"><div class="label">Mars Sol Date</div><div class="value">${fmt(m.msd, 3)}</div><div class="foot">Sols since 29 Dec 1873 (MSD epoch)</div></div>
        <div class="glass stat mars"><div class="label"><span>Solar longitude L<sub>s</sub></span></div><div class="value">${fmt(m.Ls, 2)}°</div><div class="foot">Northern ${m.north} · southern ${m.south}</div></div>`;
    };
    tick();
    const iv = setInterval(tick, 1000);
    cleanups.push(() => clearInterval(iv));
  } else {
    const box = el.querySelector('#phaseBox');
    const loadPhase = async () => {
      box.innerHTML = loading('Computing phase from JPL Horizons vectors…');
      try {
        const now = new Date(); now.setUTCSeconds(0, 0);
        const st = await getStateAt(now, { signal: ctl.signal, verify: false });
        const p = lunarPhase(st.bodies.earth, st.bodies.moon);
        box.innerHTML = `<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
          ${phaseSvg(p.elongation, 132)}
          <div style="flex:1;min-width:220px">
            <div class="kicker moon">${fmtDate(st.time)} ${modeBadge(st.meta)}</div>
            <h3 style="font-size:26px;margin:6px 0">${p.name}</h3>
            <div class="kv">
              <div><span>Illuminated</span><b>${fmt(p.illuminated * 100, 1)} %</b></div>
              <div><span>Elongation from Sun</span><b>${fmt(p.elongation, 1)}°</b></div>
              <div><span>Phase angle</span><b>${fmt(p.phaseAngle, 1)}°</b></div>
            </div>
            <p class="small dim">Computed from geometric Sun–Earth–Moon vectors: illuminated fraction k = (1 + cos i)/2, where i is the Sun–Moon–Earth angle. Disc drawn as seen from Earth's northern hemisphere.</p>
          </div></div>`;
      } catch (e) {
        if (e.name === 'AbortError') return;
        box.innerHTML = errorBox(e.message, true);
        box.querySelector('[data-retry]')?.addEventListener('click', loadPhase);
      }
    };
    loadPhase();
  }

  return () => cleanups.forEach((f) => { try { f(); } catch { /* */ } });
}

function marsExtras() {
  const a = MARS.atmosphere;
  return `
  <section class="section split" id="sec-atmo" style="scroll-margin-top:80px">
    <div class="glass card">
      <div class="section-title" style="margin-bottom:10px"><h2 style="font-size:19px">Atmospheric composition</h2>${refBadge()}</div>
      <p class="small muted">${esc(a.note)}</p>
      <div class="bar-list">${a.parts.map((p) => `<div class="bar-row"><span>${esc(p.gas)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0.6, p.pct)}%"></div></div><span class="num" style="text-align:right">${fmt(p.pct, 2)} %</span></div>`).join('')}</div>
      <p class="small dim" style="margin-top:12px">Surface pressure ≈ 636 Pa (6.36 mbar) — under 1 % of Earth's 101 325 Pa. ${cite(a.src)}</p>
    </div>
    <div class="glass card" id="sec-moons" style="scroll-margin-top:80px">
      <div class="section-title" style="margin-bottom:10px"><h2 style="font-size:19px">Natural satellites: Phobos & Deimos</h2></div>
      <div class="moon-sat">${MARS.moons.map((m) => `<div>
        <h3 style="font-size:17px;margin-bottom:6px">${m.name}</h3>
        <div class="kv"><div><span>Size</span><b>${esc(m.size)}</b></div><div><span>Orbit radius</span><b>${fmt(m.orbitKm)} km</b></div><div><span>Period</span><b>${fmt(m.periodH, 2)} h</b></div></div>
        <p class="small muted">${esc(m.note)}</p>${cite(m.src)}</div>`).join('')}</div>
    </div>
  </section>
  <section class="section" id="sec-time" style="scroll-margin-top:80px">
    <div class="section-title"><h2>Mars time & current season</h2><span class="dim">Live computation with the NASA GISS Mars24 algorithm (Allison & McEwen 2000) · ${term('sol')} length 24 h 39 min 35 s</span></div>
    <div class="grid g3" id="marsClock"></div>
    <p class="small dim" style="margin-top:10px">L<sub>s</sub> 0° = northern spring equinox, 90° = northern summer solstice, 180° = autumn equinox, 270° = winter solstice. <a class="cite" href="https://www.giss.nasa.gov/tools/mars24/help/algorithm.html" target="_blank" rel="noopener">Mars24 algorithm (NASA GISS)</a></p>
  </section>`;
}

function moonExtras() {
  return `
  <section class="section" id="sec-phase" style="scroll-margin-top:80px">
    <div class="section-title"><h2>Current lunar phase</h2><span class="dim">Derived from ephemeris positions, not a lookup table</span></div>
    <div class="glass card" id="phaseBox"></div>
  </section>
  <section class="section">
    <div class="notice info">The Moon's sidereal rotation (27.32 days) equals its orbital period — ${term('tidal locking')}. Its ${term('exosphere')} exerts a pressure roughly 10¹⁴ times lower than Earth's atmosphere at sea level. ${cite('moonFact')}</div>
  </section>`;
}
