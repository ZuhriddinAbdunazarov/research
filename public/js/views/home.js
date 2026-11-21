import { MARS, MOON, prop } from '../data/bodies.js';
import { SOURCES } from '../data/sources.js';
import { getStateAt, distance, lastLiveUpdate } from '../services/ephemeris.js';
import { getApod, searchImages } from '../services/nasa.js';
import { webglAvailable } from '../three/common.js';
import { fmt, fmtDate, fmtLocalTime, distText, esc, cite, refBadge, modeBadge, loading, errorBox, term, fmtDuration } from '../ui/format.js';
import { CONST } from '../data/bodies.js';

const QUICK = [
  ['#/mars', '🔴', 'Mars Explorer', 'Properties, geography, moons'],
  ['#/moon', '🌕', 'Moon Explorer', 'Maria, craters, polar ice'],
  ['#/distance', '📏', 'Distance Calculator', 'JPL Horizons, any date'],
  ['#/solar-system', '🪐', '3D Solar System', 'Ephemeris-positioned bodies'],
  ['#/compare', '⚖️', 'Mars vs Moon', 'Side-by-side science'],
  ['#/missions', '🚀', 'NASA Missions', 'Mariner to Artemis'],
  ['#/gallery', '🖼️', 'Image Gallery', 'images.nasa.gov live search'],
  ['#/analytics', '📊', 'Analytics', 'Charts & distance history'],
];

function statCard(body, key, label, cls, digits) {
  const p = prop(body, key);
  const v = p.display ?? fmt(p.value, digits);
  return `<div class="glass stat ${cls}">
    <div class="label">${esc(label)} ${refBadge()}</div>
    <div class="value">${esc(v)}<small>${esc(p.unit)}</small></div>
    <div class="foot">${cite(p.src)}</div>
  </div>`;
}

