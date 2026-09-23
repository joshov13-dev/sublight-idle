// DOM rendering and event wiring. Reads state, calls SL.engine for actions.
window.SL = window.SL || {};

SL.ui = (function () {
  const $ = id => document.getElementById(id);
  const fmt = v => SL.format.num(v, SL.state.settings.notation);

  function showTab(name) {
    SL.state.settings.activeTab = name;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  }

  function setBuyMode(mode) {
    SL.state.settings.buyMode = mode;
    document.querySelectorAll('.buy-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  }

  // Built once; render() only updates text and disabled state.
  function buildGenerators() {
    $('generator-list').innerHTML = SL.config.generators.map(g => `
      <div class="glow-border rounded p-3 flex justify-between items-center">
        <div>
          <div class="text-zinc-100">${g.name} <span class="text-zinc-500">x<span data-owned="${g.id}"></span></span></div>
          <div class="text-xs text-zinc-500"><span data-output="${g.id}"></span> photons/sec</div>
        </div>
        <button class="glow-border px-3 py-1 rounded text-sm" data-buy-gen="${g.id}">
          Buy <span data-count="${g.id}"></span> · <span data-cost="${g.id}"></span>
        </button>
      </div>`).join('');
  }

  function buildUpgrades() {
    $('upgrade-list').innerHTML = SL.config.upgrades.map(u => `
      <button class="glow-border rounded p-3 text-left" data-buy-upg="${u.id}">
        <div class="text-zinc-100">${u.name}</div>
        <div class="text-xs text-zinc-500 my-1">${u.desc}</div>
        <div class="text-xs" data-upg-cost="${u.id}"></div>
      </button>`).join('');
  }

  function bind() {
    $('tabs').addEventListener('click', e => { if (e.target.dataset.tab) showTab(e.target.dataset.tab); });
    $('buy-mode').addEventListener('click', e => { if (e.target.dataset.mode) setBuyMode(e.target.dataset.mode); });
    $('btn-ping').addEventListener('click', () => SL.engine.ping());

    $('generator-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-buy-gen]');
      if (btn) SL.engine.buyGenerator(btn.dataset.buyGen);
    });
    $('upgrade-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-buy-upg]');
      if (btn) SL.engine.buyUpgrade(btn.dataset.buyUpg);
    });

    $('btn-export').addEventListener('click', () => { $('save-box').value = SL.save.exportString(); });
    $('btn-import').addEventListener('click', () => {
      try { SL.save.importString($('save-box').value); applySettings(); }
      catch (e) { alert('Invalid save string.'); }
    });
    $('btn-format').addEventListener('click', () => {
      const s = SL.state.settings;
      s.notation = s.notation === 'scientific' ? 'engineering' : 'scientific';
    });
    // TODO: replace confirm() with a styled modal.
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Hard reset? All progress will be lost.')) { SL.save.hardReset(); applySettings(); }
    });
  }

  // Re-applies stored UI settings (after load, import or reset).
  function applySettings() {
    showTab(SL.state.settings.activeTab);
    setBuyMode(SL.state.settings.buyMode);
  }

  function render() {
    const s = SL.state;
    $('res-photons').textContent = fmt(s.photons);
    $('res-pps').textContent = fmt(SL.engine.photonsPerSec());
    $('res-bytes').textContent = fmt(s.bytes);
    $('res-cores').textContent = fmt(s.pulsarCores);
    $('format-label').textContent = s.settings.notation;

    $('res-bytes-wrap').classList.toggle('hidden', !s.unlocks.telemetry);
    $('res-cores-wrap').classList.toggle('hidden', !s.unlocks.calibration);
    document.querySelector('[data-tab="telemetry"]').classList.toggle('hidden', !s.unlocks.telemetry);
    document.querySelector('[data-tab="calibration"]').classList.toggle('hidden', !s.unlocks.calibration);

    SL.config.generators.forEach(g => {
      const mode = s.settings.buyMode;
      const count = mode === 'max' ? Math.max(1, SL.engine.maxAffordable(g.id)) : Number(mode);
      const cost = SL.engine.costFor(g.id, count);
      document.querySelector(`[data-owned="${g.id}"]`).textContent = s.generators[g.id];
      document.querySelector(`[data-output="${g.id}"]`).textContent = fmt(SL.engine.generatorOutput(g.id));
      document.querySelector(`[data-count="${g.id}"]`).textContent = count;
      document.querySelector(`[data-cost="${g.id}"]`).textContent = fmt(cost);
      document.querySelector(`[data-buy-gen="${g.id}"]`).disabled = s.photons.lt(cost);
    });

    SL.config.upgrades.forEach(u => {
      const owned = !!s.upgrades[u.id];
      document.querySelector(`[data-upg-cost="${u.id}"]`).textContent = owned ? 'OWNED' : fmt(u.cost) + ' photons';
      document.querySelector(`[data-buy-upg="${u.id}"]`).disabled = owned || s.photons.lt(u.cost);
    });
  }

  function init() {
    buildGenerators();
    buildUpgrades();
    bind();
    applySettings();
  }

  return { init, render };
})();
