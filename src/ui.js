'use strict';

// ---------- DOM helpers ----------

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

function setClass(el, className) {
  if (el.className !== className) el.className = className;
}

function show(el, visible) {
  if (el.hidden === visible) el.hidden = !visible;
}

function setDisabled(el, disabled) {
  if (el.disabled !== disabled) el.disabled = disabled;
}

function amountOf(value, singular, plural = `${singular}s`) {
  const d = value instanceof Decimal ? value : new Decimal(value);
  return `${format(d)} ${d.eq(1) ? singular : plural}`;
}

function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const THEMES = {
  sky: { text: 'text-sky-200', soft: 'text-sky-400', ready: 'border-sky-600 hover:bg-sky-950/60', owned: 'border-sky-900/80 bg-sky-950/40', button: 'border-sky-700 text-sky-100 hover:bg-sky-900/50', chip: 'text-sky-200' },
  emerald: { text: 'text-emerald-200', soft: 'text-emerald-400', ready: 'border-emerald-600 hover:bg-emerald-950/60', owned: 'border-emerald-900/80 bg-emerald-950/40', button: 'border-emerald-700 text-emerald-100 hover:bg-emerald-900/50', chip: 'text-emerald-200' },
  amber: { text: 'text-amber-200', soft: 'text-amber-400', ready: 'border-amber-600 hover:bg-amber-950/60', owned: 'border-amber-900/80 bg-amber-950/40', button: 'border-amber-700 text-amber-100 hover:bg-amber-900/50', chip: 'text-amber-200' },
  violet: { text: 'text-violet-200', soft: 'text-violet-400', ready: 'border-violet-600 hover:bg-violet-950/60', owned: 'border-violet-900/80 bg-violet-950/40', button: 'border-violet-700 text-violet-100 hover:bg-violet-900/50', chip: 'text-violet-200' },
};

const BTN = 'press rounded-md border px-3 py-2 text-sm transition disabled:opacity-40 disabled:hover:bg-transparent';
const SMALL_BTN = 'press rounded border px-2 py-1 text-xs transition disabled:opacity-40 disabled:hover:bg-transparent';
const PANEL = 'rounded-lg border border-slate-800 bg-slate-900/40 p-4';
const HEADING = 'text-xs uppercase tracking-widest text-slate-500';

function heading(text) {
  return h('h2', { class: HEADING, text });
}

function section(title, ...children) {
  return h('section', { class: 'space-y-3' }, title ? heading(title) : null, ...children);
}

function toggleButton(onClick) {
  return h('button', { class: SMALL_BTN, onclick: onClick, 'aria-pressed': 'false' });
}

function updateToggle(btn, label, on) {
  setText(btn, label ? `${label}: ${on ? 'on' : 'off'}` : (on ? 'On' : 'Off'));
  btn.setAttribute('aria-pressed', String(on));
  setClass(btn, `${SMALL_BTN} ${on ? 'border-sky-600 text-sky-200' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`);
}

// ---------- Shared widgets ----------

// status(def) returns { state: 'owned' | 'ready' | 'poor' | 'locked', label, hidden }
function upgradeGrid(defs, theme, status, buy, columns = 'sm:grid-cols-2') {
  const grid = h('div', { class: `grid grid-cols-1 ${columns} gap-2` });
  const items = defs.map(def => {
    const cost = h('div', { class: 'text-xs mt-2 tabular-nums' });
    const btn = h('button', {
      onclick: () => {
        if (buy(def)) refresh();
      },
    },
    h('div', { class: 'text-sm text-slate-100', text: def.name }),
    h('div', { class: 'text-xs text-slate-400 mt-1', text: def.desc }),
    cost);
    grid.append(btn);
    return { def, btn, cost };
  });
  return {
    el: grid,
    update() {
      for (const item of items) {
        const s = status(item.def);
        show(item.btn, !s.hidden);
        if (s.hidden) continue;
        const stateClass = {
          owned: theme.owned,
          ready: `border-slate-700 ${theme.ready}`,
          poor: 'border-slate-800',
          locked: 'border-slate-800 opacity-50',
        }[s.state];
        setClass(item.btn, `press text-left rounded-md border p-3 transition ${stateClass}`);
        setDisabled(item.btn, s.state !== 'ready');
        setText(item.cost, s.label);
        setClass(item.cost, `text-xs mt-2 tabular-nums ${s.state === 'owned' ? theme.soft : s.state === 'ready' ? theme.text : 'text-slate-500'}`);
      }
    },
  };
}

function simpleStatus(owned, available, affordable, costText, lockedText) {
  if (owned) return { state: 'owned', label: 'Owned' };
  if (!available) return { state: 'locked', label: lockedText };
  return { state: affordable ? 'ready' : 'poor', label: costText };
}

function repeatableRow(id, theme, currency, effectText) {
  const def = repeatableDef(id);
  const level = h('span', { class: 'text-slate-500 text-sm' });
  const effect = h('div', { class: `text-xs ${theme.soft} mt-1` });
  const buyBtn = h('button', { onclick: () => { if (buyRepeatable(id)) refresh(); } });
  const maxBtn = h('button', {
    onclick: () => {
      let bought = false;
      for (let i = 0; i < 1000 && buyRepeatable(id); i++) bought = true;
      if (bought) refresh();
    },
    text: 'Max',
  });
  const el = h('div', { class: 'rounded-md border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3' },
    h('div', { class: 'min-w-0' },
      h('div', { class: 'text-slate-100 text-sm' }, def.name, ' ', level),
      h('div', { class: 'text-xs text-slate-400 mt-1', text: def.desc }),
      effect),
    h('div', { class: 'flex gap-2' }, buyBtn, maxBtn));
  return {
    el,
    update() {
      show(el, repeatableAvailable(id) || state.repeatables[id] > 0 || !def.needsBreak || isBroken());
      const maxLevel = repeatableMaxLevel(id);
      setText(level, Number.isFinite(maxLevel) ? `level ${state.repeatables[id]} / ${maxLevel}` : `level ${formatInt(state.repeatables[id])}`);
      setText(effect, effectText());
      const maxed = repeatableMaxed(id);
      const affordable = !maxed && repeatableAvailable(id) && state[repeatableCurrency(id)].gte(repeatableCost(id));
      setText(buyBtn, maxed ? 'Maxed' : `Buy: ${amountOf(repeatableCost(id), ...currency)}`);
      setClass(buyBtn, `${SMALL_BTN} ${affordable ? theme.button : 'border-slate-700 text-slate-400'}`);
      setDisabled(buyBtn, !affordable);
      setClass(maxBtn, `${SMALL_BTN} ${affordable ? theme.button : 'border-slate-700 text-slate-400'}`);
      setDisabled(maxBtn, !affordable);
      show(maxBtn, !def.costs);
    },
  };
}

function milestoneList(milestones, countFn, alwaysFn, theme, noun) {
  const rows = milestones.map(m => {
    const mark = h('span', { class: 'shrink-0 w-24 tabular-nums' });
    const row = h('li', { class: 'flex gap-3 text-sm' }, mark, h('span', { text: m.desc }));
    return { m, row, mark };
  });
  return {
    el: h('ul', { class: 'space-y-2' }, rows.map(r => r.row)),
    update() {
      for (const r of rows) {
        const done = alwaysFn() || countFn() >= r.m.count;
        setText(r.mark, done ? 'Done' : `${Math.min(countFn(), r.m.count)}/${r.m.count} ${noun}`);
        setClass(r.mark, `shrink-0 w-28 tabular-nums ${done ? theme.soft : 'text-slate-500'}`);
        setClass(r.row, `flex gap-3 text-sm ${done ? 'text-slate-300' : 'text-slate-500'}`);
      }
    },
  };
}

