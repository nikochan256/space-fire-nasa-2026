/* Spacefire Explorer — Skylabs: repair bases on the Moon and Mars.
   Every machine on the map stopped for a real reason: batteries that could not be recharged, dust on
   solar panels, electronics that froze in the night, broken rotor blades. Two bases, placed where
   NASA's own studies say a base should go, recover them with a rocket hopper, repair them in a
   pressurised bay and fly them home. Only a repaired machine can be driven, flown or run.
   Loaded after data.js and missions.js; extends SF_EXPLORE (sites + items) and SF_HARDWARE, and
   defines SF_REPAIR (fault, cause and repair steps per item) and SF_BASES. */
(function () {
  const X = window.SF_EXPLORE, HW = window.SF_HARDWARE || (window.SF_HARDWARE = {});

  // ------------------------------------------------------------------ the two bases
  window.SF_BASES = {
    moon: { id: 'skylab-moon', name: 'Shackleton Skylab', short: 'Shackleton', body: 'moon', lat: -89.45, lon: -145.0, hopSpeed: 1.2,
      bay: 'Repair Bay 01', hopper: 'LOX / hydrogen hopper', fuel: 'oxygen and hydrogen split from polar ice' },
    mars: { id: 'skylab-mars', name: 'Arcadia Skylab', short: 'Arcadia', body: 'mars', lat: 38.6, lon: 196.0, hopSpeed: 2.4,
      bay: 'Repair Bay 02', hopper: 'methane / oxygen hopper', fuel: 'methane and oxygen made from Martian CO₂ and ice' },
  };

  X.sites.unshift(
    { id: 'skylab-moon', body: 'moon', group: 'skylab', base: 'moon', lat: -89.45, lon: -145.0, name: 'Shackleton Skylab', sub: 'Repair base · lunar south pole',
      items: ['sk-bay-moon', 'sk-hab-moon', 'sk-pad-moon', 'sk-vsat', 'sk-ice-moon', 'sk-fsp', 'sk-comms-moon', 'sk-rover-moon'] },
    { id: 'skylab-mars', body: 'mars', group: 'skylab', base: 'mars', lat: 38.6, lon: 196.0, name: 'Arcadia Skylab', sub: 'Repair base · Arcadia Planitia',
      items: ['sk-bay-mars', 'sk-icehome', 'sk-pad-mars', 'sk-greenhouse', 'sk-kilopower', 'sk-moxie', 'sk-drill', 'sk-solar-mars', 'sk-comms-mars'] },
  );

  const I = X.items;
  // ------------------------------------------------------------------ Shackleton Skylab (Moon)
  Object.assign(I, {
    'sk-bay-moon': { name: 'Repair Bay 01', kind: 'Pressurised repair hangar', model: 'skHangar', year: 'Skylab', base: true,
      story: ['The reason the base exists. Hardware that has sat in the lunar vacuum for fifty years comes in through an airlock big enough for a moon buggy, gets warmed slowly to room temperature, and is scanned, cleaned and repaired by two robot arms and a crew in shirt-sleeves.',
        'Every repair is planned from what really went wrong: spent silver-zinc batteries, dust on radiators, electronics cracked by 250 °C swings between day and night.'],
      facts: [['Size', '14 × 22 m'], ['Pressure', '0.7 bar'], ['Arms', '2 × 7-axis'], ['Queue', 'Moon hardware']] },
    'sk-hab-moon': { name: 'Regolith Habitat', kind: '3D-printed shield over inflatable modules', model: 'skHabMoon', year: 'Skylab', base: true,
      story: ['Four crew live inside inflatable modules buried under a shell printed from moon dust. A printer binds regolith layer by layer into a cellular dome, the idea ESA and Foster + Partners tested with simulated lunar soil.',
        'About 1.5 m of regolith cuts the radiation dose from cosmic rays and solar storms several times over, and it also stops micrometeorites and evens out the temperature.'],
      facts: [['Crew', '4'], ['Shield', '≈ 1.5 m regolith'], ['Volume', '≈ 400 m³'], ['Built by', 'Robots, before crew']] },
    'sk-pad-moon': { name: 'Landing Pad & Hopper', kind: 'Sintered pad with blast berm', model: 'skPad', year: 'Skylab', base: true,
      story: ['Rockets landing on bare regolith blast dust and pebbles sideways at more than 1 km/s. In 1969 Apollo 12 landed 180 m from Surveyor 3, and the robot came home sandblasted. So the pad is sintered into hard glass and ringed with a berm.',
        'The hopper parked on it is the base’s tow truck: a rocket that hops across the Moon on oxygen and hydrogen made from polar ice, picks up a dead machine with its winch and flies it back to the repair bay.'],
      facts: [['Pad', '40 m, sintered'], ['Hopper fuel', 'LOX / LH₂'], ['Range', 'Whole Moon'], ['Lesson', 'Surveyor 3, 1969']] },
    'sk-vsat': { name: 'Vertical Solar Towers', kind: 'Sun-tracking solar arrays', model: 'skVSAT', year: 'Skylab', base: true,
      story: ['At the south pole the Sun never rises more than about 1.5° above the horizon. It circles the sky once a month, so flat panels would see almost nothing. The towers stand the panels upright, 20 m tall, and turn them to follow the Sun around the horizon.',
        'On the ridge between Shackleton and de Gerlache craters, high points are lit for most of the year. This is NASA’s Vertical Solar Array Technology idea.'],
      facts: [['Height', '≈ 20 m'], ['Power', '≈ 10 kW each'], ['Sun height', '≤ 1.5°'], ['Lit', '≈ 80–90% of the year']] },
    'sk-ice-moon': { name: 'Ice Mine', kind: 'Excavator and water plant', model: 'skIceMoon', year: 'Skylab', base: true,
      story: ['The craters next to the base have not seen sunlight for billions of years. At about −230 °C, they trap water ice, which Chandrayaan-1 and NASA’s LCROSS impactor helped prove.',
        'A RASSOR-style digger with counter-rotating bucket drums brings icy regolith to a heater. The water is split into oxygen to breathe and hydrogen and oxygen to fuel the hopper.'],
      facts: [['Source', 'Shadowed craters'], ['Ice', 'A few % by mass'], ['Digger', 'Bucket drums'], ['Makes', 'Water, O₂, H₂']] },
    'sk-fsp': { name: 'Fission Power Plant', kind: '40 kW surface reactor', model: 'skFission', year: 'Skylab', base: true,
      story: ['The lunar night lasts 14 days. Even on the ridge, there are dark spells. NASA’s Fission Surface Power project is building a small reactor that gives 40 kW day and night for ten years, enough for about 30 homes.',
        'It sits behind a berm with its big radiator wings spread. The real one would stand a kilometre or more away; the explorer brings it closer so you can see it.'],
      facts: [['Power', '40 kWe'], ['Life', '10 years'], ['Fuel', 'Uranium'], ['Shield', 'Berm + distance']] },
    'sk-comms-moon': { name: 'Comms Tower', kind: 'Relay and direct-to-Earth antenna', model: 'skComms', year: 'Skylab', base: true,
      story: ['From the pole, Earth sits right on the horizon and dips below it for part of each month. The tower’s dish talks to Earth when it can, and to relay satellites in lunar orbit, a network NASA calls LunaNet, when it can’t.',
        'Radio takes about 1.3 seconds to cross to Earth, so the base can drive its robots from home in near real time.'],
      facts: [['Mast', '15 m'], ['Light delay', '1.3 s'], ['Links', 'Earth + relays'], ['Network', 'LunaNet']] },
    'sk-rover-moon': { name: 'Pressurised Rover', kind: 'Crew rover with suitports', model: 'skPRover', year: 'Skylab', base: true,
      story: ['A small motorhome for two, based on NASA’s Space Exploration Vehicle and JAXA and Toyota’s Lunar Cruiser. Crew work in shirt-sleeves and climb into their suits from the back through suitports, so dust never comes inside.',
        'It tows the base’s service trailers out to sites the hopper can’t land near.'],
      facts: [['Crew', '2'], ['Range', '≈ 1,000 km / trip'], ['Wheels', '6'], ['Suitports', '2']] },
  });
  // ------------------------------------------------------------------ Arcadia Skylab (Mars)
  Object.assign(I, {
    'sk-bay-mars': { name: 'Repair Bay 02', kind: 'Pressurised repair hangar', model: 'skHangarMars', year: 'Skylab', base: true,
      story: ['Mars’s machines died of dust, cold and old age. Here the dust is blown off with jets of filtered Martian CO₂, batteries are swapped, and frozen electronics are warmed and re-soldered.',
        'From a hangar 5–20 light-minutes from Earth, the crew has to fix what they can on the spot: there is no waiting for a reply.'],
      facts: [['Size', '14 × 22 m'], ['Pressure', '0.7 bar'], ['Arms', '2 × 7-axis'], ['Queue', 'Mars hardware']] },
    'sk-icehome': { name: 'Ice Home', kind: 'Inflatable habitat shielded with water ice', model: 'skIceHome', year: 'Skylab', base: true,
      story: ['NASA Langley’s Mars Ice Home design: an inflatable dome filled with water ice pumped from the ground. Water is one of the best radiation shields there is, and ice lets daylight through, so the crew aren’t living in a cave.',
        'Inside is a rigid core with the airlock, bunks and labs. Arcadia was chosen because ice lies just centimetres under the dust here.'],
      facts: [['Shield', 'Water ice'], ['Light', 'Translucent'], ['Crew', '4'], ['Concept', 'NASA Langley, 2016']] },
    'sk-pad-mars': { name: 'Landing Pad & Hopper', kind: 'Pad with blast berm', model: 'skPadMars', year: 'Skylab', base: true,
      story: ['The Mars hopper burns methane and oxygen, both made at the base from Martian air and buried ice using the Sabatier reaction. With full tanks it can hop half way round the planet, land beside a dead rover, winch it up and bring it home.',
        'The pad is ringed with a berm so the plume can’t pepper the base with gravel.'],
      facts: [['Fuel', 'CH₄ / LOX'], ['Made from', 'CO₂ + water'], ['Range', 'Global hops'], ['Pad', '40 m']] },
    'sk-greenhouse': { name: 'Greenhouse', kind: 'Pressurised grow tunnel', model: 'skGreenhouse', year: 'Skylab', base: true,
      story: ['Salad, beans and potatoes under red and blue LEDs, the light plants use most, like NASA’s Veggie garden on the ISS. Sunlight on Mars is only about 43% as bright as on Earth, so the lamps do most of the work.',
        'The plants turn the crew’s CO₂ back into oxygen, and growing food is a big morale boost on a two-year stay.'],
      facts: [['Light', 'Red + blue LEDs'], ['Sun', '≈ 43% of Earth’s'], ['Crops', 'Greens, potatoes'], ['Heritage', 'ISS Veggie']] },
    'sk-kilopower': { name: 'Kilopower Reactors', kind: '4 × 10 kW fission units', model: 'skKilopower', year: 'Skylab', base: true,
      story: ['Opportunity died in a dust storm and InSight under a layer of dust. Reactors don’t care about either. Kilopower is a small uranium reactor whose heat drives Stirling engines; NASA tested it at full power on Earth in 2018 (the KRUSTY test).',
        'The umbrella-shaped radiators dump the waste heat into the thin, cold air.'],
      facts: [['Units', '4 × 10 kWe'], ['Converter', 'Stirling engines'], ['Tested', 'KRUSTY, 2018'], ['Dust', 'Doesn’t matter']] },
    'sk-moxie': { name: 'Oxygen & Fuel Plant', kind: 'MOXIE-scale ISRU plant', model: 'skMoxie', year: 'Skylab', base: true,
      story: ['Mars’s air is 95% carbon dioxide. A small box on Perseverance called MOXIE split it into oxygen 16 times between 2021 and 2023, making 122 grams in total. This plant is the same idea, a few hundred times larger.',
        'Next door a Sabatier reactor combines CO₂ with hydrogen from the ice to make methane, the hopper’s fuel.'],
      facts: [['Heritage', 'MOXIE, 2021–23'], ['MOXIE made', '122 g O₂'], ['Air', '95% CO₂'], ['Also makes', 'Methane']] },
    'sk-drill': { name: 'Ice Well', kind: 'Rodwell drill rig', model: 'skDrill', year: 'Skylab', base: true,
      story: ['NASA’s Subsurface Water Ice Mapping project (SWIM) mapped ice just under the surface across Arcadia Planitia. A Rodriguez well melts a pocket in the ice and pumps the water up, like the wells used at the South Pole station.',
        'One well can give the base thousands of litres of water: to drink, to grow food, to shield the Ice Home, and to split into fuel.'],
      facts: [['Method', 'Rodwell (melt & pump)'], ['Ice depth', 'Centimetres to metres'], ['Map', 'NASA SWIM'], ['Heritage', 'South Pole station']] },
    'sk-solar-mars': { name: 'Solar Field', kind: 'Backup arrays with cleaning robot', model: 'skSolarMars', year: 'Skylab', base: true,
      story: ['Backup power, and a lesson learned: Spirit, Opportunity and InSight all lost power to dust on their panels. Here a little robot runs along each row and brushes them clean.',
        'In a global dust storm the field can drop to a few percent, so the reactors carry the base.'],
      facts: [['Rows', '6'], ['Cleaning', 'Rail robot'], ['Storm loss', 'Up to ≈ 95%'], ['Role', 'Backup']] },
    'sk-comms-mars': { name: 'Deep-Space Antenna', kind: 'High-gain dish + relay link', model: 'skCommsMars', year: 'Skylab', base: true,
      story: ['Mars is 4 to 24 light-minutes from Earth, depending on where the planets are in their orbits. The dish talks to NASA’s Deep Space Network directly, and to orbiters like MRO and MAVEN that relay most rover data today.',
        'Every two years Mars passes behind the Sun and the base is on its own for about two weeks.'],
      facts: [['Light delay', '4–24 min'], ['Dish', '3 m'], ['Relays', 'MRO, MAVEN'], ['Blackout', '≈ 2 weeks / 2 yrs']] },
  });

  // science cards for the story reader ("Label: text")
  Object.assign(HW, {
    skHangar: 'Why warm it slowly: Hardware cold-soaked at −170 °C would crack if heated fast, as metals, plastics and solder expand at different rates. The bay warms each machine over hours, in dry nitrogen, so no frost forms on the electronics.',
    skHangarMars: 'Why warm it slowly: Hardware frozen through the Martian winter would crack if heated fast. The bay warms each machine over hours in dry nitrogen, then blows off the dust with filtered CO₂.',
    skHabMoon: 'Printing with moon dust: Regolith mixed with a binding salt, or sintered with microwaves, can be printed into hollow closed cells, like bird bone: strong, light, and quick to build.',
    skPad: 'Plume ejecta: In vacuum, dust blasted by a rocket doesn’t slow down; it flies for kilometres. A sintered pad and berm protect the base and the historic sites nearby.',
    skPadMars: 'Methalox: Methane and oxygen burn cleanly, store well, and can both be made on Mars. That’s why most Mars-return plans use them.',
    skVSAT: 'Low Sun power: A vertical panel facing a Sun on the horizon catches its full light. Height matters too: crater rims at the pole put a tall mast in sunlight for much longer than the ground below.',
    skIceMoon: 'Cold traps: Some polar crater floors stay below −230 °C, among the coldest places measured in the solar system, cold enough to hold water ice for billions of years.',
    skFission: 'Fission Surface Power: NASA’s plan is a reactor of about 40 kWe, under 6 tonnes, landed on the Moon and running for at least ten years without refuelling.',
    skComms: 'Line of sight: Radio needs a clear path. At the pole, Earth wobbles above and below the horizon over the month (libration), so relays cover the gaps.',
    skCommsMars: 'Solar conjunction: When Mars passes behind the Sun, the Sun’s plasma scrambles radio. Missions stop sending commands for about two weeks.',
    skPRover: 'Suitports: The spacesuit hangs on the outside of the rover with its back hatch sealed to the hull. You climb in from inside, so dust stays outside.',
    skIceHome: 'Water as a shield: Hydrogen-rich materials stop cosmic-ray particles best. A few metres of ice shields better than the same mass of metal, and makes fewer secondary particles.',
    skGreenhouse: 'Why red and blue: Chlorophyll absorbs mostly red and blue light. LEDs that give only those colours waste less power, which is why grow rooms glow pink.',
    skKilopower: 'KRUSTY: In 2018 NASA ran the Kilopower Reactor Using Stirling Technology at full power for 28 hours in Nevada. It worked as planned, even when the team simulated failures.',
    skMoxie: 'Solid oxide electrolysis: MOXIE heated CO₂ to 800 °C and pulled oxygen ions through a ceramic membrane, leaving carbon monoxide behind.',
    skDrill: 'Rodwell: Hot water is pumped down to melt a growing pool in the ice, and the meltwater is pumped up. The US South Pole station has used them for decades.',
    skSolarMars: 'Dust factor: InSight’s panels fell to about a tenth of their power over four years. Opportunity was sometimes saved by “cleaning events”, gusts of wind that blew its panels clean.',
  });

  // ------------------------------------------------------------------ repairs
  // status: offline (repairable) · dimmed (works, can be cleaned in place) · heritage · debris · working · unreachable · gone
  // step kind (bay animation): scan · dust · frost · swap · weld · panel · heat · upload · test
  const SCAN = (t) => ({ kind: 'scan', label: 'Scan for damage', text: t || 'A CT ring and lidar map every strut, cable and joint, and the scan marks each fault in red.' });
  const EDS = { kind: 'dust', label: 'Clear the dust', text: 'An electrodynamic dust shield sends rippling electric fields across the surface and lifts the sharp, clingy regolith off it. NASA tested this on Firefly’s Blue Ghost lander in 2025.' };
  const CO2 = { kind: 'dust', label: 'Blow off the dust', text: 'Jets of filtered Martian CO₂ blow the fine red dust off without scratching the solar cells, a scaled-up version of the wind gusts that sometimes cleaned Opportunity.' };
  const TEST = (t) => ({ kind: 'test', label: 'Power-on test', text: t });
  const RHU = { kind: 'heat', label: 'Fit radioisotope heaters', text: 'Pellets of plutonium-238 that give about 1 W of heat each, with no moving parts. Heaters like these kept Apollo 11’s seismometer and the Soviet Lunokhod rovers warm through the lunar night.' };
  const R = {};
  const lrv = (fender) => ({ status: 'offline', base: 'moon', fault: 'Batteries exhausted',
    cause: 'The rover ran on two 36-volt silver-zinc batteries that could not be recharged. They were built for 78 hours of driving and were spent when the crew left. Since then, 50 years of lunar days and nights, from about +120 °C to −170 °C, have cracked wiring insulation, and dust coats the radiators that cooled the electronics.',
    tele: [['Battery', '0.0 V', '36.0 V', 2], ['Wheel motors', '0 / 4', '4 / 4', 4], ['Radiators', 'Dust 70%', 'Clean', 1], ['Temperature', '−170 °C', '+18 °C', 3]],
    steps: [SCAN('The scan finds cracked insulation on the steering harness, dust on the radiator mirrors and two flat batteries.'), { ...EDS, label: 'Clear the radiator dust', at: [0.25, 0.75, 0] },
      { kind: 'swap', label: 'Swap both batteries', text: 'Out come the spent silver-zinc batteries; in go lithium-ion packs that can be recharged from the base’s solar towers.', at: [0.35, 0.6, 0], part: 'battery' },
      fender ? { kind: 'weld', label: 'Fit a new fender', text: 'In 1972 Cernan and Schmitt fixed a broken fender with four laminated maps and clamps. The map patch goes to a museum, and a new fender goes on.', at: [0.4, 0.45, 0.45] }
        : { kind: 'weld', label: 'Rewire the steering harness', text: 'A robot arm replaces the cracked cables and solders new connectors, then checks each joint with X-rays.', at: [0.45, 0.35, 0.3] },
      TEST('Drive motors, steering and the TV camera all respond. Ready to drive.')], unlock: 'Drive it' });
  const alsep = (cable) => ({ status: 'offline', base: 'moon', fault: 'Switched off in 1977, power faded',
    cause: 'NASA switched off all five Apollo stations on 30 September 1977 to save money. Each runs on a SNAP-27 generator that turns the heat of decaying plutonium-238 into electricity. Pu-238 has a half-life of 87.7 years, so by 2026 the fuel gives only about two-thirds of its first heat, and its thermocouples have aged too.',
    tele: [['Power', '0 W (off)', '73 W', 1], ['Fuel heat', '≈ 64%', '100%', 1], ['Seismometer', 'Offline', 'Listening', 4], ['Electronics', 'Fatigued', 'Renewed', 2]],
    steps: [SCAN('The scan shows a weak RTG, tired solder joints in the central station' + (cable ? ' and the heat-flow cable John Young’s boot snapped in 1972.' : '.')),
      { kind: 'swap', label: 'Load a fresh fuel capsule', text: 'A SNAP-27 is fuelled on site. In 1969 Alan Bean had to hammer Apollo 12’s stuck fuel capsule out of its hot cask; here a robot does it inside a shielded glove box.', at: [-0.4, 0.4, -0.3], part: 'capsule' },
      cable ? { kind: 'weld', label: 'Splice the heat-flow cable', text: 'The flat ribbon cable Young tripped over gets a new connector and a strain relief, so the heat-flow probes can measure the Moon’s inner heat again.', at: [0.3, 0.1, 0.4] }
        : { kind: 'weld', label: 'Renew the electronics', text: 'Fifty years of 290 °C swings fatigued the solder joints. The central station gets new circuit boards built to survive the lunar night.', at: [0, 0.4, 0] },
      { ...EDS, label: 'Clean the thermal surfaces', at: [0, 0.6, 0] },
      TEST('The transmitter starts sending seismic data again, ready for the next moonquake.')], unlock: 'Feel a moonquake' });
  const surveyor = (o = {}) => ({ status: 'offline', base: 'moon', fault: 'Froze in the lunar night',
    cause: o.cause || 'Surveyors ran on a solar panel and a silver-zinc battery, and were never built to survive the two-week lunar night at about −150 °C. Some never woke up after the first night; the others failed within months.',
    tele: [['Battery', '0.0 V', '22 V', 2], ['Solar panel', 'Dust 60%', 'Clean', 1], ['Temperature', '−150 °C', '+15 °C', 3], ['Camera', o.camera ? 'Missing' : 'Frozen', 'Working', o.camera ? 3 : 4]],
    steps: [SCAN(o.scan), { ...EDS, label: 'Clean the solar panel and camera mirror', at: [0, 0.95, 0] },
      { kind: 'swap', label: 'Replace the battery', text: 'The silver-zinc battery goes; a cold-tolerant lithium-ion pack goes in.', at: [0.2, 0.45, 0.2], part: 'battery' },
      o.camera ? { kind: 'panel', label: 'Fit a new TV camera', text: 'Apollo 12’s crew cut this camera off in 1969 and flew it home. It is in the Smithsonian today, so a new camera, built to the old plans, goes on.', at: [0.1, 0.7, 0.3] } : RHU,
      TEST('It sends a picture home. Surveyor 6 once fired its engines and hopped 3 m; this one can too.')], unlock: 'Hop' });
  Object.assign(R, {
    'a15-lrv': lrv(false), 'a16-lrv': lrv(false), 'a17-lrv': lrv(true),
    'a12-alsep': alsep(false), 'a14-alsep': alsep(false), 'a15-alsep': alsep(false), 'a16-alsep': alsep(true), 'a17-alsep': alsep(false),
    surveyor1: surveyor({ cause: 'Surveyor 1 was the first US soft landing, in 1966. It survived several lunar nights, then its battery failed and it last called home on 7 January 1967. Silver-zinc batteries and the −150 °C nights were too much for its electronics.' }),
    surveyor3: surveyor({ camera: true, scan: 'The scan finds a flat battery, a dusty panel and a missing TV camera, removed by the Apollo 12 crew in 1969.', cause: 'Surveyor 3 never woke up after its first lunar night in May 1967. Apollo 12 landed 180 m away in 1969, sandblasting it, and its crew cut off its camera and other parts to see how they had aged.' }),
    surveyor5: surveyor(), surveyor6: surveyor(), surveyor7: surveyor(),
    'c3-vikram': { status: 'offline', base: 'moon', fault: 'Never woke after the lunar night',
      cause: 'Vikram was built for one lunar day. ISRO put it to sleep on 4 September 2023, after a little hop, before the 14-day night. Without heaters its batteries and electronics froze far below −120 °C, and it never answered the wake-up calls.',
      tele: [['Battery', 'Frozen', '50 V', 2], ['Temperature', '−180 °C', '+20 °C', 1], ['Electronics', 'Cold-cracked', 'Renewed', 3], ['Laser reflector', 'Working (passive)', 'Working', 0]],
      steps: [SCAN('The scan finds frozen batteries and solder joints cracked by the cold. The little NASA laser reflector on top is fine: it needs no power.'),
        { kind: 'heat', label: 'Warm it up slowly', text: 'Infrared lamps raise its temperature by a few degrees an hour, so the different metals and plastics don’t crack as they expand.', at: [0, 0.6, 0] },
        { kind: 'swap', label: 'Fit a cold-rated battery', text: 'A battery with built-in heaters, sized to carry Vikram through a 14-day night.', at: [0.3, 0.5, 0.3], part: 'battery' },
        { kind: 'weld', label: 'Re-solder and add heaters', text: 'Cracked joints are renewed, and radioisotope heaters are added so this never happens again.', at: [-0.3, 0.55, -0.2] },
        TEST('Vikram calls home. In September 2023 it lifted itself 40 cm on its engines and landed 30–40 cm away; it can hop again.')], unlock: 'Hop' },
    'c3-pragyan': { status: 'offline', base: 'moon', fault: 'Never woke after the lunar night',
      cause: 'Pragyan drove about 100 m across the polar soil, then parked with its solar panel facing the next sunrise. It was put to sleep on 2 September 2023. Its battery froze in the lunar night and it never woke up.',
      tele: [['Battery', 'Frozen', 'Charged', 2], ['Temperature', '−180 °C', '+20 °C', 1], ['Wheels', '6 / 6 seized', '6 / 6 free', 3], ['Link', 'Via Vikram (silent)', 'Direct to base', 4]],
      steps: [SCAN(), { kind: 'heat', label: 'Warm it up slowly', text: 'Infrared lamps bring it to room temperature over hours, so nothing cracks.', at: [0, 0.6, 0] },
        { kind: 'swap', label: 'Fit a cold-rated battery', text: 'A heated lithium-ion pack that can survive the night.', at: [0, 0.5, 0], part: 'battery' },
        { kind: 'weld', label: 'Free the wheel motors', text: 'Frozen lubricant in the six wheel motors is replaced with a dry film that works from −200 °C up.', at: [0.4, 0.15, 0.4] },
        { kind: 'upload', label: 'Give it its own radio', text: 'Pragyan only talked to Vikram. A small radio now links it straight to the base.', at: [0.4, 0.8, 0] }, TEST('Pragyan is awake. Ready to drive.')], unlock: 'Drive it' },
    // laser mirrors: work, but dimmed (cleaned in place, not moved: their exact position is a 50-year record)
    'a11-lrrr': { status: 'dimmed', base: 'moon', fault: 'Working, but dimmed by dust', inPlace: true,
      cause: 'The mirrors need no power and still work. But since the 1970s they have returned about ten times less light than they should, probably because a thin film of dust has settled on the glass (Murphy et al., 2010). They are cleaned where they stand: their exact position is a 50-year record of the Moon’s orbit.' },
  });
  R['a14-lrrr'] = R['a11-lrrr']; R['a15-lrrr'] = R['a11-lrrr'];
  // ---- Mars
  const TEMPS = (a) => ['Temperature', a || '−90 °C', '+20 °C'];
  Object.assign(R, {
    pathfinder: { status: 'offline', base: 'mars', fault: 'Battery failed, froze',
      cause: 'Pathfinder’s last signal came on 27 September 1997. Its rechargeable silver-zinc battery had already lasted almost three times its 30-day design life. Without it, the lander couldn’t keep itself warm through the night, and the cold finished its electronics.',
      tele: [['Battery', '0.0 V', '40 V', 2], ['Solar cells', 'Dust 45%', 'Clean', 1], [...TEMPS('−95 °C'), 3], ['Radio', 'Silent', 'Linked', 4]],
      steps: [SCAN(), { ...CO2, at: [0, 0.4, 0] }, { kind: 'swap', label: 'Replace the battery', text: 'A modern lithium-ion pack with heaters goes in place of the 1997 silver-zinc battery.', at: [0, 0.35, 0], part: 'battery' },
        { kind: 'heat', label: 'Renew the heaters', text: 'New heaters and insulation keep the electronics warm through −95 °C nights.', at: [0, 0.4, 0] }, TEST('The Carl Sagan Memorial Station calls home again.')], unlock: 'Send a signal home' },
    sojourner: { status: 'offline', base: 'mars', fault: 'Lost its link to the lander',
      cause: 'Sojourner could only talk to Earth through Pathfinder. When the lander fell silent, the rover lost contact. Its software then told it to drive back toward the lander, so it may have circled it for weeks. Its main batteries were never rechargeable.',
      tele: [['Battery', 'Spent', 'Charged', 2], ['Solar panel', 'Dust 50%', 'Clean', 1], ['Link', 'Via lander (silent)', 'Direct to base', 3], TEMPS()],
      steps: [SCAN(), { ...CO2, label: 'Clean its solar panel', at: [0, 0.95, 0] }, { kind: 'swap', label: 'Fit a rechargeable battery', text: 'Its lithium-thionyl chloride batteries could never be recharged. A small rechargeable pack goes in.', at: [0, 0.5, 0], part: 'battery' },
        { kind: 'upload', label: 'Give it its own radio', text: 'A tiny radio so the rover can talk to the base directly, with no lander needed.', at: [0.3, 0.8, 0] }, TEST('Sojourner’s wheels turn. Ready to drive.')], unlock: 'Drive it' },
    spirit: { status: 'offline', base: 'mars', fault: 'Stuck in sand, froze in winter',
      cause: 'In 2006 Spirit’s right-front wheel motor failed, so it drove backwards, dragging the dead wheel. In 2009 it broke through a crust into soft sand at a place called Troy. Stuck, it couldn’t tilt its solar panels toward the low winter Sun, and the cold of its fourth Martian winter ended it in 2010.',
      tele: [['Battery', '0 %', '100 %', 3], ['Right-front wheel', 'Seized', 'Working', 1], ['Solar panels', 'Dust 40%', 'Clean', 2], TEMPS('−100 °C')],
      steps: [SCAN('The scan finds the seized right-front wheel motor, cold-damaged batteries and dusty panels.'),
        { kind: 'swap', label: 'Replace the right-front wheel motor', text: 'The motor that failed in 2006 is swapped for a new one with fresh lubricant.', at: [0.45, 0.15, 0.4], part: 'motor' },
        { ...CO2, label: 'Clean the solar panels', at: [0, 0.95, 0] },
        { kind: 'swap', label: 'Replace the batteries', text: 'Its two lithium-ion batteries were ruined by the cold. New ones go in, wrapped in heaters.', at: [0, 0.5, 0], part: 'battery' },
        TEST('All six wheels turn. Spirit is free of the sand at Troy.')], unlock: 'Drive it' },
    opportunity: { status: 'offline', base: 'mars', fault: 'Buried by a dust storm',
      cause: 'In June 2018 a dust storm covered the whole planet and blocked the Sun. Opportunity’s solar panels made too little power, its batteries drained, and it fell silent. NASA sent more than 1,000 commands before giving up in February 2019. Its flash memory was also wearing out and had begun to “forget” data overnight.',
      tele: [['Battery', '0 %', '100 %', 2], ['Solar panels', 'Dust 90%', 'Clean', 1], ['Flash memory', 'Failing', 'Replaced', 3], TEMPS('−100 °C')],
      steps: [SCAN(), { ...CO2, label: 'Clean the solar panels', text: 'The storm left a thick layer of dust. Filtered CO₂ jets clean all five panels.', at: [0, 0.95, 0] },
        { kind: 'swap', label: 'Replace the batteries', text: 'Fifteen years of charging wore them out. New lithium-ion batteries go in.', at: [0, 0.5, 0], part: 'battery' },
        { kind: 'upload', label: 'Replace the flash memory', text: 'From 2014 Opportunity suffered from “amnesia”: worn flash memory lost data overnight. A new memory board fixes it.', at: [0.2, 0.55, 0] },
        TEST('Opportunity’s cameras open their eyes. Ready to drive.')], unlock: 'Drive it' },
    viking1: { status: 'offline', base: 'mars', fault: 'A bad command lost its antenna',
      cause: 'Viking 1 worked for more than six years. In November 1982, a command meant to fix its battery charging accidentally overwrote the software that pointed its antenna at Earth, and contact was never made again. Its two plutonium generators have also faded to about two-thirds.',
      tele: [['Antenna pointing', 'Overwritten', 'Restored', 1], ['RTG power', '≈ 67%', '100%', 2], ['Battery', 'Flat', 'Charged', 2], TEMPS()],
      steps: [SCAN(), { kind: 'upload', label: 'Reload the antenna software', text: 'The pointing software lost in 1982 is reloaded from the original 1970s listings, which NASA still has.', at: [0, 0.8, 0] },
        { kind: 'swap', label: 'Fit fresh RTGs', text: 'Its two SNAP-19 generators have faded with their fuel. New ones go in.', at: [0.3, 0.4, -0.3], part: 'capsule' },
        { ...CO2, at: [0, 0.5, 0] }, TEST('The Thomas A. Mutch Memorial Station calls home.')], unlock: 'Send a signal home' },
    viking2: { status: 'offline', base: 'mars', fault: 'Batteries failed',
      cause: 'Viking 2’s lander worked on Utopia Planitia until its batteries failed in April 1980. Its plutonium generators still give heat, but too little power without batteries to cover the peaks.',
      tele: [['Battery', 'Failed', 'Charged', 1], ['RTG power', '≈ 67%', '100%', 2], ['Frost', 'Thin layer', 'Clear', 3], TEMPS()],
      steps: [SCAN(), { kind: 'swap', label: 'Replace the batteries', text: 'New batteries, sized for the long Martian nights.', at: [0, 0.4, 0], part: 'battery' },
        { kind: 'swap', label: 'Fit fresh RTGs', text: 'New generators in place of the faded SNAP-19s.', at: [0.3, 0.4, -0.3], part: 'capsule' }, { ...CO2, at: [0, 0.5, 0] }, TEST('Viking 2 calls home.')], unlock: 'Send a signal home' },
    phoenix: { status: 'offline', base: 'mars', fault: 'Solar panels crushed by CO₂ ice', frost: true,
      cause: 'Phoenix landed at 68°N, where winter brings months of darkness. It went silent in November 2008. In 2010 orbiter photos showed its solar panels had bent or snapped under the weight of carbon-dioxide frost, dry ice, that piles up on everything in the polar winter.',
      tele: [['CO₂ frost', 'Thick', 'Gone', 1], ['Solar arrays', 'Broken', 'New', 2], ['Battery', 'Dead', 'Charged', 3], TEMPS('−125 °C')],
      steps: [SCAN('The scan finds dry-ice frost on every surface and both solar arrays bent and cracked.'),
        { kind: 'frost', label: 'Sublimate the CO₂ frost', text: 'Above −78 °C dry ice turns straight to gas. Gentle heat makes the frost vanish without leaving any water.', at: [0, 0.5, 0] },
        { kind: 'panel', label: 'Replace the solar arrays', text: 'New fan-shaped UltraFlex arrays, the same type that unfolded like a fan when Phoenix landed.', at: [0.45, 0.35, 0] },
        { kind: 'swap', label: 'Replace the battery', text: 'A new battery with heaters for the long nights.', at: [0, 0.35, 0], part: 'battery' },
        TEST('Phoenix calls home, sixteen years late.')], unlock: 'Send a signal home' },
    insight: { status: 'offline', base: 'mars', fault: 'Smothered by dust',
      cause: 'Dust kept settling on InSight’s two 2.2-m solar panels. By 2022 they made about a tenth of the power they did at landing, from about 5,000 to 500 watt-hours a day. The lander fell silent on 15 December 2022. Its heat probe, the “mole”, had also never got deeper than about 40 cm: the soil gave it nothing to push against.',
      tele: [['Solar power', '≈ 500 Wh / sol', '5,000 Wh / sol', 1], ['Battery', 'Flat', 'Charged', 3], ['Heat probe', 'Stuck at 40 cm', 'Free', 2], ['Seismometer', 'Silent', 'Listening', 4]],
      steps: [SCAN(), { ...CO2, label: 'Clean the solar panels', at: [0.4, 0.5, 0] },
        { kind: 'weld', label: 'Help the mole', text: 'A new sleeve gives the heat probe the friction it never had, so it can hammer itself down to 5 m.', at: [0.35, 0.1, 0.35] },
        { kind: 'swap', label: 'Replace the battery', text: 'Four Martian years of charging wore it out.', at: [0, 0.45, 0], part: 'battery' },
        TEST('The seismometer is listening again, for the next marsquake.')], unlock: 'Feel a marsquake' },
    ingenuity: { status: 'offline', base: 'mars', fault: 'Rotor blades broken',
      cause: 'On its 72nd flight, on 18 January 2024, Ingenuity’s navigation camera couldn’t track the smooth, featureless sand below it. It came down hard, the blades hit the ground, and all four were damaged. NASA’s 2024 investigation found the cause.',
      tele: [['Rotor blades', '4 damaged', '4 new', 1], ['Navigation', 'v1 (smooth sand)', 'v2', 2], ['Battery', '6 cells, worn', 'New', 3], ['Rotor speed', '0 rpm', '2,500 rpm', 4]],
      steps: [SCAN('The scan finds all four carbon-fibre blades damaged and the battery worn after three years.'),
        { kind: 'panel', label: 'Fit four new rotor blades', text: 'Carbon-fibre blades, 1.2 m tip to tip. To lift in air 1% as thick as Earth’s, they spin at about 2,500 rpm.', at: [0, 0.95, 0] },
        { kind: 'upload', label: 'Update the navigation software', text: 'New software can track smooth sand, so a featureless dune can’t fool it again.', at: [0, 0.55, 0] },
        { kind: 'swap', label: 'Replace the battery', text: 'Six small lithium-ion cells, the same kind found in laptops.', at: [0, 0.5, 0], part: 'battery' },
        TEST('The rotors spin up to 2,500 rpm. Ready to fly.')], unlock: 'Fly it' },
  });
  // ---- orbiters the bases can reach
  R['c1-orbiter'] = { status: 'offline', base: 'moon', orbit: true, fault: 'Star sensors failed',
    cause: 'Chandrayaan-1 lost contact on 28 August 2009 after its star sensors, which it needed to know which way it was pointing, failed in the radiation and heat. In 2016 NASA found it with radar, still orbiting the Moon 200 km up.',
    tele: [['Star sensors', 'Failed', 'New', 1], ['Battery', 'Flat', 'Charged', 2], ['Radio', 'Silent since 2009', 'Linked', 3], ['Orbit', '≈ 200 km, polar', '100 km, polar', 3]],
    steps: [SCAN(), { kind: 'swap', label: 'Replace the star sensors', text: 'Radiation-hardened star trackers so it always knows which way it’s pointing.', at: [0.2, 0.55, 0.3], part: 'motor' },
      { kind: 'swap', label: 'Replace the battery', text: 'A new lithium-ion battery.', at: [0, 0.4, 0], part: 'battery' }, TEST('Chandrayaan-1 calls home, sixteen years after it fell silent.')], unlock: 'Back to orbit' };
  R.mom = { status: 'offline', base: 'mars', orbit: true, fault: 'Battery drained in a long eclipse',
    cause: 'Mangalyaan was built for six months and worked for almost eight years. In 2022 a series of long eclipses kept its solar panel in Mars’s shadow for longer than its battery could last, and it ran out of fuel too.',
    tele: [['Battery', 'Drained', 'Charged', 1], ['Fuel', 'Empty', 'Full', 2], ['Radio', 'Silent since 2022', 'Linked', 3]],
    steps: [SCAN(), { kind: 'swap', label: 'Fit a bigger battery', text: 'Sized for the longest eclipses Mars can throw at it.', at: [0, 0.4, 0], part: 'battery' },
      { kind: 'upload', label: 'Refuel', text: 'Its tanks are refilled through a robotic refuelling port, a technique NASA tested on the ISS in 2011.', at: [0.3, 0.3, 0] }, TEST('Mangalyaan calls home.')], unlock: 'Back to orbit' };
  // ---- heritage, debris, still working, out of reach
  ['a11-lm', 'a12-lm', 'a14-lm', 'a15-lm', 'a16-lm', 'a17-lm'].forEach((id) => { R[id] = { status: 'heritage', fault: 'Protected heritage site',
    cause: 'A descent stage is a spent launch pad: its engine and fuel are gone, so it can’t fly again. NASA’s 2011 guidelines ask future visitors to keep their distance from the Apollo landers, footprints and tracks, and US law (the One Small Step Act, 2020) backs them. The Skylabs leave these exactly as they are.' }; });
  ['ranger7', 'c2-vikram', 'c1-mip'].forEach((id) => { R[id] = { status: 'debris', fault: 'Beyond repair',
    cause: 'It hit the Moon at more than 1 km/s. All that is left is a crater and scattered fragments, which are studied where they lie.' }; });
  R['c2-orbiter'] = { status: 'working', fault: 'Still working', cause: 'Still orbiting and sending pictures home. Nothing to fix.' };
  R.aditya = { status: 'working', fault: 'Still working', cause: 'Watching the Sun from L1, 1.5 million km away. Nothing to fix.' };
  R.voyager1 = R.voyager2 = { status: 'working', fault: 'Still talking, power fading',
    cause: 'Their plutonium generators lose about 4 watts a year, and NASA switches instruments off one by one to keep them going. At more than 20 billion km away they are out of reach of any repair: light alone takes about a day to get there.' };
  R.pioneer10 = R.pioneer11 = { status: 'unreachable', fault: 'Out of reach',
    cause: 'Their generators ran down and contact ended decades ago. They are more than 10 billion km away and still moving outward faster than any rocket we could send after them.' };
  R.dawn = { status: 'unreachable', fault: 'Out of fuel, out of reach',
    cause: 'Dawn ran out of the hydrazine it used to point itself. A tanker could refuel it in principle, but Ceres is far beyond either Skylab’s hoppers.' };
  R.kepler = { status: 'unreachable', fault: 'Out of fuel, out of reach',
    cause: 'Two of its four reaction wheels failed, then it ran out of fuel in 2018. It trails Earth around the Sun, now more than 100 million km behind us.' };
  R.near = { status: 'unreachable', fault: 'Out of reach', cause: 'NEAR rests on the asteroid Eros, which only passes near Earth every few years. It froze long ago.' };
  R.galileo = { status: 'gone', fault: 'Gone', cause: 'Galileo was steered into Jupiter on purpose in 2003 and burned up, so it could never crash into Europa and contaminate an ocean that might hold life.' };
  window.SF_REPAIR = R;
})();
