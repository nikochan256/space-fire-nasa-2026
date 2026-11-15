/* Spacefire Explorer — missions: launch facts, a timeline (it also drives the launch film:
   the first two entries play over the launch pad, the rest along the flight), and a technical
   "science" brief for readers who want more than the story.
   Sources: NASA NSSDCA, NASA Science / JPL mission pages, Apollo Lunar Surface Journal,
   ISRO mission pages and published results. Times UTC. */
window.SF_MISSIONS = {
  // ================================================================== APOLLO
  apollo11: {
    name: 'Apollo 11', agency: 'NASA', rocket: 'saturn5', to: 'moon',
    launch: { date: '16 Jul 1969', time: '13:32 UTC', vehicle: 'Saturn V (SA-506)', site: 'Launch Complex 39A, Kennedy Space Center, Florida', sky: 'day' },
    timeline: [
      ['T−0 · 16 Jul 1969', 'Five F-1 engines burn about 13 tonnes of kerosene and liquid oxygen every second. The 2,900-tonne Saturn V needs 12 seconds just to clear its 120 m tower.'],
      ['T+2 min 42 s', 'The first stage drops away at about 67 km altitude and 2.4 km/s; five hydrogen-fuelled J-2 engines on the second stage take over.'],
      ['T+2 h 44 min', 'Trans-lunar injection: the third stage relights for almost six minutes and adds about 3.1 km/s. Columbia and Eagle are on their way to the Moon.'],
      ['19 Jul', 'Lunar orbit insertion, behind the Moon and out of radio contact with Earth.'],
      ['20 Jul 20:05 UTC', 'Powered descent. Program alarms 1202 and 1201 flash: the guidance computer is overloaded, but its scheduler sheds low-priority work and keeps flying.'],
      ['20 Jul 20:17 UTC', 'Armstrong steers past a boulder-strewn crater and lands with the low-fuel light on. “The Eagle has landed.”'],
      ['21 Jul 17:54 UTC', 'The ascent stage lifts off. The descent stage stays behind as its launch pad, and it is still there today.'],
    ],
    science: [
      'Guidance: the Apollo Guidance Computer (2.048 MHz, 2,048 words of erasable memory, 36,864 words of core-rope ROM) flew the descent in programs P63 (braking), P64 (approach) and P66 (rate of descent). The 1202/1201 alarms came from the rendezvous-radar interface stealing memory cycles, because two 800 Hz power supplies were out of phase. That overflowed the executive’s core sets. Its restart-protected design dropped and rescheduled jobs instead of crashing, which is why the landing could continue.',
      'Descent propulsion: TRW’s descent engine was the first deep-throttling rocket flown by people. It made 45 kN at full thrust and was throttleable from about 10% to 60%, burning hypergolic Aerozine-50 and N₂O₄ pushed by helium, at a specific impulse of about 311 s. Four legs with crushable aluminium-honeycomb struts absorbed the touchdown.',
      'Results: 21.5 kg of samples. The Tranquillity basalts are 3.6–3.9 billion years old and rich in titanium (the mineral ilmenite), and they contained a new mineral, armalcolite. The Early Apollo Scientific Experiments Package left a solar-powered seismometer, which worked for 21 days, and the laser reflector, still in use.',
    ],
    numbers: [['Liftoff thrust', '≈ 34 MN'], ['Launch mass', '≈ 2,900 t'], ['TLI burn', '≈ +3.1 km/s'], ['Time on surface', '21 h 36 min'], ['Samples', '21.5 kg']],
  },
  apollo12: {
    name: 'Apollo 12', agency: 'NASA', rocket: 'saturn5', to: 'moon',
    launch: { date: '14 Nov 1969', time: '16:22 UTC', vehicle: 'Saturn V (SA-507)', site: 'Launch Complex 39A, Kennedy Space Center, Florida', sky: 'overcast' },
    timeline: [
      ['T+36.5 s', 'Lightning: the rocket and its ionised exhaust plume form a conducting path to the clouds. The command module’s fuel cells drop off line and its displays go haywire.'],
      ['T+52 s', 'A second strike. Flight controller John Aaron recognises the pattern: “Try SCE to Aux.” Al Bean flips the switch and the data returns. The Saturn’s own guidance never faltered.'],
      ['T+2 h 47 min', 'Trans-lunar injection, after the crew and Mission Control check every system the lightning could have damaged.'],
      ['19 Nov 06:54 UTC', 'Intrepid lands about 160 m from Surveyor 3, the first precision landing on another world.'],
      ['20 Nov', 'Conrad and Bean cut off Surveyor 3’s TV camera, scoop and cables to bring home. It was the first study of hardware after years on the Moon.'],
      ['20 Nov 22:17 UTC', 'The empty ascent stage is crashed into the Moon on purpose. The new seismometer rings for about 55 minutes.'],
    ],
    science: [
      'Precision landing: Apollo 11 had landed about 6 km long. For Apollo 12, tracking from Earth measured the downrange error during the descent and a corrected landing-site update was keyed into the computer, cutting the miss to a few hundred metres. Every later landing used the same technique.',
      'ALSEP-1 was the first nuclear-powered station on the Moon. A SNAP-27 radioisotope generator with about 3.8 kg of plutonium-238 oxide supplied about 70 W. When Intrepid’s 2.3-tonne ascent stage hit at about 1.7 km/s, the signal decayed slowly for nearly an hour. Dry, fractured lunar crust scatters seismic waves without damping them, unlike wet rock on Earth.',
      'The Surveyor 3 parts showed micrometeoroid pits and 31 months of ultraviolet and thermal cycling. The Streptococcus mitis found in the camera’s foam is now considered contamination after the camera was recovered, not microbes that survived on the Moon.',
    ],
    numbers: [['Lightning strikes', '2'], ['Miss distance', '≈ 160 m'], ['RTG power', '≈ 70 W'], ['Seismic ringing', '≈ 55 min']],
  },
  apollo14: {
    name: 'Apollo 14', agency: 'NASA', rocket: 'saturn5', to: 'moon',
    launch: { date: '31 Jan 1971', time: '21:03 UTC', vehicle: 'Saturn V (SA-509)', site: 'Launch Complex 39A, Kennedy Space Center, Florida', sky: 'day' },
    timeline: [
      ['T−0', 'Liftoff after a 40-minute hold for rain clouds, the first weather delay of a crewed Saturn V.'],
      ['T+3 h', 'The command module Kitty Hawk needs six tries to dock with the lunar module Antares. Debris on the capture latches is the likely cause.'],
      ['5 Feb, landing day', 'A loose ball of solder keeps triggering Antares’ abort switch. Programmer Don Eyles writes a patch, and the crew keys it in by hand to make the computer ignore the switch.'],
      ['Powered descent', 'The landing radar will not lock on until a circuit breaker is cycled. Without it the rules called for an abort.'],
      ['5 Feb 09:18 UTC', 'Landing at Fra Mauro, the target Apollo 13 never reached.'],
      ['6 Feb', 'Alan Shepard hits two golf balls with a six-iron head fixed to a sample-scoop handle.'],
    ],
    science: [
      'Fra Mauro was chosen to sample ejecta from the Imbrium basin impact. Its breccias put Imbrium at about 3.85–3.9 billion years. That date is central to the debated idea of a lunar “cataclysm”, a spike in impacts around 3.9 billion years ago.',
      'The Active Seismic Experiment fired a “thumper” (21 small charges) and mortar grenades to shoot a seismic refraction profile. The regolith there is about 8.5 m thick with P-wave speeds near 100 m/s, an extremely porous layer churned by impacts.',
      'The 100-cube laser reflector at Fra Mauro joined Apollo 11’s, so two reflectors far apart on the near side could be ranged. That separation lets the ranging measure the Moon’s libration, its slow wobble as seen from Earth.',
    ],
    numbers: [['Docking attempts', '6'], ['Regolith depth', '≈ 8.5 m'], ['Samples', '42.8 kg'], ['Surface stay', '33.5 h']],
  },
  apollo15: {
    name: 'Apollo 15', agency: 'NASA', rocket: 'saturn5', to: 'moon',
    launch: { date: '26 Jul 1971', time: '13:34 UTC', vehicle: 'Saturn V (SA-510)', site: 'Launch Complex 39A, Kennedy Space Center, Florida', sky: 'day' },
    timeline: [
      ['T−0', 'The first “J-mission”: an uprated Saturn V, launched to a lower parking orbit with fewer retro-rockets, carries an extended lunar module and a folded-up rover.'],
      ['T+2 h 50 min', 'Trans-lunar injection. Endeavour’s instrument bay holds mapping cameras, spectrometers and a small satellite to release around the Moon.'],
      ['30 Jul 22:16 UTC', 'Falcon lands at Hadley–Apennine after a steep 26° approach between mountains up to 4.5 km high.'],
      ['31 Jul', 'Scott and Irwin unfold the Lunar Roving Vehicle. Over three moonwalks they drive 27.8 km to Hadley Rille and the Apennine Front.'],
      ['1 Aug', 'They find the “Genesis Rock” (sample 15415), almost pure anorthosite from the Moon’s first crust, about 4 billion years old.'],
      ['2 Aug', 'Scott drops a hammer and a falcon feather together. They land at the same instant: Galileo’s principle, live on TV.'],
      ['7 Aug', 'One of the three main parachutes fails; Endeavour splashes down safely on two.'],
    ],
    science: [
      'Heat flow: probes drilled into the regolith measured about 21 mW/m², roughly a quarter of Earth’s average. That pointed to a crust rich in heat-producing potassium, thorium and uranium, a constraint on how the Moon formed. (Later work showed the site sits near the thorium-rich Procellarum region, so it is not globally typical.)',
      'Orbital science: the service module’s instrument bay carried X-ray and gamma-ray spectrometers that mapped surface chemistry from orbit, a laser altimeter, and a 36 kg subsatellite that measured the Moon’s mass concentrations (“mascons”) and particles and fields.',
      'Laser ranging: the 300-cube reflector returns about three times the light of the 100-cube arrays, so it gives most of the lunar laser ranging returns observatories have collected since.',
    ],
    numbers: [['Time on surface', '66 h 55 min'], ['Distance driven', '27.8 km'], ['Samples', '77 kg'], ['Heat flow', '≈ 21 mW/m²']],
  },
  apollo16: {
    name: 'Apollo 16', agency: 'NASA', rocket: 'saturn5', to: 'moon',
    launch: { date: '16 Apr 1972', time: '17:54 UTC', vehicle: 'Saturn V (SA-511)', site: 'Launch Complex 39A, Kennedy Space Center, Florida', sky: 'day' },
    timeline: [
      ['T−0', 'Liftoff for the only Apollo landing in the central lunar highlands.'],
      ['T+2 h 33 min', 'Trans-lunar injection. Flakes peeling off the lunar module’s skin worry the crew; it turns out to be harmless paint.'],
      ['20 Apr', 'Behind the Moon, a backup steering servo on Casper’s main engine oscillates. The landing waits nearly six hours while engineers confirm the engine is safe.'],
      ['21 Apr 02:23 UTC', 'Orion lands in the Descartes highlands.'],
      ['21 Apr', 'John Young’s boot snags the heat-flow cable and tears it from the central station; the experiment is lost.'],
      ['21–23 Apr', 'George Carruthers’ Far Ultraviolet Camera takes the first astronomical images from another world: Earth’s hydrogen glow, nebulae and star clouds.'],
    ],
    science: [
      'Before the mission, the smooth Cayley plains were mapped as volcanic. The samples were almost all impact breccias. That changed how geologists read smooth highland plains: many are basin ejecta and impact melt, not lava.',
      'The Lunar Surface Magnetometer measured the strongest crustal magnetic field of any Apollo site (a few hundred nanotesla). The Moon has no global field today, so magnetised crust implies an early core dynamo, an idea later supported by palaeomagnetic studies of Apollo samples.',
      'The Far Ultraviolet Camera/Spectrograph (gold-plated, 75 mm Schmidt optics, 105–160 nm) imaged Earth’s geocorona and the airglow bands near the magnetic equator, impossible from below the atmosphere.',
    ],
    numbers: [['Time on surface', '71 h 2 min'], ['Distance driven', '26.7 km'], ['Samples', '95.8 kg'], ['Landing delay', '≈ 6 h']],
  },
  apollo17: {
    name: 'Apollo 17', agency: 'NASA', rocket: 'saturn5', to: 'moon',
    launch: { date: '7 Dec 1972', time: '05:33 UTC', vehicle: 'Saturn V (SA-512)', site: 'Launch Complex 39A, Kennedy Space Center, Florida', sky: 'night' },
    timeline: [
      ['T−0 · 00:33 local', 'The only night launch of a Saturn V, after a 2 h 40 min hold caused by a countdown sequencer fault. The glow is seen hundreds of kilometres away.'],
      ['T+3 h 12 min', 'Trans-lunar injection.'],
      ['7 Dec', 'About five hours after launch the crew photographs the fully lit Earth: the “Blue Marble”.'],
      ['11 Dec 19:54 UTC', 'Challenger lands in the Taurus–Littrow valley, between massifs about 2 km high.'],
      ['11 Dec', 'Cernan knocks a fender off the rover. The fix is laminated maps and clamps, to stop a rooster tail of dust.'],
      ['12 Dec', 'Harrison Schmitt, the only geologist to walk on the Moon, finds orange soil at Shorty crater.'],
      ['14 Dec 22:54 UTC', 'Cernan, the last to leave: “We leave as we came and, God willing, as we shall return.”'],
    ],
    science: [
      'Orange soil (sample 74220) is made of glass beads quenched from lava fountains about 3.6 billion years ago. Their surfaces carry volatiles (zinc, sulfur, chlorine). In 2008 ion-microprobe analyses found up to about 46 ppm of water in the glass, and later work found ~600 ppm in melt inclusions, overturning the idea of a bone-dry Moon.',
      'The Lunar Surface Gravimeter was meant to sense gravitational waves through vibrations of the whole Moon. An error converting the balance masses between Earth and lunar gravity meant its beam could never be centred, so it never worked as designed.',
      'The traverse gravimeter and seismic profiling experiments mapped the valley floor: mare basalt about 1.4 km thick fills a graben between the massifs.',
    ],
    numbers: [['Time on surface', '75 h'], ['Distance driven', '35.7 km'], ['Samples', '110.5 kg'], ['Rover top speed', '≈ 18 km/h']],
  },

  // ================================================================== SURVEYOR + RANGER
  surveyor1: {
    name: 'Surveyor 1', agency: 'NASA / JPL', rocket: 'atlasCentaur', to: 'moon',
    launch: { date: '30 May 1966', time: '14:41 UTC', vehicle: 'Atlas-Centaur (AC-10)', site: 'Launch Complex 36A, Cape Kennedy', sky: 'day' },
    timeline: [
      ['T−0', 'The first operational flight of Centaur, America’s first liquid-hydrogen rocket stage. It sends Surveyor 1 straight toward the Moon with no parking orbit.'],
      ['T+16 h', 'One mid-course correction. Surveyor was so accurate that a second was not needed.'],
      ['2 Jun 06:14 UTC', 'About 76 km up, radar triggers the solid retro-rocket. In about 40 seconds it removes roughly 2.6 km/s.'],
      ['2 Jun 06:17 UTC', 'Three verniers fly the last stretch under radar control. At 4 m they cut off and Surveyor drops onto the Ocean of Storms at about 3 m/s.'],
      ['Jun–Jul 1966', '11,240 TV pictures. The ground is firm enough for an astronaut’s boot and a lunar module.'],
    ],
    science: SURVEYOR_SCIENCE(),
    numbers: [['Launch mass', '995 kg'], ['Landed mass', '≈ 294 kg'], ['Images', '11,240'], ['Touchdown', '≈ 3 m/s']],
  },
  surveyor3: {
    name: 'Surveyor 3', agency: 'NASA / JPL', rocket: 'atlasCentaur', to: 'moon',
    launch: { date: '17 Apr 1967', time: '07:05 UTC', vehicle: 'Atlas-Centaur (AC-12)', site: 'Launch Complex 36B, Cape Kennedy', sky: 'night' },
    timeline: [
      ['T−0', 'First Surveyor launched by way of a parking orbit: Centaur restarts in space, a capability every later planetary mission relied on.'],
      ['T+25 min', 'Centaur’s second burn sends Surveyor 3 toward the Moon.'],
      ['20 Apr 00:04 UTC', 'The radar locks onto bright rocks and the verniers fail to shut off. Surveyor 3 touches down, bounces about 10 m, then 3 m, then settles.'],
      ['Apr 1967', 'Its scoop digs trenches up to 17.5 cm deep, the first soil-mechanics experiment on another world.'],
      ['24 Apr 1967', 'It photographs an eclipse of the Sun by Earth, seen from the Moon.'],
      ['Nov 1969', 'Apollo 12 lands within walking distance and brings its camera home.'],
    ],
    science: SURVEYOR_SCIENCE(['Surface sampler: a pantograph arm with a scoop, driven by motors and monitored through motor current, measured bearing strength and cohesion directly. Its trenches showed a fine-grained, slightly cohesive regolith that stood in vertical walls.']),
    numbers: [['Bounces', '2'], ['Trench depth', '17.5 cm'], ['Images', '6,326'], ['Visited by people', 'Nov 1969']],
  },
  surveyor5: {
    name: 'Surveyor 5', agency: 'NASA / JPL', rocket: 'atlasCentaur', to: 'moon',
    launch: { date: '8 Sep 1967', time: '07:57 UTC', vehicle: 'Atlas-Centaur (AC-13)', site: 'Launch Complex 36B, Cape Kennedy', sky: 'night' },
    timeline: [
      ['T−0', 'Liftoff toward Mare Tranquillitatis, a candidate Apollo landing zone.'],
      ['8 Sep', 'After the mid-course burn, a valve leaks helium from the verniers’ pressurising system.'],
      ['9–10 Sep', 'Engineers redesign the landing in hours: burn the retro-rocket later and lower, and rely on the verniers with less pressure.'],
      ['11 Sep 00:46 UTC', 'Landing on the inner slope of a small crater.'],
      ['Sep 1967', 'An alpha-scattering instrument makes the first chemical analysis of lunar soil: basalt.'],
    ],
    science: SURVEYOR_SCIENCE(['Alpha-scattering spectrometer (Anthony Turkevich, University of Chicago): curium-242 sources bombarded the soil with alpha particles; the energies of back-scattered alphas and emitted protons identified oxygen, silicon, aluminium, iron and more. The result matched terrestrial basalt, the first proof that the maria are volcanic.', 'Surveyor 5 also fired its verniers on the surface to see how rocket exhaust erodes regolith, data later used for Apollo.']),
    numbers: [['Leak found', 'In flight'], ['Images', '19,118'], ['First soil analysis', 'Basaltic']],
  },
  surveyor6: {
    name: 'Surveyor 6', agency: 'NASA / JPL', rocket: 'atlasCentaur', to: 'moon',
    launch: { date: '7 Nov 1967', time: '07:39 UTC', vehicle: 'Atlas-Centaur (AC-14)', site: 'Launch Complex 36B, Cape Kennedy', sky: 'night' },
    timeline: [
      ['T−0', 'Liftoff for Sinus Medii, near the centre of the Moon’s near side.'],
      ['10 Nov 01:01 UTC', 'Soft landing.'],
      ['17 Nov', 'The verniers fire for 2.5 s. Surveyor 6 rises about 4 m and settles 2.5 m west: the first liftoff from the Moon.'],
      ['Nov 1967', 'Photos from two positions give stereo pictures, and the old footpad prints show how the soil compresses.'],
    ],
    science: SURVEYOR_SCIENCE(['The hop was a test of restarting engines on the Moon and a way to get stereo baselines. Comparing the original footprints with the new ones gave the soil’s bearing strength and showed how far exhaust blows regolith.']),
    numbers: [['Hop height', '≈ 4 m'], ['Hop distance', '2.5 m'], ['Images', '30,027']],
  },
  surveyor7: {
    name: 'Surveyor 7', agency: 'NASA / JPL', rocket: 'atlasCentaur', to: 'moon',
    launch: { date: '7 Jan 1968', time: '06:30 UTC', vehicle: 'Atlas-Centaur (AC-15)', site: 'Launch Complex 36A, Cape Kennedy', sky: 'night' },
    timeline: [
      ['T−0', 'The last Surveyor. With Apollo’s sites already scouted, it goes for pure science: the highlands near Tycho.'],
      ['10 Jan 01:05 UTC', 'Landing 29 km north of Tycho’s rim, on rough ejecta.'],
      ['Jan 1968', 'The scoop frees the stuck alpha-scattering instrument and moves it onto rocks.'],
      ['19–20 Jan 1968', 'Its camera spots argon-laser beams fired from Kitt Peak and Table Mountain observatories, the first laser light seen from the Moon.'],
    ],
    science: SURVEYOR_SCIENCE(['Highland chemistry: compared with the maria, the soil near Tycho had more calcium and aluminium and less iron, a first hint that the highlands are anorthosite (plagioclase-rich rock floating on an early magma ocean).']),
    numbers: [['Site', 'Tycho ejecta'], ['Images', '21,091'], ['Laser beams seen', '1 W from Earth']],
  },
  ranger7: {
    name: 'Ranger 7', agency: 'NASA / JPL', rocket: 'atlasAgena', to: 'moon',
    launch: { date: '28 Jul 1964', time: '16:50 UTC', vehicle: 'Atlas LV-3 Agena B', site: 'Launch Complex 12, Cape Kennedy', sky: 'day' },
    timeline: [
      ['T−0', 'After six failed Rangers, NASA tries again. Ranger 6’s cameras had been killed by an electrical arc during staging.'],
      ['T+~30 min', 'The Agena stage restarts from a parking orbit and sends Ranger 7 toward the Moon.'],
      ['29 Jul', 'Mid-course correction aims it at Mare Nubium.'],
      ['31 Jul 13:08 UTC', 'Seventeen minutes before impact, six television cameras switch on.'],
      ['31 Jul 13:25 UTC', 'Impact at 2.62 km/s. The last frame, from about 500 m up, shows craters less than a metre across.'],
    ],
    science: [
      'Imaging: six RCA vidicon cameras, two full-scan “F” channels (wide and narrow) and four partial-scan “P” channels, sent analogue video over an S-band link to Goldstone, where it was recorded on film. Resolution improved about a thousand-fold over the best telescopic images.',
      'Results: the crater size-frequency distribution continues to metre scale. The maria are saturated with small craters and their debris, the first direct evidence that the surface is a churned regolith, not bare lava.',
    ],
    numbers: [['Impact speed', '2.62 km/s'], ['Pictures', '4,316'], ['Best resolution', '< 1 m']],
  },

  // ================================================================== MARS
  viking1: {
    name: 'Viking 1', agency: 'NASA', rocket: 'titan3e', to: 'mars',
    launch: { date: '20 Aug 1975', time: '21:22 UTC', vehicle: 'Titan IIIE / Centaur', site: 'Launch Complex 41, Cape Canaveral', sky: 'dusk' },
    timeline: [
      ['T−0', 'Two solid boosters and a Titan core lift the heaviest planetary spacecraft yet flown: orbiter and lander together, about 3.5 tonnes.'],
      ['T+~1 h', 'Centaur sends Viking 1 onto a ten-month transfer to Mars.'],
      ['19 Jun 1976', 'Mars orbit insertion. Orbiter images show the planned 4 July landing site is too rough.'],
      ['20 Jul 1976 11:53 UTC', 'After a month of site hunting, the lander touches down in Chryse Planitia, seven years to the day after Apollo 11.'],
      ['Jul–Nov 1976', 'Three biology experiments look for life. One gives a puzzling positive result while the organic analyser finds nothing.'],
      ['Nov 1982', 'A faulty command overwrites the antenna-pointing software. The lander falls silent after 6 years.'],
    ],
    science: VIKING_SCIENCE(),
    numbers: [['Lander mass (landed)', '≈ 600 kg'], ['Power', '2 × 35 W RTG'], ['Operated', '6 yr 116 d'], ['Organics found', 'None (ppb level)']],
  },
  viking2: {
    name: 'Viking 2', agency: 'NASA', rocket: 'titan3e', to: 'mars',
    launch: { date: '9 Sep 1975', time: '18:39 UTC', vehicle: 'Titan IIIE / Centaur', site: 'Launch Complex 41, Cape Canaveral', sky: 'day' },
    timeline: [
      ['T−0', 'The twin of Viking 1 leaves 20 days later.'],
      ['T+~1 h', 'Centaur burn to the Mars transfer orbit.'],
      ['7 Aug 1976', 'Mars orbit insertion.'],
      ['3 Sep 1976 22:58 UTC', 'Landing in Utopia Planitia, farther north to look for water. One footpad rests on a rock, so the lander is tilted 8°.'],
      ['Winter 1977', 'Its cameras photograph thin frost on the ground.'],
      ['11 Apr 1980', 'Its batteries fail.'],
    ],
    science: VIKING_SCIENCE(['Seismology: Viking 1’s seismometer never unlocked, so Viking 2’s was the only one working on Mars until InSight. Mounted on the lander deck, it mostly recorded wind; one event on sol 80 may have been a marsquake.']),
    numbers: [['Tilt', '8.2°'], ['Operated', '3 yr 7 mo'], ['Latitude', '47.6° N']],
  },
  pathfinder: {
    name: 'Mars Pathfinder', agency: 'NASA / JPL', rocket: 'delta2', to: 'mars',
    launch: { date: '4 Dec 1996', time: '06:58 UTC', vehicle: 'Delta II 7925', site: 'Space Launch Complex 17B, Cape Canaveral', sky: 'night' },
    timeline: [
      ['T−0', 'NASA’s “faster, better, cheaper” test: a whole Mars landing for under $265 million.'],
      ['T+~1 h', 'Third-stage burn: on a seven-month transfer to Mars.'],
      ['4 Jul 1997 16:52 UTC', 'Direct entry at 7.3 km/s with no stop in orbit: heat shield, parachute, then retro-rockets fire while 24 airbag lobes inflate.'],
      ['4 Jul 1997 16:57 UTC', 'The airbag ball hits the ground, bounces about 15 m high, and keeps bouncing and rolling before it stops in Ares Vallis.'],
      ['6 Jul 1997', 'Sojourner rolls down the ramp, the first wheels on Mars.'],
      ['Jul 1997', 'The lander keeps resetting itself: a “priority inversion” bug. Engineers send a patch from Earth that turns on priority inheritance.'],
      ['27 Sep 1997', 'Last transmission.'],
    ],
    science: [
      'Entry, descent and landing: an aeroshell for the hypersonic phase, a supersonic disk-gap-band parachute, and solid retro-rockets (RAD) fired about 98 m up. The landing loads were taken by Vectran airbags, an architecture that Spirit and Opportunity reused.',
      'The bug: in VxWorks, a low-priority meteorological task held a shared bus mutex. Medium-priority tasks preempted it, so the high-priority bus manager could not run, and a watchdog reset the computer. Turning on priority inheritance for that mutex, done remotely, fixed it. It is still a textbook case in real-time systems.',
      'Results: the rocks at Ares Vallis were rounded and conglomerate-like, consistent with a catastrophic flood. The soil was rich in sulfur, and the rock “Barnacle Bill” has an andesite-like composition, a hint of evolved crust. Tracking the lander’s radio pinned down the polar moment of inertia, consistent with a dense metallic core.',
    ],
    numbers: [['Mission cost', '< $265 M'], ['Entry speed', '7.3 km/s'], ['Lander images', '16,500'], ['Rover images', '550']],
  },
  'mer-a': {
    name: 'Spirit (MER-A)', agency: 'NASA / JPL', rocket: 'delta2', to: 'mars',
    launch: { date: '10 Jun 2003', time: '17:58 UTC', vehicle: 'Delta II 7925', site: 'Space Launch Complex 17A, Cape Canaveral', sky: 'day' },
    timeline: [
      ['T−0', 'First of two identical rovers, launched three weeks apart to catch the 2003 opening to Mars.'],
      ['T+~1 h', 'The third stage spins up and burns: seven months to Mars.'],
      ['4 Jan 2004 04:35 UTC', 'Airbag landing in Gusev crater, picked because it may once have held a lake.'],
      ['21 Jan 2004 (sol 18)', 'Spirit falls silent, rebooting in a loop. Its flash memory is overloaded with files. Engineers reformat it from 170 million km away.'],
      ['2007', 'Its jammed front wheel scrapes up almost pure silica: hot-spring or steam-vent deposits.'],
      ['May 2009', 'Stuck in a sand trap named “Troy”.'],
      ['22 Mar 2010', 'Last signal, going into the Martian winter.'],
    ],
    science: MER_SCIENCE(['Gusev results: the plains were basalt, not lake sediment, a disappointment. The Columbia Hills told a wetter story: goethite and carbonate-rich outcrops (Comanche), the explosive volcanic layers of Home Plate, and opaline silica of about 90% that formed in hydrothermal systems, environments that on Earth teem with microbes.']),
    numbers: [['Planned', '90 sols'], ['Lasted', '2,208 sols'], ['Driven', '7.73 km'], ['Mass', '185 kg']],
  },
  'mer-b': {
    name: 'Opportunity (MER-B)', agency: 'NASA / JPL', rocket: 'delta2', to: 'mars',
    launch: { date: '7 Jul 2003', time: '03:18 UTC', vehicle: 'Delta II 7925H (Heavy)', site: 'Space Launch Complex 17B, Cape Canaveral', sky: 'night' },
    timeline: [
      ['T−0', 'The second rover leaves on a Delta II Heavy with larger strap-on boosters, since the planets were farther apart by then.'],
      ['T+~1 h', 'Seven months to Mars.'],
      ['25 Jan 2004 05:05 UTC', 'After bouncing across Meridiani Planum it rolls into a 22 m crater, Eagle: a “hole in one” that puts bedrock right next to it.'],
      ['Mar 2004', 'Hematite “blueberries” and the mineral jarosite: water once soaked these rocks.'],
      ['2011', 'Reaches the rim of 22 km-wide Endeavour crater after a three-year drive.'],
      ['2015', 'Passes a marathon distance, 42.2 km.'],
      ['10 Jun 2018', 'A dust storm that covers the planet blocks the Sun, and the solar-powered rover goes quiet.'],
    ],
    science: MER_SCIENCE(['Meridiani results: the outcrop is sulfate-rich sandstone with cross-bedding from flowing water. Jarosite only forms in acidic water (pH below about 4). The hematite spherules are concretions grown in groundwater. At Endeavour’s rim, Opportunity found gypsum veins (Homestake) and clay-bearing rocks (Esperance) altered by water of near-neutral pH, a more habitable chemistry than the acid brines of the plains.']),
    numbers: [['Planned', '90 sols'], ['Lasted', '5,111 sols'], ['Driven', '45.16 km'], ['Storm optical depth', '≈ 10.8']],
  },
  phoenix: {
    name: 'Phoenix', agency: 'NASA / University of Arizona', rocket: 'delta2', to: 'mars',
    launch: { date: '4 Aug 2007', time: '09:26 UTC', vehicle: 'Delta II 7925', site: 'Space Launch Complex 17A, Cape Canaveral', sky: 'dawn' },
    timeline: [
      ['T−0', 'Built from a lander cancelled in 2000, hence the name: it rose from the ashes.'],
      ['T+~1 h', 'Ten months to Mars.'],
      ['25 May 2008 23:38 UTC', 'The first legged landing on Mars since Viking, using pulsed engines, at 68° N in the arctic.'],
      ['Jun 2008', 'Bright chunks in a trench nicknamed “Dodo-Goldilocks” vanish within four days: water ice, a few centimetres down.'],
      ['Jul 2008', 'Its wet-chemistry lab finds perchlorate in the soil. Its lidar watches snow fall from clouds and evaporate before it lands.'],
      ['2 Nov 2008', 'Contact lost as winter comes. Carbon-dioxide frost later crushes its solar panels.'],
    ],
    science: [
      'Ice: the robotic arm reached hard ice-cemented ground 5–18 cm down. Sublimation rates matched water ice, not CO₂, and the TEGA oven/mass spectrometer confirmed water vapour when a sample was heated.',
      'Chemistry: the soil is mildly alkaline (pH ≈ 7.7), with about 0.5–1% perchlorate (ClO₄⁻) and some calcium carbonate. Perchlorate lowers the freezing point of brines and, when heated, breaks down organics into chlorinated compounds. That forced a reassessment of Viking’s “no organics” result.',
      'Atmosphere: the lidar showed water-ice clouds dropping fall streaks (virga) in the night, the first direct evidence of precipitation on Mars.',
    ],
    numbers: [['Latitude', '68.2° N'], ['Ice depth', '5–18 cm'], ['Perchlorate', '0.5–1 %'], ['Soil pH', '≈ 7.7']],
  },
  insight: {
    name: 'InSight', agency: 'NASA / JPL, with CNES and DLR', rocket: 'atlasV401', to: 'mars',
    launch: { date: '5 May 2018', time: '11:05 UTC', vehicle: 'Atlas V 401', site: 'Space Launch Complex 3E, Vandenberg, California', sky: 'night' },
    timeline: [
      ['T−0 · 04:05 local', 'The first interplanetary launch from America’s west coast, through thick fog. Two briefcase-sized CubeSats, MarCO-A and B, ride along.'],
      ['T+~1 h', 'Centaur’s second burn: six and a half months to Mars.'],
      ['26 Nov 2018 19:53 UTC', 'Landing in Elysium Planitia, relayed live by the MarCO CubeSats, the first deep-space CubeSats.'],
      ['19 Dec 2018', 'The robotic arm places the SEIS seismometer on the ground, later covered by its wind and thermal shield.'],
      ['2019–2021', 'The heat-flow “mole” cannot dig in: the soil gives it too little friction.'],
      ['4 May 2022', 'Marsquake S1222a, magnitude 4.7, the largest ever recorded on Mars.'],
      ['15 Dec 2022', 'Last contact, its solar panels coated in dust.'],
    ],
    science: [
      'Seismology: the French-built SEIS (very-broadband plus short-period sensors, sensitive to motions smaller than a hydrogen atom) recorded 1,319 marsquakes. Most are in Cerberus Fossae, a young fault system. Reflected phases (ScS, SKS) gave the first measurement of another planet’s core. It was about 1,830 km in radius and liquid. Analyses in 2023 suggest a ~150 km molten silicate layer above a smaller, denser iron core.',
      'Crust and mantle: receiver functions showed a layered crust 24–72 km thick under the lander. Seismic detection of meteoroid impacts, confirmed in orbital images, included one in December 2021 that dug up subsurface water ice at low latitude.',
      'Rotation (RISE): X-band Doppler tracking measured Mars’s nutation, independently constraining the core. Heat flow (HP3) failed: the cohesive, low-friction duricrust gave the hammer nothing to push against, a lesson for future drills.',
    ],
    numbers: [['Marsquakes', '1,319'], ['Largest', 'M 4.7'], ['Core radius', '≈ 1,650–1,830 km'], ['Crust', '24–72 km']],
  },
  mars2020: {
    name: 'Mars 2020 (Perseverance & Ingenuity)', agency: 'NASA / JPL', rocket: 'atlasV541', to: 'mars',
    launch: { date: '30 Jul 2020', time: '11:50 UTC', vehicle: 'Atlas V 541', site: 'Space Launch Complex 41, Cape Canaveral', sky: 'day' },
    timeline: [
      ['T−0', 'Four solid boosters and an Atlas core launch Perseverance, with a 1.8 kg helicopter folded under its belly.'],
      ['T+~1 h', 'Centaur’s second burn: seven months to Mars, in the middle of a pandemic.'],
      ['18 Feb 2021 20:55 UTC', 'Terrain-relative navigation steers the sky-crane landing away from hazards in Jezero crater.'],
      ['19 Apr 2021', 'Flight 1: Ingenuity hovers 3 m up for 39 seconds, the first powered flight on another planet.'],
      ['2021–2023', 'It flies ahead to scout for the rover: up to 24 m high and 10 m/s.'],
      ['18 Jan 2024', 'Flight 72. Over featureless sand, its navigation camera loses track and the rotor blades are damaged on landing.'],
    ],
    science: [
      'Aerodynamics: Mars’s air is about 1% as dense as Earth’s (≈ 0.015–0.02 kg/m³). Ingenuity’s two counter-rotating 1.2 m rotors spin at about 2,400–2,700 rpm, with tips near Mach 0.7. The low Reynolds number made the blades behave unlike any helicopter on Earth.',
      'Avionics: a Qualcomm Snapdragon 801 smartphone processor running Linux and JPL’s open-source F´ flight software. It navigated by visual odometry from a downward camera, fused with an inertial unit and a laser altimeter. Without GPS, featureless terrain is its weak point, and that is what ended the mission.',
      'Legacy: 72 flights, about 129 minutes and 17 km. It showed aerial scouting can raise rover productivity, and it shaped the design of future Mars helicopters.',
    ],
    numbers: [['Mass', '1.8 kg'], ['Rotor', '1.2 m, ~2,500 rpm'], ['Flights', '72'], ['Max altitude', '24 m']],
  },

  // ================================================================== DEEP SPACE
  dawn: {
    name: 'Dawn', agency: 'NASA / JPL', rocket: 'delta2', to: 'ceres',
    launch: { date: '27 Sep 2007', time: '11:34 UTC', vehicle: 'Delta II 7925H', site: 'Space Launch Complex 17B, Cape Canaveral', sky: 'day' },
    timeline: [
      ['T−0', 'A Delta II Heavy starts Dawn on a decade of ion propulsion.'],
      ['T+~1 h', 'The xenon ion engines start their long, gentle thrust.'],
      ['Feb 2009', 'A Mars gravity assist bends its path toward the asteroid belt.'],
      ['Jul 2011', 'In orbit around Vesta, the second-largest asteroid.'],
      ['Mar 2015', 'In orbit around Ceres, the first spacecraft to orbit two worlds beyond Earth.'],
      ['1 Nov 2018', 'Out of hydrazine for pointing, it goes silent. It will keep orbiting Ceres for decades.'],
    ],
    science: [
      'Propulsion: three NSTAR-derived xenon ion thrusters (Isp ≈ 3,100 s, max thrust ≈ 92 mN, about the weight of a sheet of paper) gave a total of about 11 km/s of its own Δv, more than any spacecraft before it. That made orbiting two bodies possible; a chemical rocket would have needed many times the propellant.',
      'Vesta: a differentiated protoplanet with an iron core. The 500 km Rheasilvia basin and its 22 km central peak tie Vesta to the HED meteorites found on Earth. Ceres: a dwarf planet rich in ammoniated clays (hinting it formed farther out). Bright salts in Occator crater are sodium carbonate and ammonium chloride from a deep brine reservoir, and Ahuna Mons is a cryovolcano.',
    ],
    numbers: [['Ion Δv', '≈ 11 km/s'], ['Isp', '≈ 3,100 s'], ['Thrust', '≈ 92 mN'], ['Worlds orbited', '2']],
  },
  near: {
    name: 'NEAR Shoemaker', agency: 'NASA / Johns Hopkins APL', rocket: 'delta2', to: 'eros',
    launch: { date: '17 Feb 1996', time: '20:43 UTC', vehicle: 'Delta II 7925-8', site: 'Space Launch Complex 17B, Cape Canaveral', sky: 'dusk' },
    timeline: [
      ['T−0', 'The first mission of NASA’s low-cost Discovery programme.'],
      ['27 Jun 1997', 'Flyby of asteroid 253 Mathilde: so porous it may be a rubble pile.'],
      ['20 Dec 1998', 'The orbit-insertion burn aborts. The spacecraft tumbles and is out of contact for 27 hours. It flies past Eros and loops around the Sun for a year.'],
      ['14 Feb 2000', 'Second try: the first spacecraft to orbit an asteroid.'],
      ['12 Feb 2001', 'Never built to land, it touches down at about 1.6 m/s and keeps working on the surface for two more weeks.'],
    ],
    science: [
      'Eros is a 34 × 11 × 11 km S-type asteroid with a bulk density of 2.67 g/cm³. It is coherent but fractured, not a loose rubble pile. Its X-ray and gamma-ray spectra match ordinary chondrites, the most common meteorites, darkened by space weathering.',
      'The surface has flat “ponds” of fine dust in crater floors, probably shaken or electrostatically moved, and is strewn with boulders. Mathilde, by contrast, has a density of about 1.3 g/cm³, so roughly half of it is empty space.',
    ],
    numbers: [['Eros size', '34 × 11 × 11 km'], ['Density', '2.67 g/cm³'], ['Landing speed', '≈ 1.6 m/s']],
  },
  kepler: {
    name: 'Kepler', agency: 'NASA / Ball Aerospace', rocket: 'delta2', to: 'kepler',
    launch: { date: '7 Mar 2009', time: '03:49 UTC', vehicle: 'Delta II 7925-10L', site: 'Space Launch Complex 17B, Cape Canaveral', sky: 'night' },
    timeline: [
      ['T−0 · 22:49 local', 'A night launch for a telescope built to stare at one patch of sky.'],
      ['T+~1 h', 'Released into an orbit around the Sun, trailing slowly behind Earth.'],
      ['May 2009', 'Science begins on 150,000 stars in Cygnus and Lyra.'],
      ['2012–2013', 'Two of four reaction wheels fail; the fixed stare is lost.'],
      ['2014–2018', 'K2: sunlight pressure balances the telescope along the ecliptic.'],
      ['30 Oct 2018', 'Out of fuel. More than 2,600 planets confirmed.'],
    ],
    science: [
      'Instrument: a 0.95 m Schmidt telescope (1.4 m primary mirror) with 42 CCDs (95 megapixels) covering 115 square degrees. Its photometric precision of about 20–30 ppm over 6.5 hours (for a 12th-magnitude star) could detect the 84 ppm dip of an Earth crossing a Sun-like star.',
      'Results: small planets outnumber giants. Super-Earths and sub-Neptunes, absent from our solar system, are the most common planets. A “radius valley” near 1.5–2 Earth radii separates rocky worlds from gas-rich ones, likely carved by atmospheric loss. Highlights include Kepler-186f, the first Earth-size planet in a habitable zone, and Kepler-16b, which orbits two stars. Its photometry also turned stellar oscillations into precise ages and radii (asteroseismology).',
    ],
    numbers: [['Aperture', '0.95 m'], ['Detector', '95 MP'], ['Planets confirmed', '2,600+'], ['Orbit', '372.5 days']],
  },
  galileo: {
    name: 'Galileo', agency: 'NASA / JPL', rocket: 'shuttle', to: 'jupiter',
    launch: { date: '18 Oct 1989', time: '16:53 UTC', vehicle: 'Space Shuttle Atlantis (STS-34) + IUS', site: 'Launch Complex 39B, Kennedy Space Center', sky: 'day' },
    timeline: [
      ['T−0', 'Atlantis carries Galileo to orbit in its payload bay. Protesters had sued to stop the launch over its plutonium power sources.'],
      ['T+6 h', 'Released from the shuttle, the Inertial Upper Stage fires it out of Earth orbit.'],
      ['1990–1992', 'Gravity assists from Venus and twice from Earth. The 4.8 m high-gain antenna refuses to open: 3 of its 18 ribs are stuck.'],
      ['1991–1993', 'The first asteroid flybys: Gaspra, then Ida, which has a moon of its own (Dactyl).'],
      ['Jul 1994', 'It has the only direct view of comet Shoemaker–Levy 9 hitting Jupiter.'],
      ['7 Dec 1995', 'Its probe plunges into Jupiter at 47.4 km/s and survives 58 minutes.'],
      ['21 Sep 2003', 'Deliberately crashed into Jupiter so it can never contaminate Europa.'],
    ],
    science: [
      'Antenna rescue: with only the low-gain antenna, data rates fell from a planned 134 kbit/s to tens of bits per second. New flight software for compression and arrayed DSN antennas still returned about 70% of the planned science.',
      'Probe: it entered at 47.4 km/s, the fastest atmospheric entry ever, and its heat shield lost about half its mass. It sampled down to about 22 bar but hit a dry “5-micron hot spot”, finding less water and fewer clouds than expected, and measured Jupiter’s helium and noble-gas abundances.',
      'Moons: induced magnetic fields at Europa (and probably Callisto and Ganymede) showed salty liquid-water oceans beneath the ice. Ganymede has its own magnetic field. Io’s volcanoes reach above 1,600 K, hotter than any active lava on Earth today.',
    ],
    numbers: [['Probe entry', '47.4 km/s'], ['Probe survived', '58 min'], ['Data return', '≈ 70 % of plan'], ['Orbits of Jupiter', '35']],
  },
  pioneer10: {
    name: 'Pioneer 10', agency: 'NASA / Ames', rocket: 'atlasCentaur', to: 'pioneer10',
    launch: { date: '3 Mar 1972', time: '01:49 UTC', vehicle: 'Atlas-Centaur + TE364-4', site: 'Launch Complex 36A, Cape Kennedy', sky: 'night' },
    timeline: [
      ['T−0', 'The fastest launch yet: with a solid third stage it reaches 14 km/s and passes the Moon’s orbit in 11 hours.'],
      ['Jul 1972', 'The first spacecraft to enter the asteroid belt, which turns out to be safe to cross.'],
      ['4 Dec 1973', 'First Jupiter flyby, 132,000 km above the clouds. Radiation far worse than predicted triggers false commands.'],
      ['13 Jun 1983', 'It passes Neptune’s orbit and leaves the planets behind.'],
      ['23 Jan 2003', 'Last signal, from 80 AU, too weak to hear after that.'],
    ],
    science: PIONEER_SCIENCE(),
    numbers: [['Jupiter flyby', '132,000 km'], ['Last signal', '80 AU'], ['Power at launch', '≈ 155 W'], ['Heading', 'Aldebaran']],
  },
  pioneer11: {
    name: 'Pioneer 11', agency: 'NASA / Ames', rocket: 'atlasCentaur', to: 'pioneer11',
    launch: { date: '6 Apr 1973', time: '02:11 UTC', vehicle: 'Atlas-Centaur + TE364-4', site: 'Launch Complex 36B, Cape Kennedy', sky: 'night' },
    timeline: [
      ['T−0', 'The twin of Pioneer 10, sent a year later.'],
      ['3 Dec 1974', 'It swings just 43,000 km over Jupiter, using its gravity to head for Saturn.'],
      ['1 Sep 1979', 'The first spacecraft at Saturn. It finds the F ring and nearly hits a small moon.'],
      ['30 Sep 1995', 'Out of power, it falls silent.'],
    ],
    science: PIONEER_SCIENCE(['At Saturn it mapped the magnetic field (aligned with the spin axis to within 1°, unlike any other planet), measured Titan’s temperature and found the F ring. It also tested the route through the ring plane that Voyager 2 later used.']),
    numbers: [['Jupiter flyby', '43,000 km'], ['Saturn flyby', '21,000 km'], ['Last contact', '1995'], ['Heading', 'Aquila']],
  },
  voyager1: {
    name: 'Voyager 1', agency: 'NASA / JPL', rocket: 'titan3e', to: 'voyager1',
    launch: { date: '5 Sep 1977', time: '12:56 UTC', vehicle: 'Titan IIIE / Centaur', site: 'Launch Complex 41, Cape Canaveral', sky: 'day' },
    timeline: [
      ['T−0', 'Launched 16 days after its twin, on a faster path, so it reaches Jupiter first.'],
      ['T+~1 h', 'A solid kick stage completes the escape: 1,722 kg of spacecraft with 3 plutonium generators.'],
      ['5 Mar 1979', 'At Jupiter, engineer Linda Morabito spots a volcanic plume on Io, the first active volcanism seen beyond Earth.'],
      ['12 Nov 1980', 'A close Titan flyby (6,490 km) bends its path out of the plane of the planets for good.'],
      ['14 Feb 1990', 'From 6 billion km it turns back for a “family portrait”, including the Pale Blue Dot.'],
      ['25 Aug 2012', 'It crosses the heliopause at 121.6 AU: the first human-made object in interstellar space.'],
      ['2023–2024', 'A failed memory chip garbles its data. Engineers move the code elsewhere in memory, across 24 billion km.'],
    ],
    science: VOYAGER_SCIENCE(['Interstellar medium: Voyager 1’s plasma science instrument had failed in 1980, so the heliopause crossing was proven indirectly. Solar storms set the surrounding plasma ringing, and the plasma-wave instrument measured the oscillation frequency. That gave an electron density about 40× higher than inside the heliosphere, the signature of interstellar plasma.']),
    numbers: [['Speed', '≈ 17 km/s'], ['Heliopause', '121.6 AU (2012)'], ['RTG power at launch', '≈ 470 W'], ['Light time today', '> 22 h']],
  },
  voyager2: {
    name: 'Voyager 2', agency: 'NASA / JPL', rocket: 'titan3e', to: 'voyager2',
    launch: { date: '20 Aug 1977', time: '14:29 UTC', vehicle: 'Titan IIIE / Centaur', site: 'Launch Complex 41, Cape Canaveral', sky: 'day' },
    timeline: [
      ['T−0', 'Launched first, on a slower path that can reach all four giant planets, an alignment that happens about once every 175 years.'],
      ['9 Jul 1979', 'Jupiter.'],
      ['26 Aug 1981', 'Saturn: its camera platform jams briefly behind the planet.'],
      ['24 Jan 1986', 'Uranus, the only visit ever: 10 new moons and a magnetic field tilted 59°.'],
      ['25 Aug 1989', 'Neptune: winds over 2,000 km/h, the Great Dark Spot, and nitrogen geysers on Triton.'],
      ['5 Nov 2018', 'It crosses the heliopause at about 119 AU.'],
      ['Aug 2023', 'A wrong command tilts its antenna 2° away from Earth. A high-power “shout” from Canberra turns it back.'],
    ],
    science: VOYAGER_SCIENCE(['Ice giants: Uranus’s and Neptune’s magnetic fields are tilted (59° and 47°) and offset from their centres. That suggests dynamos in thin, electrically conducting shells (water–ammonia oceans), not deep cores. Triton’s retrograde orbit marks it as a captured Kuiper-belt object, and its geysers are driven by sunlight on nitrogen ice.', 'Voyager 2’s plasma instrument still worked, so it measured the heliopause directly: the solar-wind flow dropped sharply and interstellar plasma took over.']),
    numbers: [['Planets visited', '4'], ['Neptune flyby', '≈ 4,950 km'], ['Heliopause', '≈ 119 AU (2018)'], ['Speed', '≈ 15.4 km/s']],
  },

  // ================================================================== ISRO
  chandrayaan1: {
    name: 'Chandrayaan-1', agency: 'ISRO', rocket: 'pslvxl', to: 'moon',
    launch: { date: '22 Oct 2008', time: '00:52 UTC (06:22 IST)', vehicle: 'PSLV-C11 (PSLV-XL)', site: 'Second Launch Pad, Satish Dhawan Space Centre, Sriharikota', sky: 'dawn' },
    timeline: [
      ['T−0', 'India’s first mission beyond Earth orbit, on the first flight of the PSLV-XL with its six stretched strap-on boosters.'],
      ['T+18 min', 'Released into an elliptical Earth orbit. Five engine burns over two weeks raise its apogee toward the Moon.'],
      ['8 Nov 2008', 'Lunar orbit insertion.'],
      ['14 Nov 2008 15:01 UTC', 'The 35 kg Moon Impact Probe falls for 25 minutes and hits near Shackleton crater at the south pole, sampling the thin lunar atmosphere on the way down.'],
      ['2009', 'NASA’s Moon Mineralogy Mapper, carried on board, finds hydroxyl and water across the lunar surface.'],
      ['29 Aug 2009', 'Contact is lost after 312 days. In 2017 NASA radar found it still circling the Moon.'],
    ],
    science: [
      'Water: the Moon Mineralogy Mapper (M³) found a 2.8–3.0 μm absorption from OH and H₂O spread across high latitudes, varying with time of day. That was the first sign that solar-wind hydrogen makes water at the surface. In 2018, M³ data showed exposed water ice in permanently shadowed polar craters. The Mini-SAR radar found ice-consistent signatures in more than 40 north-polar craters.',
      'Moon Impact Probe: its CHACE mass spectrometer measured the composition of the tenuous exosphere during descent and reported water-related signals near the pole. An Indian flag was painted on its side.',
      'Hardware: 1,380 kg at launch, 11 instruments from India, NASA, ESA and Bulgaria. Overheating forced its orbit up from 100 to 200 km; failed star sensors and finally a power problem ended contact. Ground-based radar (Goldstone transmitting, Green Bank receiving) re-detected it in its polar orbit in 2017.',
    ],
    numbers: [['Launch mass', '1,380 kg'], ['Instruments', '11'], ['Mission', '312 days'], ['Impact probe', '35 kg']],
  },
  chandrayaan2: {
    name: 'Chandrayaan-2', agency: 'ISRO', rocket: 'lvm3', to: 'moon',
    launch: { date: '22 Jul 2019', time: '09:13 UTC (14:43 IST)', vehicle: 'GSLV Mk III-M1 (LVM3)', site: 'Second Launch Pad, Satish Dhawan Space Centre, Sriharikota', sky: 'day' },
    timeline: [
      ['T−0', 'After a launch scrub a week earlier over a helium-system leak, India’s heaviest rocket lifts an orbiter, the Vikram lander and the Pragyan rover: 3.85 tonnes.'],
      ['T+16 min', 'The cryogenic upper stage puts it in an orbit with a higher apogee than planned, which saved fuel and later gave the orbiter years of extra life.'],
      ['20 Aug 2019', 'Lunar orbit insertion.'],
      ['2 Sep 2019', 'Vikram separates from the orbiter.'],
      ['6 Sep 2019 20:23 UTC', 'During the braking phase the thrust and attitude drift out of range. Contact is lost about 2 km above the surface and Vikram crashes.'],
      ['Dec 2019', 'Using NASA orbiter images, Chennai engineer Shanmuga Subramanian spots the debris field. NASA confirms it.'],
    ],
    science: [
      'Failure analysis: during “rough braking” the engines produced more thrust than modelled. The guidance hit its software limits on attitude rate and acceleration while trying to correct, and the small 500 m × 500 m target ellipse gave no margin. Chandrayaan-3’s lander was redesigned around exactly these findings.',
      'The orbiter is still working: OHRC images the surface at about 0.25 m per pixel, the sharpest camera ever to orbit the Moon. DFSAR is the first fully polarimetric L- and S-band radar at the Moon, probing ice in polar craters. CLASS maps elements by X-ray fluorescence during solar flares.',
    ],
    numbers: [['Launch mass', '3,850 kg'], ['Lost at', '≈ 2.1 km altitude'], ['OHRC resolution', '≈ 0.25 m'], ['Orbiter', 'Still active']],
  },
  chandrayaan3: {
    name: 'Chandrayaan-3', agency: 'ISRO', rocket: 'lvm3', to: 'moon',
    launch: { date: '14 Jul 2023', time: '09:05 UTC (14:35 IST)', vehicle: 'LVM3-M4', site: 'Second Launch Pad, Satish Dhawan Space Centre, Sriharikota', sky: 'day' },
    timeline: [
      ['T−0', 'LVM3 lifts the propulsion module and the Vikram lander, with the Pragyan rover inside.'],
      ['T+16 min', 'Injected into an elongated Earth orbit. Five burns stretch the orbit until the Moon can capture it.'],
      ['5 Aug 2023', 'Lunar orbit insertion.'],
      ['17 Aug 2023', 'Vikram separates from the propulsion module.'],
      ['23 Aug 2023 12:33 UTC', 'Touchdown at 69.4° S: the first landing near the lunar south pole. India becomes the fourth nation to soft-land on the Moon.'],
      ['24 Aug–2 Sep', 'Pragyan drives about 100 m and confirms sulfur in the soil with a laser.'],
      ['3 Sep 2023', 'Vikram fires its engines and hops about 40 cm, then lands again.'],
      ['22 Sep 2023', 'The lunar night has passed, but neither lander nor rover wakes up.'],
    ],
    science: [
      'Redesign after Chandrayaan-2: stronger legs rated for 3 m/s touchdowns, a landing zone of 4 km × 2.4 km instead of 0.5 km, more solar panels, more fuel, a new Laser Doppler Velocimeter, and software that tolerates multiple sensor failures. The fifth (central) engine was removed, leaving four throttleable 800 N engines.',
      'Surface results: Pragyan’s LIBS laser made the first in-situ detection of sulfur near the pole, along with Al, Ca, Fe, Cr, Ti, Mn, Si and O. ChaSTE pushed a thermal probe 10 cm down: about 70 °C at the surface but near −10 °C at 8 cm, showing how well regolith insulates. ILSA recorded a natural seismic event on 26 August. RAMBHA-LP measured a thin near-surface plasma.',
      'Laser ranging: Vikram carries NASA’s small Laser Retroreflector Array. In December 2023 NASA’s Lunar Reconnaissance Orbiter bounced its laser off it, the first time a reflector on the Moon was ranged from lunar orbit.',
    ],
    numbers: [['Landing site', '69.373° S, 32.319° E'], ['Rover drive', '≈ 101 m'], ['Surface temp.', '≈ 70 °C'], ['At 8 cm', '≈ −10 °C']],
  },
  mom: {
    name: 'Mars Orbiter Mission (Mangalyaan)', agency: 'ISRO', rocket: 'pslvxl', to: 'mars',
    launch: { date: '5 Nov 2013', time: '09:08 UTC (14:38 IST)', vehicle: 'PSLV-C25 (PSLV-XL)', site: 'First Launch Pad, Satish Dhawan Space Centre, Sriharikota', sky: 'day' },
    timeline: [
      ['T−0', 'PSLV is too small to throw a spacecraft straight to Mars, so ISRO plans an unusual route.'],
      ['Nov 2013', 'Six engine burns at perigee pump up its Earth orbit, using the Oberth effect: thrust works best where the craft moves fastest.'],
      ['1 Dec 2013', 'Trans-Mars injection: off on a 300-day cruise.'],
      ['22 Sep 2014', 'The 440 N engine, silent for 300 days, is test-fired for 4 seconds. It works.'],
      ['24 Sep 2014', 'Mars orbit insertion: India is the first Asian nation to reach Mars orbit, and the first nation anywhere to do it on the first attempt.'],
      ['Apr 2022', 'A 7.5-hour eclipse drains its battery, which was designed for about 100 minutes. After nearly 8 years, contact is lost.'],
    ],
    science: [
      'Trajectory: a 1,337 kg spacecraft (852 kg of it propellant) left Earth with a series of perigee burns instead of one big escape burn. Mars capture put it in a highly elliptical orbit of about 420 × 77,000 km. The long apoapsis gave the Mars Colour Camera rare full-disc views of the planet, and of the far side of Deimos.',
      'Payloads (15 kg): the Methane Sensor for Mars used a Fabry–Pérot filter design that could not separate methane from surface reflectance, so in practice it became an albedo mapper. That honest negative result was published. MENCA sampled the exosphere, the Lyman-alpha photometer measured deuterium/hydrogen escape, and TIS mapped thermal emission.',
      'Cost: about ₹450 crore (≈ US$74 million) for the whole mission, less than many films about space. It became a model of frugal engineering.',
    ],
    numbers: [['Launch mass', '1,337 kg'], ['Orbit', '≈ 420 × 77,000 km'], ['Design life', '6 months'], ['Lasted', '≈ 8 years']],
  },
  aditya: {
    name: 'Aditya-L1', agency: 'ISRO', rocket: 'pslvxl', to: 'aditya',
    launch: { date: '2 Sep 2023', time: '06:20 UTC (11:50 IST)', vehicle: 'PSLV-C57 (PSLV-XL)', site: 'Second Launch Pad, Satish Dhawan Space Centre, Sriharikota', sky: 'day' },
    timeline: [
      ['T−0', 'India’s first space observatory for the Sun lifts off ten days after Chandrayaan-3’s landing.'],
      ['Sep 2023', 'Four Earth-bound burns, then on 19 September the burn toward L1.'],
      ['6 Jan 2024', 'It enters a halo orbit around the Sun–Earth L1 point, 1.5 million km sunward.'],
      ['May 2024', 'It watches the strongest solar storms in two decades, the same ones that lit up auroras over India.'],
      ['Today', 'Still working: a continuous, uneclipsed view of the Sun.'],
    ],
    science: [
      'L1: there, the combined gravity of Sun and Earth gives an orbital period of exactly one year, so a spacecraft stays between them. The point itself is unstable, so Aditya flies a ~178-day halo orbit around it with periodic station-keeping, out of the way of Earth’s shadow and the solar radio noise behind it.',
      'Payloads: VELC (a coronagraph imaging the corona from 1.05 solar radii, with spectro-polarimetry for coronal magnetic fields), SUIT (near-UV imaging of the photosphere and chromosphere, 200–400 nm), SoLEXS and HEL1OS (soft and hard X-ray flare spectra), plus in-situ ASPEX, PAPA and a magnetometer sampling the solar wind about an hour before it reaches Earth.',
    ],
    numbers: [['Distance', '1.5 million km'], ['Halo period', '≈ 178 days'], ['Payloads', '7'], ['Status', 'Active']],
  },
};