function automationPanel(title, key, unlocked, labels) {
  const toggle = toggleButton(() => {
    state.automation[key].on = !state.automation[key].on;
    refresh();
  });
  const mode = h('select', {
    class: 'bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs',
    'aria-label': `${title} mode`,
    onchange: e => { state.automation[key].mode = e.target.value; refresh(); },
  },
  h('option', { value: 'amount', text: labels.amount }),
  h('option', { value: 'multiple', text: labels.multiple }),
  h('option', { value: 'time', text: labels.time }));
  const input = h('input', {
    class: 'bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs w-28 tabular-nums',
    'aria-label': `${title} value`,
    inputmode: 'decimal',
    oninput: e => { state.automation[key].value = e.target.value; },
  });
  const hint = h('div', { class: 'text-xs text-slate-500' });
  const el = h('div', { class: PANEL + ' space-y-3' },
    h('div', { class: 'flex flex-wrap items-center justify-between gap-2' }, heading(title), toggle),
    h('div', { class: 'flex flex-wrap items-center gap-2 text-xs text-slate-400' }, 'Fire when', mode, input),
    hint);
  return {
    el,
    update() {
      show(el, unlocked());
      if (el.hidden) return;
      const a = state.automation[key];
      updateToggle(toggle, title, a.on);
      if (mode.value !== a.mode) mode.value = a.mode;
      if (document.activeElement !== input && input.value !== a.value) input.value = a.value;
      const valid = parseAutoValue(a.value) !== null;
      setClass(input, `bg-slate-900 border rounded px-2 py-1 text-xs w-28 tabular-nums ${valid ? 'border-slate-700' : 'border-rose-600'}`);
      setText(hint, valid ? labels.hint[a.mode] : 'Enter a number, such as 100 or 1e20.');
    },
  };
}

function lockedPanel(text) {
  return h('div', { class: PANEL + ' text-center py-10 space-y-2' },
    h('div', { class: 'text-slate-500 text-xs uppercase tracking-widest', text: 'Locked' }),
    h('p', { class: 'text-slate-400 text-sm', text }));
}

// ---------- Modals and toasts ----------

let modalOpen = false;

