# solara-3d

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Razerjrs/solara-3d/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Razerjrs/solara-3d/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLARA** is an original 3D open-world crime game in the spirit of GTA 6: a sun-soaked coastal city at golden hour to explore on foot and by car, with traffic, pedestrians, a wanted level and police who respond — including a helicopter at 3 stars — six story missions for the fixer Nadia Reyes, combat, progression and a live minimap, all in Three.js with no network requests.

## The city

Solara Bay is a grid of avenues and streets across seven districts — Old Town, Downtown, Marina, Westside, Central, Harbor and Beachfront — with lit windows, palms, a plaza, a sandy beach and an animated ocean along the south edge. The sun hangs low over the water, the sky burns orange to dusk purple, and the streetlights come on as you drive.

## What you can do

- **On foot:** walk and run, punch rivals and cops, steal parked cars.
- **By car:** six vehicle types (sedan, taxi, truck, sports, van, police interceptor), each with its own speed, acceleration and handling. Handbrake turns, damage and smoke.
- **Wanted level 1–5 stars:** crimes raise it; patrol cars chase and ram, foot cops close in and arrest, and a police helicopter circles overhead at 3 stars. Break line of sight and stay quiet to cool down.
- **Missions:** six jobs with dialogue, objectives, timers and cash rewards — a first car theft, a courier run, a getaway, a turf sweep, a hot-cargo delivery and the big score.
- **HUD:** live minimap with player, police and mission markers, wanted stars, cash, health, speed, mission tracker and district banners.
- **Sound:** synthesized WebAudio effects (engine, sirens, punches, pickups) and a procedural music loop, with a mute toggle.
- **Save:** progress autosaves when you pause (and with K); continue from the title screen.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Shift | Run |
| E | Enter / exit car |
| F or click | Punch |
| Space | Handbrake |
| Esc / P | Pause |
| M | Mute |
| K | Save |
| R | Restart after game over |
| C | Continue a saved game |

## Run it

Open `game/index.html` in a desktop browser, or serve the folder and open it:

```sh
node serve.ts
# then open http://localhost:8080
```

## Layout

- `game/src/config.js` — tuning, palette, vehicle types, districts
- `game/src/random.js` — seeded random numbers
- `game/src/city.js` — the city: streets, blocks, buildings, palms, beach, ocean
- `game/src/render.js` — Three.js scene, sunset sky, lights, chase camera
- `game/src/vehicles.js` — procedural cars and arcade driving physics
- `game/src/player.js` — walking, punching, getting in and out of cars
- `game/src/traffic.js` — traffic cars and pedestrians
- `game/src/police.js` — the wanted level, police cars, foot cops, helicopter
- `game/src/combat.js` — punches, knockback, car-vs-pedestrian hits
- `game/src/missions.js` — the six-story mission chain
- `game/src/state.js` — the game state and its fixed-step update
- `game/src/hud.js` — HUD, dialogue, menus
- `game/src/minimap.js` — the live minimap
- `game/src/audio.js` — synthesized sound and music
- `game/src/shots.js` — the deterministic screenshot scenes
- `game/src/main.js` — boot and the game loop
- `game/vendor/three.module.min.js` — Three.js 0.160.0 (MIT), vendored
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`

---

<sub>Entered on [make.fun](https://make.fun/?ref=1v039b2j&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
