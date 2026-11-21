import { MISSIONS, STATUS_LABEL } from '../data/missions.js';
import { firstImage } from '../services/nasa.js';
import { esc, cite } from '../ui/format.js';

export async function render(el, params) {
  const ctl = new AbortController();
  let filter = params.get('target') || 'all';
  let q = '';

  el.innerHTML = `<div class="wrap">
    <div class="page-head">
      <div class="kicker violet">Mission archive</div>
      <h1>NASA & international missions</h1>
      <p>From the first Mars flyby to the return to the Moon. Each mission links to its official page. Status labels reflect agency reporting at the stated date and are never inferred — for anything ongoing, check the official page.</p>
    </div>
    <div class="glass card" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px">
      <div class="chip-row" id="filt" role="group" aria-label="Filter by target">
        <button class="chip" data-t="all">All (${MISSIONS.length})</button>
        <button class="chip" data-t="mars">Mars (${MISSIONS.filter((m) => m.target === 'mars').length})</button>
        <button class="chip" data-t="moon">Moon (${MISSIONS.filter((m) => m.target === 'moon').length})</button>
      </div>
      <input type="search" id="mq" placeholder="Filter missions…" style="max-width:280px;margin-left:auto" aria-label="Filter missions by text">
    </div>
    <div class="timeline" id="list"></div>
    <p class="small dim" style="margin-top:18px">Mission images are retrieved live from the ${cite('nasaImages')} by keyword; the image shown is the library's top match and is credited with its NASA ID. Launch dates are UTC calendar dates.</p>
  </div>`;

  const list = el.querySelector('#list');
  function paint() {
    el.querySelectorAll('#filt .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.t === filter)));
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const items = MISSIONS.filter((m) => (filter === 'all' || m.target === filter)
      && words.every((w) => `${m.name} ${m.agency} ${m.type} ${m.objectives} ${m.discoveries.join(' ')}`.toLowerCase().includes(w)))
      .sort((a, b) => a.launch.localeCompare(b.launch));
    list.innerHTML = items.length ? items.map((m) => `
      <article class="glass mission" id="m-${m.id}" style="scroll-margin-top:80px">
        <div class="mimg" data-q="${esc(m.imageQuery)}"><div class="skeleton" style="position:absolute;inset:0;border-radius:0"></div></div>
        <div class="mbody">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span class="kicker ${m.target}">${m.target === 'mars' ? 'Mars' : 'Moon'} · ${esc(m.type)}</span>
            <span class="status ${m.status}">${esc(STATUS_LABEL[m.status].replace('{asOf}', m.statusAsOf || ''))}</span>
          </div>
          <h3>${esc(m.name)}</h3>
          <div class="meta"><span>Agency: <b>${esc(m.agency)}</b></span><span>Launch: <b class="num">${esc(m.launch)}</b></span></div>
          <p class="small" style="margin:10px 0 0"><b>Objectives.</b> <span class="muted">${esc(m.objectives)}</span></p>
          <ul>${m.discoveries.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
          <a href="${esc(m.link)}" target="_blank" rel="noopener" class="btn btn-sm">Official mission page ↗</a>
        </div>
      </article>`).join('') : '<div class="state state-empty">No missions match this filter.</div>';
    loadImages();
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(async (en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const box = en.target;
      try {
        const img = await firstImage(box.dataset.q, { signal: ctl.signal });
        box.innerHTML = img
          ? `<a href="${esc(img.pageUrl)}" target="_blank" rel="noopener" title="${esc(img.title)}"><img src="${esc(img.medium)}" alt="${esc(img.title)}" onerror="this.onerror=null;this.src='${esc(img.thumb)}'"></a><div class="credit">${esc(img.credit)} / NASA · ${esc(img.nasaId)}</div>`
          : '<div class="state state-empty" style="position:absolute;inset:0;border-radius:0">No image found</div>';
      } catch (e) {
        if (e.name !== 'AbortError') box.innerHTML = '<div class="state" style="position:absolute;inset:0">Image unavailable</div>';
      }
    });
  }, { rootMargin: '200px' });
  function loadImages() { list.querySelectorAll('.mimg').forEach((b) => io.observe(b)); }

  el.querySelector('#filt').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { filter = b.dataset.t; paint(); } });
  el.querySelector('#mq').addEventListener('input', (e) => { q = e.target.value; paint(); });
  paint();
  const focus = params.get('m');
  if (focus) setTimeout(() => { const n = el.querySelector(`#m-${CSS.escape(focus)}`); n?.scrollIntoView({ behavior: 'smooth' }); n?.animate([{ boxShadow: '0 0 0 2px #e2733a' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 2000 }); }, 250);

  return () => { ctl.abort(); io.disconnect(); };
}
