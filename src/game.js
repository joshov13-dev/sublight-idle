'use strict';

const SAVE_KEY = 'sublight-idle-save';
const SAVE_VERSION = 1;
const TICK_MS = 50;
const AUTOSAVE_MS = 10000;
const MAX_OFFLINE_SECONDS = 24 * 60 * 60;
const MILESTONE_STEP = 25;

const GENERATORS = [
  { id: 'collector', name: 'Photon Collector', desc: 'Passive light sails skimming stray photons.', baseCost: 10, costRatio: 1.15, baseRate: 0.5 },
  { id: 'lens', name: 'Gravitational Lens', desc: 'Bends distant starlight into your collectors.', baseCost: 120, costRatio: 1.16, baseRate: 4 },
  { id: 'pulsar', name: 'Pulsar Array', desc: 'Calibrated to the rhythm of dying stars.', baseCost: 1500, costRatio: 1.17, baseRate: 30 },
  { id: 'relay', name: 'Telemetry Relay', desc: 'Decodes cosmic telemetry into raw light.', baseCost: 20000, costRatio: 1.18, baseRate: 250 },
  { id: 'quasar', name: 'Quasar Tap', desc: 'Siphons the output of a galactic core.', baseCost: 300000, costRatio: 1.19, baseRate: 2200 },
];

function freshState() {
  return {
    version: SAVE_VERSION,
    photons: new Decimal(0),
    totalPhotons: new Decimal(0),
    owned: Object.fromEntries(GENERATORS.map(g => [g.id, 0])),
    buyMode: '1',
    timePlayed: 0,
    lastTick: Date.now(),
  };
}

let state = freshState();

function multiplier(gen) {
  return Decimal.pow(2, Math.floor(state.owned[gen.id] / MILESTONE_STEP));
}

function productionOf(gen) {
  return new Decimal(gen.baseRate).times(state.owned[gen.id]).times(multiplier(gen));
}

function totalProduction() {
  return GENERATORS.reduce((sum, g) => sum.plus(productionOf(g)), new Decimal(0));
}

function gatherAmount() {
  return Decimal.max(1, totalProduction().times(0.05));
}

function buyAmount(gen) {
  if (state.buyMode === 'max') {
    const n = Decimal.affordGeometricSeries(state.photons, gen.baseCost, gen.costRatio, state.owned[gen.id]);
    return Math.max(1, n.toNumber());
  }
  return Number(state.buyMode);
}

function costFor(gen, amount) {
  return Decimal.sumGeometricSeries(amount, gen.baseCost, gen.costRatio, state.owned[gen.id]);
}

function buy(gen) {
  const amount = buyAmount(gen);
  const cost = costFor(gen, amount);
  if (state.photons.lt(cost)) return;
  state.photons = state.photons.minus(cost);
  state.owned[gen.id] += amount;
}

function earn(amount) {
  state.photons = state.photons.plus(amount);
  state.totalPhotons = state.totalPhotons.plus(amount);
}

function tick() {
  const now = Date.now();
  const dt = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;
  state.timePlayed += dt;
  earn(totalProduction().times(dt));
  render();
}

function format(d) {
  d = new Decimal(d);
  if (d.lt(1e6)) {
    const n = d.toNumber();
    return n < 100 ? n.toFixed(n % 1 === 0 ? 0 : 1) : Math.floor(n + 1e-6).toLocaleString('en-GB');
  }
  return `${d.mantissa.toFixed(2)}e${d.exponent.toLocaleString('en-GB')}`;
}

