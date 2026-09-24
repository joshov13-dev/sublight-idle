# sublight-idle
A minimalist, deep-space idle game built with HTML, Tailwind CSS, and break_infinity.js. Gather photons, decode cosmic telemetry, and re-calibrate pulsar arrays across infinite progression layers.

## How to run

You do not need to install anything. You only need a web browser (Chrome, Firefox, Edge or Safari) and an internet connection.

### Option 1: Download and double-click (easiest)

1. On this GitHub page, click the green **Code** button near the top.
2. Click **Download ZIP**.
3. Find the ZIP file in your **Downloads** folder.
4. Unzip it:
   - **Windows:** right-click the ZIP and choose **Extract All...**, then click **Extract**.
   - **Mac:** double-click the ZIP.
5. Open the new folder (it will be called something like `sublight-idle-main`).
6. Double-click the file called **`index.html`**. The game opens in your browser.
7. That's it. Click **Manual Signal Ping** to start.

If double-clicking opens the file in a text editor instead of a browser, right-click `index.html`, choose **Open with**, and pick your browser.

Leave the other files and folders (`css` and `js`) where they are. The game needs them next to `index.html` to work. Moving `index.html` on its own will break it.

### Option 2: Use Git (for developers)

```bash
git clone https://github.com/joshov13-dev/sublight-idle.git
cd sublight-idle
```

Then open `index.html` in your browser. If you would rather use a local web server, run `python3 -m http.server` in the folder and go to `http://localhost:8000`.

### Troubleshooting

- **The page is blank or unstyled:** you are probably offline. The game loads its styling and its big-number library from the internet the first time. Connect and refresh.
- **My progress has gone:** saves live in your browser. Using a different browser, a private or incognito window, or clearing your browsing data means starting fresh. Use **Console > Export Save** to back up your progress.
- **Nothing happens when I click:** refresh the page (F5, or Cmd+R on a Mac).

## How to play

1. **Ping.** Click **Manual Signal Ping** to collect Photons.
2. **Build.** Spend Photons on the four generators in the **Array** tab. They make Photons for you every second, even while the game is closed (up to 24 hours).
3. **Upgrade.** Buy the one-off upgrades in the **Spectrometer** tab.
4. **Process.** At 10,000 Photons the **Telemetry** tab opens. Buy Processing Threads to turn part of your Photon output into Raw Bytes, then spend Bytes on upgrades. More active threads means more Bytes but fewer Photons. Use the + and - buttons to find your balance.
5. **Re-Calibrate.** Once you have earned 1,000,000 Bytes in total, the **Calibration** tab opens. Re-Calibrating resets most of your progress, but gives you Pulsar Cores. Each core permanently boosts all production by 10% and unlocks automation such as Auto-Ping and autobuyers.
6. **Repeat**, going further each time.

The game saves itself every 10 seconds. The **Console** tab has manual save, export/import, number format and hard reset.

## Structure
Scripts are plain `<script>` tags (so `file://` works) sharing one global `SL` namespace. Load order is set in `index.html`.

| File | Job |
| --- | --- |
| `js/config.js` | Static data and tuning numbers (generators, upgrades, perks, unlock thresholds). |
| `js/format.js` | Number formatting (scientific / engineering). |
| `js/state.js` | Default state shape and (de)serialising of Decimals. |
| `js/engine.js` | Game maths and actions. No DOM access. |
| `js/save.js` | localStorage autosave, Base64 export/import, hard reset, offline progress. |
| `js/ui.js` | Rendering, modals and event wiring. |
| `js/main.js` | Boot, 20 TPS logic loop, render loop, autosave. |
| `css/style.css` | Terminal look (glow borders, tabs, progress bars). |

## Rules of thumb
- All numbers that can grow large are `Decimal`. Add new ones to `SL.DECIMAL_KEYS`.
- New state fields go in `SL.newState()`; old saves pick up defaults automatically.
- Gameplay changes go in `engine.js`, never in `ui.js`.
- `SL.engine.tick(dt)` is the only way time passes (live and offline).
- Balance numbers live in `config.js`. A greedy bot currently reaches the first Calibration in roughly an hour of active play.

## Design notes
- **Telemetry:** each active thread diverts 5% of gross photon output (max 20 threads) and converts it at 100 photons per byte. Byte upgrades: Buffer Indexing (photon multiplier scaling with log10 of byte reserve), Packet Compression (+50% bytes per level) and Error Correction (refunds diverted photons, max 5 levels).
- **Calibration:** cores are based on bytes earned *this run*, so repeated resets do not double count. Photons, generators, bytes, threads and telemetry upgrades reset; spectrometer upgrades, cores, perks and settings are kept.
- **Perks** unlock at core milestones (1, 2, 3, 5, 8, 12) and are never spent, so the +10% per core bonus is never lost. Each perk can be toggled on or off.
- **Offline progress** is simulated in up to 1,000 slices so autobuyers and upgrades apply along the way.
