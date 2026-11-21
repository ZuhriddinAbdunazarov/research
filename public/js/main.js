// App shell: hash router, navigation, global search, glossary tooltips.
import { MARS, MOON } from './data/bodies.js';
import { MARS_FEATURES, MOON_FEATURES } from './data/features.js';
import { MISSIONS } from './data/missions.js';
import { GLOSSARY } from './data/glossary.js';
import { esc } from './ui/format.js';

const ROUTES = {
  home: { title: 'Dashboard', load: () => import('./views/home.js') },
  mars: { title: 'Mars Explorer', load: () => import('./views/explorer.js').then((m) => ({ render: (el, p) => m.render(el, p, 'mars') })) },
  moon: { title: 'Moon Explorer', load: () => import('./views/explorer.js').then((m) => ({ render: (el, p) => m.render(el, p, 'moon') })) },
  distance: { title: 'Mars ↔ Moon Distance', load: () => import('./views/distance.js') },
  'solar-system': { title: '3D Solar System', load: () => import('./views/solar.js') },
  compare: { title: 'Mars vs Moon', load: () => import('./views/compare.js') },
  missions: { title: 'NASA Missions', load: () => import('./views/missions.js') },
  gallery: { title: 'NASA Image Gallery', load: () => import('./views/gallery.js') },
  analytics: { title: 'Scientific Analytics', load: () => import('./views/analytics.js') },
  sources: { title: 'Data Sources', load: () => import('./views/sources.js') },
};

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menuBtn');
let current = null; // { cleanup }
let navToken = 0;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const name = path || 'home';
  return { name, params: new URLSearchParams(qs || '') };
}

async function route() {
  const { name, params } = parseHash();
  const def = ROUTES[name];
  const token = ++navToken;
  try { current?.cleanup?.(); } catch (e) { console.warn(e); }
  current = null;
  closeMenu();
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.route === name));
  if (!def) {
    main.innerHTML = `<div class="wrap view"><div class="page-head"><div class="kicker">404</div><h1>Page not found</h1><p>That section does not exist. <a href="#/">Return to the dashboard</a>.</p></div></div>`;
    document.title = 'Not found — MARS × MOON';
    return;
  }
  document.title = `${def.title} — MARS × MOON`;
  main.innerHTML = '<div class="wrap view"><div class="state state-loading" style="margin-top:40px"><span class="spinner"></span>Loading section…</div></div>';
  try {
    const mod = await def.load();
    if (token !== navToken) return;
    main.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'view';
    main.appendChild(el);
    const cleanup = await mod.render(el, params);
    if (token !== navToken) { cleanup?.(); return; }
    current = { cleanup };
    if (!params.toString()) window.scrollTo({ top: 0 });
  } catch (e) {
    console.error(e);
    if (token !== navToken) return;
    main.innerHTML = `<div class="wrap view"><div class="page-head"><h1>Something went wrong</h1></div><div class="state state-error">This section failed to load: ${esc(e.message)}. Check your connection and <a href="javascript:location.reload()">reload</a>.</div></div>`;
  }
}

// ---------- mobile menu ----------
function closeMenu() { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => {
  const open = !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
});

// ---------- search ----------
const INDEX = [
  ...Object.entries(ROUTES).map(([k, r]) => ({ cat: 'Section', title: r.title, sub: '', href: `#/${k === 'home' ? '' : k}` })),
  ...MARS.props.map((p) => ({ cat: 'Mars', title: p.label, sub: `${p.display ?? p.value} ${p.unit}`, href: '#/mars?tab=props' })),
  ...MOON.props.map((p) => ({ cat: 'Moon', title: p.label, sub: `${p.display ?? p.value} ${p.unit}`, href: '#/moon?tab=props' })),
  ...MARS_FEATURES.map((f) => ({ cat: 'Mars feature', title: f.name, sub: f.type, href: `#/mars?f=${f.id}` })),
  ...MOON_FEATURES.map((f) => ({ cat: 'Moon feature', title: f.name, sub: f.type, href: `#/moon?f=${f.id}` })),
  ...MISSIONS.map((m) => ({ cat: 'Mission', title: m.name, sub: `${m.agency} · ${m.launch.slice(0, 4)}`, href: `#/missions?m=${m.id}` })),
  ...Object.entries(GLOSSARY).map(([k, v]) => ({ cat: 'Term', title: k, sub: v, href: `#/sources?term=${encodeURIComponent(k)}` })),
  { cat: 'Moons', title: 'Phobos', sub: 'Inner moon of Mars', href: '#/mars?tab=moons' },
  { cat: 'Moons', title: 'Deimos', sub: 'Outer moon of Mars', href: '#/mars?tab=moons' },
  { cat: 'Tool', title: 'Weight on Mars and the Moon', sub: 'Comparison calculator', href: '#/compare' },
  { cat: 'Tool', title: 'Light travel time Mars–Moon', sub: 'Distance calculator', href: '#/distance' },
];

