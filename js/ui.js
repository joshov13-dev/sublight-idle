// DOM rendering and event wiring. Reads state, calls SL.engine for actions.
window.SL = window.SL || {};

SL.ui = (function () {
  const cfg = SL.config;
  const E = () => SL.engine;
  const $ = id => document.getElementById(id);
  const q = sel => document.querySelector(sel);
  const fmt = v => SL.format.num(v, SL.state.settings.notation);
  const pct = x => Math.min(100, Math.max(0, x * 100));

  // --- Tabs and buy mode ---

  function tabVisible(name) {
    const u = SL.state.unlocks;
    if (name === 'telemetry') return u.telemetry;
    if (name === 'calibration') return u.calibration;
    return true;
  }

  function showTab(name) {
    if (!tabVisible(name)) name = 'array';
    SL.state.settings.activeTab = name;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  }

  function setBuyMode(mode) {
    SL.state.settings.buyMode = mode;
    document.querySelectorAll('.buy-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  }

  // --- Modal ---

  let modalConfirm = null;

  function modal({ title, body, confirmText = 'OK', cancel = true, danger = false, onConfirm = null }) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = body;
    $('modal-confirm').textContent = confirmText;
    $('modal-confirm').classList.toggle('text-red-400', danger);
    $('modal-cancel').classList.toggle('hidden', !cancel);
    modalConfirm = onConfirm;
    $('modal').classList.remove('hidden');
    $('modal-confirm').focus();
  }

  function closeModal() {
    $('modal').classList.add('hidden');
    modalConfirm = null;
  }

  function flash(msg) {
    $('console-msg').textContent = msg;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => { $('console-msg').textContent = ''; }, 3000);
  }

  function duration(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
  }

  function showOfflineReport(r) {
    let body = `You were away for <span class="text-zinc-100">${duration(r.seconds)}</span>.<br>` +
      `The array gathered <span class="text-cyan-300">${fmt(r.photons)}</span> photons`;
    if (r.bytes.gt(0)) body += ` and <span class="text-emerald-300">${fmt(r.bytes)}</span> bytes`;
    body += '.';
    if (r.seconds >= cfg.OFFLINE_CAP_SEC) body += '<br><span class="text-xs">Offline progress is capped at 24 hours.</span>';
    modal({ title: 'Welcome back', body, confirmText: 'Continue', cancel: false });
  }

  // --- Static markup, built once. render() only updates text and state. ---

  function buildGenerators() {
    $('generator-list').innerHTML = cfg.generators.map((g, i) => `
      <div class="glow-border rounded p-3">
        <div class="flex justify-between items-center gap-2">
          <div>
            <div class="text-zinc-100"><span class="text-zinc-600">T${i + 1}</span> ${g.name}
              <span class="text-zinc-500">x<span data-owned="${g.id}"></span></span></div>
            <div class="text-xs text-zinc-500"><span data-output="${g.id}"></span> photons/sec</div>
          </div>
          <button class="glow-border px-3 py-1 rounded text-sm whitespace-nowrap" data-buy-gen="${g.id}">
            Buy <span data-count="${g.id}"></span>: <span data-cost="${g.id}"></span>
          </button>
        </div>
        <div class="progress mt-2"><div data-gen-bar="${g.id}"></div></div>
      </div>`).join('');
  }

  function buildUpgrades() {
    $('upgrade-list').innerHTML = cfg.upgrades.map(u => `
      <button class="glow-border rounded p-3 text-left" data-buy-upg="${u.id}">
        <div class="text-zinc-100">${u.name}</div>
        <div class="text-xs text-zinc-500 my-1">${u.desc}</div>
        <div class="text-xs" data-upg-cost="${u.id}"></div>
      </button>`).join('');
  }

  function buildTelemetry() {
    $('thr-max').textContent = cfg.MAX_THREADS;
    $('thr-cells').innerHTML = Array.from({ length: cfg.MAX_THREADS }, (_, i) =>
      `<div class="thread-cell" data-cell="${i}"></div>`).join('');
    $('telemetry-list').innerHTML = cfg.telemetryUpgrades.map(u => `
      <button class="glow-border glow-emerald rounded p-3 text-left" data-buy-tel="${u.id}">
        <div class="text-zinc-100">${u.name} <span class="text-zinc-500 text-xs">Lv <span data-tel-lvl="${u.id}"></span></span></div>
        <div class="text-xs text-zinc-500 my-1">${u.desc}</div>
        <div class="text-xs" data-tel-cost="${u.id}"></div>
      </button>`).join('');
  }

  function buildPerks() {
    $('perk-list').innerHTML = cfg.perks.map(p => `
      <div class="border border-zinc-800 rounded p-3 flex justify-between items-center gap-2" data-perk-card="${p.id}">
        <div>
          <div class="text-zinc-100">${p.name}</div>
          <div class="text-xs text-zinc-500">${p.desc}</div>
          <div class="text-xs text-violet-400" data-perk-req="${p.id}">Requires ${p.cores} core${p.cores > 1 ? 's' : ''}</div>
        </div>
        <button class="border border-zinc-700 px-3 py-1 rounded text-xs whitespace-nowrap" data-perk="${p.id}"></button>
      </div>`).join('');
  }

  // --- Events ---

  function bind() {
    $('tabs').addEventListener('click', e => { if (e.target.dataset.tab) showTab(e.target.dataset.tab); });
    $('buy-mode').addEventListener('click', e => { if (e.target.dataset.mode) setBuyMode(e.target.dataset.mode); });
    $('btn-ping').addEventListener('click', () => E().ping());

    $('generator-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-buy-gen]');
      if (btn) E().buyGenerator(btn.dataset.buyGen);
    });
    $('upgrade-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-buy-upg]');
      if (btn) E().buyUpgrade(btn.dataset.buyUpg);
    });

    $('btn-thread-buy').addEventListener('click', () => E().buyThread());
    $('btn-thread-up').addEventListener('click', () => E().setActiveThreads(SL.state.threads.active + 1));
    $('btn-thread-down').addEventListener('click', () => E().setActiveThreads(SL.state.threads.active - 1));
    $('telemetry-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-buy-tel]');
      if (btn) E().buyTelemetry(btn.dataset.buyTel);
    });

    $('btn-recalibrate').addEventListener('click', () => {
      const gain = E().coresOnReset();
      modal({
        title: 'Re-Calibrate Array?',
        body: `You will gain <span class="text-violet-300">${fmt(gain)}</span> Pulsar Core${gain.eq(1) ? '' : 's'}. ` +
          'Photons, Generators, Bytes, Threads and Telemetry upgrades will be reset.',
        confirmText: 'Re-Calibrate',
        onConfirm: () => { if (E().recalibrate()) { SL.save.write(); showTab('calibration'); } },
      });
    });
    $('perk-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-perk]');
      if (btn) E().togglePerk(btn.dataset.perk);
    });

    $('btn-save').addEventListener('click', () => { SL.save.write(); flash('Game saved.'); });
    $('btn-export').addEventListener('click', () => {
      $('save-box').value = SL.save.exportString();
      $('save-box').select();
      flash('Save exported. Copy the text below and keep it somewhere safe.');
    });
    $('btn-import').addEventListener('click', () => {
      try {
        SL.save.importString($('save-box').value);
        applySettings();
        flash('Save imported.');
      } catch (e) {
        flash('That save string is not valid.');
      }
    });
    $('btn-format').addEventListener('click', () => {
      const s = SL.state.settings;
      s.notation = s.notation === 'scientific' ? 'engineering' : 'scientific';
    });
    $('btn-reset').addEventListener('click', () => modal({
      title: 'Hard Reset',
      body: 'This wipes <span class="text-red-400">everything</span>, including Pulsar Cores. It cannot be undone. Export your save first if you might want it back.',
      confirmText: 'Wipe Everything',
      danger: true,
      onConfirm: () => { SL.save.hardReset(); SL.state.settings.activeTab = 'console'; applySettings(); flash('Game reset.'); },
    }));

    $('modal-cancel').addEventListener('click', closeModal);
    $('modal-confirm').addEventListener('click', () => { const fn = modalConfirm; closeModal(); if (fn) fn(); });
    $('modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('modal-cancel').classList.contains('hidden')) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  // Re-applies stored UI settings (after load, import or reset).
  function applySettings() {
    showTab(SL.state.settings.activeTab);
    setBuyMode(SL.state.settings.buyMode);
  }

  // --- Render (every frame) ---

  function renderHeader(s) {
    $('res-photons').textContent = fmt(s.photons);
    $('res-pps').textContent = fmt(E().photonsPerSec());
    $('res-bytes').textContent = fmt(s.bytes);
    $('res-cores').textContent = fmt(s.pulsarCores);
    $('res-bytes-wrap').classList.toggle('hidden', !s.unlocks.telemetry);
    $('res-cores-wrap').classList.toggle('hidden', !s.unlocks.calibration && s.pulsarCores.eq(0));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('hidden', !tabVisible(b.dataset.tab)));
  }

  function renderArray(s) {
    $('ping-value').textContent = fmt(E().pingValue());
    $('next-unlock').classList.toggle('hidden', s.unlocks.telemetry);
    if (!s.unlocks.telemetry) {
      const p = pct(s.photons.div(cfg.UNLOCK_BYTES_AT).toNumber());
      $('next-unlock-bar').style.width = p + '%';
      $('next-unlock-pct').textContent = p.toFixed(0) + '%';
    }

    cfg.generators.forEach(g => {
      const mode = s.settings.buyMode;
      const count = mode === 'max' ? Math.max(1, E().maxAffordable(g.id)) : Number(mode);
      const cost = E().costFor(g.id, count);
      q(`[data-owned="${g.id}"]`).textContent = s.generators[g.id];
      q(`[data-output="${g.id}"]`).textContent = fmt(E().generatorOutput(g.id));
      q(`[data-count="${g.id}"]`).textContent = count;
      q(`[data-cost="${g.id}"]`).textContent = fmt(cost);
      q(`[data-buy-gen="${g.id}"]`).disabled = s.photons.lt(cost);
      q(`[data-gen-bar="${g.id}"]`).style.width = pct(s.photons.div(cost).toNumber()) + '%';
    });
  }

  function renderSpectrometer(s) {
    cfg.upgrades.forEach(u => {
      const owned = !!s.upgrades[u.id];
      q(`[data-upg-cost="${u.id}"]`).textContent = owned ? 'OWNED' : fmt(u.cost) + ' photons';
      q(`[data-buy-upg="${u.id}"]`).disabled = owned || s.photons.lt(u.cost);
      q(`[data-buy-upg="${u.id}"]`).classList.toggle('owned', owned);
    });
  }

  function renderTelemetry(s) {
    const t = s.threads;
    $('thr-active').textContent = t.active;
    $('thr-owned').textContent = t.owned;
    $('thr-share').textContent = (E().divertedShare() * 100).toFixed(0) + '%';
    $('thr-bps').textContent = fmt(E().bytesPerSec());
    const maxed = t.owned >= cfg.MAX_THREADS;
    $('thr-cost').textContent = maxed ? 'MAXED' : fmt(E().threadCost()) + ' photons';
    $('btn-thread-buy').disabled = maxed || s.photons.lt(E().threadCost());
    $('btn-thread-up').disabled = t.active >= t.owned;
    $('btn-thread-down').disabled = t.active <= 0;
    document.querySelectorAll('[data-cell]').forEach(c => {
      const i = Number(c.dataset.cell);
      c.className = 'thread-cell' + (i < t.active ? ' active' : i < t.owned ? ' idle' : '');
    });
    // One-second processing cycle, purely visual.
    $('thr-bar').style.width = t.active > 0 ? (Date.now() % 1000) / 10 + '%' : '0%';

    cfg.telemetryUpgrades.forEach(u => {
      const maxedUpg = E().telemetryMaxed(u.id);
      const cost = E().telemetryCost(u.id);
      q(`[data-tel-lvl="${u.id}"]`).textContent = s.telemetry[u.id] || 0;
      q(`[data-tel-cost="${u.id}"]`).textContent = maxedUpg ? 'MAXED' : fmt(cost) + ' bytes';
      q(`[data-buy-tel="${u.id}"]`).disabled = maxedUpg || s.bytes.lt(cost);
    });
  }

  function renderCalibration(s) {
    const gain = E().coresOnReset();
    const next = E().bytesForNextCore();
    $('cal-run-bytes').textContent = fmt(s.bytesThisRun);
    $('cal-gain').textContent = fmt(gain);
    $('cal-bonus').textContent = '+' + fmt(s.pulsarCores.mul(cfg.CORE_BONUS * 100)) + '%';
    $('cal-next').textContent = fmt(next);
    const p = pct(s.bytesThisRun.div(next).toNumber());
    $('cal-bar').style.width = p + '%';
    $('cal-next-pct').textContent = p.toFixed(0) + '%';
    $('btn-recalibrate').disabled = !E().canRecalibrate();

    cfg.perks.forEach(p => {
      const unlocked = E().perkUnlocked(p.id);
      const on = E().perkActive(p.id);
      const btn = q(`[data-perk="${p.id}"]`);
      btn.textContent = !unlocked ? 'LOCKED' : on ? 'ON' : 'OFF';
      btn.disabled = !unlocked;
      btn.classList.toggle('text-violet-300', on);
      q(`[data-perk-req="${p.id}"]`).classList.toggle('hidden', unlocked);
      q(`[data-perk-card="${p.id}"]`).classList.toggle('opacity-50', !unlocked);
    });
  }

  function renderConsole(s) {
    $('format-label').textContent = s.settings.notation;
    const rows = [
      ['Time played', duration((Date.now() - s.stats.startTime) / 1000)],
      ['Manual pings', s.stats.pings.toLocaleString('en-GB')],
      ['Lifetime photons', fmt(s.lifetimePhotons)],
      ['Lifetime bytes', fmt(s.lifetimeBytes)],
      ['Calibrations', s.stats.calibrations],
    ];
    $('stats').innerHTML = rows.map(([k, v]) => `<dt class="text-zinc-500">${k}</dt><dd>${v}</dd>`).join('');
  }

  // Only the visible tab is redrawn; the header always is.
  function render() {
    const s = SL.state;
    renderHeader(s);
    if (!tabVisible(s.settings.activeTab)) showTab('array');
    ({
      array: renderArray,
      telemetry: renderTelemetry,
      spectrometer: renderSpectrometer,
      calibration: renderCalibration,
      console: renderConsole,
    })[s.settings.activeTab](s);
  }

  function init() {
    buildGenerators();
    buildUpgrades();
    buildTelemetry();
    buildPerks();
    bind();
    applySettings();
  }

  return { init, render, showOfflineReport };
})();