function openModal({ title, body, actions = [{ label: 'Close' }], dismissable = true }) {
  closeModal();
  const root = document.getElementById('modal-root');
  const close = () => closeModal();
  const buttons = actions.map(a => h('button', {
    class: `${BTN} ${a.style === 'danger' ? 'border-rose-700 text-rose-200 hover:bg-rose-950/60' : a.style === 'primary' ? 'border-sky-600 text-sky-100 hover:bg-sky-900/50' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`,
    text: a.label,
    onclick: () => {
      const keepOpen = a.onClick && a.onClick() === false;
      if (!keepOpen) close();
      refresh();
    },
  }));
  const dialog = h('div', {
    class: 'w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  },
  h('h2', { class: 'text-slate-100', text: title }),
  typeof body === 'string' ? h('p', { class: 'text-sm text-slate-300 leading-relaxed', text: body }) : body,
  h('div', { class: 'flex flex-wrap justify-end gap-2' }, buttons));
  const overlay = h('div', {
    class: 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4',
    onclick: e => { if (dismissable && e.target === overlay) close(); },
  }, dialog);
  overlay.dataset.dismissable = dismissable ? '1' : '';
  root.append(overlay);
  modalOpen = true;
  (buttons[buttons.length - 1] || dialog).focus();
}

function closeModal() {
  document.getElementById('modal-root').replaceChildren();
  modalOpen = false;
}

function confirmAction(settingKey, title, body, confirmLabel, action) {
  if (settingKey && !state.settings[settingKey]) {
    action();
    refresh();
    return;
  }
  openModal({
    title,
    body,
    actions: [{ label: 'Cancel' }, { label: confirmLabel, style: 'primary', onClick: action }],
  });
}

function toast(text, tone = 'plain') {
  const root = document.getElementById('toasts');
  const colours = {
    plain: 'border-slate-700 text-slate-200',
    log: 'border-sky-800 text-sky-100',
    achievement: 'border-amber-700 text-amber-100',
  };
  const el = h('div', { class: `toast-enter max-w-md rounded-md border bg-slate-900/95 px-4 py-2 text-sm shadow-lg ${colours[tone]}`, text });
  root.append(el);
  while (root.children.length > 4) root.firstChild.remove();
  setTimeout(() => el.remove(), 4000);
}

// ---------- Header ----------

const headerEls = {};

function buildHeader() {
  const photons = h('div', { class: 'text-3xl sm:text-4xl text-sky-200 glow-sky tabular-nums leading-none' });
  const pps = h('div', { class: 'text-xs text-slate-500 tabular-nums mt-1' });
  const chip = (label, theme) => {
    const value = h('span', { class: `${THEMES[theme].chip} tabular-nums` });
    const el = h('div', { class: 'text-xs text-slate-500' }, `${label} `, value);
    return { el, value };
  };
  const telemetry = chip('Telemetry', 'emerald');
  const calibration = chip('Calibration', 'amber');
  const shards = chip('Shards', 'violet');
  const fragments = chip('Fragments', 'amber');
  const decodeBtn = h('button', { onclick: () => ui.decode() });
  const recalBtn = h('button', { onclick: () => ui.recalibrate() });
  const crossBtn = h('button', { onclick: () => ui.cross() });
  const challenge = h('div', { class: 'border-t border-violet-900/60 bg-violet-950/40 text-xs text-violet-100' });
  const challengeText = h('span');
  const abandon = h('button', { class: `${SMALL_BTN} border-violet-700 hover:bg-violet-900/50`, text: 'Abandon', onclick: () => ui.abandonChallenge() });
  challenge.append(h('div', { class: 'max-w-4xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2' }, challengeText, abandon));

  const header = document.getElementById('header');
  header.append(
    h('div', { class: 'max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3' },
      h('div', {},
        h('div', { class: 'text-[10px] tracking-[0.35em] uppercase text-slate-500 mb-1', text: 'Sublight' }),
        photons, pps),
      h('div', { class: 'flex flex-col items-start sm:items-end gap-1' },
        h('div', { class: 'flex flex-wrap gap-x-4 gap-y-1' }, telemetry.el, calibration.el, shards.el, fragments.el),
        h('div', { class: 'flex flex-wrap gap-2' }, decodeBtn, recalBtn, crossBtn))),
    challenge);
  Object.assign(headerEls, { photons, pps, telemetry, calibration, shards, fragments, decodeBtn, recalBtn, crossBtn, challenge, challengeText });
}

function updateHeader(prod) {
  const e = headerEls;
  setText(e.photons, format(state.photons));
  const capped = !isBroken() && canCross();
  const surging = state.signal.surge > 0 ? ` (Signal Surge x${surgeMultiplier()})` : '';
  setText(e.pps, capped ? 'Photon limit reached. Cross the Horizon.' : `${format(prod.total)} photons / sec${surging}`);
  show(e.telemetry.el, Boolean(state.flags.telemetry));
  setText(e.telemetry.value, format(state.telemetry));
  show(e.calibration.el, Boolean(state.flags.calibration));
  setText(e.calibration.value, formatInt(state.calibration));
  show(e.shards.el, state.stats.crossings > 0 || state.shards.gt(0));
  setText(e.shards.value, format(state.shards));
  show(e.fragments.el, state.signal.fragmentsEarned > 0);
  setText(e.fragments.value, formatInt(state.signal.fragments));

  const pendingT = pendingTelemetry();
  show(e.decodeBtn, pendingT.gte(1));
  setText(e.decodeBtn, `Decode +${format(pendingT)}`);
  setClass(e.decodeBtn, `${SMALL_BTN} ${THEMES.emerald.button}`);
  const pendingC = pendingCalibration();
  show(e.recalBtn, pendingC >= 1);
  setText(e.recalBtn, `Recalibrate +${formatInt(pendingC)}`);
  setClass(e.recalBtn, `${SMALL_BTN} ${THEMES.amber.button}`);
  const pendingS = pendingShards();
  show(e.crossBtn, pendingS.gte(1));
  setText(e.crossBtn, `Cross +${format(pendingS)}`);
  setClass(e.crossBtn, `${SMALL_BTN} ${THEMES.violet.button}`);

  show(e.challenge, Boolean(state.challenge));
  if (state.challenge) {
    const c = CHALLENGES.find(x => x.id === state.challenge);
    setText(e.challengeText, `Challenge: ${c.name}. ${c.desc} Reach 1.8e308 photons and cross to complete it.`);
  }
}

// ---------- Tabs ----------

const TABS = [
  { id: 'arrays', label: 'Arrays', unlocked: () => true },
  { id: 'signal', label: 'Signal', unlocked: () => true },
  { id: 'telemetry', label: 'Telemetry', unlocked: () => Boolean(state.flags.telemetry) },
  { id: 'calibration', label: 'Calibration', unlocked: () => Boolean(state.flags.calibration) },
  { id: 'horizon', label: 'Horizon', unlocked: () => Boolean(state.flags.horizon) },
  { id: 'achievements', label: 'Achievements', unlocked: () => true },
  { id: 'log', label: 'Log', unlocked: () => true },
  { id: 'stats', label: 'Stats', unlocked: () => true },
  { id: 'settings', label: 'Settings', unlocked: () => true },
];

const tabEls = {};
const panels = {};

function buildTabs() {
  const nav = document.getElementById('tabs');
  const row = h('div', { class: 'tabs-scroll max-w-4xl mx-auto px-2 flex overflow-x-auto', role: 'tablist' });
  for (const tab of TABS) {
    const btn = h('button', {
      role: 'tab',
      id: `tab-${tab.id}`,
      'aria-controls': `panel-${tab.id}`,
      onclick: () => selectTab(tab.id),
    });
    tabEls[tab.id] = btn;
    row.append(btn);
  }
  nav.append(row);
}

function selectTab(id) {
  state.tab = id;
  for (const tab of TABS) show(panels[tab.id].el, tab.id === id);
  refresh();
}

function updateTabs() {
  for (const tab of TABS) {
    const btn = tabEls[tab.id];
    const active = state.tab === tab.id;
    const unlocked = tab.unlocked();
    setText(btn, !unlocked ? `${tab.label} (locked)` : tab.id === 'signal' && state.signal.queued ? `Signal (${state.signal.queued})` : tab.label);
    btn.setAttribute('aria-selected', String(active));
    setClass(btn, `shrink-0 px-3 py-3 text-xs uppercase tracking-wider border-b-2 transition ${active ? 'border-sky-400 text-sky-100' : 'border-transparent hover:text-slate-200'} ${unlocked ? (active ? '' : 'text-slate-400') : 'text-slate-600'}`);
  }
}

// ---------- Arrays tab ----------

function buildArraysTab() {
  const intro = h('p', { class: 'text-sm text-slate-400' });
  const gatherBtn = h('button', {
    class: `${BTN} ${THEMES.sky.button} px-6 py-3`,
    text: 'Gather photons',
    onclick: () => { gather(); burstFrom(gatherBtn, [125, 211, 252], 10); refresh(); },
  });
  const gatherInfo = h('div', { class: 'text-xs text-slate-500 tabular-nums' });

  const modeBtns = ['1', '10', 'max'].map(mode => h('button', {
    text: mode === 'max' ? 'Max' : `x${mode}`,
    onclick: () => { state.buyMode = mode; refresh(); },
  }));
  const buyAllBtn = h('button', { class: `${SMALL_BTN} border-slate-700 hover:border-slate-500`, text: 'Buy max of all', onclick: () => { buyAllArrays(); refresh(); } });
  const autoArrays = toggleButton(() => { state.automation.arrays = !state.automation.arrays; refresh(); });
  const autoUpgrades = toggleButton(() => { state.automation.upgrades = !state.automation.upgrades; refresh(); });
  const autoRow = h('div', { class: 'flex flex-wrap gap-2' }, autoArrays, autoUpgrades);

  const rows = ARRAYS.map(gen => {
    const owned = h('span', { class: 'text-slate-500 text-sm tabular-nums' });
    const rate = h('div', { class: 'text-xs text-sky-400/90 mt-1 tabular-nums' });
    const note = h('div', { class: 'text-xs text-slate-500 mt-1 tabular-nums' });
    const amount = h('div', { class: 'text-xs text-slate-500' });
    const cost = h('div', { class: 'text-sm tabular-nums' });
    const buyBtn = h('button', {
      class: 'press flex-1 min-w-0 text-left p-3 flex items-center justify-between gap-4',
      onclick: () => { if (buyArray(gen)) refresh(); },
    },
    h('div', { class: 'min-w-0' },
      h('div', { class: 'text-slate-100' }, gen.name, ' ', owned),
      h('div', { class: 'text-xs text-slate-500 truncate', text: gen.desc }),
      rate, note),
    h('div', { class: 'text-right shrink-0' }, amount, cost));
    const autoBtn = h('button', {
      class: 'shrink-0 w-14 border-l border-slate-800 text-[10px] uppercase tracking-wider',
      onclick: () => {
        state.automation.arrayToggles[gen.id] = !state.automation.arrayToggles[gen.id];
        refresh();
      },
    });
    const row = h('div', { class: 'rounded-md border flex transition' }, buyBtn, autoBtn);
    return { gen, row, owned, rate, note, amount, cost, buyBtn, autoBtn };
  });

  const upgrades = upgradeGrid(PHOTON_UPGRADES, THEMES.sky,
    u => simpleStatus(hasPhoton(u.id), true, state.photons.gte(u.cost), `${format(u.cost)} photons`),
    u => buyPhotonUpgrade(u.id), 'sm:grid-cols-2 lg:grid-cols-3');
  const upgradeNote = h('p', { class: 'text-xs text-slate-500' });

  const el = h('div', { class: 'space-y-8' },
    intro,
    h('div', { class: 'flex flex-col items-center gap-2' }, gatherBtn, gatherInfo),
    section(null,
      h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
        heading('Arrays'),
        h('div', { class: 'flex flex-wrap items-center gap-1' }, modeBtns, buyAllBtn)),
      autoRow,
      h('div', { class: 'space-y-2' }, rows.map(r => r.row))),
    section('Photon upgrades', upgradeNote, upgrades.el));

  return {
    el,
    update(prod) {
      const step = milestoneStep();
      setText(intro, `Arrays produce photons. Every ${step} you own of an array multiplies its output by ${milestoneBase()}. Array cost scaling: x${costRatio(ARRAYS[0]).toFixed(3)} per purchase.`);
      const gain = gatherAmount(prod.total);
      setText(gatherInfo, `+${format(gain)} photons per click${hasTelemetry('echo') ? ', and 4 automatic clicks a second' : ''} (key G)`);

      modeBtns.forEach((btn, i) => {
        const active = state.buyMode === ['1', '10', 'max'][i];
        setClass(btn, `${SMALL_BTN} ${active ? 'border-sky-500 text-sky-100' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`);
      });
      const autos = autobuyersUnlocked();
      show(autoRow, autos);
      if (autos) {
        updateToggle(autoArrays, `Array autobuyer${autobuyerInterval() ? ' (every 2s)' : ''}`, state.automation.arrays);
        updateToggle(autoUpgrades, 'Upgrade autobuyer', state.automation.upgrades);
      }

      rows.forEach((r, i) => {
        const g = r.gen;
        const visible = arrayVisible(g);
        show(r.row, visible);
        if (!visible) return;
        const ownedCount = state.arrays[g.id];
        const amount = buyAmountFor(g);
        const cost = arrayCost(g, amount);
        const blocked = arrayBlocked(g);
        const affordable = !blocked && state.photons.gte(cost);
        setText(r.owned, `x${formatInt(ownedCount)}`);
        if (blocked) {
          setText(r.rate, 'Offline during Dark Sky.');
        } else if (ownedCount && !arrayActive(g)) {
          setText(r.rate, 'Idle: only your highest owned array produces during Single Band.');
        } else {
          const share = prod.total.gt(0) ? prod.perArray[i].div(prod.total).toNumber() * 100 : 0;
          setText(r.rate, ownedCount ? `${format(prod.perArray[i])} / sec (${share.toFixed(share < 10 ? 1 : 0)}%)` : 'Not built yet.');
        }
        const next = (Math.floor(ownedCount / step) + 1) * step;
        const tuned = state.tuning[g.id] ? `, tuned x${format(tuningMultiplier(g))}` : '';
        setText(r.note, `x${format(arrayMultiplier(g))} from milestones and upgrades${tuned}. Next x${milestoneBase()} at ${formatInt(next)}.`);
        setText(r.amount, `buy ${formatInt(amount)}`);
        setText(r.cost, format(cost));
        setClass(r.cost, `text-sm tabular-nums ${affordable ? 'text-sky-200' : 'text-slate-600'}`);
        setDisabled(r.buyBtn, !affordable);
        setClass(r.row, `rounded-md border flex transition ${affordable ? 'border-slate-700 hover:border-sky-600' : 'border-slate-800'}`);
        show(r.autoBtn, autos);
        if (autos) {
          const on = state.automation.arrayToggles[g.id];
          setText(r.autoBtn, on ? 'auto on' : 'auto off');
          r.autoBtn.setAttribute('aria-label', `${g.name} autobuyer ${on ? 'on' : 'off'}`);
          setClass(r.autoBtn, `shrink-0 w-14 border-l border-slate-800 text-[10px] uppercase tracking-wider ${on ? 'text-sky-300' : 'text-slate-600'}`);
        }
      });

      setText(upgradeNote, state.flags.firstDecode
        ? (decodeMilestone(2) ? 'Kept when you Decode.' : 'Lost when you Decode.')
        : 'One-off purchases that boost your arrays.');
      upgrades.update();
    },
  };
}

