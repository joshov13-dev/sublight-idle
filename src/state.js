'use strict';

const SAVE_KEY = 'sublight-idle-save';
const SAVE_VERSION = 2;

function perArray(value) {
  return Object.fromEntries(ARRAYS.map(g => [g.id, value]));
}

function freshState() {
  return {
    version: SAVE_VERSION,
    photons: new Decimal(10),
    run: { photons: new Decimal(0), time: 0 },
    arrays: perArray(0),
    photonUpgrades: [],
    telemetry: new Decimal(0),
    telemetryRun: new Decimal(0),
    telemetryUpgrades: [],
    repeatables: { amplifier: 0, decoder: 0, tidal: 0, resonance: 0, condenser: 0 },
    decodes: 0,
    recalTime: 0,
    calibration: 0,
    calibrationRun: 0,
    tuning: perArray(0),
    calibrationUpgrades: [],
    recals: 0,
    shards: new Decimal(0),
    shardsEarned: new Decimal(0),
    horizonUpgrades: [],
    horizonTime: 0,
    challenge: null,
    challengesDone: [],
    achievements: [],
    flags: {},
    log: [],
    stats: {
      totalPhotons: new Decimal(0),
      bestPhotons: new Decimal(0),
      timePlayed: 0,
      gathers: 0,
      decodes: 0,
      recals: 0,
      crossings: 0,
      calibrationEarned: 0,
      fastestDecode: Infinity,
      fastestRecal: Infinity,
      fastestCross: Infinity,
    },
    automation: {
      arrays: true,
      arrayToggles: perArray(true),
      upgrades: true,
      repeatables: true,
      decode: { on: false, mode: 'amount', value: '1' },
      recal: { on: false, mode: 'amount', value: '1' },
      cross: { on: false, mode: 'amount', value: '1' },
    },
    buyMode: '1',
    tab: 'arrays',
    settings: {
      notation: 'scientific',
      autosave: 10,
      offline: true,
      confirmDecode: true,
      confirmRecal: true,
      confirmCross: true,
    },
    lastTick: Date.now(),
  };
}

function safeDecimal(value, fallback = null) {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  try {
    const d = new Decimal(value);
    return Number.isNaN(d.mantissa) || Number.isNaN(d.exponent) ? fallback : d;
  } catch {
    return fallback;
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Decimal);
}

// Copies loaded values onto a fresh template, so missing or malformed fields fall back to defaults.
function mergeInto(template, loaded) {
  if (!isPlainObject(loaded)) return template;
  for (const key of Object.keys(template)) {
    const t = template[key];
    const v = loaded[key];
    if (v === undefined) continue;
    if (t instanceof Decimal) {
      template[key] = safeDecimal(v, t);
    } else if (Array.isArray(t)) {
      if (Array.isArray(v)) template[key] = v;
    } else if (isPlainObject(t)) {
      template[key] = Object.keys(t).length ? mergeInto(t, v) : (isPlainObject(v) ? v : t);
    } else if (t === null) {
      template[key] = typeof v === 'string' ? v : null;
    } else if (typeof t === 'number') {
      if (typeof v === 'number' && Number.isFinite(v)) template[key] = v;
    } else if (typeof t === typeof v) {
      template[key] = v;
    }
  }
  return template;
}

function migrate(data) {
  if (!data.version || data.version < 2) {
    data.arrays = data.owned || {};
    data.stats = {
      totalPhotons: data.totalPhotons || '0',
      bestPhotons: data.photons || '0',
      timePlayed: data.timePlayed || 0,
    };
    data.run = { photons: data.totalPhotons || '0', time: data.timePlayed || 0 };
  }
  data.version = SAVE_VERSION;
  return data;
}

function serialise(s) {
  return JSON.stringify(s);
}

function deserialise(json) {
  const data = migrate(JSON.parse(json));
  const s = mergeInto(freshState(), data);
  if (!['1', '10', 'max'].includes(s.buyMode)) s.buyMode = '1';
  if (!NOTATIONS[s.settings.notation]) s.settings.notation = 'scientific';
  if (s.challenge && !CHALLENGES.some(c => c.id === s.challenge)) s.challenge = null;
  s.log = s.log.filter(e => e && typeof e.text === 'string').slice(0, 100);
  return s;
}

function encodeSave(s) {
  return btoa(unescape(encodeURIComponent(serialise(s))));
}

function decodeSave(code) {
  return deserialise(decodeURIComponent(escape(atob(code.trim()))));
}
