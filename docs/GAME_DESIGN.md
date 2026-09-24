# Sublight Idle: Game Design

This describes the game as built. All four layers, automation, challenges and the ending are in place. The numbers were tuned with `tools/simulate.js`, which plays the real game logic with a simple bot.

## Pillars

- **Minimalist.** Dark UI, text and numbers only, one accent colour per layer (sky, emerald, amber, violet).
- **Always something to do next.** Locked tabs stay visible and say how to unlock them.
- **Layers that change how you play.** Each layer adds a new system: telemetry upgrades, array tuning, challenges.
- **Respect the player's time.** Offline progress, autobuyers and auto-resets remove the need to click later on.

## Pacing

Times for the simulated bot, which plays efficiently and never idles. Real players will be slower.

| Moment | Bot time |
|---|---|
| First Decode | 26 min |
| First Recalibrate | 1.7 h |
| First Horizon crossing | 21.5 h |
| Crossings down to about 2 hours each (Tidal Lock maxed) | about 70 h |
| All 4 challenges done, Horizon broken | 90 h |
| Lightspeed (1e1000 photons, the ending) | 109 h |

## Layers

| Layer | Resource | Reset action | Unlocks at | Gain |
|---|---|---|---|---|
| 1 | Photons | none | start | arrays and gathering |
| 2 | Telemetry | **Decode** | 1e9 photons in one run | 3 × (photons this run / 1e9)^0.4 × multipliers |
| 3 | Calibration points | **Recalibrate** | 1e8 telemetry in one Recalibration | (telemetry this Recalibration / 1e8)^0.08 × multipliers |
| 4 | Horizon Shards | **Cross the Horizon** | 1.8e308 photons | 1 per crossing; after breaking the Horizon, x10 per 100 orders of magnitude past 1.8e308 |

What each reset clears:

- **Decode:** photons, arrays and photon upgrades (upgrades are kept from 2 Decodes).
- **Recalibrate:** photons, arrays, photon upgrades and telemetry, plus telemetry upgrades, Amplifier and Decoder levels and the Decode count until milestones keep them.
- **Cross:** everything except shards, Horizon upgrades and resonances, challenges, achievements, stats and settings.

## Layer 1: Photons

Every run starts with 10 photons (1,000 with Signal Memory), enough for a first Collector.

### Arrays

All arrays cost x1.15 more per purchase. Every 25 owned multiplies that array by 2. Telemetry, calibration, Horizon and challenge rewards improve both numbers.

| # | Array | Base cost | Base rate /s |
|---|---|---|---|
| 1 | Photon Collector | 10 | 0.5 |
| 2 | Gravitational Lens | 120 | 5 |
| 3 | Pulsar Array | 1.5e3 | 45 |
| 4 | Telemetry Relay | 2e4 | 400 |
| 5 | Quasar Tap | 3e5 | 3.5e3 |
| 6 | Magnetar Loom | 5e6 | 3.2e4 |
| 7 | Neutrino Sieve | 1e8 | 3e5 |
| 8 | Dyson Lattice | 2.5e9 | 3e6 |

An array appears once you have produced 10% of its base cost this run, and stays visible after that.

**Gather** gives 1 photon plus 5% of photons/s per click.

### Photon upgrades

| Upgrade | Cost | Effect |
|---|---|---|
| Focused Gathering | 50 | Gather gives 3 photons plus 10% of photons/s |
| Collector Coating | 300 | Collectors x3 |
| Lens Grinding | 3e3 | Lenses x3 |
| Resonant Sync | 3e4 | All arrays x(1 + arrays owned / 100) |
| Pulsar Timing | 3e5 | Pulsar Arrays x3 |
| Relay Compression | 3e6 | Telemetry Relays x3 |
| Deep Field | 3e7 | All arrays x2 |
| Quasar Harness | 3e8 | Quasar Taps x3 |
| Magnetar Weave | 3e9 | Magnetar Looms x3 |
| Deep Sieve | 3e10 | Neutrino Sieves and Dyson Lattices x3 |

## Layer 2: Telemetry

- **Bonus:** all arrays x(1 + unspent telemetry)^0.3. Archive Access switches it to telemetry earned this Recalibration, so spending no longer lowers it.
- **Upgrades** (one-off, lost on Recalibrate until 3 Recalibrations):