function formatTime(seconds) {
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

const $ = id => document.getElementById(id);
const genEls = {};

function buildGenerators() {
  const container = $('generators');
  for (const gen of GENERATORS) {
    const row = document.createElement('button');
    row.className = 'w-full text-left p-3 rounded-md border border-slate-800 flex items-center justify-between gap-4 transition';
    row.innerHTML = `
      <div class="min-w-0">
        <div class="text-slate-200"><span data-name></span> <span data-owned class="text-slate-500 text-sm"></span></div>
        <div data-desc class="text-xs text-slate-500 truncate"></div>
        <div data-rate class="text-xs text-sky-400/80 mt-1"></div>
      </div>
      <div class="text-right shrink-0">
        <div data-amount class="text-xs text-slate-500"></div>
        <div data-cost class="text-sm tabular-nums"></div>
      </div>`;
    row.querySelector('[data-name]').textContent = gen.name;
    row.querySelector('[data-desc]').textContent = gen.desc;
    row.addEventListener('click', () => { buy(gen); render(); });
    container.appendChild(row);
    genEls[gen.id] = {
      row,
      owned: row.querySelector('[data-owned]'),
      rate: row.querySelector('[data-rate]'),
      amount: row.querySelector('[data-amount]'),
      cost: row.querySelector('[data-cost]'),
    };
  }
}

function render() {
  $('photons').textContent = format(state.photons);
  $('pps').textContent = format(totalProduction());
  $('stat-total').textContent = format(state.totalPhotons);
  $('stat-time').textContent = formatTime(state.timePlayed);

  for (const gen of GENERATORS) {
    const el = genEls[gen.id];
    const amount = buyAmount(gen);
    const cost = costFor(gen, amount);
    const affordable = state.photons.gte(cost);
    el.owned.textContent = `x${state.owned[gen.id]}`;
    el.rate.textContent = `${format(new Decimal(gen.baseRate).times(multiplier(gen)))} each / sec (${format(productionOf(gen))} total)`;
    el.amount.textContent = `buy ${amount}`;
    el.cost.textContent = format(cost);
    el.cost.className = `text-sm tabular-nums ${affordable ? 'text-sky-200' : 'text-slate-600'}`;
    el.row.classList.toggle('hover:border-sky-600', affordable);
    el.row.classList.toggle('opacity-60', !affordable);
    el.row.disabled = !affordable;
  }

  for (const btn of document.querySelectorAll('#buy-mode button')) {
    const active = btn.dataset.mode === state.buyMode;
    btn.classList.toggle('border-sky-500', active);
    btn.classList.toggle('text-sky-200', active);
  }
}

function serialise() {
  return JSON.stringify({
    ...state,
    photons: state.photons.toString(),
    totalPhotons: state.totalPhotons.toString(),
  });
}

function deserialise(json) {
  const data = JSON.parse(json);
  const s = freshState();
  s.photons = new Decimal(data.photons ?? 0);
  s.totalPhotons = new Decimal(data.totalPhotons ?? 0);
  for (const gen of GENERATORS) s.owned[gen.id] = Number(data.owned?.[gen.id]) || 0;
  s.buyMode = ['1', '10', 'max'].includes(data.buyMode) ? data.buyMode : '1';
  s.timePlayed = Number(data.timePlayed) || 0;
  s.lastTick = Number(data.lastTick) || Date.now();
  return s;
}

function save(silent) {
  try {
    localStorage.setItem(SAVE_KEY, serialise());
    if (!silent) toast('Game saved');
  } catch {
    if (!silent) toast('Could not save');
  }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    state = deserialise(raw);
    applyOfflineProgress();
  } catch {
    toast('Save data was unreadable, starting fresh');
  }
}

function applyOfflineProgress() {
  const seconds = Math.min((Date.now() - state.lastTick) / 1000, MAX_OFFLINE_SECONDS);
  state.lastTick = Date.now();
  if (seconds < 10) return;
  const gained = totalProduction().times(seconds);
  earn(gained);
  if (gained.gt(0)) toast(`Away for ${formatTime(seconds)}: +${format(gained)} photons`);
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('opacity-0'), 3000);
}

function bindControls() {
  $('gather').addEventListener('click', () => { earn(gatherAmount()); render(); });
  for (const btn of document.querySelectorAll('#buy-mode button')) {
    btn.addEventListener('click', () => { state.buyMode = btn.dataset.mode; render(); });
  }
  $('save-btn').addEventListener('click', () => save(false));
  $('export-btn').addEventListener('click', async () => {
    const code = btoa(serialise());
    try {
      await navigator.clipboard.writeText(code);
      toast('Save copied to clipboard');
    } catch {
      prompt('Copy your save:', code);
    }
  });
  $('import-btn').addEventListener('click', () => {
    const code = prompt('Paste your save:');
    if (!code) return;
    try {
      state = deserialise(atob(code.trim()));
      applyOfflineProgress();
      save(true);
      render();
      toast('Save imported');
    } catch {
      toast('That save code is invalid');
    }
  });
  $('reset-btn').addEventListener('click', () => {
    if (!confirm('Wipe all progress? This cannot be undone.')) return;
    state = freshState();
    save(true);
    render();
  });
  window.addEventListener('beforeunload', () => save(true));
}

buildGenerators();
bindControls();
load();
render();
setInterval(tick, TICK_MS);
setInterval(() => save(true), AUTOSAVE_MS);
