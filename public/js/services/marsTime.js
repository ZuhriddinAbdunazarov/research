// Mars Sol Date, Coordinated Mars Time and solar longitude (Ls) — NASA GISS Mars24 algorithm
// (Allison & McEwen 2000; https://www.giss.nasa.gov/tools/mars24/help/algorithm.html). Pure computation.

const TT_MINUS_UTC = 69.184; // seconds: 37 leap seconds (since 2017-01-01) + 32.184 s
const PBS = [
  [0.0071, 2.2353, 49.409], [0.0057, 2.7543, 168.173], [0.0039, 1.1177, 191.837], [0.0037, 15.7866, 21.736],
  [0.0021, 2.1354, 15.704], [0.0020, 2.4694, 95.528], [0.0018, 32.8493, 49.095],
];
const rad = (d) => (d * Math.PI) / 180;
const mod = (a, n) => ((a % n) + n) % n;

export function marsTime(date) {
  const jdUT = date.getTime() / 86400000 + 2440587.5;
  const jdTT = jdUT + TT_MINUS_UTC / 86400;
  const dt = jdTT - 2451545.0;
  const M = mod(19.3871 + 0.52402073 * dt, 360);
  const aFMS = mod(270.3871 + 0.524038496 * dt, 360);
  const pbs = PBS.reduce((s, [A, tau, phi]) => s + A * Math.cos(rad((0.985626 * dt) / tau + phi)), 0);
  const eoc = (10.691 + 3.0e-7 * dt) * Math.sin(rad(M)) + 0.623 * Math.sin(rad(2 * M)) + 0.050 * Math.sin(rad(3 * M))
    + 0.005 * Math.sin(rad(4 * M)) + 0.0005 * Math.sin(rad(5 * M)) + pbs;
  const Ls = mod(aFMS + eoc, 360);
  const msd = (dt - 4.5) / 1.0274912517 + 44796.0 - 0.0009626;
  const mtc = mod(24 * msd, 24);
  return { jdTT, M, Ls, msd, mtc, ...seasons(Ls) };
}

export function seasons(Ls) {
  const q = Math.floor(Ls / 90);
  const north = ['spring', 'summer', 'autumn', 'winter'][q];
  const south = ['autumn', 'winter', 'spring', 'summer'][q];
  return { north, south };
}

export function fmtMtc(h) {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = Math.floor(((h - hh) * 60 - mm) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