// ---------- Telemetry tab ----------

function nextTelemetryAt() {
  const next = pendingTelemetry().plus(1);
  return next.div(telemetryMultiplier().times(BALANCE.telemetryBase)).pow(1 / telemetryExponent()).times(BALANCE.decodeThreshold);
}

function buildTelemetryTab() {
  const locked = lockedPanel('Produce 1e9 photons in a single run to decode your first telemetry.');
  const decodeBtn = h('button', { onclick: () => ui.decode() });
  const decodeInfo = h('p', { class: 'text-xs text-slate-400 leading-relaxed' });
  const telemetryLine = h('div', { class: 'text-sm' });
  const bonusLine = h('div', { class: 'text-xs text-emerald-400' });

  const upgrades = upgradeGrid(TELEMETRY_UPGRADES, THEMES.emerald,
    u => simpleStatus(hasTelemetry(u.id), true, state.telemetry.gte(u.cost), `${format(u.cost)} telemetry`),
    u => buyTelemetryUpgrade(u.id));
  const upgradeNote = h('p', { class: 'text-xs text-slate-500' });

  const amplifier = repeatableRow('amplifier', THEMES.emerald, ['telemetry', 'telemetry'], () => `Currently x${format(Decimal.pow(2, state.repeatables.amplifier))} to all arrays.`);
  const decoder = repeatableRow('decoder', THEMES.emerald, ['telemetry', 'telemetry'], () => `Currently x${format(Decimal.pow(1.25, state.repeatables.decoder))} telemetry gain.`);
  const ampAuto = toggleButton(() => { state.automation.repeatables = !state.automation.repeatables; refresh(); });
  const ampAutoNote = h('p', { class: 'text-xs text-slate-500' });

  const milestones = milestoneList(DECODE_MILESTONES, () => state.decodes, () => hasHorizon('eventmemory'), THEMES.emerald, 'Decodes');
  const milestoneNote = h('p', { class: 'text-xs text-slate-500' });

  const auto = automationPanel('Auto-Decode', 'decode', () => hasCalibration('autodecode'), {
    amount: 'gain is at least',
    multiple: 'gain is at least x times earned',
    time: 'run lasted seconds',
    hint: {
      amount: 'Decodes as soon as a Decode would give at least this much telemetry.',
      multiple: 'Decodes when the gain is at least this many times the telemetry earned this Recalibration. 1 means doubling it.',
      time: 'Decodes once the current run has lasted this many seconds.',
    },
  });

  const content = h('div', { class: 'space-y-8' },
    h('p', { class: 'text-sm text-slate-400', text: 'Decoding trades your whole run for telemetry. Unspent telemetry boosts every array, and it buys permanent upgrades that make the next run faster.' }),
    h('div', { class: PANEL + ' space-y-3' },
      h('div', { class: 'flex flex-wrap items-center justify-between gap-3' },
        h('div', { class: 'space-y-1' }, telemetryLine, bonusLine),
        decodeBtn),
      decodeInfo),
    auto.el,
    section('Telemetry upgrades', upgradeNote, upgrades.el),
    section('Signal processing', amplifier.el, decoder.el, h('div', { class: 'flex flex-wrap items-center gap-2' }, ampAuto, ampAutoNote)),
    section('Decode milestones', milestoneNote, milestones.el));
  const el = h('div', {}, locked, content);

  return {
    el,
    update() {
      const unlocked = Boolean(state.flags.telemetry);
      show(locked, !unlocked);
      show(content, unlocked);
      if (!unlocked) return;
      const pending = pendingTelemetry();
      setText(telemetryLine, `Telemetry: ${format(state.telemetry)} (earned this Recalibration: ${format(state.telemetryRun)})`);
      setText(bonusLine, `Bonus: x${format(telemetryBonus())} to all arrays, from ${hasTelemetry('archive') ? 'telemetry earned' : 'unspent telemetry'} ^${(BALANCE.telemetryBonusExponent + (challengeDone('silent') ? 0.15 : 0)).toFixed(2)}${inChallenge('silent') ? ' (disabled during Silent Relay)' : ''}.`);
      const ready = pending.gte(1);
      setText(decodeBtn, ready ? `Decode for +${format(pending)} telemetry` : 'Decode');
      setClass(decodeBtn, `${BTN} ${ready ? THEMES.emerald.button : 'border-slate-700 text-slate-400'}`);
      setDisabled(decodeBtn, !ready);
      const kept = decodeMilestone(2) ? 'photons and arrays' : 'photons, arrays and photon upgrades';
      const progress = ready
        ? `Next telemetry at ${format(nextTelemetryAt())} photons this run.`
        : `Needs ${format(BALANCE.decodeThreshold)} photons this run (${format(state.run.photons)} so far).`;
      setText(decodeInfo, `Resets your ${kept}. Gain: ${BALANCE.telemetryBase} x (photons this run / 1e9)^${telemetryExponent().toFixed(2)} x ${format(telemetryMultiplier())}. ${progress} Key D.`);
      setText(upgradeNote, recalMilestone(3) ? 'Kept when you Recalibrate.' : state.flags.firstRecal ? 'Lost when you Recalibrate.' : 'Permanent until your first Recalibration.');
      upgrades.update();
      amplifier.update();
      decoder.update();
      const hasAuto = hasCalibration('ampauto');
      show(ampAuto, hasAuto);
      if (hasAuto) updateToggle(ampAuto, 'Autobuyer', state.automation.repeatables);
      setText(ampAutoNote, hasAuto
        ? (hasTelemetry('archive') ? 'Spends telemetry freely.' : 'Only spends up to half your telemetry, so your bonus stays high.')
        : 'Spending telemetry here lowers your unspent telemetry bonus.');
      milestones.update();
      setText(milestoneNote, hasHorizon('eventmemory') ? 'Always active thanks to Event Memory.' : recalMilestone(1) ? 'Your Decode count is kept when you Recalibrate.' : 'Decodes this Recalibration.');
      auto.update();
    },
  };
}

// ---------- Calibration tab ----------

function nextCalibrationAt() {
  const next = pendingCalibration() + 1;
  return new Decimal(next).div(calibrationMultiplier()).pow(1 / BALANCE.calibrationExponent).times(BALANCE.recalThreshold);
}

function recalResetList() {
  const items = ['photons', 'arrays', 'photon upgrades', 'telemetry'];
  if (!recalMilestone(3)) items.push('telemetry upgrades');
  if (!recalMilestone(6)) items.push('Amplifier and Decoder levels');
  if (!recalMilestone(1)) items.push('your Decode count');
  return joinList(items);
}

