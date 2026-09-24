// Persistence: localStorage, Base64 export/import, hard reset, offline progress.
window.SL = window.SL || {};

SL.save = (function () {
  const cfg = SL.config;

  function encode(state) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(SL.toPlain(state)))));
  }

  function decode(str) {
    return SL.fromPlain(JSON.parse(decodeURIComponent(escape(atob(str.trim())))));
  }

  function write() {
    try {
      SL.state.lastTick = Date.now();
      localStorage.setItem(cfg.SAVE_KEY, encode(SL.state));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(cfg.SAVE_KEY);
      SL.state = raw ? decode(raw) : SL.newState();
    } catch (e) {
      console.warn('Load failed, starting fresh', e);
      SL.state = SL.newState();
    }
  }

  // Simulates time away in slices so upgrades and autobuyers kick in along the way.
  // Returns a summary for the "welcome back" popup.
  function applyOffline() {
    const s = SL.state;
    const elapsed = Math.min(Math.max(0, (Date.now() - s.lastTick) / 1000), cfg.OFFLINE_CAP_SEC);
    const before = { photons: s.lifetimePhotons, bytes: s.lifetimeBytes };

    if (elapsed > 1) {
      const steps = Math.min(cfg.OFFLINE_MAX_STEPS, Math.ceil(elapsed));
      for (let i = 0; i < steps; i++) SL.engine.tick(elapsed / steps);
    }
    s.lastTick = Date.now();

    return {
      seconds: elapsed,
      photons: s.lifetimePhotons.sub(before.photons),
      bytes: s.lifetimeBytes.sub(before.bytes),
    };
  }

  function exportString() {
    return encode(SL.state);
  }

  function importString(str) {
    SL.state = decode(str);   // throws on bad input; caller handles it
    write();
  }

  function hardReset() {
    localStorage.removeItem(cfg.SAVE_KEY);
    SL.state = SL.newState();
  }

  return { write, load, applyOffline, exportString, importString, hardReset };
})();
