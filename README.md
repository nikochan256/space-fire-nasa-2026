# Spacefire — The Machines We Left Behind

**An interactive 3D archive of the hardware humanity left on the Moon, on Mars and in deep space, and two Skylab bases that repair it.**

Built for the **NASA Space Apps Challenge 2026**, challenge *[Abandoned but Not Forgotten: NASA's discarded equipment](https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/)*.

Spacefire turns catalogue records (a name, a date, a pair of coordinates) into places you can visit. Fly across the solar system, land at the real coordinates of an Apollo site or a Mars rover, walk around the hardware at its real size, find out why it stopped working, then send it to a repair base on the Moon or Mars and bring it back to life.

Everything runs in the browser: a static site with no server-side code, no build step and no dependencies to install.

---

## Contents

- [Quick start](#quick-start)
- [What you can do](#what-you-can-do)
- [Skylabs: the repair bases](#skylabs-the-repair-bases)
- [Narration and sound](#narration-and-sound)
- [The archive: 48 objects](#the-archive-48-objects)
- [The science behind it](#the-science-behind-it)
- [How it is built](#how-it-is-built)
- [Project structure](#project-structure)
- [Controls](#controls)
- [Testing](#testing)
- [Known limits](#known-limits)
- [Data sources and credits](#data-sources-and-credits)

---

## Quick start

You need [Node.js](https://nodejs.org/) 18 or newer (only for the tiny local server).

```bash
git clone https://github.com/nikochan256/space-fire-nasa-2026.git
cd space-fire-nasa-2026
npm start            # or: node scripts/serve.mjs 4179
```

Open **http://127.0.0.1:4179/** and the explorer loads (`/explore/`).

Any static file server works too (`npx serve .`, `python -m http.server`, GitHub Pages, Netlify, Vercel). The site must be served over HTTP, not opened from `file://`, because it uses ES modules and loads 3D models.

Deep links: `/explore/?a=<item id>` opens a site and object directly, for example `/explore/?a=a15-lrv` (Apollo 15 rover), `/explore/?a=ingenuity` or `/explore/?a=sk-bay-moon` (the Moon repair bay).

---

## What you can do

### 1. Explore the solar system
- A 3D map with the Sun, all planets, the Moon, Ceres, Eros and the asteroid belt, each object on a drawn orbit.
- **36 sites:** landing sites pinned at their **real coordinates** on NASA's Moon map and the USGS Viking Mars mosaic, deep-space probes on their real routes, plus the two Skylab bases.
- Orbiters still circling (Chandrayaan-1 and 2, Mangalyaan, Aditya-L1 at L1) move along their orbits.
- Views: Solar System, Moon, Mars, Beyond, Skylabs. An index lists every site, grouped by world.

### 2. Land and walk around
Click a Moon or Mars site and the camera flies down and lands. Each of the **24 walkable surfaces** is built for that site:
- terrain with craters, rocks, ripples, dunes or polygon ground depending on the real site;
- hardware at **real scale** in its real layout (Apollo lander, rover, science station, laser mirror, flag, astronaut tracks);
- the Sun at an adjustable height; on the Moon, Earth hangs in the sky at the position set by the site's latitude and longitude; Mars has a butterscotch sky, fog and a blue sunset glow around the Sun.

### 3. Use the hardware (once it is repaired)
- **Drive** the Apollo moon buggies, Sojourner, Spirit, Opportunity, Pragyan and the Skylab crew rover: wheels roll and steer, dust flies (in clean arcs on the airless Moon), tracks stay behind.
- **Fly** Ingenuity in Jezero Crater.
- **Fire a laser from Earth** at the Apollo retroreflectors.
- **Feel a moonquake / marsquake** at the Apollo science stations and InSight.
- **Hop** with Surveyor (Surveyor 6 hopped 3 m in 1967) or Vikram (40 cm in 2023).
- **Send a signal home** from the landers.
- **Replay** the Apollo ascent-stage liftoffs and the Ranger 7, Vikram and Moon Impact Probe impacts.

### 4. Stories and launch films
- **Story mode:** each object has a full-screen story in chapters: Intro, Liftoff, The mission (timeline), How it works (science cards), By the numbers, Today.
- **Launch films:** watch the mission's real rocket (10 launch vehicles modelled to scale: Atlas-Agena, Atlas-Centaur, Saturn V, Titan IIIE, Space Shuttle, Delta II, PSLV-XL, Atlas V 401/541, LVM3) leave the pad, then follow the route across the solar system to the site.

---

## Skylabs: the repair bases

**The main feature.** Almost every machine on the map stopped for a documented reason: batteries that could not be recharged, dust on solar panels, electronics that froze in the night, broken rotor blades. In Spacefire a machine has to be **repaired before it can be driven, flown or run**.

### Two bases at real candidate sites

| | **Shackleton Skylab** (Moon) | **Arcadia Skylab** (Mars) |
|---|---|---|
| Where | ≈ 89.5° S, the ridge between Shackleton and de Gerlache craters, one of NASA's Artemis candidate regions | ≈ 38.6° N, Arcadia Planitia, where NASA's SWIM project mapped ice centimetres under the surface |
| Why there | Crater rims in sunlight most of the year; water ice in the permanently shadowed floors next door | Shallow ice, flat ground, low elevation (more air to land through) |
| Habitat | 3D-printed regolith shell over inflatable modules (ESA / Foster + Partners concept) | **Mars Ice Home**: inflatable dome shielded with water ice (NASA Langley, 2016), translucent so daylight gets in |
| Power | **Vertical Solar Array** towers that turn to follow a Sun skimming the horizon; a 40 kWe **Fission Surface Power** reactor | Four **Kilopower** reactors (tested in NASA's 2018 KRUSTY run); a solar field with a cleaning robot |
| Resources | Ice mine: RASSOR-style excavator with counter-rotating bucket drums, water plant, tanks | **MOXIE**-scale oxygen plant + Sabatier methane reactor; **Rodwell** ice well |
| Also | Repair hangar, landing pad with blast berm, recovery hopper, LunaNet comms tower, drivable pressurised rover | Repair hangar, greenhouse with red/blue LEDs, landing pad and hopper, deep-space antenna |

All 17 modules are modelled in code at real scale and animated: towers track the Sun, dishes track Earth, drums and drills turn, beacons blink. Each module has its own explanation and story chapter.

### How a repair works

1. **Diagnose:** every machine shows its status (Offline, Working but dimmed, Protected heritage, Beyond repair, Out of reach) and *why*, from the mission record.
2. **Recover:** press *Repair*. A sky-crane-style **recovery hopper**, fuelled with propellant made from local ice, flies the real great-circle distance from the base, hovers, winches the machine up and flies it away.
3. **Repair bay:** an indoor, pressurised hangar with two robot arms (live inverse kinematics), a gantry crane, a scanning ring and parts tables. Each machine has 4 to 6 steps built from its real fault:
   *scan* (faults marked in red) · *dust* (electrodynamic dust shield on the Moon, CO₂ jets on Mars) · *frost* (sublimating dry ice) · *swap* (batteries, fuel capsules, motors) · *weld* · *panel* (solar arrays, rotor blades, a new camera) · *heat* (slow warming, radioisotope heaters) · *upload* (software) · *test* (power-on).
   Telemetry readouts turn from red to green as each step completes.
4. **Return:** the hopper sets the machine down exactly where it was, and its action unlocks.

Inside each base's hangar, **Enter the repair bay** opens a queue of every machine waiting for that base. Repairs are remembered in the browser (`localStorage`).

### Honest limits, on purpose

| | Count | What happens |
|---|---|---|
| Repairable | 26 | Recovered and repaired at a Skylab |
| Laser mirrors | 3 | Still work; cleaned **in place**, because their exact position is a 50-year measurement record |
| Apollo landers | 6 | **Protected heritage**: left untouched (NASA's 2011 guidelines, the 2020 One Small Step Act) |
| Crash sites | 3 | Beyond repair; studied where they lie |
| Out of reach / gone | 6 | Pioneer 10 & 11, Dawn, Kepler, NEAR, Galileo (burned up in Jupiter) |
| Still working | 4 | Voyager 1 & 2, Chandrayaan-2 orbiter, Aditya-L1 |

---

## Narration and sound

- **Narrator:** every explanation is read aloud with the browser's Web Speech API: the selected machine and why it stopped, every action, each repair step, story chapters as you scroll, launch-film captions. Units and symbols are rewritten for speech ("≈ 45 km" → "about 45 kilometres"). The best available voice is chosen automatically (Edge's *Natural* voices and Chrome's Google voices sound best). A **Listen** button reads an object's full story.
- **Sound effects** are synthesised live with the Web Audio API, with no audio files: rocket roar timed to liftoff, hopper engines and winch, rover motors on gravel, Ingenuity's rotor hum, robot-arm servos, welding crackle, gas jets, scan sweeps, data chirps, quakes, lasers, power-up chimes.
- **The physics of hearing it:** on the airless Moon you only hear what reaches you through the ground and your suit, so sounds are muffled. Mars's thin CO₂ air is quiet and absorbs high pitches (as Perseverance's microphones showed), and Ingenuity hums at 84 Hz. The pressurised repair bay sounds like a workshop on Earth.
- **Narrator** and **Sound** toggles sit in the bottom-right corner and are remembered. Browsers allow audio only after the first click or key press.

---

## The archive: 48 objects

**Moon:** Apollo 11, 12, 14, 15, 16, 17 (lunar module descent stages, three Lunar Roving Vehicles, five ALSEP science stations, three laser retroreflectors) · Surveyor 1, 3, 5, 6, 7 · Ranger 7 · Chandrayaan-1 Moon Impact Probe · Chandrayaan-2 Vikram crash site · Chandrayaan-3 Vikram and Pragyan · Chandrayaan-1 and -2 orbiters.

**Mars:** Viking 1 and 2 · Mars Pathfinder and Sojourner · Spirit · Opportunity · Phoenix · InSight · Ingenuity · Mangalyaan (orbit).

**Beyond:** Pioneer 10 and 11 · Voyager 1 and 2 · Galileo · NEAR Shoemaker (on Eros) · Dawn (at Ceres) · Kepler · Aditya-L1.

Plus the 17 Skylab modules. Every object has a plain-language story for all ages, key facts, and (for NASA/ISRO missions) launch details, a timeline, science cards and numbers.

---

## The science behind it

Some of the real details the experience is built on:

- **Apollo LRV:** two 36 V silver-zinc batteries, not rechargeable, rated for 78 hours. Apollo 17's fender was repaired with maps and clamps.
- **ALSEP:** switched off on 30 Sep 1977 to save money; SNAP-27 RTGs run on plutonium-238 (half-life 87.7 years), so about two-thirds of the heat is left today. Apollo 12's fuel capsule stuck and was hammered out by Alan Bean.
- **Laser retroreflectors:** still in use; they return about ten times less light than expected, probably from dust (Murphy et al., 2010). The Moon recedes 3.8 cm a year.
- **Surveyor 3:** its camera was brought home by Apollo 12 and is at the Smithsonian.
- **Opportunity:** lost to the 2018 global dust storm after almost 15 years and 45 km; NASA sent over 1,000 recovery commands.
- **Ingenuity:** 72 flights; NASA's 2024 investigation found its navigation could not track featureless sand, causing the hard landing that broke the blades.
- **Phoenix:** solar panels bent or broken under CO₂ frost (HiRISE images, 2010).
- **InSight:** dust cut power from about 5,000 to 500 Wh per sol; 1,319 marsquakes recorded.
- **Viking 1:** lost in 1982 when a battery-charging command overwrote its antenna-pointing software.
- **MOXIE:** produced 122 g of oxygen on Mars, 2021 to 2023.

Positions on the Moon and Mars are the real landing coordinates; Skylab base coordinates are approximate. Planet sizes and distances are compressed so everything fits on one map.

---

## How it is built

- **Pure static site:** HTML, CSS and ES modules. No framework, no bundler, no server code.
- **[three.js](https://threejs.org/) r160** (WebGL): PBR materials, shadows, custom shaders for planets, atmospheres, dust, light shafts and force-field effects.
- **Hand-built models** (`builders.js`, `skylab.js`) for hardware NASA's 3D library doesn't include (LRV, ALSEP, retroreflectors, Surveyor, Pathfinder, Sojourner, Ranger, Chandrayaan hardware, all Skylab modules), built from mission photos and published dimensions, with procedural canvas textures (crinkled foil, solar cells, woven wire, printed regolith, quilted ice, panel seams).
- **NASA 3D Resources glTF models** (lunar module, MER, Viking, InSight, Ingenuity and the deep-space probes), Draco-compressed.
- **Procedural terrain** per site: a polar-grid mesh with fractal noise, craters, horizon curvature, flattened ground under each piece of hardware.
- **Web Speech API** for narration and **Web Audio API** for synthesised sound.

---

## Project structure

```
index.html                 → redirects to the explorer
explore/
  index.html               the explorer page
  explore.js               solar-system scene, sites, labels, detail panel, story mode, launch films, repair flow
  surface.js               walkable surfaces: terrain, sky, driving, flying, effects, recovery hopper
  skylab.js                Skylab base models, sky-crane hopper, the repair bay (robot arms, IK, effects, UI)
  skylab-data.js           the two bases, their modules, and the repair plan for every object
  audio.js                 narrator (Web Speech) + synthesised sound effects (Web Audio)
  builders.js              hand-built hardware models and procedural textures
  launch.js                rockets to scale and the launch-pad film
  data.js                  sites (real coordinates) and the 48 objects
  missions.js              launches, timelines, science and numbers per mission
  explore.css              all styles
  models/                  NASA 3D Resources glTF models
  tex/                     Moon, Mars and planet textures
  vendor/                  three.js add-ons (OrbitControls, GLTFLoader, DRACOLoader, RoomEnvironment) + Draco decoder
shared/
  vendor/three.module.min.js
  assets/space/            Earth textures
assets/meta/               favicon, app icons, web manifest
scripts/
  serve.mjs                zero-dependency static server
  cdp.mjs                  headless-Chrome test driver
```

---

## Controls

| Where | Input | Action |
|---|---|---|
| Map | Drag / scroll / click | Orbit / zoom / select a planet or site |
| Surface | Drag, W A S D (Shift = run), double-click | Look, walk, go to a spot |
| Driving | W S, A D, Space, Esc | Drive, steer, brake, stop |
| Flying | W A S D, Q E, Space | Fly, change height, land / take off |
| Repair bay | Drag, scroll | Look around the bay |
| Anywhere | Esc | Close / go back |

Touch screens get on-screen controls for driving and flying.

---

## Testing

`scripts/cdp.mjs` drives headless Chrome over the DevTools protocol for automated checks and screenshots:

```bash
node scripts/cdp.mjs steps.json out/
```

`steps.json` lists steps: `goto`, `wait`, `waitFor` (a JS condition), `eval`, `click`, `drag`, `wheel`, `shot`, `shotEl`. The page exposes test handles: `window.SF_SURFACE`, `window.SF_BAY`, `window.SF_AUDIO` (narration log and live output level).

---

## Known limits

- Sizes and distances on the map are compressed.
- Terrain around each site is generated, not loaded from LRO / HiRISE elevation data (planned).
- Skylab bases are concepts built from published NASA and ESA studies, not real missions.
- Narration uses the browser's own voices, so quality depends on the browser and system.
- Heavy 3D can stutter on low-end phones.

---

## Data sources and credits

- **Mission data:** NASA Space Science Data Coordinated Archive (NSSDCA), NASA Science mission pages, ISRO.
- **3D models:** [NASA 3D Resources](https://nasa3d.arc.nasa.gov/) (lunar module, MER, Viking, InSight, Ingenuity, Dawn, Galileo, Kepler, NEAR, Pioneer, Voyager, planet textures).
- **Moon:** NASA Scientific Visualization Studio [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) (LRO LROC colour mosaic + LOLA elevation).
- **Mars:** USGS Viking MDIM 2.1 colour mosaic.
- **Earth:** NASA Blue Marble derived textures (via the three.js examples).
- **Skylab designs:** NASA Artemis III candidate landing regions, Fission Surface Power, Vertical Solar Array Technology, RASSOR, LunaNet, ESA / Foster + Partners regolith printing, NASA Langley Mars Ice Home, Kilopower / KRUSTY, MOXIE, SWIM ice maps, Rodriguez wells, ISS Veggie.
- **Libraries:** [three.js](https://github.com/mrdoob/three.js) (MIT), [Draco](https://github.com/google/draco) decoder (Apache 2.0).
- **Fonts:** Geist, Geist Mono, Instrument Serif (Google Fonts).

NASA content is used under [NASA's media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/); NASA does not endorse this project.

Made for the NASA Space Apps Challenge 2026.
