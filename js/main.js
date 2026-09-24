// Boot sequence and loops. Logic ticks at a fixed rate; rendering runs on rAF.
(function () {
  const cfg = SL.config;

  SL.save.load();
  const offline = SL.save.applyOffline();

  SL.ui.init();
  if (offline.seconds >= cfg.OFFLINE_REPORT_SEC) SL.ui.showOfflineReport(offline);

  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    SL.engine.tick((now - last) / 1000);   // real delta handles throttled tabs
    last = now;
    SL.state.lastTick = now;
  }, cfg.TICK_MS);

  setInterval(SL.save.write, cfg.AUTOSAVE_MS);
  window.addEventListener('beforeunload', SL.save.write);

  (function frame() {
    SL.ui.render();
    requestAnimationFrame(frame);
  })();
})();
