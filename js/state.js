// The single source of truth for game data.
// Anything added here must also be handled in fromPlain() so old saves load.
window.SL = window.SL || {};

SL.state = null;

SL.newState = function () {
  const generators = {};
  SL.config.generators.forEach(g => { generators[g.id] = 0; });

  return {
    version: SL.config.SAVE_VERSION,
    lastTick: Date.now(),

    photons: new Decimal(0),
    lifetimePhotons: new Decimal(0),
    bytes: new Decimal(0),
    bytesThisRun: new Decimal(0),     // drives the Pulsar Core reward
    lifetimeBytes: new Decimal(0),    // all time; drives the Calibration unlock
    pulsarCores: new Decimal(0),

    generators,          // id -> amount owned (plain number)
    upgrades: {},        // spectrometer id -> true when bought
    telemetry: {},       // telemetry upgrade id -> level
    threads: { owned: 0, active: 0 },

    unlocks: { telemetry: false, calibration: false },
    automation: {},      // perk id -> false when switched off (on by default)

    stats: { startTime: Date.now(), calibrations: 0, pings: 0 },
    settings: { notation: 'scientific', buyMode: '1', activeTab: 'array' },
  };
};

// Keys holding Decimals. Used when (de)serialising.
SL.DECIMAL_KEYS = ['photons', 'lifetimePhotons', 'bytes', 'bytesThisRun', 'lifetimeBytes', 'pulsarCores'];

SL.toPlain = function (state) {
  const out = JSON.parse(JSON.stringify(state));
  SL.DECIMAL_KEYS.forEach(k => { out[k] = state[k].toString(); });
  return out;
};

// Merges a loaded object over a fresh state so missing fields get defaults.
SL.fromPlain = function (plain) {
  if (!plain || typeof plain !== 'object') throw new Error('Not a save object');
  const s = SL.newState();
  for (const key of Object.keys(s)) {
    if (plain[key] === undefined) continue;
    if (SL.DECIMAL_KEYS.includes(key)) {
      const d = new Decimal(plain[key]);
      if (!isFinite(d.mantissa)) throw new Error('Bad number in save: ' + key);
      s[key] = d;
    } else if (typeof s[key] === 'object' && s[key] !== null) Object.assign(s[key], plain[key]);
    else s[key] = plain[key];
  }
  return s;
};
