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
    lifetimeBytes: new Decimal(0),
    pulsarCores: new Decimal(0),

    generators,          // id -> amount owned (plain number)
    upgrades: {},        // id -> true when bought

    unlocks: { telemetry: false, calibration: false },
    automation: {},      // future: autoPing, autobuyers

    settings: { notation: 'scientific', buyMode: '1', activeTab: 'array' },
  };
};

// Keys holding Decimals. Used when (de)serialising.
SL.DECIMAL_KEYS = ['photons', 'lifetimePhotons', 'bytes', 'lifetimeBytes', 'pulsarCores'];

SL.toPlain = function (state) {
  const out = JSON.parse(JSON.stringify(state));
  SL.DECIMAL_KEYS.forEach(k => { out[k] = state[k].toString(); });
  return out;
};

// Merges a loaded object over a fresh state so missing fields get defaults.
SL.fromPlain = function (plain) {
  const s = SL.newState();
  for (const key of Object.keys(s)) {
    if (plain[key] === undefined) continue;
    if (SL.DECIMAL_KEYS.includes(key)) s[key] = new Decimal(plain[key]);
    else if (typeof s[key] === 'object' && s[key] !== null) Object.assign(s[key], plain[key]);
    else s[key] = plain[key];
  }
  return s;
};