| Upgrade | Cost | Effect |
|---|---|---|
| Signal Memory | 1 | Start each run with 1,000 photons |
| Carrier Wave | 2 | All arrays x3 |
| Array Blueprints | 5 | Array cost scaling 20% slower |
| Echo Gathering | 10 | Gather fires by itself 4 times a second |
| Compressed Packets | 25 | Telemetry gain x2 |
| Milestone Harmonics | 60 | Milestones every 20 owned instead of 25 |
| Afterglow | 150 | All arrays x(1 + minutes in this run), up to x100 |
| Archive Access | 400 | The bonus counts telemetry earned, not just unspent |

- **Signal processing** (repeatable): Signal Amplifier, all arrays x2 per level, cost 5 × 10^level. Decoder Efficiency, telemetry gain x1.25 per level, cost 50 × 10^level.
- **Decode milestones:** 2 keep photon upgrades; 5 unlock the array and upgrade autobuyers (every 2 seconds); 10 make them run every tick; 20 double telemetry gain.

## Layer 3: Calibration

- **Tuning:** put points into an array for x(1 + points)^1.5 on that array. Points only come back through **Respec**, which also restarts the current run.
- **Upgrades** (spent points are gone until the next crossing):

| Upgrade | Cost | Effect |
|---|---|---|
| Auto-Decode | 1 | Unlock Auto-Decode |
| Harmonic Lock | 2 | Milestones multiply by 3 instead of 2 |
| Wide Band | 3 | Telemetry gain uses ^0.55 instead of ^0.4 |
| Precision Tuning | 5 | Tuning uses ^2 instead of ^1.5 |
| Amplifier Autobuyer | 8 | Buys Signal Amplifier and Decoder Efficiency |
| Pulsar Lock | 13 | Photon production ^1.05 |

- **Recalibration milestones:** 1 keeps the Decode count, 3 keep telemetry upgrades, 6 keep Amplifier and Decoder levels.

## Layer 4: Horizon

Photons stop at 1.8e308 until the Horizon breaks.

### Horizon upgrades

| Upgrade | Cost | Effect |
|---|---|---|
| Singularity Lens | 1 | Telemetry and calibration gain x(1 + shards earned) |
| Event Memory | 1 | All Decode and Recalibration milestones always active |
| Stellar Seed | 1 | Start each Horizon run with 100 calibration points |
| Auto-Recalibrate | 1 | Unlock Auto-Recalibrate |
| Deep Seed | 2 | Start each Horizon run with 1e6 calibration points |
| Break the Horizon | 3 | Needs all 4 challenges. Photons pass 1.8e308 and shard gain scales |
| Auto-Cross | 10 | After the break: unlock Auto-Cross |

### Resonances (repeatable)

- **Tidal Lock:** milestones 1 owned sooner per level, 5 levels costing 1, 1, 2, 2 and 3 shards. This is the main speed-up between crossings.
- **Horizon Resonance** (after the break): horizon drag 0.01 weaker per level, 15 levels costing 50 up to 1e6 shards.
- **Shard Condenser** (after the break): shard gain x2 per level, cost 100 × 10^level.

### Challenges

Open after the first crossing. Starting one resets like a crossing. Reach 1.8e308 photons under the restriction, then cross to complete it.

| Challenge | Restriction | Reward |
|---|---|---|
| Dark Sky | Only arrays 1 to 4 produce | Array cost scaling a further 10% slower |
| Silent Relay | No telemetry bonus | Telemetry bonus uses ^0.45 instead of ^0.3 |
| Frozen Lattice | Milestones need 10 more owned | Milestones 2 owned sooner |
| Single Band | Only your highest owned array produces | Tuning uses an extra ^0.5 |

### Beyond the Horizon

After the break, production above 1.8e308/s is softcapped by **horizon drag**: the excess counts at ^0.50, raised by Horizon Resonance. Each Resonance level moves the point where a run stalls further out (about 1e545 at ^0.50, 1e790 at ^0.60, past 1e1000 at ^0.64).

**Lightspeed**, 1e1000 photons, is the ending. A summary screen appears and the game carries on.

## The Signal (the hook)

The part that makes Sublight different. The best-loved idle games (Universal Paperclips, A Dark Room) hook players with a mystery that unfolds, not just bigger numbers. The Signal gives Sublight that.

