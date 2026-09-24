// Plays the real game logic with a simple bot to check pacing after balance changes.
// Usage: node tools/simulate.js [maxHours] [-v] [--set="BALANCE.telemetryExponent = 0.45"]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Decimal = require('../vendor/break_infinity.min.js');

const SRC = path.join(__dirname, '..', 'src');
const ctx = vm.createContext({ Decimal, console });
for (const file of ['format.js', 'data.js', 'signal.js', 'state.js', 'achievements.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(SRC, file), 'utf8'), ctx, { filename: file });
}
const run = code => vm.runInContext(code, ctx);

const maxHours = Number(process.argv.find(a => /^\d+(\.\d+)?$/.test(a)) || 150);
const verbose = process.argv.includes('-v');
const override = process.argv.find(a => a.startsWith('--set='));

run(`
var bot = { focus: 'dyson', events: [] };

function note(t, text) { bot.events.push([t, text]); }

// Reset once the pending gain would at least double what this layer has earned, or after a long wait.
function worthIt(pending, earned, time, patience) {
  if (pending.lt(1)) return false;
  return earned.lte(0) || pending.gte(earned) || (time > patience && pending.gte(earned.times(0.25)));
}

// Past the Horizon, cross once shard gain has stopped rising for a while.
function shardsStalled() {
  const p = pendingShards();
  if (!bot.lastPending || p.gt(bot.lastPending)) {
    bot.lastPending = p;
    bot.lastIncrease = state.horizonTime;
  }
  const stalled = state.horizonTime - bot.lastIncrease > Math.max(300, 0.25 * state.horizonTime);
  if (stalled) bot.lastPending = null;
  return stalled;
}

function focusTopArray() {
  const prod = computeProduction().perArray;
  let best = 0;
  prod.forEach((p, i) => { if (p.gt(prod[best])) best = i; });
  if (prod[best].gt(0)) bot.focus = ARRAYS[best].id;
}

function spendCalibration() {
  const next = CALIBRATION_UPGRADES.find(u => !hasCalibration(u.id));
  if (next && next.cost <= state.calibration + allocatedPoints()) {
    if (state.calibration < next.cost) respec();
    buyCalibrationUpgrade(next.id);
    spendCalibration();
    return;
  }
  if (state.calibration > 0) tune(bot.focus, state.calibration);
}

function buyHorizon() {
  for (let i = 0; i < 20; i++) {
    const options = HORIZON_UPGRADES
      .filter(u => !hasHorizon(u.id) && horizonUpgradeAvailable(u))
      .map(u => ({ cost: new Decimal(u.cost), buy: () => buyHorizonUpgrade(u.id) }));
    if (repeatableAvailable('tidal')) options.push({ tidal: true, cost: repeatableCost('tidal'), buy: () => buyRepeatable('tidal') });
    options.sort((a, b) => a.cost.cmp(b.cost) || (b.tidal ? 1 : 0) - (a.tidal ? 1 : 0));
    if (!options.length || !options[0].buy()) break;
  }
  if (isBroken()) {
    for (let i = 0; i < 50 && buyRepeatable('resonance'); i++);
    buyRepeatable('condenser');
  }
}

function botStep(t, dt) {
  if (t < 180 && !hasTelemetry('echo')) for (let i = 0; i < 3 * dt; i++) gather();
  buyAllPhotonUpgrades();
  buyAllArrays();
  for (const u of TELEMETRY_UPGRADES) buyTelemetryUpgrade(u.id);
  autoBuyTelemetryRepeatables();
  buyHorizon();

  if (canCross() && (!isBroken() || shardsStalled())) {
    const challenge = state.challenge;
    focusTopArray();
    cross();
    note(t, challenge ? 'challenge done: ' + challenge : 'crossing ' + state.stats.crossings + ', shards ' + format(state.shards));
    buyHorizon();
    const next = CHALLENGES.find(c => !challengeDone(c.id));
    const ready = repeatableMaxed('tidal') && HORIZON_UPGRADES.every(u => u.id === 'break' || u.needsBreak || hasHorizon(u.id));
    if (next && ready) {
      startChallenge(next.id);
      note(t, 'start challenge: ' + next.id);
    }
    return;
  }
  if (worthIt(new Decimal(pendingCalibration()), new Decimal(state.calibrationRun), state.recalTime, 3600)) {
    focusTopArray();
    const gain = pendingCalibration();
    recalibrate();
    if (state.stats.recals === 1 || state.stats.recals % 10 === 0) note(t, 'recalibration ' + state.stats.recals + ': +' + gain + ' points');
    spendCalibration();
    return;
  }
  if (worthIt(pendingTelemetry(), state.telemetryRun, state.run.time, 900)) {
    const gain = pendingTelemetry();
    decode();
    if ([1, 5, 10, 20, 50, 100].includes(state.stats.decodes)) note(t, 'decode ' + state.stats.decodes + ': +' + format(gain) + ' telemetry');
  }
}
`);

if (override) run(override.slice('--set='.length));

const milestones = [9, 20, 50, 100, 200, 308, 500, 750, 1000];
let t = 0;
let lastReport = 0;
let broken = false;
while (t < maxHours * 3600 && !run('state.flags.lightspeed')) {
  const dt = t < 3600 ? 1 : t < 86400 ? 2 : 5;
  run(`tick(${dt}); botStep(${t}, ${dt});`);
  t += dt;
  while (milestones.length && run(`state.stats.bestPhotons.gte('1e${milestones[0]}')`)) {
    run(`note(${t}, 'reached 1e${milestones.shift()} photons')`);
  }
  if (!broken && run('isBroken()')) {
    broken = true;
    run(`note(${t}, 'broke the Horizon')`);
  }
  if (verbose && t - lastReport >= 3600) {
    lastReport = t;
    console.log(run(`'${(t / 3600).toFixed(0)}h photons ' + format(state.photons) + ', telemetry ' + format(state.telemetryRun) + ', calibration ' + state.calibrationRun + ', shards ' + format(state.shardsEarned)`));
  }
}

const hours = s => `${(s / 3600).toFixed(2)}h`.padStart(8);
for (const [time, text] of run('bot.events')) console.log(hours(time), text);
console.log(hours(t), run(`'end: ' + format(state.photons) + ' photons, ' + state.achievements.length + ' of ' + ACHIEVEMENTS.length + ' achievements'`));
