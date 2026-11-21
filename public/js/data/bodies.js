// STATIC REFERENCE VALUES (not live data). Each value cites its source key from sources.js.
// Values from the NASA NSSDCA planetary fact sheets unless stated otherwise.

export const CONST = {
  AU_KM: 149_597_870.7, // IAU 2012 B2, exact
  C_KM_S: 299_792.458, // exact
  MILE_KM: 1.609344, // international mile, exact
};

/** @typedef {{key:string,label:string,value:number|null,unit:string,display?:string,src:string,note?:string,term?:string}} Prop */

export const MARS = {
  id: 'mars',
  name: 'Mars',
  color: '#e2733a',
  tagline: 'The fourth planet from the Sun — a cold desert world with the largest volcano and canyon system known in the solar system.',
  props: [
    { key: 'radius', label: 'Mean radius', value: 3389.5, unit: 'km', src: 'marsFact', note: 'Volumetric mean radius. Equatorial 3396.2 km, polar 3376.2 km.' },
    { key: 'diameter', label: 'Mean diameter', value: 6779, unit: 'km', src: 'marsFact', note: '2 × volumetric mean radius.' },
    { key: 'mass', label: 'Mass', value: 6.4169e23, unit: 'kg', display: '6.4169 × 10²³', src: 'marsFact', note: 'About 10.7 % of Earth\'s mass.' },
    { key: 'density', label: 'Mean density', value: 3934, unit: 'kg/m³', src: 'marsFact' },
    { key: 'gravity', label: 'Surface gravity', value: 3.73, unit: 'm/s²', src: 'marsFact', note: 'Equatorial; ≈ 38 % of Earth\'s.' },
    { key: 'escape', label: 'Escape velocity', value: 5.03, unit: 'km/s', src: 'marsFact', term: 'escape velocity' },
    { key: 'tempMean', label: 'Average temperature', value: -63, unit: '°C', display: '≈ −63', src: 'marsFact', note: '~210 K global average. Ranges from about −153 °C at the poles to ~20 °C at the equator in summer.' },
    { key: 'tempMin', label: 'Coldest (polar winter)', value: -153, unit: '°C', display: '≈ −153', src: 'marsFacts' },
    { key: 'tempMax', label: 'Warmest (equatorial summer)', value: 20, unit: '°C', display: '≈ 20', src: 'marsFacts' },
    { key: 'pressure', label: 'Surface pressure', value: 636, unit: 'Pa', display: '≈ 636', src: 'marsFact', note: '6.36 mbar at mean radius — less than 1 % of Earth\'s. Varies seasonally as CO₂ freezes onto and sublimates from the polar caps.' },
    { key: 'rotation', label: 'Sidereal rotation', value: 24.6229, unit: 'h', src: 'marsFact', term: 'sidereal' },
    { key: 'sol', label: 'Solar day (sol)', value: 24.6597, unit: 'h', display: '24 h 39 min 35 s', src: 'marsFact', term: 'sol' },
    { key: 'orbit', label: 'Orbital period', value: 686.98, unit: 'Earth days', src: 'marsFact', note: '≈ 1.88 Earth years, ≈ 668.6 sols.' },
    { key: 'sma', label: 'Mean distance from Sun', value: 227.956e6, unit: 'km', display: '227.96 million', src: 'marsFact', note: '1.524 au (semi-major axis). Perihelion 206.65 M km, aphelion 249.26 M km.', term: 'semi-major axis' },
    { key: 'ecc', label: 'Orbital eccentricity', value: 0.0935, unit: '', src: 'marsFact', term: 'eccentricity' },
    { key: 'obliquity', label: 'Axial tilt (obliquity)', value: 25.19, unit: '°', src: 'marsFact', note: 'Similar to Earth\'s 23.44° — which is why Mars has seasons.' },
    { key: 'synodic', label: 'Synodic period (with Earth)', value: 779.94, unit: 'days', src: 'marsFact', note: 'Time between successive oppositions — Earth–Mars launch windows recur on this cycle (~26 months).', term: 'synodic' },
  ],
  atmosphere: {
    src: 'marsFact',
    note: 'Major constituents by volume (Curiosity SAM measurements, as tabulated in the NASA fact sheet).',
    parts: [
      { gas: 'Carbon dioxide (CO₂)', pct: 95.1 },
      { gas: 'Nitrogen (N₂)', pct: 2.59 },
      { gas: 'Argon (Ar)', pct: 1.94 },
      { gas: 'Oxygen (O₂)', pct: 0.16 },
      { gas: 'Carbon monoxide (CO)', pct: 0.06 },
    ],
  },
  moons: [
    { name: 'Phobos', size: '26.8 × 22.4 × 18.4 km', orbitKm: 9378, periodH: 7.65, src: 'marsFact', note: 'Orbits faster than Mars rotates, so it rises in the west. It is slowly spiralling inward and is expected to break up or impact Mars in tens of millions of years.' },
    { name: 'Deimos', size: '15.0 × 12.2 × 10.4 km', orbitKm: 23459, periodH: 30.3, src: 'marsFact', note: 'The smaller, outer moon. Both moons are dark, cratered bodies; their origin (captured asteroids vs. debris from an impact) is still debated.' },
  ],
};

