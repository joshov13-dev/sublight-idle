'use strict';

const TICK_MS = 50;
const OFFLINE_THRESHOLD_SECONDS = 300;

let quiet = false;
let lastSave = Date.now();
let endingPending = false;

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, serialise(state));
    lastSave = Date.now();
    return true;
  } catch {
    return false;
  }
}

function loadGame() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return { away: 0, message: 'Your browser is blocking storage, so progress will not be saved.' };
  }
  if (!raw) return { away: 0, fresh: true };
  try {
    state = deserialise(raw);
    return { away: (Date.now() - state.lastTick) / 1000 };
  } catch {
    try {
      localStorage.setItem(`${SAVE_KEY}-unreadable`, raw);
    } catch { /* storage full or blocked */ }
    state = freshState();
    return { away: 0, fresh: true, message: 'Your save could not be read, so a new game has started. The old save was kept as a backup.' };
  }
}

function snapshot() {
  return {
    photons: state.photons,
    telemetry: state.telemetryRun,
    calibration: state.stats.calibrationEarned,
    shards: state.shardsEarned,
    decodes: state.stats.decodes,
    recals: state.stats.recals,
    crossings: state.stats.crossings,
    achievements: state.achievements.length,
  };
}

function catchUp(seconds) {
  if (!state.settings.offline || seconds <= 0) return;
  const capped = Math.min(seconds, BALANCE.offlineCapSeconds);
  const before = snapshot();
  quiet = true;
  try {
    advance(capped);
  } finally {
    quiet = false;
  }
  if (capped >= 60) showOfflineSummary(seconds, capped, before, snapshot());
}

function showOfflineSummary(away, simulated, before, after) {
  const lines = [];
  lines.push(`Photons: ${format(before.photons)} to ${format(after.photons)}`);
  const count = (label, a, b) => { if (b > a) lines.push(`${label}: +${formatInt(b - a)}`); };
  count('Decodes', before.decodes, after.decodes);
  count('Recalibrations', before.recals, after.recals);
  count('Crossings', before.crossings, after.crossings);
  if (after.calibration > before.calibration) lines.push(`Calibration points earned: +${formatInt(after.calibration - before.calibration)}`);
  if (after.shards.gt(before.shards)) lines.push(`Horizon Shards earned: +${format(after.shards.minus(before.shards))}`);
  count('Achievements', before.achievements, after.achievements);
  const capNote = away > simulated ? ` Offline progress is capped at ${formatTime(BALANCE.offlineCapSeconds)}.` : '';
  openModal({
    title: 'Welcome back',
    body: h('div', { class: 'space-y-3' },
      h('p', { class: 'text-sm text-slate-300', text: `You were away for ${formatTime(away)}. Your probe kept working.${capNote}` }),
      h('ul', { class: 'text-sm text-slate-400 space-y-1 tabular-nums' }, lines.map(l => h('li', { text: l })))),
    actions: [{ label: 'Continue', style: 'primary' }],
  });
}

function showWelcome() {
  openModal({
    title: 'Sublight Idle',
    body: h('div', { class: 'space-y-3 text-sm text-slate-300 leading-relaxed' },
      h('p', { text: '1. Click Gather to catch photons.' }),
      h('p', { text: '2. Spend photons on arrays. They gather for you.' }),
      h('p', { text: '3. Follow the goal at the top. It always shows your next step.' })),
    actions: [{ label: 'Begin', style: 'primary' }],
  });
}

function showEnding() {
  openModal({
    title: 'Lightspeed',
    body: h('div', { class: 'space-y-3 text-sm text-slate-300 leading-relaxed' },
      h('p', { text: 'You hit 1e1000 photons and broke the speed of light. You won.' }),
      h('p', { class: 'tabular-nums', text: `Time played: ${formatTime(state.stats.timePlayed)}. Crossings: ${formatInt(state.stats.crossings)}. Achievements: ${state.achievements.length} of ${ACHIEVEMENTS.length}.` }),
      h('p', { class: 'text-slate-400', text: 'Thank you for playing. Everything still runs if you want to keep going.' })),
    actions: [{ label: 'Keep playing', style: 'primary' }],
  });
}

function installHooks() {
  hooks.log = text => { if (!quiet) toast(text, 'log'); };
  hooks.achievement = a => { if (!quiet) toast(`Achievement unlocked: ${a.name}`, 'achievement'); };
  hooks.lightspeed = () => { endingPending = true; };
  hooks.signal = ({ fragments, story, perfect }) => {
    if (quiet) return;
    const scope = document.querySelector('#panel-signal canvas');
    if (scope) burstFrom(scope, [52, 211, 153], 50);
    const reward = `+${fragments} Star Fragment${fragments === 1 ? '' : 's'}${perfect ? ' (perfect lock bonus)' : ''}. Signal Surge active.`;
    if (!story) {
      toast(`Signal locked. ${reward}`, 'log');
      return;
    }
    const line = h('p', { class: 'transmission text-emerald-200 text-base leading-relaxed min-h-[3rem]' });
    openModal({
      title: `Transmission ${state.signal.story} of ${TRANSMISSIONS.length}`,
      body: h('div', { class: 'space-y-3' }, line, h('p', { class: 'text-xs text-slate-400', text: reward })),
      actions: [{ label: 'Keep listening', style: 'primary' }],
    });
    let i = 0;
    const type = setInterval(() => {
      i += 1;
      line.textContent = story.slice(0, i);
      if (i >= story.length) clearInterval(type);
    }, 28);
  };
  ui.save = manual => {
    const ok = saveGame();
    if (manual) toast(ok ? 'Game saved.' : 'Could not save. Your browser may be blocking storage.');
  };
  ui.loadState = (next, wipe) => {
    state = next;
    state.lastTick = Date.now();
    setNotation(state.settings.notation);
    if (wipe) addLog(SIGNAL_LINES.start);
    saveGame();
    closeModal();
    refresh();
  };
}

function frame() {
  const now = Date.now();
  const seconds = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;
  if (seconds > OFFLINE_THRESHOLD_SECONDS) catchUp(seconds);
  else advance(seconds);
  if (endingPending && !modalOpen) {
    endingPending = false;
    showEnding();
  }
  if (now - lastSave >= state.settings.autosave * 1000) saveGame();
  refresh();
}

const KEY_ACTIONS = {
  g: () => gather(),
  m: () => buyAllArrays(),
  d: () => ui.decode(),
  r: () => ui.recalibrate(),
  c: () => ui.cross(),
};

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (modalOpen) {
    const overlay = document.querySelector('#modal-root > div');
    if (e.key === 'Escape' && overlay && overlay.dataset.dismissable) {
      closeModal();
      refresh();
    }
    return;
  }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  const key = e.key.toLowerCase();
  if (key >= '1' && key <= '8' && key.length === 1) {
    buyArray(ARRAYS[Number(key) - 1]);
  } else if (KEY_ACTIONS[key]) {
    if (key === 'g' && e.repeat) return;
    KEY_ACTIONS[key]();
  } else {
    return;
  }
  e.preventDefault();
  refresh();
}

function boot() {
  const result = loadGame();
  setNotation(state.settings.notation);
  installHooks();
  buildUI();
  initSky();
  if (result.fresh) addLog(SIGNAL_LINES.start);
  if (result.away > 10) catchUp(result.away);
  state.lastTick = Date.now();
  if (result.message) toast(result.message);
  if (!state.flags.welcomed) {
    state.flags.welcomed = true;
    showWelcome();
  }
  refresh();
  saveGame();
  setInterval(frame, TICK_MS);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  window.addEventListener('pagehide', saveGame);
}

boot();