export async function render(el) {
  const cleanups = [];
  const ctl = new AbortController();
  cleanups.push(() => ctl.abort());

  el.innerHTML = `
  <section class="hero">
    <canvas class="hero-canvas" id="heroCanvas" aria-label="Illustrative 3D view of Mars and the Moon — drag to rotate" role="img"></canvas>
    <div class="hero-shade"></div>
    <div class="wrap hero-content">
      <div class="kicker violet">NASA Space Apps Challenge · Scientific data platform</div>
      <h1>MARS <span class="x">×</span> MOON</h1>
      <p class="sub">Interplanetary Scientific Data Explorer — real ${term('ephemeris')} data from NASA/JPL Horizons, NASA imagery and reference science for Mars and Earth's Moon.</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="#/distance">Calculate Mars ↔ Moon distance</a>
        <a class="btn" href="#/solar-system">Open 3D solar system</a>
      </div>
    </div>
    <div class="hero-hint">Drag to rotate · illustrative, not to scale · textures: NASA</div>
  </section>

  <div class="wrap">
    <div class="live-strip grid g3" id="liveStrip">
      <div class="glass stat violet" id="liveDist">${loading('Computing Mars–Moon distance from JPL Horizons…')}</div>
      <div class="glass stat" id="liveEM"><div class="skeleton" style="height:100%;min-height:80px"></div></div>
      <div class="glass stat" id="liveLT"><div class="skeleton" style="height:100%;min-height:80px"></div></div>
    </div>

    <div class="section">
      <div class="section-title"><h2>Key indicators</h2><span class="dim">Static reference constants from NASA fact sheets — not live measurements.</span></div>
      <div class="grid g3">
        ${statCard(MARS, 'diameter', 'Mars mean diameter', 'mars', 0)}
        ${statCard(MOON, 'diameter', 'Moon mean diameter', 'moon', 1)}
        ${statCard(MARS, 'gravity', 'Mars surface gravity', 'mars', 2)}
        ${statCard(MOON, 'gravity', 'Moon surface gravity', 'moon', 2)}
        ${statCard(MARS, 'orbit', 'Mars orbital period (around Sun)', 'mars', 2)}
        ${statCard(MOON, 'orbit', 'Moon orbital period (around Earth)', 'moon', 4)}
      </div>
    </div>

    <div class="section">
      <div class="section-title"><h2>Explore</h2></div>
      <div class="quick">${QUICK.map(([href, icon, t, s]) => `<a class="glass" href="${href}"><span class="qi" aria-hidden="true">${icon}</span><span><b>${t}</b><span>${s}</span></span></a>`).join('')}</div>
    </div>

    <div class="section split">
      <div>
        <div class="section-title"><h2>Astronomy Picture of the Day</h2><span class="dim">NASA APOD API</span></div>
        <div class="glass card" id="apod">${loading('Contacting NASA APOD…')}</div>
      </div>
      <div>
        <div class="section-title"><h2>Recent NASA imagery</h2><span class="dim">images.nasa.gov · newest uploads tagged Mars / Moon</span></div>
        <div class="glass card" id="recent">${loading('Searching the NASA Image Library…')}</div>
      </div>
    </div>
  </div>`;

  // 3D hero
  const heroCanvas = el.querySelector('#heroCanvas');
  if (webglAvailable()) {
    import('../three/hero.js').then(({ createHero }) => createHero(heroCanvas)).then((dispose) => {
      if (ctl.signal.aborted) dispose(); else cleanups.push(dispose);
    }).catch((e) => { console.warn(e); heroCanvas.replaceWith(Object.assign(document.createElement('div'), { className: 'hero-canvas', style: 'background:url(assets/img/PIA00407.jpg) 75% 50%/contain no-repeat' })); });
  } else {
    heroCanvas.style.background = 'url(assets/img/PIA00407.jpg) 80% 50%/contain no-repeat';
  }

  // live distance
  async function loadDistance() {
    const box = el.querySelector('#liveDist');
    box.innerHTML = loading('Computing Mars–Moon distance from JPL Horizons…');
    try {
      const now = new Date();
      now.setUTCSeconds(0, 0);
      const st = await getStateAt(now, { signal: ctl.signal, verify: false });
      const mm = distance(st.bodies.mars, st.bodies.moon);
      const em = distance(st.bodies.earth, st.bodies.mars);
      const emoon = distance(st.bodies.earth, st.bodies.moon);
      const last = lastLiveUpdate();
      box.innerHTML = `
        <div class="label">Mars ↔ Moon distance (now) ${modeBadge(st.meta)}</div>
        <div class="value">${fmt(mm / 1e6, 2)}<small>million km</small></div>
        <div class="foot"><span class="num">${fmt(mm / CONST.AU_KM, 4)} au</span><span>· for ${fmtDate(st.time)}</span>
        ${st.meta.mode !== 'live' ? `<span>· live data unavailable${st.liveError ? '' : ''}; last live update: ${last ? fmtLocalTime(last) : 'never'}</span>` : `<span>· retrieved ${fmtLocalTime(st.meta.retrievedAt)}</span>`}
        <a href="#/distance">Details →</a> <button class="btn btn-sm btn-ghost" data-refresh>Recalculate</button></div>`;
      el.querySelector('#liveEM').innerHTML = `
        <div class="label">Earth ↔ Mars · Earth ↔ Moon ${modeBadge(st.meta)}</div>
        <div class="value">${fmt(em / 1e6, 2)}<small>million km</small></div>
        <div class="foot"><span>Earth–Moon: <span class="num">${fmt(emoon, 0)} km</span></span><span>· geometric, centre to centre</span></div>`;
      el.querySelector('#liveLT').innerHTML = `
        <div class="label">${term('light-time', 'light-time')} Mars → Moon <span class="badge badge-calc">CALCULATED</span></div>
        <div class="value">${fmtDuration(mm / CONST.C_KM_S)}</div>
        <div class="foot"><span>distance ÷ c (299 792.458 km/s)</span> ${cite('nistC', 'c (NIST)')}</div>`;
      box.querySelector('[data-refresh]').addEventListener('click', loadDistance);
    } catch (e) {
      if (e.name === 'AbortError') return;
      box.innerHTML = errorBox(e.message, true);
      box.querySelector('[data-retry]')?.addEventListener('click', loadDistance);
      el.querySelector('#liveEM').innerHTML = '<div class="dim small">Unavailable</div>';
      el.querySelector('#liveLT').innerHTML = '<div class="dim small">Unavailable</div>';
    }
  }
  loadDistance();

  // APOD
  async function loadApod() {
    const box = el.querySelector('#apod');
    try {
      const a = await getApod({ signal: ctl.signal });
      const img = a.mediaType === 'image' ? a.url : a.thumbnailUrl;
      box.innerHTML = `
        ${img ? `<a href="${esc(a.pageUrl)}" target="_blank" rel="noopener"><img src="${esc(img)}" alt="${esc(a.title)}" loading="lazy" style="border-radius:10px;aspect-ratio:16/10;object-fit:cover;width:100%;margin-bottom:14px"></a>` : ''}
        <div class="kicker">${esc(a.date)} ${a.meta?.stale ? '· cached (API currently unavailable)' : ''}</div>
        <h3 style="margin:6px 0 8px">${esc(a.title)}</h3>
        <p class="muted small">${esc(a.explanation.slice(0, 360))}${a.explanation.length > 360 ? '…' : ''}</p>
        <div class="small dim">Credit: ${esc(a.copyright ? `© ${a.copyright}` : 'NASA / APOD')} · <a href="${esc(a.pageUrl)}" target="_blank" rel="noopener">View on apod.nasa.gov</a> · ${cite('nasaApi', 'NASA Open APIs')}</div>`;
    } catch (e) {
      if (e.name === 'AbortError') return;
      box.innerHTML = `${errorBox(`${e.message}. The APOD proxy needs the local server (npm start) or the deployed function; with DEMO_KEY the hourly limit is low.`, true)}`;
      box.querySelector('[data-retry]')?.addEventListener('click', () => { box.innerHTML = loading(); loadApod(); });
    }
  }
  loadApod();

  // Recent NASA images
  (async () => {
    const box = el.querySelector('#recent');
    try {
      const y = new Date().getUTCFullYear() - 1;
      const [mars, moon] = await Promise.all([
        searchImages('Mars', { pageSize: 40, yearStart: y, signal: ctl.signal }).catch(() => null),
        searchImages('Moon', { pageSize: 40, yearStart: y, signal: ctl.signal }).catch(() => null),
      ]);
      const byDate = (a, b) => new Date(b.date) - new Date(a.date);
      const valid = (r) => (r?.items || []).filter((i) => i.date && new Date(i.date) <= new Date()).sort(byDate).slice(0, 3); // skip items with future-dated metadata
      const items = [...valid(mars), ...valid(moon)].sort(byDate);
      if (!items.length) throw new Error('No images returned.');
      box.innerHTML = `<div class="gallery-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">${items.map((i) => `
        <a class="gitem" href="${esc(i.pageUrl)}" target="_blank" rel="noopener" title="${esc(i.title)}"><img src="${esc(i.thumb)}" alt="${esc(i.title)}" loading="lazy"><span class="cap">${esc(i.title.slice(0, 48))}<small>${esc((i.date || '').slice(0, 10))} · ${esc(i.center || 'NASA')}</small></span></a>`).join('')}</div>
        <div class="small dim" style="margin-top:12px">Images courtesy NASA (images.nasa.gov). <a href="#/gallery">Open full gallery →</a></div>`;
    } catch (e) {
      if (e.name === 'AbortError') return;
      box.innerHTML = errorBox(e.message);
    }
  })();

  return () => cleanups.forEach((f) => { try { f(); } catch { /* ignore */ } });
}