function buildCalibrationTab() {
  const locked = lockedPanel('Earn 1e8 telemetry within one Recalibration to unlock calibration.');
  const recalBtn = h('button', { onclick: () => ui.recalibrate() });
  const recalInfo = h('p', { class: 'text-xs text-slate-400 leading-relaxed' });
  const pointsLine = h('div', { class: 'text-sm' });
  const tuningLine = h('div', { class: 'text-xs text-amber-400' });

  const tuningRows = ARRAYS.map(gen => {
    const points = h('span', { class: 'text-slate-500 text-sm tabular-nums' });
    const mult = h('div', { class: 'text-xs text-amber-400/90 tabular-nums' });
    const btns = [
      ['+1', () => 1],
      ['+10', () => 10],
      ['+half', () => Math.ceil(state.calibration / 2)],
      ['+all', () => state.calibration],
    ].map(([label, amount]) => h('button', {
      text: label,
      onclick: () => { if (tune(gen.id, amount())) refresh(); },
    }));
    const row = h('div', { class: 'rounded-md border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2' },
      h('div', { class: 'min-w-0' }, h('div', { class: 'text-sm text-slate-100' }, gen.name, ' ', points), mult),
      h('div', { class: 'flex gap-1' }, btns));
    return { gen, row, points, mult, btns };
  });
  const respecBtn = h('button', {
    class: `${SMALL_BTN} border-slate-700 text-slate-300 hover:border-slate-500`,
    text: 'Respec',
    onclick: () => confirmAction(null, 'Respec tuning?', 'All tuning points go back to your pool, and your current run restarts: photons and arrays reset. Telemetry is not affected.', 'Respec', () => respec()),
  });

  const upgrades = upgradeGrid(CALIBRATION_UPGRADES, THEMES.amber,
    u => simpleStatus(hasCalibration(u.id), true, state.calibration >= u.cost, amountOf(u.cost, 'calibration point')),
    u => buyCalibrationUpgrade(u.id));
  const milestones = milestoneList(RECAL_MILESTONES, () => state.recals, () => hasHorizon('eventmemory'), THEMES.amber, 'Recals');
  const auto = automationPanel('Auto-Recalibrate', 'recal', () => hasHorizon('autorecal'), {
    amount: 'gain is at least',
    multiple: 'gain is at least x times earned',
    time: 'Recalibration lasted seconds',
    hint: {
      amount: 'Recalibrates once a Recalibration would give at least this many points.',
      multiple: 'Recalibrates when the gain is at least this many times the points earned from Recalibrating this Horizon run.',
      time: 'Recalibrates once the current Recalibration has lasted this many seconds.',
    },
  });

  const content = h('div', { class: 'space-y-8' },
    h('p', { class: 'text-sm text-slate-400', text: 'Recalibrating trades all your telemetry for calibration points. Put points into an array to tune it, or spend them on upgrades that change the rules.' }),
    h('div', { class: PANEL + ' space-y-3' },
      h('div', { class: 'flex flex-wrap items-center justify-between gap-3' },
        h('div', { class: 'space-y-1' }, pointsLine, tuningLine),
        recalBtn),
      recalInfo),
    auto.el,
    section(null,
      h('div', { class: 'flex items-center justify-between gap-2' }, heading('Array tuning'), respecBtn),
      h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }, tuningRows.map(r => r.row))),
    section('Calibration upgrades', h('p', { class: 'text-xs text-slate-500', text: 'Spent points are gone until your next crossing, when these upgrades reset.' }), upgrades.el),
    section('Recalibration milestones', milestones.el));
  const el = h('div', {}, locked, content);

  return {
    el,
    update(prod) {
      const unlocked = Boolean(state.flags.calibration);
      show(locked, !unlocked);
      show(content, unlocked);
      if (!unlocked) return;
      const pending = pendingCalibration();
      setText(pointsLine, `Unspent calibration points: ${formatInt(state.calibration)} (tuned: ${formatInt(allocatedPoints())})`);
      setText(tuningLine, `Each tuned array gets x(1 + points)^${tuningPower().toFixed(1)}.`);
      const ready = pending >= 1;
      setText(recalBtn, ready ? `Recalibrate for +${amountOf(pending, 'point')}` : 'Recalibrate');
      setClass(recalBtn, `${BTN} ${ready ? THEMES.amber.button : 'border-slate-700 text-slate-400'}`);
      setDisabled(recalBtn, !ready);
      const progress = ready
        ? `Next point at ${format(nextCalibrationAt())} telemetry earned.`
        : `Needs ${format(BALANCE.recalThreshold)} telemetry earned this Recalibration (${format(state.telemetryRun)} so far).`;
      setText(recalInfo, `Resets ${recalResetList()}. Gain: (telemetry earned / 1e8)^${BALANCE.calibrationExponent} x ${format(calibrationMultiplier())}. ${progress} Key R.`);
      const hasPoints = state.calibration >= 1;
      tuningRows.forEach((r, i) => {
        const pts = state.tuning[r.gen.id];
        setText(r.points, `${formatInt(pts)} pts`);
        const share = prod.total.gt(0) ? prod.perArray[i].div(prod.total).toNumber() * 100 : 0;
        setText(r.mult, `x${format(tuningMultiplier(r.gen))}${state.arrays[r.gen.id] ? `, ${share.toFixed(share < 10 ? 1 : 0)}% of production` : ''}`);
        for (const b of r.btns) {
          setClass(b, `${SMALL_BTN} ${hasPoints ? THEMES.amber.button : 'border-slate-800 text-slate-600'}`);
          setDisabled(b, !hasPoints);
        }
      });
      setDisabled(respecBtn, allocatedPoints() < 1);
      upgrades.update();
      milestones.update();
      auto.update();
    },
  };
}

// ---------- Horizon tab ----------

function nextShardsAt() {
  const base = Decimal.pow(10, (state.photons.log10() - HORIZON.log10()) / 100).floor().max(1);
  return Decimal.pow(10, base.plus(1).log10() * 100).times(HORIZON);
}

function buildHorizonTab() {
  const locked = lockedPanel('Reach 1.8e308 photons to find the edge of the observable universe.');
  const crossBtn = h('button', { onclick: () => ui.cross() });
  const crossInfo = h('p', { class: 'text-xs text-slate-400 leading-relaxed' });
  const shardsLine = h('div', { class: 'text-sm' });
  const dragLine = h('div', { class: 'text-xs text-violet-400' });

  const upgrades = upgradeGrid(HORIZON_UPGRADES, THEMES.violet, u => {
    if (u.needsBreak && !isBroken()) return { hidden: true };
    const available = horizonUpgradeAvailable(u);
    const lockedText = u.id === 'break' ? `Complete all challenges (${challengeCount()}/${CHALLENGES.length})` : 'Locked';
    return simpleStatus(hasHorizon(u.id), available, state.shards.gte(u.cost), amountOf(u.cost, 'shard'), lockedText);
  }, u => buyHorizonUpgrade(u.id));
  const tidal = repeatableRow('tidal', THEMES.violet, ['shard'], () => `Milestones every ${milestoneStep()} owned right now.`);
  const resonance = repeatableRow('resonance', THEMES.violet, ['shard'], () => `Drag exponent ^${dragExponent().toFixed(2)}.`);
  const condenser = repeatableRow('condenser', THEMES.violet, ['shard'], () => `Currently x${format(shardMultiplier())} shards.`);

  const challengeRows = CHALLENGES.map(c => {
    const status = h('div', { class: 'text-xs' });
    const btn = h('button', { onclick: () => ui.startChallenge(c) });
    const row = h('div', { class: 'rounded-md border p-3 space-y-2' },
      h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
        h('div', { class: 'text-sm text-slate-100', text: c.name }), btn),
      h('div', { class: 'text-xs text-slate-400', text: `Restriction: ${c.desc}` }),
      h('div', { class: 'text-xs text-violet-300/80', text: `Reward: ${c.reward}` }),
      status);
    return { c, row, btn, status };
  });
  const challengeIntro = h('p', { class: 'text-xs text-slate-500' });
  const auto = automationPanel('Auto-Cross', 'cross', () => hasHorizon('autocross') && isBroken(), {
    amount: 'gain is at least',
    multiple: 'gain is at least x times earned',
    time: 'Horizon run lasted seconds',
    hint: {
      amount: 'Crosses once a crossing would give at least this many shards.',
      multiple: 'Crosses when the gain is at least this many times all shards you have ever earned.',
      time: 'Crosses once the current Horizon run has lasted this many seconds.',
    },
  });

  const content = h('div', { class: 'space-y-8' },
    h('p', { class: 'text-sm text-slate-400', text: 'Crossing the Horizon resets everything except Horizon Shards, Horizon upgrades, challenges, achievements and stats. Shards buy the upgrades that make every later run faster.' }),
    h('div', { class: PANEL + ' space-y-3' },
      h('div', { class: 'flex flex-wrap items-center justify-between gap-3' },
        h('div', { class: 'space-y-1' }, shardsLine, dragLine),
        crossBtn),
      crossInfo),
    auto.el,
    section('Horizon upgrades', upgrades.el),
    section('Resonances', tidal.el, resonance.el, condenser.el),
    section('Challenges', challengeIntro, h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }, challengeRows.map(r => r.row))));
  const el = h('div', {}, locked, content);

  return {
    el,
    update() {
      const unlocked = Boolean(state.flags.horizon);
      show(locked, !unlocked);
      show(content, unlocked);
      if (!unlocked) return;
      setText(shardsLine, `Horizon Shards: ${format(state.shards)} (earned in total: ${format(state.shardsEarned)})`);
      setText(dragLine, isBroken()
        ? `Horizon drag: production past 1.8e308/s counts at ^${dragExponent().toFixed(2)}.`
        : 'Photons stop at 1.8e308 until you break the Horizon.');
      const pending = pendingShards();
      const ready = pending.gte(1);
      setText(crossBtn, ready ? `Cross for +${amountOf(pending, 'shard')}` : 'Cross the Horizon');
      setClass(crossBtn, `${BTN} ${ready ? THEMES.violet.button : 'border-slate-700 text-slate-400'}`);
      setDisabled(crossBtn, !ready);
      let info = ready ? 'Ready to cross.' : `Needs 1.8e308 photons (${format(state.photons)} now).`;
      if (isBroken() && ready) info = `Shards grow x10 for every 100 orders of magnitude past 1.8e308. Next at ${format(nextShardsAt())} photons.`;
      setText(crossInfo, `${info} Key C.`);
      upgrades.update();
      tidal.update();
      resonance.update();
      condenser.update();
      setText(challengeIntro, state.stats.crossings
        ? 'Starting a challenge resets like a crossing but gives no shards until you complete it. Reach 1.8e308 photons under the restriction, then cross.'
        : 'Challenges open after your first crossing.');
      for (const r of challengeRows) {
        const done = challengeDone(r.c.id);
        const active = inChallenge(r.c.id);
        setClass(r.row, `rounded-md border p-3 space-y-2 ${active ? 'border-violet-500 bg-violet-950/40' : done ? THEMES.violet.owned : 'border-slate-800'}`);
        setText(r.status, active ? 'In progress.' : done ? 'Completed. Reward active.' : 'Not completed.');
        setClass(r.status, `text-xs ${done || active ? 'text-violet-300' : 'text-slate-500'}`);
        const canStart = state.stats.crossings > 0 && !state.challenge;
        setText(r.btn, active ? 'Active' : done ? 'Replay' : 'Start');
        setClass(r.btn, `${SMALL_BTN} ${canStart ? THEMES.violet.button : 'border-slate-800 text-slate-600'}`);
        setDisabled(r.btn, !canStart);
      }
      auto.update();
    },
  };
}

