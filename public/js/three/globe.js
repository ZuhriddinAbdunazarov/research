// Interactive textured globe with surface-feature markers (Mars / Moon explorers).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadTexture, latLonToVec, makeRenderer, fit, disposeScene, visibleLoop } from './common.js';

/**
 * @param {HTMLElement} wrap  container (position:relative) — a canvas is appended
 * @param {{texture:string, features:Array, accent:string, onSelect:(id:string)=>void}} opts
 */
export async function createGlobe(wrap, { texture, features, accent = '#e2733a', onSelect }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Interactive 3D globe. Drag to rotate, scroll or pinch to zoom.');
  canvas.setAttribute('role', 'img');
  wrap.prepend(canvas);
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.6, 3.9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 2, 5);
  scene.add(sun);

  const map = await loadTexture(texture);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0 }));
  scene.add(globe);
  // thin atmosphere-ish rim for Mars; harmless for Moon (accent chooses tint)
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.015, 64, 32), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.06, side: THREE.BackSide }));
  scene.add(rim);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.6;
  controls.maxDistance = 6;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  // markers
  const markerMat = new THREE.MeshBasicMaterial({ color: accent });
  const markers = features.map((f) => {
    const pos = latLonToVec(f.lat, f.lon, 1.002);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), markerMat);
    dot.position.copy(pos);
    globe.add(dot);
    const label = document.createElement('button');
    label.className = 'marker-label';
    label.textContent = f.name;
    label.type = 'button';
    label.addEventListener('click', () => onSelect?.(f.id));
    wrap.appendChild(label);
    return { f, pos, label };
  });

  let flight = null;
  function focus(id) {
    const m = markers.find((x) => x.f.id === id);
    markers.forEach((x) => x.label.classList.toggle('active', x === m));
    if (!m) return;
    controls.autoRotate = false;
    const dist = Math.max(3.5, Math.min(camera.position.length(), 4));
    const from = camera.position.clone();
    const to = m.pos.clone().normalize().multiplyScalar(dist);
    flight = { from, to, t0: performance.now(), dur: 900 };
  }

  const v = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const stop = visibleLoop(canvas, (now) => {
    fit(renderer, camera, canvas);
    if (flight) {
      const k = Math.min(1, (now - flight.t0) / flight.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const len = THREE.MathUtils.lerp(flight.from.length(), flight.to.length(), e);
      camera.position.copy(flight.from.clone().normalize().lerp(flight.to.clone().normalize(), e).normalize().multiplyScalar(len));
      if (k >= 1) flight = null;
    }
    controls.update();
    sun.position.copy(camera.position).add(new THREE.Vector3(2, 1.5, 0)); // keep the visible hemisphere lit
    renderer.render(scene, camera);
    // project labels
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camDir.copy(camera.position).normalize();
    for (const m of markers) {
      v.copy(m.pos).applyMatrix4(globe.matrixWorld);
      const facing = v.clone().normalize().dot(camDir) > 0.15;
      v.project(camera);
      m.label.classList.toggle('hidden', !facing);
      if (facing) { m.label.style.left = `${(v.x * 0.5 + 0.5) * w}px`; m.label.style.top = `${(-v.y * 0.5 + 0.5) * h}px`; }
    }
  });

  return {
    focus,
    dispose() {
      stop();
      controls.dispose();
      markers.forEach((m) => m.label.remove());
      disposeScene(scene);
      renderer.dispose();
      canvas.remove();
    },
  };
}
