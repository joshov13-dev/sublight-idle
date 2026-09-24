// Static game data and tuning constants. No logic here.
window.SL = window.SL || {};

SL.config = {
  SAVE_KEY: 'sublight_save',
  SAVE_VERSION: 1,
  TICK_MS: 50,                     // 20 ticks per second
  AUTOSAVE_MS: 10000,
  OFFLINE_CAP_SEC: 24 * 60 * 60,
  OFFLINE_MAX_STEPS: 1000,         // offline time is simulated in this many slices
  OFFLINE_REPORT_SEC: 60,          // show the "welcome back" popup after this long away

  BASE_COST_SCALE: 1.15,
  COMPRESSED_COST_SCALE: 1.13,
  PING_BASE: 1,
  AUTO_PING_RATE: 5,               // pings per second once Auto-Ping is unlocked

  UNLOCK_BYTES_AT: 10000,          // photons
  UNLOCK_CALIBRATION_AT: 1e6,      // lifetime bytes
  CORE_DIVISOR: 1e6,               // cores = floor(sqrt(bytesThisRun / CORE_DIVISOR))
  CORE_BONUS: 0.10,                // +10% production per core

  // Telemetry: each active thread diverts a share of gross photon output into bytes.
  THREAD_BASE_COST: 10000,
  THREAD_COST_SCALE: 4,
  MAX_THREADS: 20,
  THREAD_SHARE: 0.05,              // 5% of gross photons/sec per active thread
  PHOTONS_PER_BYTE: 100,

  generators: [
    { id: 'dipole',         name: 'Dipole Antenna',      baseCost: 15,    production: 1 },
    { id: 'dish',           name: 'Dish Array',          baseCost: 100,   production: 8 },
    { id: 'interferometer', name: 'Interferometer Grid', baseCost: 1100,  production: 65 },
    { id: 'sublight',       name: 'Sub-Light Sensor',    baseCost: 12000, production: 450 },
  ],

  // Spectrometer: one-off purchases with photons. Effects are read by SL.engine by id.
  upgrades: [
    { id: 'signalAmp',   name: 'Signal Amplification',    cost: 500,   desc: 'Manual pings gain +1% of Photons/sec.' },
    { id: 'cryo',        name: 'Cryo-Cooling',            cost: 2500,  desc: 'Tier 1 and Tier 2 generators are 100% more efficient.' },
    { id: 'compression', name: 'Algorithmic Compression', cost: 25000, desc: 'Cost scaling lowered from 1.15 to 1.13.' },
  ],

  // Telemetry: levelled upgrades bought with bytes. Cost = baseCost * scale ^ level.
  telemetryUpgrades: [
    { id: 'indexing', name: 'Buffer Indexing',   baseCost: 1000, scale: 5, maxLevel: Infinity,
      desc: 'Photon output x(1 + 0.1 per level x log10(Bytes + 1)). Scales with your byte reserve.' },
    { id: 'packets',  name: 'Packet Compression', baseCost: 2500, scale: 6, maxLevel: Infinity,
      desc: 'Threads produce 50% more bytes per level.' },
    { id: 'ecc',      name: 'Error Correction',   baseCost: 5000, scale: 10, maxLevel: 5,
      desc: 'Refunds 10% of diverted photons per level (max 5).' },
  ],

  // Calibration perks unlock when total Pulsar Cores reach `cores`. Cores are never spent.
  perks: [
    { id: 'autoPing',            cores: 1,  name: 'Auto-Ping',               desc: 'Pings the array 5 times per second.' },
    { id: 'auto_dipole',         cores: 2,  name: 'Dipole Autobuyer',        desc: 'Buys Dipole Antennas automatically.' },
    { id: 'auto_dish',           cores: 3,  name: 'Dish Autobuyer',          desc: 'Buys Dish Arrays automatically.' },
    { id: 'auto_interferometer', cores: 5,  name: 'Interferometer Autobuyer', desc: 'Buys Interferometer Grids automatically.' },
    { id: 'auto_sublight',       cores: 8,  name: 'Sub-Light Autobuyer',     desc: 'Buys Sub-Light Sensors automatically.' },
    { id: 'autoThreads',         cores: 12, name: 'Thread Scheduler',        desc: 'Buys and activates processing threads automatically.' },
  ],
};