// ---------- Signal tab ----------

function drawWave(ctx, w, hgt, freq, phase, colour, noise, time, dashed) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = dashed ? 2 : 2.5;
  ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const t = x / w;
    const wobble = noise ? Math.sin(t * 37 + time * 5) * noise * 0.5 + Math.sin(t * 91 - time * 7) * noise * 0.3 : 0;
    const y = hgt / 2 - (Math.sin(t * freq * Math.PI * 2 + (phase * Math.PI) / 180) + wobble) * hgt * 0.36;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function buildSignalTab() {
  const status = h('div', { class: 'text-sm' });
  const surge = h('div', { class: 'text-xs text-emerald-300' });
  const canvas = h('canvas', { class: 'w-full h-40 rounded-md bg-slate-950/80 border border-slate-800', width: 720, height: 200, 'aria-label': 'Signal scope' });
  const ctx = canvas.getContext('2d');
  const freq = h('input', { type: 'range', min: '1', max: '6.5', step: '0.1', value: '3', class: 'w-full accent-amber-400', 'aria-label': 'Frequency' });
  const phase = h('input', { type: 'range', min: '0', max: '359', step: '1', value: '0', class: 'w-full accent-amber-400', 'aria-label': 'Phase' });
  const freqLabel = h('span', { class: 'tabular-nums text-amber-200' });
  const phaseLabel = h('span', { class: 'tabular-nums text-amber-200' });
  const strength = h('div', { class: 'text-xs text-slate-400 tabular-nums' });
  const lockBar = h('div', { class: 'h-full bg-emerald-400 transition-[width] duration-100', style: 'width:0%' });
  const tuner = h('div', { class: 'space-y-3' },
    h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' },
      h('label', { class: 'space-y-1 text-xs text-slate-400' }, h('div', {}, 'Frequency ', freqLabel), freq),
      h('label', { class: 'space-y-1 text-xs text-slate-400' }, h('div', {}, 'Phase ', phaseLabel), phase)),
    h('div', { class: 'flex items-center gap-3' },
      h('div', { class: 'flex-1 h-2 rounded bg-slate-800 overflow-hidden' }, lockBar), strength));
  const idle = h('p', { class: 'text-xs text-slate-500' });

  const archive = h('ol', { class: 'space-y-2' });
  let archiveKey = '';

  const fragmentsLine = h('div', { class: 'text-sm' });
  const cards = CONSTELLATIONS.map(c => {
    const chart = h('canvas', { width: 220, height: 140, class: 'w-full h-28 rounded bg-slate-950/70' });
    const btn = h('button', { onclick: () => { if (lightStar(c.id)) { burstFrom(chart, [253, 224, 71], 24); refresh(); } } });
    const progress = h('span', { class: 'text-xs text-slate-500 tabular-nums' });
    const el = h('div', { class: 'rounded-md border p-3 space-y-2' },
      h('div', { class: 'flex items-center justify-between gap-2' }, h('div', { class: 'text-sm text-slate-100', text: c.name }), progress),
      chart,
      h('div', { class: 'text-xs text-amber-300/90', text: `Reward: ${c.reward}` }),
      btn);
    return { c, el, chart, btn, progress, ctx: chart.getContext('2d') };
  });

  const drawChart = card => {
    const { ctx: g, c } = card;
    const lit = state.signal.stars[c.id];
    const done = lit >= c.stars.length;
    g.clearRect(0, 0, 220, 140);
    g.strokeStyle = done ? 'rgba(253,224,71,0.7)' : 'rgba(253,224,71,0.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    c.stars.slice(0, lit).forEach(([x, y], i) => (i ? g.lineTo(x * 200 + 10, y * 120 + 10) : g.moveTo(x * 200 + 10, y * 120 + 10)));
    if (done) g.closePath();
    g.stroke();
    c.stars.forEach(([x, y], i) => {
      const on = i < lit;
      g.fillStyle = on ? '#fde68a' : 'rgba(148,163,184,0.35)';
      g.beginPath();
      g.arc(x * 200 + 10, y * 120 + 10, on ? 4 : 2.5, 0, Math.PI * 2);
      g.fill();
      if (on) {
        g.fillStyle = 'rgba(253,224,71,0.18)';
        g.beginPath();
        g.arc(x * 200 + 10, y * 120 + 10, 10, 0, Math.PI * 2);
        g.fill();
      }
    });
  };

  const el = h('div', { class: 'space-y-8' },
    h('p', { class: 'text-sm text-slate-400', text: 'Something out there is transmitting. Tune the dials until your wave matches the signal and hold it there to lock on. Every lock reveals more of the message, pays out Star Fragments and triggers a Signal Surge.' }),
    h('div', { class: PANEL + ' space-y-4' },
      h('div', { class: 'flex flex-wrap items-center justify-between gap-2' }, status, surge),
      canvas, tuner, idle),
    section('Star chart', fragmentsLine, h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' }, cards.map(x => x.el))),
    section('Transmissions', archive));

  let last = performance.now();
  return {
    el,
    update() {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const s = state.signal;
      ensureTarget();
      const waiting = s.queued > 0;
      const cap = signalQueueCap();
      const nextIn = s.queued >= cap ? 'Queue full.' : `Next in ${formatTime((s.decoded === 0 && s.queued === 0 ? SIGNAL.firstDelay : signalInterval()) - s.timer)}.`;
      setText(status, `Transmissions waiting: ${s.queued} / ${cap}. ${nextIn}`);
      setText(surge, s.surge > 0 ? `Signal Surge: all arrays x${surgeMultiplier()} for ${formatTime(s.surge)}` : '');

      const W = 720; const H = 200;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(51,65,85,0.6)';
      ctx.lineWidth = 1;
      for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const time = now / 1000;
      show(tuner, waiting);
      show(idle, !waiting);
      if (waiting) {
        const f = Number(freq.value);
        const p = Number(phase.value);
        drawWave(ctx, W, H, s.target.freq, s.target.phase, 'rgba(52,211,153,0.9)', s.target.noise, time, true);
        drawWave(ctx, W, H, f, p, 'rgba(251,191,36,0.95)', 0, time, false);
        const score = tuneScore(f, p);
        setText(freqLabel, f.toFixed(1));
        setText(phaseLabel, `${p}°`);
        setText(strength, `Signal strength ${(score * 100).toFixed(1)}%`);
        const progress = updateLock(f, p, dt);
        lockBar.style.width = `${Math.round(progress * 100)}%`;
      } else {
        ctx.strokeStyle = 'rgba(100,116,139,0.6)';
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) ctx.lineTo(x, H / 2 + (Math.random() - 0.5) * 18);
        ctx.stroke();
        setText(idle, 'Only static right now. Transmissions keep arriving while you are away, and up to ' + cap + ' can wait for you.');
      }

      setText(fragmentsLine, `Star Fragments: ${formatInt(s.fragments)}. Light every star in a constellation to claim its reward.`);
      for (const card of cards) {
        const lit = s.stars[card.c.id];
        const done = lit >= card.c.stars.length;
        const cost = starCost(card.c);
        const can = !done && s.fragments >= cost;
        setText(card.progress, `${lit}/${card.c.stars.length} stars`);
        setText(card.btn, done ? 'Complete. Reward active.' : `Light a star: ${amountOf(cost, 'fragment')}`);
        setClass(card.btn, `${SMALL_BTN} w-full ${can ? 'border-amber-600 text-amber-100 hover:bg-amber-900/40' : 'border-slate-800 text-slate-500'}`);
        setDisabled(card.btn, !can);
        setClass(card.el, `rounded-md border p-3 space-y-2 ${done ? 'border-amber-700/80 bg-amber-950/30' : 'border-slate-800 bg-slate-950/40'}`);
        drawChart(card);
      }

      const next = nextTransmission();
      const key = `${s.story}:${next && transmissionGated(next)}`;
      if (key !== archiveKey) {
        archiveKey = key;
        const items = TRANSMISSIONS.slice(0, s.story).map((t, i) => h('li', { class: 'flex gap-3 text-sm' },
          h('span', { class: 'shrink-0 w-12 text-xs text-slate-600 tabular-nums pt-0.5', text: `${i + 1}/${TRANSMISSIONS.length}` }),
          h('span', { class: 'transmission text-emerald-200', text: t.text })));
        if (next) {
          items.push(h('li', { class: 'flex gap-3 text-sm' },
            h('span', { class: 'shrink-0 w-12 text-xs text-slate-600 tabular-nums pt-0.5', text: `${s.story + 1}/${TRANSMISSIONS.length}` }),
            h('span', { class: 'text-slate-500', text: transmissionGated(next) ? `Too much static. ${GATE_TEXT[next.gate]}` : 'Lock onto a signal to decode this.' })));
        } else {
          items.push(h('li', { class: 'text-sm text-slate-500', text: 'The message is complete. Signals still carry Star Fragments.' }));
        }
        archive.replaceChildren(...items);
      }
    },
  };
}

