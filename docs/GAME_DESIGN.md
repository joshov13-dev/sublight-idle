# Sublight Idle: Game Design

The plan for the full game. All numbers are starting points for balancing, not final values.

## Pillars

- **Minimalist.** Dark UI with one accent colour. Everything is text and numbers, no art assets.
- **Always something to do next.** The next unlock is always shown, even when it is locked.
- **Layers that change how you play.** Each prestige layer adds a new system, not just a bigger multiplier.
- **Respect the player's time.** Offline progress, automation, and no required clicking after the early game.

## Resources and layers

| Layer | Resource | Reset action | Unlocks at | Resets | Target time to first reset |
|---|---|---|---|---|---|
| 1 | Photons | (base layer) | start | nothing | n/a |
| 2 | Telemetry | **Decode** | 1e9 photons in current run | photons, arrays, photon upgrades | 20 to 30 min |
| 3 | Calibration | **Recalibrate** | 1e6 telemetry in current run | layers 1 and 2 | 3 to 5 hours |
| 4 | Horizon Shards | **Cross the Horizon** | 1.8e308 photons (the "infinity" break_infinity.js exists for) | layers 1 to 3 | 2 to 4 days |

Each layer is always shown in the UI. Before it unlocks, it appears greyed out with its unlock requirement.

## Layer 1: Photons (built)

### Arrays (generators)

Every array produces photons directly. Each 25 owned doubles that array's output.

| # | Array | Base cost | Cost ratio | Base rate /s | Status |
|---|---|---|---|---|---|
| 1 | Photon Collector | 10 | 1.15 | 0.5 | built |
| 2 | Gravitational Lens | 120 | 1.16 | 4 | built |
| 3 | Pulsar Array | 1.5e3 | 1.17 | 30 | built |
| 4 | Telemetry Relay | 2e4 | 1.18 | 250 | built |
| 5 | Quasar Tap | 3e5 | 1.19 | 2.2e3 | built |
| 6 | Magnetar Loom | 5e6 | 1.20 | 2e4 | planned |
| 7 | Neutrino Sieve | 1e8 | 1.21 | 1.8e5 | planned |
| 8 | Dyson Lattice | 2.5e9 | 1.22 | 1.7e6 | planned |

Arrays 6 to 8 unlock one at a time as you reach 10% of their base cost, so the list grows as you play.

### Photon upgrades

These are one-off purchases in photons, shown in a grid. All are lost on Decode.

| Upgrade | Cost | Effect |
|---|---|---|
| Focused Gathering | 50 | Gather gives +1% of photons/s (from 5% to 6%) |
| Collector Coating | 500 | Collectors x3 |
| Lens Grinding | 5e3 | Lenses x3 |
| Resonant Sync | 5e4 | Every array gets +1% per 10 total arrays owned |
| Pulsar Timing | 5e5 | Pulsar Arrays x3 |
| Relay Compression | 5e6 | Telemetry Relays x3 |
| Deep Field | 5e7 | All arrays x2 |
| Quasar Harness | 5e8 | Quasar Taps x3 |

## Layer 2: Telemetry (Decode)

- **Gain:** `floor(sqrt(photonsThisRun / 1e9))`. Show a live preview of the gain on the Decode button.
- **Passive bonus:** each unspent telemetry point gives +2% photon production. This makes saving versus spending a real choice.
- **Telemetry upgrades** are permanent across Decodes and lost on Recalibrate:

| Upgrade | Cost | Effect |
|---|---|---|
| Signal Memory | 1 | Start each run with 100 photons |
| Carrier Wave | 2 | All arrays x2 |
| Array Blueprints | 5 | Arrays cost 5% less (applies to cost ratio) |
| Echo Gathering | 10 | Gather also auto-clicks once per second |
| Compressed Packets | 25 | Telemetry gain x1.5 |
| Background Decoding | 50 | Gain 1% of pending telemetry per second while not Decoding |
| Milestone Harmonics | 100 | Milestones every 20 owned instead of 25 |
| Unlock Arrays 6 to 8 early | 250 | Magnetar, Sieve and Lattice visible from the start of a run |

- **Decode milestones** (based on total Decodes, kept until Recalibrate): 1 Decode keeps buy-max unlocked, 5 Decodes keeps photon upgrades bought, 10 Decodes unlocks the array autobuyer.

## Layer 3: Calibration (Recalibrate)

