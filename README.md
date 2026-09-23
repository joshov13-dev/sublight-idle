# sublight-idle
A minimalist, deep-space idle game built with HTML, Tailwind CSS, and break_infinity.js. Gather photons, decode cosmic telemetry, and re-calibrate pulsar arrays across infinite progression layers.

## Running
Open `index.html` in a browser. No build step. Tailwind and break_infinity.js load from CDNs.

## Structure
Scripts are plain `<script>` tags (so `file://` works) sharing one global `SL` namespace. Load order is set in `index.html`.

| File | Job |
| --- | --- |
| `js/config.js` | Static data and tuning numbers (generators, upgrades, unlock thresholds). |
| `js/format.js` | Number formatting (scientific / engineering). |
| `js/state.js` | Default state shape and (de)serialising of Decimals. |
| `js/engine.js` | Game maths and actions. No DOM access. |
| `js/save.js` | localStorage autosave, Base64 export/import, hard reset, offline progress. |
| `js/ui.js` | Rendering and event wiring. |
| `js/main.js` | Boot, 20 TPS logic loop, render loop, autosave. |
| `css/style.css` | Terminal look (glow borders, tabs, progress bars). |

## Rules of thumb
- All numbers that can grow large are `Decimal`. Add new ones to `SL.DECIMAL_KEYS`.
- New state fields go in `SL.newState()`; old saves pick up defaults automatically.
- Gameplay changes go in `engine.js`, never in `ui.js`.
- `SL.engine.tick(dt)` is the only way time passes (live and offline).

## Status
Done: game loop, saving, offline progress (24h cap), export/import/reset, notation toggle, tabs, manual ping, 4 generators with Buy 1/10/Max, Spectrometer upgrades.

To do:
- Telemetry: processing threads (Photons to Bytes) and byte-based multipliers (`tick()` and `globalMultiplier()` TODOs).
- Calibration: `recalibrate()` reset logic and UI.
- Automation perks (auto-ping, autobuyers) stored in `state.automation`.
- Styled hard-reset modal to replace `confirm()`.
- Offline progress summary popup.
- Balance pass on upgrade costs (current values are placeholders).
