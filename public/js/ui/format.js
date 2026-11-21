// Formatting helpers + tiny DOM helpers shared by all views.
import { SOURCES } from '../data/sources.js';
import { CONST } from '../data/bodies.js';

const nf = (digits, opts = {}) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: opts.min ?? 0 });

export function fmt(v, digits = 0, min) {
  if (v == null || !Number.isFinite(v)) return '—';
  return nf(digits, { min }).format(v);
}

export function fmtSig(v, sig = 4) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const mag = Math.floor(Math.log10(Math.abs(v)));
  return fmt(v, Math.max(0, sig - 1 - mag));
}

const UNIT_LABEL = { km: 'km', mi: 'mi', au: 'au' };
export function fmtDistance(km, unit = 'km') {
  if (!Number.isFinite(km)) return { value: '—', unit: UNIT_LABEL[unit] };
  if (unit === 'au') return { value: fmt(km / CONST.AU_KM, 6, 6), unit: 'au' };
  if (unit === 'mi') return { value: fmt(km / CONST.MILE_KM, 0), unit: 'mi' };
  return { value: fmt(km, 0), unit: 'km' };
}
export const distText = (km, unit) => { const d = fmtDistance(km, unit); return `${d.value} ${d.unit}`; };

export function fmtDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.abs(seconds);
  if (s < 60) return `${fmt(s, 1)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${fmt(s % 60, 0)} s`;
  if (s < 86400 * 2) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
  const days = s / 86400;
  if (days < 365.25 * 2) return `${fmt(days, 1)} days`;
  return `${fmt(days / 365.25, 1)} years`;
}

export const fmtDate = (d, withTime = true) => {
  if (!(d instanceof Date)) d = new Date(d);
  if (Number.isNaN(d.getTime())) return '—';
  const iso = d.toISOString();
  return withTime ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : iso.slice(0, 10);
};

export const fmtLocalTime = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Inline source citation link. */
export function cite(key, label) {
  const s = SOURCES[key];
  if (!s) return '';
  return `<a class="cite" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title)}">${esc(label || s.title.replace(/^NASA (NSSDCA|Science) — /, ''))}</a>`;
}

/** Glossary term with tooltip. */
export const term = (text, key) => `<span class="term" tabindex="0" data-term="${esc(key || text)}">${esc(text)}</span>`;

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const loading = (label = 'Loading…') => `<div class="state state-loading" role="status"><span class="spinner" aria-hidden="true"></span><span>${esc(label)}</span></div>`;
export const errorBox = (msg, retry = false) => `<div class="state state-error" role="alert"><strong>Data unavailable.</strong> <span>${esc(msg)}</span>${retry ? ' <button class="btn btn-sm" data-retry>Retry</button>' : ''}</div>`;
export const emptyBox = (msg) => `<div class="state state-empty">${esc(msg)}</div>`;

/** Badge describing the provenance of a value. */
export function modeBadge(meta) {
  if (!meta) return '';
  if (meta.mode === 'live') return `<span class="badge badge-live" title="Retrieved from JPL Horizons via the server proxy"><i></i>LIVE · JPL Horizons</span>`;
  if (meta.mode === 'snapshot') return `<span class="badge badge-cache" title="Real Horizons vectors cached on ${esc(fmtDate(meta.retrievedAt))}; intermediate times interpolated">CACHED · Horizons snapshot</span>`;
  return '';
}
export const refBadge = () => '<span class="badge badge-ref" title="Static reference constant from a NASA fact sheet — not a live measurement">REFERENCE</span>';
