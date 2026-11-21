// Every reference value in the app points at one of these sources by key.
export const SOURCES = {
  marsFact: {
    title: 'NASA NSSDCA — Mars Fact Sheet',
    org: 'NASA Goddard Space Flight Center',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    kind: 'Reference constants',
  },
  moonFact: {
    title: 'NASA NSSDCA — Moon Fact Sheet',
    org: 'NASA Goddard Space Flight Center',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
    kind: 'Reference constants',
  },
  earthFact: {
    title: 'NASA NSSDCA — Earth Fact Sheet',
    org: 'NASA Goddard Space Flight Center',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
    kind: 'Reference constants',
  },
  marsScience: {
    title: 'NASA Science — Mars',
    org: 'NASA Science Mission Directorate',
    url: 'https://science.nasa.gov/mars/',
    kind: 'Explanations, features',
  },
  marsFacts: {
    title: 'NASA Science — Mars Facts',
    org: 'NASA Science Mission Directorate',
    url: 'https://science.nasa.gov/mars/facts/',
    kind: 'Temperatures, seasons, geology',
  },
  moonScience: {
    title: 'NASA Science — Earth\'s Moon',
    org: 'NASA Science Mission Directorate',
    url: 'https://science.nasa.gov/moon/',
    kind: 'Explanations, features',
  },
  moonFacts: {
    title: 'NASA Science — Moon Facts',
    org: 'NASA Science Mission Directorate',
    url: 'https://science.nasa.gov/moon/facts/',
    kind: 'Temperatures, formation, phases',
  },
  horizons: {
    title: 'NASA/JPL Horizons System',
    org: 'JPL Solar System Dynamics',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
    kind: 'Ephemerides (positions over time)',
  },
  horizonsApi: {
    title: 'Horizons API documentation',
    org: 'JPL Solar System Dynamics',
    url: 'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
    kind: 'API reference',
  },
  nasaApi: {
    title: 'NASA Open APIs',
    org: 'NASA',
    url: 'https://api.nasa.gov/',
    kind: 'APOD and other open APIs',
  },
  nasaImages: {
    title: 'NASA Image and Video Library',
    org: 'NASA',
    url: 'https://images.nasa.gov/',
    kind: 'Public imagery (images-api.nasa.gov)',
  },
  pds: {
    title: 'NASA Planetary Data System',
    org: 'NASA',
    url: 'https://pds.nasa.gov/',
    kind: 'Archived mission science data',
  },
  svsMoon: {
    title: 'NASA SVS — CGI Moon Kit (LRO LROC colour map)',
    org: 'NASA Scientific Visualization Studio',
    url: 'https://svs.gsfc.nasa.gov/4720',
    kind: 'Moon texture',
  },
  nasa3d: {
    title: 'NASA 3D Resources',
    org: 'NASA',
    url: 'https://science.nasa.gov/3d-resources/',
    kind: 'Mars & Earth textures',
  },
  iau2012: {
    title: 'IAU 2012 Resolution B2 — astronomical unit',
    org: 'International Astronomical Union',
    url: 'https://www.iau.org/static/resolutions/IAU2012_English.pdf',
    kind: '1 au = 149 597 870 700 m (exact)',
  },
  nistC: {
    title: 'NIST — speed of light in vacuum',
    org: 'NIST',
    url: 'https://physics.nist.gov/cgi-bin/cuu/Value?c',
    kind: 'c = 299 792 458 m/s (exact)',
  },
  mediaGuidelines: {
    title: 'NASA Images and Media Usage Guidelines',
    org: 'NASA',
    url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    kind: 'Image usage & attribution',
  },
  marsSeasons: {
    title: 'NASA Mars Exploration — Mars calendar & seasons',
    org: 'NASA / JPL',
    url: 'https://science.nasa.gov/mars/facts/',
    kind: 'Seasons, sol',
  },
};

/** Primary data sources shown on the Data Sources page (in this order). */
export const PRIMARY_SOURCES = [
  { key: 'nasaApi', use: 'Astronomy Picture of the Day (APOD) on the dashboard, requested by our server proxy so the API key is never exposed.', how: 'GET /planetary/apod — JSON {title, date, explanation, url, media_type}. DEMO_KEY: ~30 requests/hour/IP.' },
  { key: 'horizons', use: 'Positions of Earth, Moon and Mars for the distance calculator, the 3D solar system and the distance-history charts.', how: 'GET /api/horizons.api with EPHEM_TYPE=VECTORS, CENTER=500@10, REF_PLANE=ECLIPTIC, REF_SYSTEM=ICRF, OUT_UNITS=KM-S, VEC_CORR=NONE, TIME_TYPE=UT. No CORS → proxied server-side.' },
  { key: 'pds', use: 'The long-term archive of the mission instruments behind the reference values (e.g. MOLA topography, Diviner temperatures). Linked for further research; not queried live.', how: 'Archive browsing via node sites (Geosciences, Imaging, Atmospheres). Datasets are large and not suitable for live browser queries.' },
  { key: 'marsScience', use: 'Plain-language explanations of Martian features, seasons, moons and water ice; mission pages.', how: 'Editorial pages — quoted values are cited per item.' },
  { key: 'moonScience', use: 'Plain-language explanations of lunar formation, phases, tidal locking, regolith and water ice; mission pages.', how: 'Editorial pages — quoted values are cited per item.' },
  { key: 'nasaImages', use: 'Image gallery and mission images, searched live from images-api.nasa.gov (CORS enabled, no key).', how: 'GET https://images-api.nasa.gov/search?q=…&media_type=image — Collection+JSON with titles, descriptions, centres, NASA IDs and thumbnails.' },
];
