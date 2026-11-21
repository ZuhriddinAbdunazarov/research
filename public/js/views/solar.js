// 3D solar system positioned with JPL Horizons ephemerides (snapshot + optional live sync).
import { MARS, MOON, EARTH, CONST, prop } from '../data/bodies.js';
import { loadSnapshot, snapshotStateAt, snapshotRange, getStateAt, getSeries, distance, norm, sub } from '../services/ephemeris.js';
import { webglAvailable } from '../three/common.js';
import { fmt, fmtDate, esc, cite, modeBadge, errorBox, loading } from '../ui/format.js';

const DAY = 86400000;
const AU = CONST.AU_KM;
const SCALE = 100 / AU; // 1 au = 100 scene units

export async function render(el) {
  if (!webglAvailable()) {
    el.innerHTML = `<div class="wrap"><div class="page-head"><h1>3D Solar System</h1></div>${errorBox('WebGL is not available in this browser, so the 3D view cannot be shown. The Distance Calculator includes a 2D ecliptic-plane view.')}</div>`;
    return;
  }
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { loadTexture, makeRenderer, fit, disposeScene, visibleLoop } = await import('../three/common.js');

  el.innerHTML = `<div class="solar" id="solar">
    <canvas id="sc" aria-label="Interactive 3D model of the Sun, Earth, Moon and Mars. Drag to rotate, scroll to zoom, click a body for details." role="img"></canvas>
    <div class="glass solar-panel">
      <div class="kicker violet">3D Solar System</div>
      <h2 style="font-size:20px;margin:6px 0 8px">Sun · Earth · Moon · Mars</h2>
      <p class="small muted">Positions come from NASA/JPL Horizons (heliocentric, ecliptic J2000). Orbit paths are the actual ephemeris tracks — not idealised circles.</p>
      <div id="provenance" class="small" style="margin-bottom:10px">${loading('Loading ephemeris…')}</div>
      <div class="grid" style="gap:10px">
        <label class="field">Body size
          <div class="seg" id="sizeSeg"><button data-s="enlarged" aria-pressed="true">Enlarged</button><button data-s="true">True scale</button></div>
        </label>
        <label class="field">Moon offset exaggeration: <span id="exagV" class="num">×40</span>
          <input type="range" id="exag" min="1" max="80" value="40" aria-label="Moon offset exaggeration">
        </label>
        <label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="lbl" checked> Labels & distance line</label>
      </div>
      <div class="notice small" style="margin-top:12px"><span class="badge badge-illus">ILLUSTRATIVE</span> Body sizes (when enlarged) and the Earth–Moon spacing are exaggerated for visibility. Positions of Sun, Earth and Mars are to scale.</div>
      <div class="small dim" style="margin-top:10px">Legend: <span class="legend-dot" style="background:#ffcf6b"></span>Sun <span class="legend-dot" style="background:#4a90e2;margin-left:8px"></span>Earth <span class="legend-dot" style="background:#c9ccd6;margin-left:8px"></span>Moon <span class="legend-dot" style="background:#e2733a;margin-left:8px"></span>Mars</div>
    </div>
    <div class="glass solar-info" id="info" aria-live="polite"></div>
    <div class="glass solar-time">
      <div class="row">
        <button class="btn btn-sm" id="play" aria-label="Play animation">▶ Play</button>
        <div class="seg" id="speedSeg" role="group" aria-label="Animation speed"><button data-v="1" aria-pressed="true">1 d/s</button><button data-v="10">10 d/s</button><button data-v="60">60 d/s</button></div>
        <input type="date" id="date" style="max-width:170px" aria-label="Scene date (UTC)">
        <button class="btn btn-sm" id="today">Today</button>
        <button class="btn btn-sm" id="live" title="Fetch exact live positions for this instant from JPL Horizons">Sync live Horizons</button>
        <span class="num small" id="dateLbl" style="margin-left:auto"></span>
      </div>
      <input type="range" id="slider" min="0" max="1000" value="0" aria-label="Time slider">
    </div>
  </div>`;

  const $ = (s) => el.querySelector(s);
  const canvas = $('#sc');
  const wrap = $('#solar');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000);
  camera.position.set(60, 140, 220);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 1200;

  let snap;
  try { snap = await loadSnapshot(); } catch (e) {
    $('#provenance').innerHTML = errorBox(`Ephemeris snapshot failed to load: ${e.message}`);
  }
  const range = snap ? snapshotRange(snap) : { start: new Date(), stop: new Date() };

  // ---------- scene ----------
  scene.add(new THREE.AmbientLight(0x404a60, 0.6));
  const sunLight = new THREE.PointLight(0xfff4e0, 3, 0, 0);
  scene.add(sunLight);
  loadTexture('assets/tex/stars.jpg').then((t) => { if (!disposed) { t.mapping = THREE.EquirectangularReflectionMapping; scene.background = t; scene.backgroundIntensity = 0.35; } }).catch(() => {});

  const [earthTex, moonTex, marsTex] = await Promise.all(['earth', 'moon', 'mars'].map((n) => loadTexture(`assets/tex/${n}.jpg`).catch(() => null)));
  const R = { sun: 696_000, earth: prop(EARTH, 'radius').value, moon: prop(MOON, 'radius').value, mars: prop(MARS, 'radius').value };
  const ENLARGED = { sun: 6, earth: 2.2, moon: 0.8, mars: 1.6 };
  const mk = (r, opts) => new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), opts.basic ? new THREE.MeshBasicMaterial({ color: opts.color }) : new THREE.MeshStandardMaterial({ roughness: 1, ...opts }));
  const sun = mk(1, { basic: true, color: 0xffcf6b });
  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.15 }));
  sun.add(sunGlow);
  const earth = mk(1, earthTex ? { map: earthTex } : { color: 0x4a90e2 });
  const moon = mk(1, moonTex ? { map: moonTex } : { color: 0xc9ccd6 });
  const mars = mk(1, marsTex ? { map: marsTex } : { color: 0xe2733a });
  earth.rotation.z = THREE.MathUtils.degToRad(23.44);
  mars.rotation.z = THREE.MathUtils.degToRad(25.19);
  const bodies = { sun, earth, moon, mars };
  Object.entries(bodies).forEach(([k, m]) => { m.userData.key = k; scene.add(m); });

  // minimum visible marker sprites for true-scale mode
  const ring = (col) => new THREE.Mesh(new THREE.RingGeometry(0.9, 1.2, 32), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
  const halos = { earth: ring(0x4a90e2), moon: ring(0xc9ccd6), mars: ring(0xe2733a) };
  Object.values(halos).forEach((h) => { h.visible = false; scene.add(h); });

  const lineMat = new THREE.LineDashedMaterial({ color: 0x8b7cf6, dashSize: 2, gapSize: 1.5 });
  const mmLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
  scene.add(mmLine);

  // ecliptic grid (1 au rings)
  for (let au = 0.5; au <= 2; au += 0.5) {
    const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * au * 100, 0, Math.sin(a) * au * 100); }));
    scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x2a3a5c, transparent: true, opacity: 0.35 })));
  }

  const toScene = (v) => new THREE.Vector3(v[0] * SCALE, v[2] * SCALE, -v[1] * SCALE);
  let orbitLines = [];
  function buildOrbits(t) {
    orbitLines.forEach((l) => { scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
    orbitLines = [];
    if (!snap) return;
    const track = (key, days, col) => {
      const pts = [];
      for (let d = -days / 2; d <= days / 2; d += 2) {
        const st = snapshotStateAt(snap, new Date(t.getTime() + d * DAY));
        if (st) pts.push(toScene(st[key]));
      }
      if (pts.length < 2) return;
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 }));
      scene.add(l); orbitLines.push(l);
    };
    track('earth', 366, 0x4a90e2);
    track('mars', 688, 0xe2733a);
  }

  // labels
  const labels = {};
  for (const [k, txt] of [['sun', 'SUN'], ['earth', 'EARTH'], ['moon', 'MOON'], ['mars', 'MARS'], ['mm', '']]) {
    const d = document.createElement('div'); d.className = 'solar-label'; d.textContent = txt; wrap.appendChild(d); labels[k] = d;
  }
  labels.mm.style.color = '#c9c2ff';

  // ---------- state ----------
  let exag = 40, sizeMode = 'enlarged', showLabels = true;
  let current = null; // { time, bodies, meta }
  let playing = false, speed = 1, lastFrame = 0, simTime = new Date();
  let orbitsAt = 0;
  let selected = 'mars';
  let disposed = false;

  function setState(st) {
    current = st;
    const b = st.bodies;
    const pe = toScene(b.earth), pm = toScene(b.mars);
    const moonRel = toScene(sub(b.moon, b.earth)).multiplyScalar(exag);
    sun.position.set(0, 0, 0);
    earth.position.copy(pe); mars.position.copy(pm); moon.position.copy(pe).add(moonRel);
    const scale = (k) => (sizeMode === 'true' ? R[k] * SCALE : ENLARGED[k]);
    for (const k of Object.keys(bodies)) bodies[k].scale.setScalar(scale(k));
    for (const k of Object.keys(halos)) {
      halos[k].visible = sizeMode === 'true';
      halos[k].position.copy(bodies[k].position);
    }
    mmLine.geometry.setFromPoints([moon.position, mars.position]);
    mmLine.computeLineDistances();
    if (Math.abs(st.time - orbitsAt) > 20 * DAY) { buildOrbits(st.time); orbitsAt = +st.time; }
    $('#dateLbl').textContent = fmtDate(st.time);
    $('#date').value = st.time.toISOString().slice(0, 10);
    if (snap) $('#slider').value = String(Math.round(((st.time - range.start) / (range.stop - range.start)) * 1000));
    $('#provenance').innerHTML = `${modeBadge(st.meta)} <span class="dim">${st.meta.mode === 'live' ? `exact positions for ${fmtDate(st.time)}` : `retrieved ${fmtDate(st.meta.retrievedAt, false)} · covers ${fmtDate(range.start, false)} – ${fmtDate(range.stop, false)}`}</span>`;
    paintInfo();
  }

  function snapState(t) {
    const st = snap && snapshotStateAt(snap, t);
    if (!st) return null;
    return { time: t, bodies: st, meta: { ...snap.meta, mode: 'snapshot' } };
  }

  function paintInfo() {
    if (!current) return;
    const b = current.bodies;
    const au = (km) => `${fmt(km / AU, 4)} au`;
    const mk = (title, color, rows, link) => `<div class="kicker" style="color:${color}">Selected body</div><h3 style="font-size:20px;margin:4px 0 10px">${title}</h3>
      <table class="ptable"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td class="num">${v}</td></tr>`).join('')}</tbody></table>${link ? `<p class="small" style="margin:10px 0 0">${link}</p>` : ''}`;
    const mm = distance(b.mars, b.moon);
    const map = {
      sun: () => mk('Sun', '#ffcf6b', [['Earth distance', au(norm(b.earth))], ['Mars distance', au(norm(b.mars))], ['Mean radius', '695 700 km']], '<span class="dim">Centre of the heliocentric frame used here.</span>'),
      earth: () => mk('Earth', '#4a90e2', [['Distance from Sun', au(norm(b.earth))], ['Earth ↔ Mars', `${fmt(distance(b.earth, b.mars) / 1e6, 2)} M km`], ['Earth ↔ Moon', `${fmt(distance(b.earth, b.moon), 0)} km`], ['Surface gravity', '9.80 m/s²']], cite('earthFact')),
      moon: () => mk('Moon', '#c9ccd6', [['Moon ↔ Mars', `${fmt(mm / 1e6, 3)} M km`], ['Moon ↔ Earth', `${fmt(distance(b.earth, b.moon), 0)} km`], ['Distance from Sun', au(norm(b.moon))], ['Radius', '1 737.4 km']], '<a href="#/moon">Open Moon Explorer →</a>'),
      mars: () => mk('Mars', '#e2733a', [['Distance from Sun', au(norm(b.mars))], ['Mars ↔ Moon', `${fmt(mm / 1e6, 3)} M km`], ['Mars ↔ Earth', `${fmt(distance(b.earth, b.mars) / 1e6, 3)} M km`], ['Light-time to Moon', `${fmt(mm / CONST.C_KM_S / 60, 2)} min`]], `<a href="#/mars">Open Mars Explorer →</a> · <a href="#/distance?t=${encodeURIComponent(current.time.toISOString())}">Distance details →</a>`),
    };
    $('#info').innerHTML = map[selected]();
  }

  // ---------- interaction ----------
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects([...Object.values(bodies), ...Object.values(halos)], false)[0];
    if (hit) {
      selected = hit.object.userData.key || Object.keys(halos).find((k) => halos[k] === hit.object);
      paintInfo();
      // fly toward selection
      const target = bodies[selected].position.clone();
      const off = camera.position.clone().sub(controls.target).setLength(Math.max(8, bodies[selected].scale.x * 8 + (selected === 'sun' ? 40 : 10)));
      fly = { t0: performance.now(), fromT: controls.target.clone(), toT: target, fromP: camera.position.clone(), toP: target.clone().add(off) };
    }
  });
  let fly = null;

  $('#sizeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sizeMode = b.dataset.s; el.querySelectorAll('#sizeSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); if (current) setState(current); });
  $('#exag').addEventListener('input', (e) => { exag = Number(e.target.value); $('#exagV').textContent = `×${exag}`; if (current) setState(current); });
  $('#lbl').addEventListener('change', (e) => { showLabels = e.target.checked; mmLine.visible = showLabels; });
  $('#speedSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; speed = Number(b.dataset.v); el.querySelectorAll('#speedSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  const setPlaying = (p) => { playing = p; $('#play').textContent = p ? '❚❚ Pause' : '▶ Play'; $('#play').setAttribute('aria-label', p ? 'Pause animation' : 'Play animation'); };
  $('#play').addEventListener('click', () => { if (!snap) return; setPlaying(!playing); lastFrame = performance.now(); simTime = current?.time || new Date(); });
  $('#slider').addEventListener('input', (e) => {
    if (!snap) return;
    setPlaying(false);
    const t = new Date(+range.start + (Number(e.target.value) / 1000) * (range.stop - range.start));
    const st = snapState(t); if (st) setState(st);
  });
  async function goTo(t) {
    setPlaying(false);
    const st = snapState(t);
    if (st) { setState(st); return; }
    await syncLive(t);
  }
  $('#date').addEventListener('change', (e) => { const t = new Date(`${e.target.value}T00:00:00Z`); if (!Number.isNaN(t.getTime())) goTo(t); });
  $('#today').addEventListener('click', () => goTo(new Date()));
  async function syncLive(t = current?.time || new Date()) {
    setPlaying(false);
    $('#live').disabled = true;
    $('#provenance').innerHTML = loading('Requesting JPL Horizons…');
    try {
      const st = await getStateAt(t, { verify: false });
      if (disposed) return;
      if (st.meta.mode !== 'live' && !snapState(t)) throw new Error('Horizons unavailable and date outside snapshot.');
      setState(st);
      if (st.meta.mode !== 'live') $('#provenance').insertAdjacentHTML('beforeend', `<div class="notice small" style="margin-top:6px">Live sync failed${st.liveError ? `: ${esc(st.liveError)}` : ''}. Using cached snapshot.</div>`);
      if (!snapState(t) && st.meta.mode === 'live') {
        // outside snapshot: build orbit tracks from a live series
        const s = await getSeries(new Date(t.getTime() - 344 * DAY), new Date(t.getTime() + 344 * DAY), 344);
        if (disposed) return;
        orbitLines.forEach((l) => { scene.remove(l); l.geometry.dispose(); l.material.dispose(); }); orbitLines = [];
        const mid = 172;
        for (const [key, col, n] of [['earth', 0x4a90e2, 183], ['mars', 0xe2733a, 344]]) {
          const pts = s.bodies[key].slice(Math.max(0, mid - n / 2 | 0), mid + n / 2 | 0).map(toScene);
          const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 }));
          scene.add(l); orbitLines.push(l);
        }
        orbitsAt = +t;
      }
    } catch (e) {
      $('#provenance').innerHTML = errorBox(e.message);
    } finally { $('#live').disabled = false; }
  }
  $('#live').addEventListener('click', () => syncLive());

  // initial
  const start = snapState(new Date());
  if (start) setState(start); else await syncLive(new Date());

  // ---------- loop ----------
  const v = new THREE.Vector3();
  const stop = visibleLoop(canvas, (now) => {
    fit(renderer, camera, canvas);
    if (playing && snap) {
      const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
      simTime = new Date(+(current?.time || simTime) + dt * speed * DAY);
      if (simTime > range.stop) simTime = new Date(+range.start);
      const st = snapState(simTime); if (st) setState(st);
    }
    if (fly) {
      const k = Math.min(1, (now - fly.t0) / 900), e = 1 - (1 - k) ** 3;
      controls.target.lerpVectors(fly.fromT, fly.toT, e);
      camera.position.lerpVectors(fly.fromP, fly.toP, e);
      if (k >= 1) fly = null;
    } else if (selected !== 'sun' && current) {
      // keep tracking the selected body while time moves
      const delta = bodies[selected].position.clone().sub(controls.target);
      if (delta.lengthSq() > 1e-8 && playing) { controls.target.add(delta); camera.position.add(delta); }
    }
    controls.update();
    for (const h of Object.values(halos)) if (h.visible) { h.lookAt(camera.position); h.scale.setScalar(camera.position.distanceTo(h.position) * 0.012); }
    earth.rotation.y += 0.01; mars.rotation.y += 0.0097; sun.rotation.y += 0.001;
    renderer.render(scene, camera);
    // labels
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const place = (lab, pos, visible) => {
      v.copy(pos).project(camera);
      const on = visible && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      lab.style.display = on ? '' : 'none';
      if (on) { lab.style.left = `${(v.x * 0.5 + 0.5) * w}px`; lab.style.top = `${(-v.y * 0.5 + 0.5) * h}px`; }
    };
    for (const k of ['sun', 'earth', 'moon', 'mars']) place(labels[k], bodies[k].position, showLabels);
    if (current) {
      labels.mm.textContent = `${fmt(distance(current.bodies.mars, current.bodies.moon) / 1e6, 2)} M km`;
      place(labels.mm, moon.position.clone().lerp(mars.position, 0.5), showLabels);
    }
  });

  return () => {
    disposed = true;
    stop();
    controls.dispose();
    Object.values(labels).forEach((l) => l.remove());
    disposeScene(scene);
    renderer.dispose();
  };
}
