'use strict';

const BALANCE = {
  gatherBase: 1,
  gatherPct: 0.05,
  milestoneStep: 25,
  milestoneBase: 2,
  decodeThreshold: 1e9,
  telemetryExponent: 0.4,
  widebandBonus: 0.15,
  telemetryBase: 3,
  telemetryBonusExponent: 0.3,
  afterglowCap: 100,
  recalThreshold: 1e8,
  calibrationExponent: 0.08,
  tuningPower: 1.5,
  lightspeed: '1e1000',
  dragExponent: 0.5,
  offlineCapSeconds: 24 * 60 * 60,
};

const ARRAYS = [
  { id: 'collector', name: 'Photon Collector', desc: 'Passive light sails skimming stray photons.', baseCost: 10, costRatio: 1.15, baseRate: 0.5 },
  { id: 'lens', name: 'Gravitational Lens', desc: 'Bends distant starlight into your collectors.', baseCost: 120, costRatio: 1.15, baseRate: 5 },
  { id: 'pulsar', name: 'Pulsar Array', desc: 'Calibrated to the rhythm of dying stars.', baseCost: 1.5e3, costRatio: 1.15, baseRate: 45 },
  { id: 'relay', name: 'Telemetry Relay', desc: 'Decodes cosmic telemetry into raw light.', baseCost: 2e4, costRatio: 1.15, baseRate: 400 },
  { id: 'quasar', name: 'Quasar Tap', desc: 'Siphons the output of a galactic core.', baseCost: 3e5, costRatio: 1.15, baseRate: 3.5e3 },
  { id: 'magnetar', name: 'Magnetar Loom', desc: 'Weaves light from collapsing magnetic fields.', baseCost: 5e6, costRatio: 1.15, baseRate: 3.2e4 },
  { id: 'sieve', name: 'Neutrino Sieve', desc: 'Filters ghost particles for their last glimmer.', baseCost: 1e8, costRatio: 1.15, baseRate: 3e5 },
  { id: 'dyson', name: 'Dyson Lattice', desc: 'A shell of mirrors around a borrowed star.', baseCost: 2.5e9, costRatio: 1.15, baseRate: 3e6 },
];

const PHOTON_UPGRADES = [
  { id: 'focus', name: 'Focused Gathering', cost: 50, desc: 'Gather gives 3 photons plus 10% of photons/s.' },
  { id: 'coating', name: 'Collector Coating', cost: 300, desc: 'Photon Collectors x3.', array: 'collector' },
  { id: 'grinding', name: 'Lens Grinding', cost: 3e3, desc: 'Gravitational Lenses x3.', array: 'lens' },
  { id: 'resonant', name: 'Resonant Sync', cost: 3e4, desc: 'All arrays x(1 + arrays owned / 100).' },
  { id: 'timing', name: 'Pulsar Timing', cost: 3e5, desc: 'Pulsar Arrays x3.', array: 'pulsar' },
  { id: 'compression', name: 'Relay Compression', cost: 3e6, desc: 'Telemetry Relays x3.', array: 'relay' },
  { id: 'deepfield', name: 'Deep Field', cost: 3e7, desc: 'All arrays x2.' },
  { id: 'harness', name: 'Quasar Harness', cost: 3e8, desc: 'Quasar Taps x3.', array: 'quasar' },
  { id: 'weave', name: 'Magnetar Weave', cost: 3e9, desc: 'Magnetar Looms x3.', array: 'magnetar' },
  { id: 'deepsieve', name: 'Deep Sieve', cost: 3e10, desc: 'Neutrino Sieves and Dyson Lattices x3.', arrays: ['sieve', 'dyson'] },
];

const TELEMETRY_UPGRADES = [
  { id: 'memory', name: 'Signal Memory', cost: 1, desc: 'Start each run with 1,000 photons.' },
  { id: 'carrier', name: 'Carrier Wave', cost: 2, desc: 'All arrays x3.' },
  { id: 'blueprints', name: 'Array Blueprints', cost: 5, desc: 'Array costs scale 20% slower.' },
  { id: 'echo', name: 'Echo Gathering', cost: 10, desc: 'Gather fires by itself 4 times a second.' },
  { id: 'packets', name: 'Compressed Packets', cost: 25, desc: 'Telemetry gain x2.' },
  { id: 'harmonics', name: 'Milestone Harmonics', cost: 60, desc: 'Milestones every 20 owned instead of 25.' },
  { id: 'afterglow', name: 'Afterglow', cost: 150, desc: 'All arrays x(1 + minutes in this run), up to x100.' },
  { id: 'archive', name: 'Archive Access', cost: 400, desc: 'Spending telemetry no longer shrinks your telemetry boost.' },
];

const TELEMETRY_REPEATABLES = [
  { id: 'amplifier', name: 'Signal Amplifier', baseCost: 5, costGrowth: 10, desc: 'All arrays x2 per level.' },
  { id: 'decoder', name: 'Decoder Efficiency', baseCost: 50, costGrowth: 10, desc: 'Telemetry gain x1.25 per level.' },
];