export const MOON = {
  id: 'moon',
  name: 'Moon',
  color: '#c9ccd6',
  tagline: 'Earth\'s only natural satellite — an airless, cratered world that records 4.5 billion years of solar-system history.',
  props: [
    { key: 'radius', label: 'Mean radius', value: 1737.4, unit: 'km', src: 'moonFact', note: 'Volumetric mean radius. Equatorial 1738.1 km, polar 1736.0 km.' },
    { key: 'diameter', label: 'Mean diameter', value: 3474.8, unit: 'km', src: 'moonFact' },
    { key: 'mass', label: 'Mass', value: 7.346e22, unit: 'kg', display: '7.346 × 10²²', src: 'moonFact', note: 'About 1.2 % of Earth\'s mass.' },
    { key: 'density', label: 'Mean density', value: 3344, unit: 'kg/m³', src: 'moonFact' },
    { key: 'gravity', label: 'Surface gravity', value: 1.62, unit: 'm/s²', src: 'moonFact', note: '≈ 16.5 % of Earth\'s.' },
    { key: 'escape', label: 'Escape velocity', value: 2.38, unit: 'km/s', src: 'moonFact', term: 'escape velocity' },
    { key: 'tempMax', label: 'Daytime maximum', value: 120, unit: '°C', display: '≈ 120', src: 'moonFacts', note: 'Near the equator in full sunlight.' },
    { key: 'tempMin', label: 'Night minimum', value: -130, unit: '°C', display: '≈ −130', src: 'moonFacts', note: 'Permanently shadowed polar craters reach about −246 °C (LRO Diviner).' },
    { key: 'tempPSR', label: 'Permanently shadowed craters', value: -246, unit: '°C', display: '≈ −246', src: 'moonFacts', term: 'permanently shadowed region' },
    { key: 'pressure', label: 'Surface pressure', value: 3e-10, unit: 'Pa', display: '≈ 3 × 10⁻¹⁰', src: 'moonFact', note: 'Night-time value (3 × 10⁻¹⁵ bar). The Moon has only a tenuous exosphere, not a real atmosphere.', term: 'exosphere' },
    { key: 'rotation', label: 'Sidereal rotation', value: 655.72, unit: 'h', display: '655.72 (27.32 d)', src: 'moonFact', note: 'Equal to its orbital period — the Moon is tidally locked.', term: 'tidal locking' },
    { key: 'orbit', label: 'Orbital period (sidereal)', value: 27.3217, unit: 'days', src: 'moonFact', term: 'sidereal' },
    { key: 'synodic', label: 'Synodic month (phases)', value: 29.53, unit: 'days', src: 'moonFact', note: 'New Moon to New Moon.', term: 'synodic' },
    { key: 'sma', label: 'Mean distance from Earth', value: 384400, unit: 'km', display: '384 400', src: 'moonFact', note: 'Semi-major axis. Perigee ≈ 363 300 km, apogee ≈ 405 500 km (mean values).', term: 'semi-major axis' },
    { key: 'ecc', label: 'Orbital eccentricity', value: 0.0549, unit: '', src: 'moonFact', term: 'eccentricity' },
    { key: 'incl', label: 'Inclination to ecliptic', value: 5.145, unit: '°', src: 'moonFact', note: 'Why eclipses do not happen every month.' },
  ],
  atmosphere: {
    src: 'moonFact',
    note: 'The Moon has no substantial atmosphere — a surface-bounded exosphere of helium, argon, neon, sodium and potassium atoms with a total mass of only ~25 000 kg.',
    parts: [],
  },
};

export const EARTH = {
  id: 'earth',
  name: 'Earth',
  color: '#4a90e2',
  props: [
    { key: 'radius', label: 'Mean radius', value: 6371.0, unit: 'km', src: 'earthFact' },
    { key: 'diameter', label: 'Mean diameter', value: 12742, unit: 'km', src: 'earthFact' },
    { key: 'mass', label: 'Mass', value: 5.9722e24, unit: 'kg', display: '5.9722 × 10²⁴', src: 'earthFact' },
    { key: 'density', label: 'Mean density', value: 5513, unit: 'kg/m³', src: 'earthFact' },
    { key: 'gravity', label: 'Surface gravity', value: 9.8, unit: 'm/s²', src: 'earthFact' },
    { key: 'escape', label: 'Escape velocity', value: 11.19, unit: 'km/s', src: 'earthFact' },
  ],
};

export const prop = (body, key) => body.props.find((p) => p.key === key);

/** Rows for the Mars-vs-Moon comparison dashboard. */
export const COMPARE_ROWS = [
  { key: 'diameter', label: 'Diameter', unit: 'km' },
  { key: 'radius', label: 'Mean radius', unit: 'km' },
  { key: 'mass', label: 'Mass', unit: 'kg', log: true },
  { key: 'density', label: 'Mean density', unit: 'kg/m³' },
  { key: 'gravity', label: 'Surface gravity', unit: 'm/s²' },
  { key: 'escape', label: 'Escape velocity', unit: 'km/s' },
  { key: 'rotation', label: 'Sidereal rotation', unit: 'h' },
  { key: 'pressure', label: 'Surface pressure', unit: 'Pa', log: true },
];
