// Surface features. lat = planetocentric/selenographic latitude (°N positive), lon = east longitude (−180…180).
// Coordinates and sizes are rounded reference values; see the cited NASA pages for details.

export const MARS_FEATURES = [
  {
    id: 'olympus', name: 'Olympus Mons', type: 'Shield volcano', lat: 18.65, lon: -133.8,
    stats: [['Height', '≈ 21.9 km above datum'], ['Width', '≈ 600 km']],
    text: 'The tallest known volcano in the solar system — roughly 2.5 times the height of Mount Everest above sea level. Its gentle slopes formed from long-lived, fluid lava flows, made possible by Mars\'s lack of plate tectonics: the crust stayed over the same hotspot for a very long time.',
    src: 'marsScience', query: 'Olympus Mons',
  },
  {
    id: 'valles', name: 'Valles Marineris', type: 'Canyon system', lat: -13.9, lon: -59.2,
    stats: [['Length', '≈ 4 000 km'], ['Depth', 'up to ≈ 7 km']],
    text: 'A rift-valley system long enough to stretch across the continental United States. It was named after Mariner 9, which revealed it in 1971–72. It formed largely by crustal stretching associated with the rise of the Tharsis volcanic region, later widened by landslides and erosion.',
    src: 'marsScience', query: 'Valles Marineris',
  },
  {
    id: 'gale', name: 'Gale Crater', type: 'Impact crater · Curiosity site', lat: -5.4, lon: 137.8,
    stats: [['Diameter', '≈ 154 km'], ['Central mound', 'Mount Sharp (Aeolis Mons), ≈ 5 km']],
    text: 'Landing site of the Curiosity rover (August 2012). Layered sediments in Mount Sharp record a long history of water: Curiosity found that Gale once hosted a lake whose chemistry could have supported microbial life.',
    src: 'marsScience', query: 'Gale Crater Curiosity Mount Sharp',
  },
  {
    id: 'jezero', name: 'Jezero Crater', type: 'Impact crater · Perseverance site', lat: 18.38, lon: 77.58,
    stats: [['Diameter', '≈ 45 km'], ['Feature', 'Ancient river delta']],
    text: 'An ancient lake basin with a well-preserved river delta — chosen for Perseverance (landed February 2021) because deltas are excellent at preserving potential biosignatures. Perseverance is collecting rock cores here for possible future return to Earth.',
    src: 'marsScience', query: 'Jezero Crater delta',
  },
  {
    id: 'hellas', name: 'Hellas Planitia', type: 'Impact basin', lat: -42.4, lon: 70.5,
    stats: [['Diameter', '≈ 2 300 km'], ['Depth', '≈ 7 km']],
    text: 'One of the largest impact basins in the solar system. Because its floor is so low, atmospheric pressure there is the highest on Mars.',
    src: 'marsScience', query: 'Hellas Planitia',
  },
  {
    id: 'npole', name: 'North Polar Cap (Planum Boreum)', type: 'Polar ice cap', lat: 85, lon: 0,
    stats: [['Main ice', 'Water ice'], ['Winter layer', 'CO₂ frost']],
    text: 'A residual cap of water ice up to ~3 km thick, built from layered deposits that record climate cycles. Each winter a seasonal coat of carbon-dioxide frost forms over it, then sublimates in spring.',
    src: 'marsScience', query: 'Mars north polar cap',
  },
  {
    id: 'spole', name: 'South Polar Cap (Planum Australe)', type: 'Polar ice cap', lat: -85, lon: 0,
    stats: [['Main ice', 'Water ice'], ['Residual cap', 'Thin CO₂ ice veneer']],
    text: 'Water-ice layered deposits topped by a permanent veneer of CO₂ ice. MRO\'s SHARAD radar has mapped buried CO₂ ice deposits within these layers.',
    src: 'marsScience', query: 'Mars south polar cap',
  },
  {
    id: 'chryse', name: 'Chryse Planitia', type: 'Plain · Viking 1 site', lat: 22.27, lon: -47.95,
    stats: [['Landing', 'Viking 1, 20 July 1976']],
    text: 'A smooth plain where ancient outflow channels empty — evidence of catastrophic floods. Viking 1 made the first successful U.S. landing on Mars here.',
    src: 'marsScience', query: 'Viking 1 Chryse Planitia',
  },
];