// shared science text for families of spacecraft
function SURVEYOR_SCIENCE(extra = []) {
  return [
    'Landing system: a closed-loop descent with no crew. An altitude-marking radar fired the main solid retro-rocket (Thiokol TE-364) at about 100 km slant range; once it burned out it was jettisoned. Three throttleable liquid verniers, steered by the RADVS radar altimeter and Doppler velocity sensor, flew the last ~11 km, the template for every robotic lander since.',
    ...extra,
    'Engineering for Apollo: footpad penetration, strain-gauge records of the touchdown and close-up TV of disturbed soil gave the bearing strength and friction angle used to design the lunar module’s legs and footpads.',
  ];
}
function VIKING_SCIENCE(extra = []) {
  return [
    'Lander: heat-sterilised at about 112 °C before launch, powered by two SNAP-19 radioisotope generators. It landed with three throttled engines, each spread over 18 small nozzles so the exhaust would not scour or contaminate the soil it was about to test.',
    'Biology: the Labeled Release experiment saw radioactive gas released from nutrient added to the soil, a result that met its pre-agreed criterion for life. But the gas-chromatograph mass spectrometer found no organics at parts-per-billion levels. The consensus is oxidising soil chemistry; Phoenix’s 2008 perchlorate discovery and later Curiosity results reopened how the organics could have been destroyed during heating.',
    ...extra,
    'Atmosphere: during entry, Viking measured nitrogen and argon isotope ratios that matched gases later found trapped in Martian meteorites. That is how we know the SNC meteorites come from Mars.',
  ];
}
function MER_SCIENCE(extra = []) {
  return [
    'Entry and landing: a heat shield, a supersonic parachute, three RAD solid rockets plus the side-firing TIRS rockets that cancel wind-driven swing, and airbags. The rover has a rocker-bogie suspension, a RAD6000 CPU at 20 MHz with 128 MB of RAM running VxWorks, and about 140 W of solar power at the start.',
    'Instruments: Pancam (stereo colour), Mini-TES (thermal-infrared mineralogy), the APXS and Mössbauer spectrometers on the arm (Mössbauer identifies iron minerals and oxidation states such as hematite and jarosite), a microscopic imager, and the Rock Abrasion Tool for grinding through weathered rinds.',
    ...extra,
  ];
}
function PIONEER_SCIENCE(extra = []) {
  return [
    'Design: spin-stabilised (about 4.8 rpm) around a 2.74 m high-gain antenna, powered by four SNAP-19 RTGs on booms (about 155 W at launch). It carried the Pioneer plaque by Carl Sagan, Frank Drake and Linda Salzman Sagan, which shows where we are using 14 pulsars.',
    ...extra,
    'The Pioneer anomaly: tracking showed a tiny unexplained sunward acceleration of about 8.7 × 10⁻¹⁰ m/s². It drew proposals of new physics until 2012, when a thermal model showed it is recoil from heat radiated unevenly off the spacecraft (the RTGs and electronics warming the back of the antenna).',
  ];
}
function VOYAGER_SCIENCE(extra = []) {
  return [
    'Spacecraft: three-axis stabilised, with a 3.7 m high-gain antenna, three MHW-RTGs (about 470 W at launch, losing about 4 W a year), and computers with about 70 KB of memory in total. Instruments are switched off one by one as power fades. The Golden Record carries sounds, music, greetings in 55 languages and 115 images.',
    'Gravity assists: each flyby swapped momentum with a planet, adding many km/s at no fuel cost. Jupiter alone added about 10 km/s, which is why both Voyagers left the solar system and Pioneer-class launches could not.',
    ...extra,
  ];
}

