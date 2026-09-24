# sublight-idle
A minimalist, deep-space idle game built with HTML, Tailwind CSS, and break_infinity.js. Gather photons, decode cosmic telemetry, and re-calibrate pulsar arrays across infinite progression layers.

## Playing

No build step and no server needed. Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server
```

Then go to http://localhost:8000. Everything the game needs is in the repo, so it also works offline.

### How it goes

1. **Photons.** Gather by hand, then build 8 kinds of array that gather for you.
2. **Telemetry.** Produce 1e9 photons in one run to Decode: reset your run for telemetry, which boosts production and buys upgrades.
3. **Calibration.** Earn 1e8 telemetry to Recalibrate for calibration points. Tune arrays with them, or buy upgrades such as Auto-Decode.
4. **Horizon.** Reach 1.8e308 photons to cross the Horizon for shards. Complete 4 challenges, break the Horizon and push on to lightspeed at 1e1000 photons.

Progress saves to your browser every 10 seconds and when the page closes, and the game keeps running while you are away (up to 24 hours). Use **Settings → Export save** to keep a backup.

Keys: `G` gather, `1` to `8` buy an array, `M` buy max of all, `D` Decode, `R` Recalibrate, `C` cross.

## Developing

The game is plain JavaScript loaded with ordinary script tags. See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) for the full design, formulas and file layout.

```
npm install          # only needed for the two commands below
npm run build:css    # rebuild src/tailwind.css after changing Tailwind classes
npm run simulate     # play the game logic with a bot and print the pacing
```

`src/tailwind.css` is committed, so players never need to run the build. Rebuild it whenever you add or change Tailwind classes in `index.html` or `src/`.

After changing any balance numbers in `src/data.js` or `src/engine.js`, run `npm run simulate` and compare the timeline with the pacing table in the design doc.

break_infinity.js is bundled in `vendor/` under its MIT licence.