- **Transmissions** arrive every 8 minutes of play, including offline. The first comes after 45 seconds. Up to 3 queue (5 with The Listener).
- **Tuning:** a scope shows the incoming wave (green, dashed) and yours (amber). Match frequency and phase with two dials, then hold signal strength at 97% or more for 1 second to lock. Later signals wobble more, so they are harder to read.
- **Story:** each clean lock reveals the next of 24 transmissions from probe SL-1. The story runs through the time loop behind the Horizon, and the last line loops back to the first. Some transmissions stay static until you reach a layer (telemetry, calibration, the Horizon, the break).
- **Rewards:** every lock gives 1 Star Fragment, plus 1 for a story line and 1 for a perfect lock (99.5%). It also starts a **Signal Surge**: all arrays x3 for 3 minutes.
- **Star chart:** 7 constellations, 38 stars. Each star costs its constellation's tier (1 to 4 fragments), and completing a constellation grants its reward:

| Constellation | Stars | Tier | Reward |
|---|---|---|---|
| The Lantern | 3 | 1 | All arrays x3 |
| The Weaver | 4 | 1 | Gather x10, comets pay double |
| The Listener | 5 | 2 | Transmissions twice as often, 2 more can queue |
| The Archivist | 5 | 2 | Telemetry gain x3 |
| The Tuner | 6 | 3 | Surge lasts twice as long and gives x10 |
| The Pilot | 7 | 3 | Calibration gain x2 |
| The Returning | 8 | 4 | All arrays x1e25 |

- **Comets** streak across the screen every 1.5 to 4 minutes while you are watching. Click one for 2 minutes of production and a 30% chance of a Star Fragment.

## Visuals

- An animated starfield sits behind the whole game. It drifts faster as production grows, turns to warp streaks during a Surge, and takes on the colour of your highest layer.
- Particle bursts on gathering, locking a signal, lighting stars and catching comets.
- Motion is switched off for players who ask their system to reduce motion.

## Cross-cutting systems

- **Achievements:** 48, in 6 rows. Each gives all arrays x1.03, compounding.
- **Signal log:** terminal-style lines at key moments, shown as toasts and kept in the Log tab.
- **Stats:** totals, fastest runs and the current run for each layer.
- **Settings:** notation (scientific, engineering, letters, logarithm), autosave interval, offline progress, reset confirmations.
- **Keys:** G gather, 1 to 8 buy an array, M buy max of all, D Decode, R Recalibrate, C cross.
- **Automation:** Auto-Decode, Auto-Recalibrate and Auto-Cross each fire on a gain amount, a multiple of what you have earned, or a run length.
- **Offline progress:** up to 24 hours, simulated as up to 1,000 ticks so automation keeps working. A summary shows what happened.
- **Saving:** localStorage every 10 seconds by default, plus on hide and close. Export and import use a base64 code. `state.js` migrates older saves and falls back to defaults for any broken field.

## Balance notes

Lessons from tuning, for future changes:

- **Avoid continuous feedback loops.** An early design paid out telemetry every second, and that telemetry raised its own payout. Photons hit 1.8e308 within minutes. Resets must stay discrete.
- **The milestone interval is the strongest lever.** Going from every 20 owned to every 19 roughly halves a Horizon run, which is why Tidal Lock moves it one step per level.
- **Wide Band is sensitive.** Adding 0.15 to the telemetry exponent gets the first Horizon in about 21 hours. Adding 0.1 stalls it past 250 hours.
- **Past the Horizon, drag sets the wall.** Small changes to the drag exponent move where runs stall by hundreds of orders of magnitude.

Run `npm run simulate` after any balance change and compare with the pacing table above.

## Code structure

Plain scripts loaded in order, so the game also runs from `file://`:

```
index.html
src/
  format.js        number and time formatting, notations
  data.js          content: arrays, upgrades, milestones, challenges, balance constants
  signal.js        transmissions, tuning, story, constellations, comets (no DOM)
  state.js         fresh state, save and load, migrations
  achievements.js  achievement definitions
  engine.js        formulas, purchases, resets, automation, ticks (no DOM)
  ui.js            tabs, widgets, modals, toasts, the Signal tab
  visuals.js       starfield canvas, particles, comets
  main.js          boot, game loop, saving, offline progress, keys
  style.css        small hand-written styles
  tailwind.css     generated by npm run build:css
vendor/            break_infinity.js (MIT)
tools/simulate.js  balance simulator
```