const DECODE_MILESTONES = [
  { count: 2, desc: 'Keep photon upgrades when you Decode.' },
  { count: 5, desc: 'Unlock the array and photon upgrade autobuyers (every 2 seconds).' },
  { count: 10, desc: 'Autobuyers run every tick.' },
  { count: 20, desc: 'Telemetry gain x2.' },
];

const CALIBRATION_UPGRADES = [
  { id: 'autodecode', name: 'Auto-Decode', cost: 1, desc: 'Unlock Auto-Decode.' },
  { id: 'harmonic', name: 'Harmonic Lock', cost: 2, desc: 'Milestones multiply by 3 instead of 2.' },
  { id: 'wideband', name: 'Wide Band', cost: 3, desc: 'Telemetry gain uses ^0.55 instead of ^0.4.' },
  { id: 'precision', name: 'Precision Tuning', cost: 5, desc: 'Tuning uses ^2 instead of ^1.5.' },
  { id: 'ampauto', name: 'Amplifier Autobuyer', cost: 8, desc: 'Automatically buy Signal Amplifier and Decoder Efficiency.' },
  { id: 'pulsarlock', name: 'Pulsar Lock', cost: 13, desc: 'Photon production ^1.05.' },
];

const RECAL_MILESTONES = [
  { count: 1, desc: 'Keep Decode milestones when you Recalibrate.' },
  { count: 3, desc: 'Keep telemetry upgrades when you Recalibrate.' },
  { count: 6, desc: 'Keep Signal Amplifier and Decoder Efficiency levels when you Recalibrate.' },
];

const HORIZON_UPGRADES = [
  { id: 'singularity', name: 'Singularity Lens', cost: 1, desc: 'Telemetry and calibration gain x(1 + shards earned).' },
  { id: 'eventmemory', name: 'Event Memory', cost: 1, desc: 'All Decode and Recalibration milestones are always active.' },
  { id: 'seed', name: 'Stellar Seed', cost: 1, desc: 'Start each Horizon run with 100 calibration points.' },
  { id: 'autorecal', name: 'Auto-Recalibrate', cost: 1, desc: 'Unlock Auto-Recalibrate.' },
  { id: 'deepseed', name: 'Deep Seed', cost: 2, desc: 'Start each Horizon run with 1e6 calibration points.' },
  { id: 'break', name: 'Break the Horizon', cost: 3, desc: 'Photons can pass 1.8e308, and shard gain grows x10 for every 100 orders of magnitude past it. Needs all 4 challenges.' },
  { id: 'autocross', name: 'Auto-Cross', cost: 10, desc: 'Unlock Auto-Cross.', needsBreak: true },
];

const HORIZON_REPEATABLES = [
  { id: 'tidal', name: 'Tidal Lock', costs: [1, 1, 2, 2, 3], desc: 'Milestones happen 1 owned sooner per level.' },
  { id: 'resonance', name: 'Horizon Resonance', costs: [50, 100, 200, 350, 600, 1e3, 1.8e3, 3e3, 5e3, 9e3, 1.6e4, 4e4, 1e5, 3e5, 1e6], desc: 'Horizon drag is 0.01 weaker per level.', needsBreak: true },
  { id: 'condenser', name: 'Shard Condenser', baseCost: 100, costGrowth: 10, desc: 'Shard gain x2 per level.', needsBreak: true },
];

const CHALLENGES = [
  { id: 'darksky', name: 'Dark Sky', desc: 'Only arrays 1 to 4 produce photons.', reward: 'Array costs scale a further 10% slower.' },
  { id: 'silent', name: 'Silent Relay', desc: 'The telemetry bonus is disabled.', reward: 'The telemetry bonus uses ^0.45 instead of ^0.3.' },
  { id: 'frozen', name: 'Frozen Lattice', desc: 'Milestones need 10 more owned.', reward: 'Milestones happen 2 owned sooner.' },
  { id: 'singleband', name: 'Single Band', desc: 'Only your highest owned array produces photons.', reward: 'Tuning uses an extra ^0.5.' },
];

const SIGNAL_LINES = {
  start: 'Sublight probe online. Photon sails deployed. Awaiting input.',
  firstArray: 'First collector locked on. The dark is not as empty as it looks.',
  array: name => `${name} brought online.`,
  firstUpgrade: 'Upgrade applied. Efficiency climbing.',
  decodeReady: 'Enough light gathered. The noise has a pattern. Decode it.',
  firstDecode: 'Telemetry decoded. The signal points further out. Everything resets, but you remember.',
  recalReady: 'Telemetry saturation reached. The arrays can be recalibrated.',
  firstRecal: 'Pulsar arrays recalibrated. You can now tune each array by hand.',
  horizonReached: 'Photon density at the limit. Beyond this lies the horizon.',
  firstCross: 'You crossed the horizon. Nothing looks the same from this side.',
  challenge: name => `Challenge complete: ${name}. The horizon remembers.`,
  broken: 'The horizon breaks. Light pours through without limit.',
  lightspeed: 'Velocity: c. The sublight era is over.',
};
