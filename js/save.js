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

  // Returns seconds simulated so the UI can report it.
  function applyOffline() {
    const elapsed = Math.min((Date.now() - SL.state.lastTick) / 1000, cfg.OFFLINE_CAP_SEC);
    if (elapsed > 1) SL.engine.tick(elapsed);
    SL.state.lastTick = Date.now();
    return elapsed;
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
