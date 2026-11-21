import * as THREE from 'three';

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

const loader = new THREE.TextureLoader();
const texCache = new Map();
export function loadTexture(url) {
  if (!texCache.has(url)) {
    texCache.set(url, new Promise((resolve, reject) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; resolve(t); }, undefined, () => { texCache.delete(url); reject(new Error(`Texture failed: ${url}`)); })));
  }
  return texCache.get(url);
}

/** Unit vector for planetocentric latitude / east longitude, matching three.js SphereGeometry UVs
 *  with an equirectangular map centred on 0° longitude. */
export function latLonToVec(lat, lon, r = 1) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

/** Resize renderer/camera to the canvas' CSS box. Returns true if size changed. */
export function fit(renderer, camera, canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return false;
  const s = renderer.getSize(new THREE.Vector2());
  if (s.x === w && s.y === h) return false;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  return true;
}

export function disposeScene(scene) {
  scene.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => m.dispose?.());
  });
}

/** Run an animation loop only while the element is on screen and the tab is visible. */
export function visibleLoop(el, frame) {
  let raf = 0, onScreen = true, stopped = false;
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) tick(); }, { threshold: 0 });
  io.observe(el);
  function tick() {
    cancelAnimationFrame(raf);
    if (stopped || !onScreen || document.hidden) return;
    raf = requestAnimationFrame((t) => { frame(t); tick(); });
  }
  const vis = () => tick();
  document.addEventListener('visibilitychange', vis);
  tick();
  return () => { stopped = true; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', vis); };
}