const searchEl = document.getElementById('search');
const input = document.getElementById('searchInput');
const results = document.getElementById('searchResults');
let sel = 0;
let lastFocus = null;

function openSearch() {
  lastFocus = document.activeElement;
  searchEl.hidden = false;
  input.value = '';
  renderResults('');
  input.focus();
}
function closeSearch() { searchEl.hidden = true; lastFocus?.focus?.(); }

function renderResults(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = (words.length
    ? INDEX.map((it) => {
      const hay = `${it.title} ${it.sub} ${it.cat}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      const score = (it.title.toLowerCase().startsWith(words[0]) ? 0 : 1) + (it.title.toLowerCase().includes(words[0]) ? 0 : 1);
      return { it, score };
    }).filter(Boolean).sort((a, b) => a.score - b.score).map((x) => x.it)
    : INDEX.filter((i) => i.cat === 'Section')).slice(0, 30);
  sel = 0;
  results.innerHTML = list.length
    ? list.map((it, i) => `<li><a href="${esc(it.href)}" role="option" aria-selected="${i === 0}"><span class="cat">${esc(it.cat)}</span>${esc(it.title)}<small>${esc(it.sub.slice(0, 140))}</small></a></li>`).join('')
    : `<li class="state state-empty">No results for “${esc(q)}”.</li>`;
}
function moveSel(d) {
  const links = [...results.querySelectorAll('a')];
  if (!links.length) return;
  sel = (sel + d + links.length) % links.length;
  links.forEach((a, i) => a.setAttribute('aria-selected', String(i === sel)));
  links[sel].scrollIntoView({ block: 'nearest' });
}

document.getElementById('searchBtn').addEventListener('click', openSearch);
document.getElementById('searchClose').addEventListener('click', closeSearch);
searchEl.addEventListener('click', (e) => { if (e.target === searchEl) closeSearch(); });
results.addEventListener('click', (e) => { if (e.target.closest('a')) closeSearch(); });
input.addEventListener('input', () => renderResults(input.value));
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
  else if (e.key === 'Enter') { const a = results.querySelectorAll('a')[sel]; if (a) { location.hash = a.getAttribute('href'); closeSearch(); } }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !searchEl.hidden) closeSearch();
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (!typing && searchEl.hidden && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) { e.preventDefault(); openSearch(); }
});

// ---------- glossary tooltips ----------
const tip = document.getElementById('tooltip');
function showTip(el) {
  const key = el.dataset.term;
  const def = GLOSSARY[key] || GLOSSARY[Object.keys(GLOSSARY).find((k) => k.toLowerCase() === key.toLowerCase())];
  if (!def) return;
  tip.innerHTML = `<b>${esc(key)}</b>${esc(def)}`;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), innerWidth - tw - 8);
  let y = r.top - th - 8;
  if (y < 8) y = r.bottom + 8;
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
}
const hideTip = () => { tip.hidden = true; };
document.addEventListener('mouseover', (e) => { const t = e.target.closest?.('.term'); if (t) showTip(t); });
document.addEventListener('mouseout', (e) => { if (e.target.closest?.('.term')) hideTip(); });
document.addEventListener('focusin', (e) => { const t = e.target.closest?.('.term'); if (t) showTip(t); });
document.addEventListener('focusout', (e) => { if (e.target.closest?.('.term')) hideTip(); });
addEventListener('scroll', hideTip, { passive: true });

// Hide the "game & handbook" footer link when not deployed alongside the original site.
if (!/\/explorer\/?/.test(location.pathname)) document.querySelectorAll('.if-hosted').forEach((a) => a.remove());

addEventListener('hashchange', route);
route();
