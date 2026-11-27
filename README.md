# Housebiom

A cozy little world inside the gut. A keeper sits on a raft by lantern light, microbes swim and wander, and food floats down the river to be welcomed in.

Work in progress — a companion for slowly reintroducing foods.

## Run it
Open `index.html` in a browser, or visit the GitHub Pages site.

## Art
All scene layers live in `assets/` as separate images (glow, walls, water, raft, frame, keeper, microbes `m0–m7`, foods `f0–f11`). Replace a file with your own drawing of the same name and size to update the scene.

## Credits
- Food icons: "16x16 Food" by ARoachIFoundOnMyPillow, from OpenGameArt — CC0 (public domain).
- Background and boy sprites: generated for this project and cleaned into pixel art.

## Structure
- `index.html` — the hub: a portal chamber. The open portal leads to the Gut world; the sealed doors are for future worlds.
- `gut/index.html` — the Gut world (red portal).
- `train/index.html` — the Training world: a lake for rowing (turquoise portal).
- `assets/sound.js` — shared chiptune sound engine for all worlds.
