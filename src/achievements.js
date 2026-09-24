'use strict';

const allOwned = (list, ids) => ids.every(id => list.includes(id));
const photonsAtLeast = n => () => state.photons.gte(n);

const ACHIEVEMENTS = [
  { id: 'firstlight', row: 1, name: 'First Light', desc: 'Buy a Photon Collector.', check: () => state.arrays.collector > 0 },
  { id: 'lensflare', row: 1, name: 'Lens Flare', desc: 'Buy a Gravitational Lens.', check: () => state.arrays.lens > 0 },
  { id: 'steadypulse', row: 1, name: 'Steady Pulse', desc: 'Own 25 Pulsar Arrays.', check: () => state.arrays.pulsar >= 25 },
  { id: 'hoarder', row: 1, name: 'Hoarder', desc: 'Have 1e6 photons.', check: photonsAtLeast(1e6) },
  { id: 'fleet', row: 1, name: 'Collector Fleet', desc: 'Own 100 Photon Collectors.', check: () => state.arrays.collector >= 100 },
  { id: 'spectrum', row: 1, name: 'Full Spectrum', desc: 'Own at least one of every array.', check: () => ARRAYS.every(g => state.arrays[g.id] > 0) },
  { id: 'pattern', row: 1, name: 'Pattern Found', desc: 'Have 1e9 photons.', check: photonsAtLeast(1e9) },
  { id: 'upgraded', row: 1, name: 'Fully Upgraded', desc: 'Own every photon upgrade.', check: () => allOwned(state.photonUpgrades, PHOTON_UPGRADES.map(u => u.id)) },

  { id: 'decoded', row: 2, name: 'Decoded', desc: 'Decode for the first time.', check: () => state.stats.decodes > 0 },
  { id: 'signalstack', row: 2, name: 'Signal Stack', desc: 'Have 100 telemetry.', check: () => state.telemetry.gte(100) },
  { id: 'routine', row: 2, name: 'Routine Work', desc: 'Decode 20 times in total.', check: () => state.stats.decodes >= 20 },
  { id: 'uplink', row: 2, name: 'Full Uplink', desc: 'Own every telemetry upgrade.', check: () => allOwned(state.telemetryUpgrades, TELEMETRY_UPGRADES.map(u => u.id)) },
  { id: 'loud', row: 2, name: 'Loud and Clear', desc: 'Reach Signal Amplifier level 10.', check: () => state.repeatables.amplifier >= 10 },
  { id: 'quickread', row: 2, name: 'Quick Read', desc: 'Finish a Decode run in under 60 seconds.', check: () => state.stats.fastestDecode <= 60 },
  { id: 'deepsignal', row: 2, name: 'Deep Signal', desc: 'Have 1e6 telemetry.', check: () => state.telemetry.gte(1e6) },
  { id: 'flood', row: 2, name: 'Photon Flood', desc: 'Have 1e30 photons.', check: photonsAtLeast(1e30) },

  { id: 'recalibrated', row: 3, name: 'Recalibrated', desc: 'Recalibrate for the first time.', check: () => state.stats.recals > 0 },
  { id: 'fineadjust', row: 3, name: 'Fine Adjustments', desc: 'Put 10 tuning points into one array.', check: () => ARRAYS.some(g => state.tuning[g.id] >= 10) },
  { id: 'calibrated', row: 3, name: 'Well Calibrated', desc: 'Earn 50 calibration points in total.', check: () => state.stats.calibrationEarned >= 50 },
  { id: 'handsfree', row: 3, name: 'Hands Free', desc: 'Turn on Auto-Decode.', check: () => hasCalibration('autodecode') && state.automation.decode.on },
  { id: 'precise', row: 3, name: 'Every Adjustment', desc: 'Own every calibration upgrade.', check: () => allOwned(state.calibrationUpgrades, CALIBRATION_UPGRADES.map(u => u.id)) },
  { id: 'bright', row: 3, name: 'Bright', desc: 'Have 1e100 photons.', check: photonsAtLeast('1e100') },
  { id: 'blinding', row: 3, name: 'Blinding', desc: 'Have 1e200 photons.', check: photonsAtLeast('1e200') },
  { id: 'rapidrecal', row: 3, name: 'Rapid Recalibration', desc: 'Finish a Recalibration run in under 10 minutes.', check: () => state.stats.fastestRecal <= 600 },

  { id: 'eventhorizon', row: 4, name: 'Event Horizon', desc: 'Reach 1.8e308 photons.', check: () => state.photons.gte(HORIZON) },
  { id: 'beyond', row: 4, name: 'Beyond', desc: 'Cross the Horizon.', check: () => state.stats.crossings > 0 },
  { id: 'shards', row: 4, name: 'Shard Collector', desc: 'Earn 10 Horizon Shards in total.', check: () => state.shardsEarned.gte(10) },
  { id: 'inthedark', row: 4, name: 'In the Dark', desc: 'Complete Dark Sky.', check: () => challengeDone('darksky') },
  { id: 'radiosilence', row: 4, name: 'Radio Silence', desc: 'Complete Silent Relay.', check: () => challengeDone('silent') },
  { id: 'thaw', row: 4, name: 'Thaw', desc: 'Complete Frozen Lattice.', check: () => challengeDone('frozen') },
  { id: 'onenote', row: 4, name: 'One Note', desc: 'Complete Single Band.', check: () => challengeDone('singleband') },
  { id: 'broken', row: 4, name: 'Broken', desc: 'Break the Horizon.', check: () => isBroken() },

  { id: 'pastlimit', row: 5, name: 'Past the Limit', desc: 'Have 1e400 photons.', check: photonsAtLeast('1e400') },
  { id: 'denselight', row: 5, name: 'Dense Light', desc: 'Have 1e600 photons.', check: photonsAtLeast('1e600') },
  { id: 'resonant', row: 5, name: 'Resonant', desc: 'Reach Horizon Resonance level 5.', check: () => state.repeatables.resonance >= 5 },
  { id: 'lightspeed', row: 5, name: 'Lightspeed', desc: 'Have 1e1000 photons.', check: photonsAtLeast(BALANCE.lightspeed) },
  { id: 'busyhands', row: 5, name: 'Busy Hands', desc: 'Gather 1,000 times.', check: () => state.stats.gathers >= 1000 },
  { id: 'dedicated', row: 5, name: 'Dedicated', desc: 'Play for 1 hour.', check: () => state.stats.timePlayed >= 3600 },
  { id: 'longhaul', row: 5, name: 'Long Haul', desc: 'Play for 3 days.', check: () => state.stats.timePlayed >= 3 * 86400 },
  { id: 'speedrun', row: 5, name: 'Speed of Light', desc: 'Finish a Horizon run in under 1 hour.', check: () => state.stats.fastestCross <= 3600 },
];