// ---------- Achievements tab ----------

const ACHIEVEMENT_ROWS = ['Photons', 'Telemetry', 'Calibration', 'Horizon', 'Beyond', 'Signal'];

function buildAchievementsTab() {
  const summary = h('p', { class: 'text-sm text-slate-400' });
  const detail = h('div', { class: PANEL + ' text-sm min-h-[4.5rem]' });
  const showDetail = a => {
    const got = state.achievements.includes(a.id);
    detail.replaceChildren(
      h('div', { class: got ? 'text-amber-200' : 'text-slate-300', text: `${a.name}${got ? ' (unlocked)' : ''}` }),
      h('div', { class: 'text-xs text-slate-400 mt-1', text: a.desc }));
  };
  const tiles = [];
  const rows = ACHIEVEMENT_ROWS.map((label, i) => {
    const row = h('div', { class: 'grid grid-cols-4 sm:grid-cols-8 gap-2' });
    for (const a of ACHIEVEMENTS.filter(x => x.row === i + 1)) {
      const tile = h('button', {
        title: `${a.name}: ${a.desc}`,
        onmouseenter: () => showDetail(a),
        onfocus: () => showDetail(a),
        onclick: () => showDetail(a),
      }, h('span', { class: 'line-clamp-2', text: a.name }));
      tiles.push({ a, tile });
      row.append(tile);
    }
    return h('div', { class: 'space-y-2' }, heading(label), row);
  });
  detail.append(h('div', { class: 'text-xs text-slate-500', text: 'Hover over, tap or focus an achievement to see how to earn it.' }));
  const el = h('div', { class: 'space-y-6' }, summary, detail, ...rows);
  return {
    el,
    update() {
      const n = state.achievements.length;
      setText(summary, `${n} of ${ACHIEVEMENTS.length} unlocked. Each one boosts all arrays by 3%, compounding: x${format(achievementMultiplier())} right now.`);
      for (const { a, tile } of tiles) {
        const got = state.achievements.includes(a.id);
        setClass(tile, `h-16 rounded-md border p-1 text-[10px] leading-tight text-center transition ${got ? 'border-amber-700/80 bg-amber-950/40 text-amber-100' : 'border-slate-800 text-slate-600 hover:border-slate-600'}`);
      }
    },
  };
}

// ---------- Log tab ----------

function buildLogTab() {
  const list = h('ol', { class: 'space-y-2' });
  let lastKey = '';
  const el = h('div', { class: 'space-y-4' },
    h('p', { class: 'text-sm text-slate-400', text: 'Signals received by your probe, newest first.' }),
    list);
  return {
    el,
    update() {
      const key = `${state.log.length}:${state.log[0] ? state.log[0].t : ''}`;
      if (key === lastKey) return;
      lastKey = key;
      list.replaceChildren(...state.log.map(entry => h('li', { class: 'flex gap-3 text-sm' },
        h('span', { class: 'shrink-0 w-20 text-xs text-slate-600 tabular-nums pt-0.5', text: formatTime(entry.t) }),
        h('span', { class: 'text-slate-300', text: entry.text }))));
    },
  };
}

// ---------- Stats tab ----------

