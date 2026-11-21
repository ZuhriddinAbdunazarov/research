// Dashboard hero: textured Mars and Moon (NASA maps), draggable. Purely illustrative — sizes & spacing are NOT to scale.
import * as THREE from 'three';
import { loadTexture, makeRenderer, fit, disposeScene, visibleLoop } from './common.js';

export async function createHero(canvas) {
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 0, 12);

  const [marsTex, moonTex] = await Promise.all([loadTexture('assets/tex/mars.jpg'), loadTexture('assets/tex/moon.jpg')]);

  scene.add(new THREE.AmbientLight(0x8899bb, 0.18));
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
  sun.position.set(-6, 2.5, 5);
  scene.add(sun);

  const group = new THREE.Group();
  scene.add(group);
  const mars = new THREE.Mesh(new THREE.SphereGeometry(2.6, 96, 64), new THREE.MeshStandardMaterial({ map: marsTex, roughness: 1 }));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 48), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1 }));
  mars.rotation.z = THREE.MathUtils.degToRad(25.19); // real obliquity, for flavour
  group.add(mars, moon);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2.68, 64, 32), new THREE.MeshBasicMaterial({ color: 0xe2733a, transparent: true, opacity: 0.08, side: THREE.BackSide }));
  mars.add(glow);

  // background star points (illustrative)
  const starGeo = new THREE.BufferGeometry();
  const pts = new Float32Array(1800 * 3);
  for (let i = 0; i < pts.length; i += 3) {
    const r = 60 + Math.random() * 40, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pts[i] = r * Math.sin(ph) * Math.cos(th); pts[i + 1] = r * Math.sin(ph) * Math.sin(th); pts[i + 2] = -Math.abs(r * Math.cos(ph));
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xc8d4ff, size: 0.12, transparent: true, opacity: 0.7 })));

  // drag to rotate
  let dragging = false, lx = 0, ly = 0, vx = 0, vy = 0;
  const down = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (!dragging) return; vx = (e.clientX - lx) * 0.005; vy = (e.clientY - ly) * 0.003; lx = e.clientX; ly = e.clientY; };
  const up = () => { dragging = false; };
  canvas.addEventListener('pointerdown', down);
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tilt = 0;
  const stop = visibleLoop(canvas, (t) => {
    fit(renderer, camera, canvas);
    const wide = camera.aspect > 1.1;
    group.position.set(wide ? 3.2 : 0, wide ? 0 : 2.4, 0);
    group.scale.setScalar(wide ? 1 : 0.62);
    const s = t * 0.001;
    if (!reduced) { mars.rotation.y += 0.0012 + vx; moon.rotation.y += 0.0008 + vx; }
    else { mars.rotation.y += vx; moon.rotation.y += vx; }
    tilt = THREE.MathUtils.clamp(tilt + vy, -0.5, 0.5);
    group.rotation.x = tilt;
    vx *= 0.92; vy *= 0.85;
    const a = reduced ? 0.9 : s * 0.08 + 0.9;
    moon.position.set(Math.cos(a) * 4.6, 0.9 + Math.sin(a * 0.7) * 0.3, Math.sin(a) * 2.2 + 1);
    renderer.render(scene, camera);
  });

  return () => {
    stop();
    canvas.removeEventListener('pointerdown', down);
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    disposeScene(scene);
    renderer.dispose();
  };
}