- **Gain:** `floor((telemetryThisRun / 1e6) ^ 0.3)`.
- **Array tuning.** Each calibration point can be put into one array. Every point in an array gives x1.5 to that array (multiplicative). Points can be moved freely, but only between runs. This is where builds come from.
- **Automation.** Calibration unlocks autobuyers, bought with calibration points:
  - Array autobuyer (per array, with an on/off toggle)
  - Photon upgrade autobuyer
  - Auto-Decode, triggered at a set amount of telemetry or after a set time
- **Recalibration milestones:** keep telemetry upgrades, then start runs with arrays, then passive telemetry gain without Decoding.

## Layer 4: Horizon Shards (Cross the Horizon)

This is the late-game loop and the point where break_infinity.js starts to matter.

- **Gain:** 1 shard per crossing at first, then scaled by how far past 1.8e308 you reached.
- **Horizon challenges.** You restart layers 1 to 3 with a restriction and get a permanent reward for finishing. Examples:
  - *Dark Sky:* arrays 5 to 8 are disabled.
  - *Silent Relay:* no telemetry passive bonus.
  - *Drift:* each array bought raises every array's cost ratio.
  - *Single Band:* you can only own one kind of array.
- **Shard upgrades:** larger permanent multipliers, faster automation, and an option to **break the horizon**. Breaking it lets photons go past 1.8e308 and sets up any future layers.

## Cross-cutting systems

### Achievements
- About 40 at launch, in rows by layer (for example: first array, 100 collectors, first Decode, finish every challenge).
- Each achievement gives +1% photon production, so they always matter.
- Pop up a toast on unlock. Show locked ones with a hint.

### Signal log (story)
- A short line of terminal-style text at key moments: first array, first Decode, and so on. This gives the game its deep-space feel without any art.
- Kept in a scrollable log panel.

### Statistics
- Per layer: totals, best run, fastest run, number of resets.
- Current run: time in run, photons this run.

### Settings
- Number notation: scientific (default), engineering, standard letters (K, M, B) and logarithm.
- Autosave interval, offline progress on or off, confirmation prompts for each reset.
- Keybinds: `G` gather, `1` to `8` buy an array, `M` buy max on all, `D` Decode.

### Offline progress
- Built for layer 1. As layers are added, offline time should simulate automation too (autobuyers, Auto-Decode), in chunks of up to 1,000 ticks, not one giant tick.

## UI layout

Tabs along the top, each shown once it unlocks:

1. **Arrays:** photons, gather, arrays, photon upgrades
2. **Telemetry:** Decode button with gain preview, telemetry upgrades, milestones
3. **Calibration:** array tuning, autobuyers
4. **Horizon:** challenges, shard upgrades
5. **Achievements**
6. **Log**
7. **Stats**
8. **Settings** (includes save, export, import, reset)

The photon count and photons/s stay pinned at the top of every tab.

## Technical plan

### Code structure

`game.js` will be split as systems are added, using plain ES modules with no build step:

```
src/
  main.js          boot, game loop, autosave
  state.js         freshState, save/load, migrations
  format.js        number and time formatting, notations
  layers/
    photons.js     arrays, photon upgrades
    telemetry.js   Decode, telemetry upgrades, milestones
    calibration.js Recalibrate, tuning, autobuyers
    horizon.js     crossing, challenges, shard upgrades
  achievements.js
  log.js
  ui/              one file per tab
```

### Rules

- **Production is one pure function.** It takes the state and returns photons/s, stacking every multiplier. The tick, offline progress and the UI all call it, so they always agree.
- **Content is data.** Arrays, upgrades, achievements and challenges are plain objects in arrays, like `GENERATORS` today. Adding content should not need new logic.
- **Save versioning.** `state.version` goes up with each change to the save shape, and `state.js` runs migrations in order so old saves keep working.
- **Decimals everywhere.** Any value that can grow uses `Decimal`. Counts that stay small (owned arrays, achievement flags) can be plain numbers.

## Build order

| Phase | Scope | Status |
|---|---|---|
| 1 | Layer 1 core: gather, 5 arrays, bulk buy, milestones, save/load, offline, export/import | done |
| 2 | Split code into modules, tabs, notation setting | next |
| 3 | Arrays 6 to 8, photon upgrades | |
| 4 | Telemetry layer: Decode, upgrades, milestones | |
| 5 | Achievements, signal log, stats tab | |
| 6 | Calibration layer: tuning, autobuyers, Auto-Decode | |
| 7 | Balancing pass on layers 1 to 3, offline simulation of automation | |
| 8 | Horizon layer and challenges | |
| 9 | Keybinds, settings polish, mobile pass | |