function buildStatsTab() {
  const table = h('dl', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm' });
  const el = h('div', { class: 'space-y-4' }, table);
  return {
    el,
    update() {
      const s = state.stats;
      const rows = [
        ['Time played', formatTime(s.timePlayed)],
        ['Photons produced', format(s.totalPhotons)],
        ['Most photons held', format(s.bestPhotons)],
        ['Times gathered', formatInt(s.gathers)],
        ['Current run', formatTime(state.run.time)],
        ['Photons this run', format(state.run.photons)],
        ['Decodes', formatInt(s.decodes)],
        ['Fastest Decode run', formatTime(s.fastestDecode, true)],
        ['Recalibrations', formatInt(s.recals)],
        ['Fastest Recalibration', formatTime(s.fastestRecal, true)],
        ['Calibration points earned', formatInt(s.calibrationEarned)],
        ['Current Recalibration', formatTime(state.recalTime)],
        ['Crossings', formatInt(s.crossings)],
        ['Fastest Horizon run', formatTime(s.fastestCross, true)],
        ['Current Horizon run', formatTime(state.horizonTime)],
        ['Challenges completed', `${challengeCount()} / ${CHALLENGES.length}`],
        ['Transmissions locked', formatInt(state.signal.decoded)],
        ['Story decoded', `${state.signal.story} / ${TRANSMISSIONS.length}`],
        ['Star Fragments earned', formatInt(state.signal.fragmentsEarned)],
        ['Comets caught', formatInt(state.signal.comets)],
        ['Achievements', `${state.achievements.length} / ${ACHIEVEMENTS.length}`],
        ['Production multiplier', `x${format(globalMultiplier())}`],
      ];
      if (table.children.length !== rows.length * 2) {
        table.replaceChildren(...rows.flatMap(() => [
          h('dt', { class: 'text-slate-500' }),
          h('dd', { class: 'text-slate-200 tabular-nums sm:text-right -mt-1 sm:mt-0 mb-2 sm:mb-0' }),
        ]));
      }
      rows.forEach(([label, value], i) => {
        setText(table.children[i * 2], label);
        setText(table.children[i * 2 + 1], value);
      });
    },
  };
}

// ---------- Settings tab ----------

function buildSettingsTab() {
  const selectClass = 'bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm';
  const notation = h('select', {
    class: selectClass,
    'aria-label': 'Number notation',
    onchange: e => { state.settings.notation = e.target.value; setNotation(e.target.value); refresh(); },
  }, Object.entries(NOTATIONS).map(([value, label]) => h('option', { value, text: label })));
  const autosave = h('select', {
    class: selectClass,
    'aria-label': 'Autosave interval',
    onchange: e => { state.settings.autosave = Number(e.target.value); refresh(); },
  }, [5, 10, 30, 60].map(v => h('option', { value: String(v), text: `Every ${v} seconds` })));
  const offline = toggleButton(() => { state.settings.offline = !state.settings.offline; refresh(); });
  const confirms = [
    ['confirmDecode', 'Confirm Decode'],
    ['confirmRecal', 'Confirm Recalibrate'],
    ['confirmCross', 'Confirm crossing'],
  ].map(([key, label]) => ({ key, label, btn: toggleButton(() => { state.settings[key] = !state.settings[key]; refresh(); }) }));

  const saveBtn = h('button', { class: `${BTN} border-slate-700 hover:bg-slate-800`, text: 'Save now', onclick: () => ui.save(true) });
  const exportBtn = h('button', { class: `${BTN} border-slate-700 hover:bg-slate-800`, text: 'Export save', onclick: () => ui.exportSave() });
  const importBtn = h('button', { class: `${BTN} border-slate-700 hover:bg-slate-800`, text: 'Import save', onclick: () => ui.importSave() });
  const resetBtn = h('button', { class: `${BTN} border-rose-800 text-rose-300 hover:bg-rose-950/60`, text: 'Hard reset', onclick: () => ui.hardReset() });

  const row = (label, control) => h('div', { class: 'flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-800/80' },
    h('span', { class: 'text-sm text-slate-300', text: label }), control);
  const keys = [
    ['G', 'Gather photons'],
    ['1 to 8', 'Buy an array (current buy mode)'],
    ['M', 'Buy max of every array'],
    ['D', 'Decode'],
    ['R', 'Recalibrate'],
    ['C', 'Cross the Horizon'],
  ];

  const el = h('div', { class: 'space-y-8' },
    section('Display',
      row('Number notation', notation)),
    section('Saving',
      row('Autosave', autosave),
      row('Offline progress (up to 24 hours)', offline),
      h('div', { class: 'flex flex-wrap gap-2 pt-2' }, saveBtn, exportBtn, importBtn, resetBtn)),
    section('Confirmations',
      h('div', { class: 'flex flex-wrap gap-2' }, confirms.map(c => c.btn))),
    section('Keyboard',
      h('dl', { class: 'grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm' },
        keys.flatMap(([k, v]) => [h('dt', { class: 'text-sky-300 tabular-nums', text: k }), h('dd', { class: 'text-slate-400', text: v })]))),
    section('About',
      h('p', { class: 'text-xs text-slate-500 leading-relaxed', text: 'Sublight Idle. Built with HTML, Tailwind CSS and break_infinity.js. Your save lives in this browser, so export it now and then to keep a backup.' })));
  return {
    el,
    update() {
      if (notation.value !== state.settings.notation) notation.value = state.settings.notation;
      if (autosave.value !== String(state.settings.autosave)) autosave.value = String(state.settings.autosave);
      updateToggle(offline, '', state.settings.offline);
      for (const c of confirms) updateToggle(c.btn, c.label, state.settings[c.key]);
    },
  };
}

// ---------- Actions shared by header, tabs and keys ----------

const ui = {
  decode() {
    const gain = pendingTelemetry();
    if (gain.lt(1)) return;
    const resets = decodeMilestone(2) ? 'your photons and arrays' : 'your photons, arrays and photon upgrades';
    confirmAction('confirmDecode', 'Decode?', `Decode for ${format(gain)} telemetry. This resets ${resets}.`, 'Decode', () => decode());
  },
  recalibrate() {
    const gain = pendingCalibration();
    if (gain < 1) return;
    confirmAction('confirmRecal', 'Recalibrate?', `Recalibrate for ${amountOf(gain, 'calibration point')}. This resets ${recalResetList()}.`, 'Recalibrate', () => recalibrate());
  },
  cross() {
    const gain = pendingShards();
    if (gain.lt(1)) return;
    const challenge = state.challenge ? ` This completes ${CHALLENGES.find(c => c.id === state.challenge).name}.` : '';
    confirmAction('confirmCross', 'Cross the Horizon?', `Cross for ${amountOf(gain, 'Horizon Shard')}.${challenge} Everything resets except shards, Horizon upgrades, challenges, achievements and stats.`, 'Cross', () => cross());
  },
  startChallenge(c) {
    const warning = canCross() ? ' You could cross right now. Starting the challenge throws that crossing away.' : '';
    openModal({
      title: `Start ${c.name}?`,
      body: `This resets everything a crossing would, but gives no shards. Restriction: ${c.desc} Reach 1.8e308 photons, then cross to complete it.${warning}`,
      actions: [{ label: 'Cancel' }, { label: 'Start challenge', style: 'primary', onClick: () => startChallenge(c.id) }],
    });
  },
  abandonChallenge() {
    openModal({
      title: 'Abandon challenge?',
      body: 'Your current Horizon run restarts outside the challenge. Nothing is gained.',
      actions: [{ label: 'Cancel' }, { label: 'Abandon', style: 'danger', onClick: () => abandonChallenge() }],
    });
  },
  save: () => {},
  exportSave() {
    const code = encodeSave(state);
    const area = h('textarea', { class: 'w-full h-32 bg-slate-950 border border-slate-700 rounded p-2 text-xs break-all', readonly: true, 'aria-label': 'Save code' });
    area.value = code;
    const status = h('div', { class: 'text-xs text-slate-500', text: 'Keep this code somewhere safe. Import it to restore your game.' });
    openModal({
      title: 'Export save',
      body: h('div', { class: 'space-y-2' }, area, status),
      actions: [
        {
          label: 'Download',
          onClick: () => {
            const link = h('a', { href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })), download: `sublight-save-${new Date().toISOString().slice(0, 10)}.txt` });
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            return false;
          },
        },
        {
          label: 'Copy',
          style: 'primary',
          onClick: () => {
            area.select();
            navigator.clipboard?.writeText(code).then(
              () => setText(status, 'Copied to your clipboard.'),
              () => setText(status, 'Copy blocked by the browser. Select the text and copy it yourself.'),
            );
            return false;
          },
        },
        { label: 'Close' },
      ],
    });
  },
  importSave() {
    const area = h('textarea', { class: 'w-full h-32 bg-slate-950 border border-slate-700 rounded p-2 text-xs break-all', 'aria-label': 'Paste save code' });
    const status = h('div', { class: 'text-xs text-slate-500', text: 'Paste a save code. This replaces your current game.' });
    openModal({
      title: 'Import save',
      body: h('div', { class: 'space-y-2' }, area, status),
      actions: [
        { label: 'Cancel' },
        {
          label: 'Import',
          style: 'primary',
          onClick: () => {
            try {
              ui.loadState(decodeSave(area.value));
              toast('Save imported.');
              return true;
            } catch {
              setText(status, 'That save code could not be read. Check you copied all of it.');
              setClass(status, 'text-xs text-rose-400');
              return false;
            }
          },
        },
      ],
    });
  },
  hardReset() {
    openModal({
      title: 'Wipe all progress?',
      body: 'This deletes your save in this browser, including achievements and settings. It cannot be undone. Export your save first if you might want it back.',
      actions: [{ label: 'Cancel' }, { label: 'Wipe everything', style: 'danger', onClick: () => ui.loadState(freshState(), true) }],
    });
  },
  loadState: () => {},
};

// ---------- Build and render ----------

function buildUI() {
  buildHeader();
  buildTabs();
  const main = document.getElementById('main');
  const builders = {
    arrays: buildArraysTab,
    signal: buildSignalTab,
    telemetry: buildTelemetryTab,
    calibration: buildCalibrationTab,
    horizon: buildHorizonTab,
    achievements: buildAchievementsTab,
    log: buildLogTab,
    stats: buildStatsTab,
    settings: buildSettingsTab,
  };
  for (const tab of TABS) {
    const panel = builders[tab.id]();
    panel.el.id = `panel-${tab.id}`;
    panel.el.setAttribute('role', 'tabpanel');
    panel.el.setAttribute('aria-labelledby', `tab-${tab.id}`);
    panels[tab.id] = panel;
    main.append(panel.el);
  }
  if (!panels[state.tab]) state.tab = 'arrays';
  for (const tab of TABS) show(panels[tab.id].el, tab.id === state.tab);
}

function refresh() {
  const prod = computeProduction();
  updateHeader(prod);
  updateTabs();
  for (const tab of TABS) show(panels[tab.id].el, tab.id === state.tab);
  panels[state.tab].update(prod);
}
