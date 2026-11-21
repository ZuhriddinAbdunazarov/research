// Curated mission list. Dates are launch dates (UTC where available).
// status: 'complete' | 'operating' | 'unverified'. "operating" reflects NASA reporting at the stated
// `statusAsOf`; we do not claim live status — users are always pointed to the official page.
// Images are fetched live from the NASA Image and Video Library using `imageQuery`.

export const MISSIONS = [
  // ---------- MARS ----------
  {
    id: 'mariner4', name: 'Mariner 4', target: 'mars', agency: 'NASA / JPL', type: 'Flyby', launch: '1964-11-28', status: 'complete',
    objectives: 'First successful flyby of Mars and close-up imaging of another planet.',
    discoveries: ['Returned 21 images during the July 1965 flyby, revealing a cratered, Moon-like surface.', 'Measured a very thin atmosphere and found no global magnetic field.'],
    link: 'https://science.nasa.gov/mission/mariner-4/', imageQuery: 'Mariner 4 Mars',
  },
  {
    id: 'mariner9', name: 'Mariner 9', target: 'mars', agency: 'NASA / JPL', type: 'Orbiter', launch: '1971-05-30', status: 'complete',
    objectives: 'Map the Martian surface and study the atmosphere from orbit.',
    discoveries: ['First spacecraft to orbit another planet (November 1971).', 'Revealed Olympus Mons, Valles Marineris and ancient river channels after a global dust storm cleared.'],
    link: 'https://science.nasa.gov/mission/mariner-9/', imageQuery: 'Mariner 9',
  },
  {
    id: 'viking', name: 'Viking 1 & 2', target: 'mars', agency: 'NASA', type: 'Orbiters + landers', launch: '1975-08-20', status: 'complete',
    objectives: 'Obtain high-resolution images, characterise the surface and atmosphere, and search for evidence of life.',
    discoveries: ['Viking 1 landed on 20 July 1976 — the first successful U.S. Mars landing; Viking 2 followed on 3 September 1976.', 'Biology experiments returned no conclusive evidence of life; orbiters mapped evidence of ancient floods.'],
    link: 'https://science.nasa.gov/mission/viking-1/', imageQuery: 'Viking lander Mars surface',
  },
  {
    id: 'pathfinder', name: 'Mars Pathfinder & Sojourner', target: 'mars', agency: 'NASA / JPL', type: 'Lander + rover', launch: '1996-12-04', status: 'complete',
    objectives: 'Demonstrate a low-cost airbag landing and a free-ranging robotic rover.',
    discoveries: ['Landed 4 July 1997 in Ares Vallis; Sojourner was the first wheeled rover on Mars.', 'Rocks and pebbles suggested a past watery environment.'],
    link: 'https://science.nasa.gov/mission/mars-pathfinder/', imageQuery: 'Sojourner rover Pathfinder',
  },
  {
    id: 'mer', name: 'Spirit & Opportunity (MER)', target: 'mars', agency: 'NASA / JPL', type: 'Rovers', launch: '2003-06-10', status: 'complete',
    objectives: 'Search for rocks and soils that hold clues to past water activity.',
    discoveries: ['Opportunity found hematite "blueberries" and layered rocks formed in water at Meridiani Planum.', 'Spirit found silica-rich deposits suggesting ancient hot springs.', 'Planned for 90 sols; Opportunity drove more than 45 km and operated until the 2018 dust storm.'],
    link: 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/', imageQuery: 'Opportunity rover',
  },
  {
    id: 'mro', name: 'Mars Reconnaissance Orbiter', target: 'mars', agency: 'NASA / JPL', type: 'Orbiter', launch: '2005-08-12', status: 'operating', statusAsOf: '2025',
    objectives: 'Study the history of water on Mars at high resolution and relay data for surface missions.',
    discoveries: ['HiRISE imaged features as small as about a metre across.', 'SHARAD radar mapped buried ice; MRO observed fresh craters exposing subsurface ice.'],
    link: 'https://science.nasa.gov/mission/mars-reconnaissance-orbiter/', imageQuery: 'Mars Reconnaissance Orbiter HiRISE',
  },
  {
    id: 'curiosity', name: 'Curiosity (Mars Science Laboratory)', target: 'mars', agency: 'NASA / JPL', type: 'Rover', launch: '2011-11-26', status: 'operating', statusAsOf: '2025',
    objectives: 'Assess whether Gale Crater ever offered environmental conditions favourable for microbial life.',
    discoveries: ['Landed 6 August 2012 (UTC) in Gale Crater.', 'Found that Gale hosted an ancient freshwater lake with the chemical ingredients for life.', 'Detected complex organic molecules and seasonal variation in atmospheric methane; RAD measured surface radiation.'],
    link: 'https://science.nasa.gov/mission/msl-curiosity/', imageQuery: 'Curiosity rover selfie',
  },
  {
    id: 'maven', name: 'MAVEN', target: 'mars', agency: 'NASA', type: 'Orbiter', launch: '2013-11-18', status: 'unverified',
    objectives: 'Investigate how Mars lost its atmosphere and water to space.',
    discoveries: ['Arrived in Mars orbit in September 2014.', 'Showed that the solar wind and solar storms strip gas from the upper atmosphere — a major driver of Mars\'s climate change.'],
    link: 'https://science.nasa.gov/mission/maven/', imageQuery: 'MAVEN spacecraft Mars',
  },
  {
    id: 'perseverance', name: 'Perseverance (Mars 2020) & Ingenuity', target: 'mars', agency: 'NASA / JPL', type: 'Rover + helicopter', launch: '2020-07-30', status: 'operating', statusAsOf: '2025',
    objectives: 'Seek signs of ancient life, collect rock samples for possible return to Earth, and test technology for human exploration.',
    discoveries: ['Landed 18 February 2021 in Jezero Crater.', 'MOXIE produced oxygen from Martian CO₂ — 122 g in total.', 'Ingenuity made the first powered, controlled flight on another planet (19 April 2021) and flew 72 times.'],
    link: 'https://science.nasa.gov/mission/mars-2020-perseverance/', imageQuery: 'Perseverance rover Jezero',
  },
  // ---------- MOON ----------
  {
    id: 'apollo', name: 'Apollo program', target: 'moon', agency: 'NASA', type: 'Crewed landings', launch: '1969-07-16', status: 'complete',
    objectives: 'Land humans on the Moon and return them safely to Earth.',
    discoveries: ['Six crewed landings (Apollo 11, 12, 14, 15, 16, 17) between 1969 and 1972; 12 astronauts walked on the Moon.', 'Returned 382 kg of lunar samples that underpin the giant-impact model of lunar formation.', 'Apollo 11 launch date shown; first landing 20 July 1969.'],
    link: 'https://www.nasa.gov/the-apollo-program/', imageQuery: 'Apollo 11 Aldrin lunar surface',
  },
  {
    id: 'lunarprospector', name: 'Lunar Prospector', target: 'moon', agency: 'NASA', type: 'Orbiter', launch: '1998-01-07', status: 'complete',
    objectives: 'Map surface composition and search for polar ice.',
    discoveries: ['Its neutron spectrometer detected excess hydrogen at the poles, consistent with water ice.'],
    link: 'https://science.nasa.gov/mission/lunar-prospector/', imageQuery: 'Lunar Prospector',
  },
  {
    id: 'chandrayaan1', name: 'Chandrayaan-1', target: 'moon', agency: 'ISRO (with NASA M³ instrument)', type: 'Orbiter', launch: '2008-10-22', status: 'complete',
    objectives: 'Map lunar chemistry, mineralogy and topography.',
    discoveries: ['NASA\'s Moon Mineralogy Mapper (M³) detected water and hydroxyl on the lunar surface (2009).', 'M³ data later confirmed exposed water ice in polar cold traps (2018).'],
    link: 'https://www.isro.gov.in/Chandrayaan_1.html', imageQuery: 'Moon Mineralogy Mapper water',
  },
  {
    id: 'lro', name: 'Lunar Reconnaissance Orbiter', target: 'moon', agency: 'NASA', type: 'Orbiter', launch: '2009-06-18', status: 'operating', statusAsOf: '2025',
    objectives: 'Create detailed maps of the Moon, identify safe landing sites and locate resources.',
    discoveries: ['LROC imaged the Apollo landing sites, including hardware and astronaut tracks.', 'Diviner measured some of the coldest temperatures in the solar system inside permanently shadowed craters.'],
    link: 'https://science.nasa.gov/mission/lro/', imageQuery: 'Lunar Reconnaissance Orbiter',
  },
  {
    id: 'lcross', name: 'LCROSS', target: 'moon', agency: 'NASA', type: 'Impactor', launch: '2009-06-18', status: 'complete',
    objectives: 'Confirm the presence of water ice in a permanently shadowed crater.',
    discoveries: ['Impacted Cabeus crater on 9 October 2009 and detected water in the ejected debris plume.'],
    link: 'https://science.nasa.gov/mission/lcross/', imageQuery: 'LCROSS Cabeus',
  },
  {
    id: 'grail', name: 'GRAIL', target: 'moon', agency: 'NASA', type: 'Twin orbiters', launch: '2011-09-10', status: 'complete',
    objectives: 'Map the Moon\'s gravity field to reveal its internal structure.',
    discoveries: ['Produced the highest-resolution gravity map of any celestial body at the time.', 'Showed the lunar crust is thinner and more fractured than expected.'],
    link: 'https://science.nasa.gov/mission/grail/', imageQuery: 'GRAIL gravity map moon',
  },
  {
    id: 'change4', name: 'Chang\'e 4', target: 'moon', agency: 'CNSA', type: 'Lander + rover', launch: '2018-12-07', status: 'unverified',
    objectives: 'Explore the lunar far side.',
    discoveries: ['First soft landing on the far side of the Moon (3 January 2019), in Von Kármán crater within the South Pole–Aitken basin.'],
    link: 'https://www.cnsa.gov.cn/english/', imageQuery: 'Chang\'e 4 far side',
  },
  {
    id: 'chandrayaan3', name: 'Chandrayaan-3', target: 'moon', agency: 'ISRO', type: 'Lander + rover', launch: '2023-07-14', status: 'complete',
    objectives: 'Demonstrate a safe soft landing and roving near the lunar south pole.',
    discoveries: ['Vikram lander touched down on 23 August 2023 — the first soft landing near the lunar south pole region.', 'Pragyan rover measured surface elemental composition, including sulfur.'],
    link: 'https://www.isro.gov.in/Chandrayaan3_Details.html', imageQuery: 'Chandrayaan-3',
  },
  {
    id: 'artemis', name: 'Artemis program', target: 'moon', agency: 'NASA (with international partners)', type: 'Crewed exploration', launch: '2022-11-16', status: 'unverified',
    objectives: 'Return humans to the Moon, explore the south polar region and prepare for missions to Mars.',
    discoveries: ['Artemis I (launched 16 November 2022) flew an uncrewed Orion spacecraft around the Moon and splashed down on 11 December 2022.', 'Later Artemis missions add crews; see NASA for the current schedule.'],
    link: 'https://www.nasa.gov/humans-in-space/artemis/', imageQuery: 'Artemis I SLS launch',
  },
];

export const STATUS_LABEL = {
  complete: 'Mission complete',
  operating: 'Operating (NASA, as of {asOf})',
  unverified: 'Status not asserted — check official page',
};