export const MOON_FEATURES = [
  {
    id: 'spole', name: 'Lunar South Pole', type: 'Polar region · Artemis target', lat: -89.9, lon: 0,
    stats: [['Shackleton crater', '≈ 21 km wide'], ['Coldest craters', '≈ −246 °C']],
    text: 'The Sun stays near the horizon here, so deep craters are in permanent shadow and cold enough to trap water ice for billions of years. Nearby ridges get near-continuous sunlight. These resources make the region the target of NASA\'s Artemis program.',
    src: 'moonScience', query: 'lunar south pole',
  },
  {
    id: 'tranq', name: 'Mare Tranquillitatis', type: 'Lunar mare · Apollo 11 site', lat: 8.5, lon: 31.4,
    stats: [['Diameter', '≈ 870 km'], ['Apollo 11', '20 July 1969']],
    text: 'The Sea of Tranquility — a basin flooded by dark basaltic lava. Apollo 11 landed near its southern edge, where Neil Armstrong and Buzz Aldrin became the first humans to walk on another world.',
    src: 'moonScience', query: 'Sea of Tranquility Apollo 11',
  },
  {
    id: 'tycho', name: 'Tycho Crater', type: 'Young impact crater', lat: -43.31, lon: -11.36,
    stats: [['Diameter', '≈ 85 km'], ['Age', '≈ 108 million years']],
    text: 'One of the youngest large craters on the Moon. Its bright ray system extends over 1 500 km and is easily visible from Earth around full Moon. Surveyor 7 landed on its rim in 1968.',
    src: 'moonScience', query: 'Tycho crater',
  },
  {
    id: 'copernicus', name: 'Copernicus Crater', type: 'Impact crater', lat: 9.62, lon: -20.08,
    stats: [['Diameter', '≈ 93 km'], ['Age', '≈ 800 million years']],
    text: 'A classic complex crater with terraced walls and central peaks. Its rays overlie older surfaces, which helps geologists order lunar events in time.',
    src: 'moonScience', query: 'Copernicus crater',
  },
  {
    id: 'imbrium', name: 'Mare Imbrium', type: 'Lunar mare', lat: 32.8, lon: -15.6,
    stats: [['Diameter', '≈ 1 145 km']],
    text: 'The Sea of Showers — the giant impact basin forming the Moon\'s "right eye" seen from Earth, later flooded by basaltic lava. Apollo 15 landed at its edge near Hadley Rille.',
    src: 'moonScience', query: 'Mare Imbrium',
  },
  {
    id: 'procellarum', name: 'Oceanus Procellarum', type: 'Lunar mare', lat: 18.4, lon: -57.4,
    stats: [['Span', '> 2 500 km']],
    text: 'The Ocean of Storms is the largest of the lunar maria. Apollo 12 landed here in 1969, next to the robotic Surveyor 3 lander.',
    src: 'moonScience', query: 'Oceanus Procellarum',
  },
  {
    id: 'apennines', name: 'Montes Apenninus', type: 'Mountain range', lat: 18.9, lon: -3.7,
    stats: [['Length', '≈ 600 km'], ['Mons Huygens', '≈ 5.5 km high']],
    text: 'Rugged mountains thrown up as the rim of the Imbrium basin impact. They include Mons Huygens, often cited as the Moon\'s tallest mountain.',
    src: 'moonScience', query: 'Apennine mountains moon Hadley',
  },
  {
    id: 'spa', name: 'South Pole–Aitken Basin', type: 'Impact basin (far side)', lat: -53, lon: -169,
    stats: [['Diameter', '≈ 2 500 km'], ['Depth', '≈ 8 km']],
    text: 'One of the largest and oldest impact basins in the solar system. It may expose material from the lunar mantle. China\'s Chang\'e 4 made the first soft landing on the far side inside this basin in January 2019.',
    src: 'moonScience', query: 'South Pole Aitken basin',
  },
];

/** Long-form topics for the explorers. */
export const MARS_TOPICS = [
  { title: 'Martian seasons', src: 'marsFacts', text: 'Mars is tilted about 25.2°, so it has seasons like Earth — but each lasts roughly twice as long because a Mars year is 687 Earth days. Its more eccentric orbit makes seasons unequal: southern summers are shorter and hotter, and often trigger planet-wide dust storms (like the 2018 storm that ended Opportunity\'s mission).' },
  { title: 'The sol', src: 'marsFact', text: 'A Martian solar day — a "sol" — lasts 24 h 39 min 35 s. Rover teams on Earth have lived on "Mars time", shifting their schedules about 40 minutes later each day.' },
  { title: 'Water ice', src: 'marsScience', text: 'Water ice exists in both polar caps and in buried mid-latitude ice sheets mapped by MRO\'s SHARAD radar. In 2008 the Phoenix lander scraped into bright subsurface ice. Fresh impact craters imaged by MRO have exposed nearly pure ice just below the surface.' },
  { title: 'Surface geology', src: 'marsScience', text: 'The surface is mostly basalt covered by fine iron-oxide dust — the source of Mars\'s red colour. The southern highlands are ancient and heavily cratered; the northern lowlands are smoother and younger. Rovers have found clays, sulfates and conglomerates that formed in liquid water billions of years ago.' },
];

export const MOON_TOPICS = [
  { title: 'Lunar phases', src: 'moonFacts', text: 'Phases come from the changing angle between the Sun, Earth and Moon — half the Moon is always lit, but we see different fractions of that lit half. A full cycle (synodic month) takes about 29.5 days, longer than the 27.3-day orbit because Earth also moves around the Sun.' },
  { title: 'Tidal locking', src: 'moonFacts', text: 'Earth\'s gravity raised tidal bulges in the young Moon and slowed its spin until its rotation period matched its orbital period. That is why we always see the same face — not because the Moon does not rotate.' },
  { title: 'Regolith & composition', src: 'moonScience', text: 'The surface is blanketed by regolith — broken rock and glassy dust made by billions of years of impacts, a few metres thick on maria and thicker in the highlands. The bright highlands are anorthosite (rich in plagioclase feldspar); the dark maria are iron-rich basalts.' },
  { title: 'Water ice', src: 'moonScience', text: 'LCROSS impacted Cabeus crater in 2009 and detected water in the ejected plume. NASA\'s Moon Mineralogy Mapper on India\'s Chandrayaan-1 detected water/hydroxyl, and later analysis of its data (2018) confirmed exposed water ice in polar cold traps.' },
  { title: 'Formation', src: 'moonFacts', text: 'The leading explanation is the giant-impact hypothesis: about 4.5 billion years ago a Mars-sized body collided with the young Earth, and debris from the collision coalesced into the Moon. Apollo samples, isotopically very similar to Earth rocks, strongly informed this model.' },
];
