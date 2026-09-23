// Static game data and tuning constants. No logic here.
window.SL = window.SL || {};

SL.config = {
  SAVE_KEY: 'sublight_save',
  SAVE_VERSION: 1,
  TICK_MS: 50,                     // 20 ticks per second
  AUTOSAVE_MS: 10000,
  OFFLINE_CAP_SEC: 24 * 60 * 60,

  BASE_COST_SCALE: 1.15,
  PING_BASE: 1,

  UNLOCK_BYTES_AT: 10000,          // photons
  UNLOCK_CALIBRATION_AT: 1e6,      // lifetime bytes
  CORE_DIVISOR: 1e6,               // cores = floor(sqrt(lifetimeBytes / CORE_DIVISOR))
  CORE_BONUS: 0.10,                // +10% production per core

  generators: [
    { id: 'dipole',         name: 'Dipole Antenna',      baseCost: 15,    production: 1 },
    { id: 'dish',           name: 'Dish Array',          baseCost: 100,   production: 8 },
    { id: 'interferometer', name: 'Interferometer Grid', baseCost: 1100,  production: 65 },
    { id: 'sublight',       name: 'Sub-Light Sensor',    baseCost: 12000, production: 450 },
  ],

  // Effects are read by SL.engine; the id is the contract between the two.
  upgrades: [
    { id: 'signalAmp',   name: 'Signal Amplification',   cost: 500,   desc: 'Manual pings gain +1% of Photons/sec.' },
    { id: 'cryo',        name: 'Cryo-Cooling',           cost: 2500,  desc: 'Tier 1 and Tier 2 generators are 100% more efficient.' },
    { id: 'compression', name: 'Algorithmic Compression', cost: 25000, desc: 'Cost scaling lowered from 1.15 to 1.13.' },
  ],
};
