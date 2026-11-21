// Chart.js helpers (Chart.js is loaded as a deferred UMD script → window.Chart).
import { esc } from './format.js';

export const COLORS = { mars: '#e2733a', moon: '#9fb3d9', earth: '#4a90e2', violet: '#8b7cf6', sun: '#ffcf6b', ok: '#3ecf8e', grid: 'rgba(148,170,220,0.12)', text: '#a7b3cb' };

let ready = null;
export function getChart() {
  if (!ready) {
    ready = new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function poll() {
        if (window.Chart) {
          const C = window.Chart;
          C.defaults.color = COLORS.text;
          C.defaults.font.family = "'Inter', system-ui, sans-serif";
          C.defaults.font.size = 12;
          C.defaults.borderColor = COLORS.grid;
          C.defaults.plugins.legend.labels.boxWidth = 12;
          C.defaults.plugins.tooltip.backgroundColor = 'rgba(14,22,42,0.96)';
          C.defaults.plugins.tooltip.borderColor = 'rgba(160,185,240,0.28)';
          C.defaults.plugins.tooltip.borderWidth = 1;
          C.defaults.plugins.tooltip.padding = 10;
          C.defaults.maintainAspectRatio = false;
          C.defaults.animation.duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500;
          resolve(C);
        } else if (Date.now() - t0 > 15000) {
          ready = null;
          reject(new Error('Chart library failed to load (check your internet connection).'));
        } else setTimeout(poll, 50);
      })();
    });
  }
  return ready;
}

/** Card markup for a chart with the mandatory metadata (title, description, units, source, time range). */
export function chartCard({ id, title, desc, units, source, range, cls = '' }) {
  return `<div class="glass card">
    <div class="chart-head"><h3>${esc(title)}</h3><p>${desc}</p></div>
    <div class="chart-box ${cls}"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div>
    <div class="chart-meta">
      <div><b>Units:</b> ${units}</div>
      <div><b>Source:</b> ${source}</div>
      ${range ? `<div><b>Time range:</b> ${range}</div>` : ''}
    </div>
  </div>`;
}

export const dateTick = (v) => new Date(v).toISOString().slice(0, 7);