// hardware-specific deep dives (shown with every item of that kind)
window.SF_HARDWARE = {
  lm: 'Descent stage engineering: about 2 tonnes dry and 8 tonnes of propellant at landing burn start. The landing radar measured altitude and three-axis velocity by Doppler, and its data was blended into the inertial state by the guidance computer. Gold and black Kapton/Mylar blankets kept the propellant tanks thermally stable. At liftoff the ascent stage’s 15.6 kN engine fired through the descent stage’s top deck, blasting insulation across the site; orbital images show the bright “blast zones” around every landing site today.',
  lrv: 'Lunar Roving Vehicle: 210 kg empty, carrying 490 kg. Each wheel had its own 0.25 hp DC series motor with an 80:1 harmonic drive. Two 36 V silver–zinc batteries supplied 121 Ah each. Front and rear Ackermann steering gave a 3 m turning radius. The woven zinc-coated piano-wire tyres with titanium chevrons deformed around rocks, and navigation used a directional gyro plus odometry, shown on the console as heading, bearing and range back to the lunar module.',
  alsep: 'ALSEP: a SNAP-27 RTG (thermoelectric PbTe couples, about 70 W) powered a central station that collected data from each experiment and sent it to Earth on S-band, taking commands back. The Apollo 12, 14, 15 and 16 seismometers formed a network until NASA switched them off on 30 September 1977. They catalogued about 12,500 events: deep moonquakes 700–1,200 km down, triggered by tides on a monthly rhythm, shallow quakes up to about magnitude 5, meteoroid impacts, and thermal quakes at sunrise and sunset. Re-analysis in 2011 used them to detect a small, partly molten core.',
  lrrr: 'Laser ranging: each fused-silica corner cube sends light back toward its source whatever its angle. An observatory fires nanosecond pulses of about 10¹⁷ photons. The beam is several kilometres wide at the Moon and the echo is several kilometres wide back on Earth, so typically a single photon returns from many pulses. Timing it to picoseconds gives the distance to millimetres. Results: the Moon recedes 3.8 cm/yr (tidal dissipation), the lunar core is fluid, the strong equivalence principle holds to about 10⁻¹³, and the gravitational constant G changes by less than about 1 part in 10¹² per year.',
  lrrr15: 'Laser ranging: each fused-silica corner cube sends light back toward its source whatever its angle. An observatory fires nanosecond pulses of about 10¹⁷ photons. The beam is several kilometres wide at the Moon and the echo is several kilometres wide back on Earth, so typically a single photon returns from many pulses. The 300 cubes here give three times the return of the 100-cube arrays. Results: the Moon recedes 3.8 cm/yr, the lunar core is fluid, the strong equivalence principle holds to about 10⁻¹³, and G changes by less than about 1 part in 10¹² per year.',
  sojourner: 'Sojourner: 10.6 kg, an 8-bit Intel 80C85 processor, a 0.22 m² gallium-arsenide solar panel (about 16 W at Mars noon) and non-rechargeable lithium backup batteries. It found hazards with laser stripes and cameras, moved at about 1 cm/s and never went more than about 12 m from the lander, which relayed all its UHF data. Its APXS (alpha proton X-ray spectrometer) gave the first chemistry of Martian rocks rather than soil.',
  vikram: 'Vikram (Chandrayaan-3): 1,752 kg at separation, including the 26 kg rover. Four throttleable 800 N engines, a Laser Doppler Velocimeter, Ka-band altimeters, hazard-detection cameras, and a lateral-velocity camera to cancel drift. It landed within its 4 × 2.4 km zone at about 1 m/s vertical speed. On board were ChaSTE (thermal probe), ILSA (seismometer), RAMBHA-LP (Langmuir probe) and NASA’s Laser Retroreflector Array.',
  pragyan: 'Pragyan: 26 kg, six wheels on a rocker-bogie, 50 W of solar power, and stereo navigation cameras. It talked only to Vikram. Its two spectrometers, APXS (alpha-particle X-ray) and LIBS (laser-induced breakdown, which vaporises a speck of soil and reads the light), made the first element-by-element analysis of polar regolith. Its rear wheels stamped the ISRO logo and the national emblem into the soil.',
};

