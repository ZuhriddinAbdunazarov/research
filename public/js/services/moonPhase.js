// Lunar phase from heliocentric ephemeris vectors (Sun-centred, ecliptic J2000).
import { sub, norm } from './ephemeris.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * @param {number[]} earth heliocentric Earth position (km)
 * @param {number[]} moon  heliocentric Moon position (km)
 * @returns {{phaseAngle:number, illuminated:number, elongation:number, waxing:boolean, name:string}}
 */
export function lunarPhase(earth, moon) {
  const toSun = moon.map((c) => -c); // Moon → Sun
  const toEarth = sub(earth, moon); // Moon → Earth
  const i = Math.acos(Math.max(-1, Math.min(1, dot(toSun, toEarth) / (norm(toSun) * norm(toEarth))))); // phase angle
  const illuminated = (1 + Math.cos(i)) / 2;
  // geocentric ecliptic longitudes of Sun and Moon → elongation (0..360, east of Sun)
  const geoMoon = sub(moon, earth);
  const geoSun = earth.map((c) => -c);
  const lon = (v) => Math.atan2(v[1], v[0]);
  let elong = ((lon(geoMoon) - lon(geoSun)) * 180) / Math.PI;
  elong = ((elong % 360) + 360) % 360;
  const waxing = elong < 180;
  const names = ['New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  const name = names[Math.round(elong / 45) % 8];
  return { phaseAngle: (i * 180) / Math.PI, illuminated, elongation: elong, waxing, name };
}

/** SVG of the Moon disc lit according to elongation (as seen from the northern hemisphere). */
export function phaseSvg(elongation, size = 120) {
  const r = size / 2 - 2;
  const c = size / 2;
  const k = Math.cos((elongation * Math.PI) / 180); // 1 new … -1 full
  const waxing = elongation < 180;
  const rx = Math.abs(k) * r;
  // lit limb on the right when waxing (northern hemisphere view)
  const sweepOuter = waxing ? 1 : 0;
  const sweepInner = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${sweepOuter} ${c} ${c + r} A ${rx} ${r} 0 0 ${sweepInner} ${c} ${c - r} Z`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Moon phase illustration">
    <defs><radialGradient id="mlit" cx="40%" cy="40%"><stop offset="0" stop-color="#f4f5f8"/><stop offset="1" stop-color="#aab0bd"/></radialGradient></defs>
    <circle cx="${c}" cy="${c}" r="${r}" fill="#1a2030" stroke="rgba(160,185,240,.25)"/>
    <path d="${d}" fill="url(#mlit)"/>
  </svg>`;
}
