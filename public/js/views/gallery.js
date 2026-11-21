import { searchImages } from '../services/nasa.js';
import { esc, cite, loading, errorBox, emptyBox, fmt } from '../ui/format.js';

const PRESETS = [
  ['Mars surface', 'Mars surface panorama'],
  ['Mars rovers', 'Mars rover Perseverance Curiosity'],
  ['Mars from orbit', 'HiRISE Mars'],
  ['Moon surface', 'lunar surface Apollo'],
  ['Lunar orbit', 'Lunar Reconnaissance Orbiter LROC'],
  ['Apollo', 'Apollo moon astronaut'],
  ['Artemis', 'Artemis Orion Moon'],
  ['Phobos & Deimos', 'Phobos Deimos'],
];

export async function render(el, params) {
  const ctl = new AbortController();
  let query = params.get('q') || PRESETS[0][1];
  let page = 1;
  let items = [];
  let reqToken = 0;

  el.innerHTML = `<div class="wrap">
    <div class="page-head">
      <div class="kicker violet">NASA Image and Video Library · live</div>
      <h1>Image Gallery</h1>
      <p>Authentic NASA imagery searched live from images.nasa.gov. Every image shows its title, NASA ID, centre, date and a link to the original record.</p>
    </div>
    <div class="glass card" style="display:grid;gap:12px;margin-bottom:16px">
      <form id="gform" style="display:flex;gap:8px" role="search">
        <input type="search" id="gq" value="${esc(query)}" placeholder="Search NASA images (e.g. Jezero delta, Tycho crater)…" aria-label="Search NASA images">
        <button class="btn btn-primary" type="submit">Search</button>
      </form>
      <div class="chip-row" id="presets">${PRESETS.map(([l, q]) => `<button class="chip" data-q="${esc(q)}">${esc(l)}</button>`).join('')}</div>
    </div>
    <div id="meta" class="small dim" style="margin-bottom:10px"></div>
    <div class="gallery-grid" id="grid"></div>
    <div style="display:flex;justify-content:center;margin-top:18px"><button class="btn" id="more" hidden>Load more</button></div>
    <p class="small dim" style="margin-top:18px">NASA content is generally not subject to copyright in the United States, but some images in the library are credited to third parties. Follow the ${cite('mediaGuidelines')}: credit "NASA" (and any named creator), and do not imply NASA endorsement.</p>
  </div>
  <div class="lightbox" id="lb" hidden role="dialog" aria-modal="true" aria-label="Image details">
    <button class="btn btn-sm lb-close" id="lbClose" aria-label="Close">✕ Close</button>
    <div class="glass lb-panel"><div class="lb-img" id="lbImg"></div><div class="lb-text" id="lbText"></div></div>
  </div>`;

  const $ = (s) => el.querySelector(s);
  const grid = $('#grid');

  function paintPresets() { el.querySelectorAll('#presets .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.q === query))); }

  async function load(reset) {
    const token = ++reqToken;
    if (reset) { page = 1; items = []; grid.innerHTML = Array.from({ length: 8 }, () => '<div class="gitem skeleton"></div>').join(''); $('#meta').textContent = ''; }
    $('#more').hidden = true;
    paintPresets();
    try {
      const r = await searchImages(query, { page, pageSize: 24, signal: ctl.signal });
      if (token !== reqToken) return;
      items = items.concat(r.items);
      if (!items.length) { grid.innerHTML = emptyBox(`No NASA images found for “${query}”. Try a broader term.`); return; }
      grid.innerHTML = items.map((it, i) => `<button class="gitem" data-i="${i}" aria-label="${esc(it.title)}"><img src="${esc(it.thumb)}" alt="" loading="lazy"><span class="cap">${esc(it.title.slice(0, 70))}<small>${esc((it.date || '').slice(0, 10))} · ${esc(it.center || 'NASA')} · ${esc(it.nasaId)}</small></span></button>`).join('');
      $('#meta').innerHTML = `${r.totalHits != null ? `${fmt(r.totalHits)} results` : ''} for “${esc(query)}” · showing ${items.length} · retrieved ${new Date(r.retrievedAt).toLocaleTimeString()} from images-api.nasa.gov`;
      $('#more').hidden = !r.hasNext;
    } catch (e) {
      if (e.name === 'AbortError' || token !== reqToken) return;
      grid.innerHTML = errorBox(`NASA Image Library request failed: ${e.message}`, true);
      grid.querySelector('[data-retry]')?.addEventListener('click', () => load(reset));
    }
  }

  let lastFocus = null;
  function open(i) {
    const it = items[i]; if (!it) return;
    lastFocus = document.activeElement;
    $('#lbImg').innerHTML = `<img src="${esc(it.large)}" alt="${esc(it.title)}" onerror="this.onerror=null;this.src='${esc(it.medium)}'">`;
    $('#lbText').innerHTML = `<div class="kicker">${esc(it.center || 'NASA')} · ${esc((it.date || '').slice(0, 10))}</div>
      <h3>${esc(it.title)}</h3>
      <p>${esc(it.description || 'No description provided.')}</p>
      <table class="ptable small"><tbody>
        <tr><th>NASA ID</th><td class="num">${esc(it.nasaId)}</td></tr>
        <tr><th>Credit</th><td>${esc(it.credit)}${/nasa/i.test(it.credit) ? '' : ' / NASA'}</td></tr>
        ${it.keywords.length ? `<tr><th>Keywords</th><td>${esc(it.keywords.slice(0, 8).join(', '))}</td></tr>` : ''}
      </tbody></table>
      <p style="margin-top:12px"><a class="btn btn-sm" href="${esc(it.pageUrl)}" target="_blank" rel="noopener">Original on images.nasa.gov ↗</a></p>`;
    $('#lb').hidden = false;
    $('#lbClose').focus();
  }
  const close = () => { $('#lb').hidden = true; $('#lbImg').innerHTML = ''; lastFocus?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape' && !$('#lb').hidden) close(); };
  document.addEventListener('keydown', onKey);

  grid.addEventListener('click', (e) => { const b = e.target.closest('.gitem[data-i]'); if (b) open(Number(b.dataset.i)); });
  $('#lb').addEventListener('click', (e) => { if (e.target.id === 'lb') close(); });
  $('#lbClose').addEventListener('click', close);
  $('#gform').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#gq').value.trim(); if (v) { query = v; load(true); } });
  $('#presets').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { query = b.dataset.q; $('#gq').value = query; load(true); } });
  $('#more').addEventListener('click', () => { page += 1; load(false); });
  load(true);

  return () => { ctl.abort(); document.removeEventListener('keydown', onKey); };
}