// item → mission
window.SF_MISSION_OF = {
  'a11-lm': 'apollo11', 'a11-lrrr': 'apollo11', 'a12-lm': 'apollo12', 'a12-alsep': 'apollo12', surveyor3: 'surveyor3',
  'a14-lm': 'apollo14', 'a14-alsep': 'apollo14', 'a14-lrrr': 'apollo14',
  'a15-lm': 'apollo15', 'a15-lrv': 'apollo15', 'a15-alsep': 'apollo15', 'a15-lrrr': 'apollo15',
  'a16-lm': 'apollo16', 'a16-lrv': 'apollo16', 'a16-alsep': 'apollo16', 'a17-lm': 'apollo17', 'a17-lrv': 'apollo17', 'a17-alsep': 'apollo17',
  surveyor1: 'surveyor1', surveyor5: 'surveyor5', surveyor6: 'surveyor6', surveyor7: 'surveyor7', ranger7: 'ranger7',
  viking1: 'viking1', viking2: 'viking2', pathfinder: 'pathfinder', sojourner: 'pathfinder', spirit: 'mer-a', opportunity: 'mer-b',
  phoenix: 'phoenix', insight: 'insight', ingenuity: 'mars2020',
  dawn: 'dawn', near: 'near', kepler: 'kepler', galileo: 'galileo', pioneer10: 'pioneer10', pioneer11: 'pioneer11', voyager1: 'voyager1', voyager2: 'voyager2',
  'c1-mip': 'chandrayaan1', 'c1-orbiter': 'chandrayaan1', 'c2-vikram': 'chandrayaan2', 'c2-orbiter': 'chandrayaan2',
  'c3-vikram': 'chandrayaan3', 'c3-pragyan': 'chandrayaan3', mom: 'mom', aditya: 'aditya',
};
