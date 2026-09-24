'use strict';

const HORIZON = new Decimal(Number.MAX_VALUE);
const LIGHTSPEED = new Decimal(BALANCE.lightspeed);
const ZERO = new Decimal(0);
const ONE = new Decimal(1);

let state = freshState();

// The UI replaces these to react to game events.
const hooks = {
  log() {},
  achievement() {},
  lightspeed() {},
};

const hasPhoton = id => state.photonUpgrades.includes(id);
const hasTelemetry = id => state.telemetryUpgrades.includes(id);
const hasCalibration = id => state.calibrationUpgrades.includes(id);
const hasHorizon = id => state.horizonUpgrades.includes(id);
const challengeDone = id => state.challengesDone.includes(id);
const inChallenge = id => state.challenge === id;
const isBroken = () => hasHorizon('break');

function decodeMilestone(count) {
  return hasHorizon('eventmemory') || state.decodes >= count;
}

function recalMilestone(count) {
  return hasHorizon('eventmemory') || state.recals >= count;
}

function addLog(text) {
  state.log.unshift({ t: state.stats.timePlayed, text });
  if (state.log.length > 100) state.log.length = 100;
  hooks.log(text);
}

function once(flag, text) {
  if (state.flags[flag]) return;
  state.flags[flag] = true;
  if (text) addLog(text);
}

// ---------- Arrays ----------

function arrayIndex(gen) {
  return ARRAYS.indexOf(gen);
}

function totalArraysOwned() {
  return ARRAYS.reduce((sum, g) => sum + state.arrays[g.id], 0);
}

function highestOwnedArray() {
  for (let i = ARRAYS.length - 1; i >= 0; i--) {
    if (state.arrays[ARRAYS[i].id] > 0) return ARRAYS[i];
  }
  return null;
}

function arrayVisible(gen) {
  return arrayIndex(gen) === 0
    || state.arrays[gen.id] > 0
    || state.flags[`seen-${gen.id}`]
    || state.run.photons.gte(gen.baseCost * 0.1);
}

function arrayBlocked(gen) {
  return inChallenge('darksky') && arrayIndex(gen) >= 4;
}

function arrayActive(gen) {
  if (arrayBlocked(gen)) return false;
  if (inChallenge('singleband') && gen !== highestOwnedArray()) return false;
  return true;
}

function costRatio(gen) {
  let excess = gen.costRatio - 1;
  if (hasTelemetry('blueprints')) excess *= 0.8;
  if (challengeDone('darksky')) excess *= 0.9;
  return 1 + excess;
}

function arrayCost(gen, amount) {
  return Decimal.sumGeometricSeries(amount, gen.baseCost, costRatio(gen), state.arrays[gen.id]);
}

function maxAffordable(gen) {
  let n = Decimal.affordGeometricSeries(state.photons, gen.baseCost, costRatio(gen), state.arrays[gen.id]).toNumber();
  if (!Number.isFinite(n) || n < 0) return 0;
  n = Math.floor(n);
  while (n > 0 && arrayCost(gen, n).gt(state.photons)) n--;
  return n;
}

function buyAmountFor(gen, mode = state.buyMode) {
  return mode === 'max' ? Math.max(1, maxAffordable(gen)) : Number(mode);
}

function buyArray(gen, mode = state.buyMode) {
  if (!arrayVisible(gen) || arrayBlocked(gen)) return false;
  const amount = mode === 'max' ? maxAffordable(gen) : Number(mode);
  if (amount < 1) return false;
  const cost = arrayCost(gen, amount);
  if (state.photons.lt(cost)) return false;
  state.photons = Decimal.max(0, state.photons.minus(cost));
  state.arrays[gen.id] += amount;
  once('firstArray', SIGNAL_LINES.firstArray);
  if (arrayIndex(gen) > 0) once(`bought-${gen.id}`, SIGNAL_LINES.array(gen.name));
  return true;
}

function buyAllArrays() {
  let bought = false;
  for (let i = ARRAYS.length - 1; i >= 0; i--) bought = buyArray(ARRAYS[i], 'max') || bought;
  return bought;
}

// ---------- Production ----------

function milestoneStep() {
  let step = hasTelemetry('harmonics') ? 20 : BALANCE.milestoneStep;
  step -= state.repeatables.tidal;
  if (challengeDone('frozen')) step -= 2;
  if (inChallenge('frozen')) step += 10;
  return step;
}

function milestoneBase() {
  return hasCalibration('harmonic') ? 3 : BALANCE.milestoneBase;
}

function milestoneMultiplier(gen) {
  return Decimal.pow(milestoneBase(), Math.floor(state.arrays[gen.id] / milestoneStep()));
}

function tuningPower() {
  let power = BALANCE.tuningPower;
  if (hasCalibration('precision')) power += 0.5;
  if (challengeDone('singleband')) power += 0.5;
  return power;
}

function tuningMultiplier(gen) {
  const points = state.tuning[gen.id];
  return points ? Decimal.pow(1 + points, tuningPower()) : ONE;
}

function upgradeMultiplier(gen) {
  let m = 1;
  for (const u of PHOTON_UPGRADES) {
    if ((u.array === gen.id || (u.arrays && u.arrays.includes(gen.id))) && hasPhoton(u.id)) m *= 3;
  }
  return m;
}

function arrayMultiplier(gen) {
  return milestoneMultiplier(gen).times(tuningMultiplier(gen)).times(upgradeMultiplier(gen));
}

function telemetryBonus() {
  if (inChallenge('silent')) return ONE;
  const base = hasTelemetry('archive') ? state.telemetryRun : state.telemetry;
  const exponent = BALANCE.telemetryBonusExponent + (challengeDone('silent') ? 0.15 : 0);
  return base.plus(1).pow(exponent);
}

function afterglowMultiplier() {
  return Math.min(BALANCE.afterglowCap, 1 + state.run.time / 60);
}

function achievementMultiplier() {
  return Decimal.pow(1.03, state.achievements.length);
}

function globalMultiplier() {
  let m = new Decimal(1);
  if (hasPhoton('resonant')) m = m.times(1 + totalArraysOwned() / 100);
  if (hasPhoton('deepfield')) m = m.times(2);
  if (hasTelemetry('carrier')) m = m.times(3);
  if (hasTelemetry('afterglow')) m = m.times(afterglowMultiplier());
  m = m.times(Decimal.pow(2, state.repeatables.amplifier));
  m = m.times(telemetryBonus());
  m = m.times(achievementMultiplier());
  return m;
}

function dragExponent() {
  return BALANCE.dragExponent + 0.01 * state.repeatables.resonance;
}

// Horizon drag: production past 1.8e308/s is softcapped, so only part of the excess counts.
function applyDrag(production) {
  if (production.lte(HORIZON)) return production;
  return production.div(HORIZON).pow(dragExponent()).times(HORIZON);
}

function productionExponent() {
  return hasCalibration('pulsarlock') ? 1.05 : 1;
}

// Returns total photons/s and each array's share of it.
function computeProduction() {
  const raw = ARRAYS.map(g => {
    const owned = state.arrays[g.id];
    if (!owned || !arrayActive(g)) return ZERO;
    return arrayMultiplier(g).times(g.baseRate * owned);
  });
  const rawSum = raw.reduce((a, b) => a.plus(b), ZERO);
  let total = rawSum.times(globalMultiplier());
  const exponent = productionExponent();
  if (exponent !== 1 && total.gt(1)) total = total.pow(exponent);
  total = applyDrag(total);
  const perArray = raw.map(r => (rawSum.gt(0) ? total.times(r.div(rawSum)) : ZERO));
  return { total, perArray };
}

function photonsPerSecond() {
  return computeProduction().total;
}

function gatherAmount(pps = photonsPerSecond()) {
  return hasPhoton('focus') ? pps.times(0.1).plus(3) : pps.times(BALANCE.gatherPct).plus(BALANCE.gatherBase);
}

function earn(amount) {
  if (amount.lte(0)) return;
  let next = state.photons.plus(amount);
  if (!isBroken() && next.gt(HORIZON)) next = HORIZON;
  const gained = next.minus(state.photons);
  if (gained.lte(0)) return;
  state.photons = next;
  state.run.photons = state.run.photons.plus(gained);
  state.stats.totalPhotons = state.stats.totalPhotons.plus(gained);
  if (next.gt(state.stats.bestPhotons)) state.stats.bestPhotons = next;
}

function gather() {
  earn(gatherAmount());
  state.stats.gathers++;
}

// ---------- Upgrades ----------

function buyPhotonUpgrade(id) {
  const u = PHOTON_UPGRADES.find(x => x.id === id);
  if (!u || hasPhoton(id) || state.photons.lt(u.cost)) return false;
  state.photons = state.photons.minus(u.cost);
  state.photonUpgrades.push(id);
  once('firstUpgrade', SIGNAL_LINES.firstUpgrade);
  return true;
}

function buyAllPhotonUpgrades() {
  for (const u of PHOTON_UPGRADES) buyPhotonUpgrade(u.id);
}

function buyTelemetryUpgrade(id) {
  const u = TELEMETRY_UPGRADES.find(x => x.id === id);
  if (!u || hasTelemetry(id) || state.telemetry.lt(u.cost)) return false;
  state.telemetry = state.telemetry.minus(u.cost);
  state.telemetryUpgrades.push(id);
  return true;
}

function buyCalibrationUpgrade(id) {
  const u = CALIBRATION_UPGRADES.find(x => x.id === id);
  if (!u || hasCalibration(id) || state.calibration < u.cost) return false;
  state.calibration -= u.cost;
  state.calibrationUpgrades.push(id);
  return true;
}

function horizonUpgradeAvailable(u) {
  if (u.needsBreak && !isBroken()) return false;
  if (u.id === 'break' && challengeCount() < CHALLENGES.length) return false;
  return true;
}

function buyHorizonUpgrade(id) {
  const u = HORIZON_UPGRADES.find(x => x.id === id);
  if (!u || hasHorizon(id) || !horizonUpgradeAvailable(u) || state.shards.lt(u.cost)) return false;
  state.shards = state.shards.minus(u.cost);
  state.horizonUpgrades.push(id);
  if (id === 'break') addLog(SIGNAL_LINES.broken);
  return true;
}

const REPEATABLES = [...TELEMETRY_REPEATABLES, ...HORIZON_REPEATABLES];

function repeatableDef(id) {
  return REPEATABLES.find(x => x.id === id);
}

function repeatableMaxLevel(id) {
  const r = repeatableDef(id);
  return r.costs ? r.costs.length : (r.maxLevel || Infinity);
}

function repeatableMaxed(id) {
  return state.repeatables[id] >= repeatableMaxLevel(id);
}

function repeatableCost(id) {
  const r = repeatableDef(id);
  if (r.costs) return new Decimal(r.costs[Math.min(state.repeatables[id], r.costs.length - 1)]);
  return Decimal.pow(r.costGrowth, state.repeatables[id]).times(r.baseCost);
}

function repeatableCurrency(id) {
  return TELEMETRY_REPEATABLES.some(r => r.id === id) ? 'telemetry' : 'shards';
}

function repeatableAvailable(id) {
  const r = repeatableDef(id);
  return (!r.needsBreak || isBroken()) && !repeatableMaxed(id);
}

function buyRepeatable(id) {
  if (!repeatableAvailable(id)) return false;
  const currency = repeatableCurrency(id);
  const cost = repeatableCost(id);
  if (state[currency].lt(cost)) return false;
  state[currency] = state[currency].minus(cost);
  state.repeatables[id]++;
  return true;
}

// Spending telemetry lowers the telemetry bonus, so the autobuyer only spends up to half of it
// until Archive Access makes the bonus count earned telemetry instead.
function autoBuyTelemetryRepeatables() {
  for (const id of ['decoder', 'amplifier']) {
    for (let i = 0; i < 100; i++) {
      const cost = repeatableCost(id);
      if (!hasTelemetry('archive') && cost.gt(state.telemetry.div(2))) break;
      if (!buyRepeatable(id)) break;
    }
  }
}

// ---------- Decode (layer 2) ----------

function telemetryExponent() {
  return BALANCE.telemetryExponent + (hasCalibration('wideband') ? BALANCE.widebandBonus : 0);
}

function telemetryMultiplier() {
  let m = new Decimal(1);
  if (hasTelemetry('packets')) m = m.times(2);
  m = m.times(Decimal.pow(1.25, state.repeatables.decoder));
  if (decodeMilestone(20)) m = m.times(2);
  if (hasHorizon('singularity')) m = m.times(state.shardsEarned.plus(1));
  return m;
}

function pendingTelemetry() {
  if (state.run.photons.lt(BALANCE.decodeThreshold)) return ZERO;
  return state.run.photons.div(BALANCE.decodeThreshold).pow(telemetryExponent())
    .times(BALANCE.telemetryBase).times(telemetryMultiplier()).floor();
}

function addTelemetry(amount) {
  state.telemetry = state.telemetry.plus(amount);
  state.telemetryRun = state.telemetryRun.plus(amount);
}

function resetRun() {
  state.photons = new Decimal(hasTelemetry('memory') ? 1000 : 10);
  state.run = { photons: new Decimal(0), time: 0 };
  for (const g of ARRAYS) state.arrays[g.id] = 0;
  if (!decodeMilestone(2)) state.photonUpgrades = [];
}

function decode() {
  const gain = pendingTelemetry();
  if (gain.lt(1)) return false;
  addTelemetry(gain);
  state.decodes++;
  state.stats.decodes++;
  state.stats.fastestDecode = Math.min(state.stats.fastestDecode, state.run.time);
  once('firstDecode', SIGNAL_LINES.firstDecode);
  resetRun();
  return true;
}

// ---------- Recalibrate (layer 3) ----------

function calibrationMultiplier() {
  return hasHorizon('singularity') ? state.shardsEarned.plus(1) : ONE;
}

function startingCalibration() {
  if (hasHorizon('deepseed')) return 1e6;
  if (hasHorizon('seed')) return 100;
  return 0;
}

function pendingCalibration() {
  if (state.telemetryRun.lt(BALANCE.recalThreshold)) return 0;
  const gain = state.telemetryRun.div(BALANCE.recalThreshold).pow(BALANCE.calibrationExponent).times(calibrationMultiplier()).floor();
  return Math.min(Math.round(gain.toNumber()), 1e15);
}

function allocatedPoints() {
  return ARRAYS.reduce((sum, g) => sum + state.tuning[g.id], 0);
}

function resetRecal() {
  state.telemetry = new Decimal(0);
  state.telemetryRun = new Decimal(0);
  if (!recalMilestone(3)) state.telemetryUpgrades = [];
  if (!recalMilestone(6)) {
    state.repeatables.amplifier = 0;
    state.repeatables.decoder = 0;
  }
  if (!recalMilestone(1)) state.decodes = 0;
  state.photonUpgrades = [];
  state.recalTime = 0;
  resetRun();
}

function recalibrate() {
  const gain = pendingCalibration();
  if (gain < 1) return false;
  state.calibration += gain;
  state.calibrationRun += gain;
  state.recals++;
  state.stats.recals++;
  state.stats.calibrationEarned += gain;
  state.stats.fastestRecal = Math.min(state.stats.fastestRecal, state.recalTime);
  once('firstRecal', SIGNAL_LINES.firstRecal);
  resetRecal();
  return true;
}

function tune(id, amount) {
  amount = Math.min(Math.floor(amount), state.calibration);
  if (amount < 1 || !(id in state.tuning)) return false;
  state.calibration -= amount;
  state.tuning[id] += amount;
  return true;
}

function respec() {
  const points = allocatedPoints();
  if (!points) return false;
  state.calibration += points;
  for (const g of ARRAYS) state.tuning[g.id] = 0;
  resetRun();
  return true;
}

// ---------- Horizon (layer 4) ----------

function challengeCount() {
  return state.challengesDone.length;
}

function canCross() {
  return state.photons.gte(HORIZON);
}

function shardMultiplier() {
  return Decimal.pow(2, state.repeatables.condenser);
}

function pendingShards() {
  if (!canCross()) return ZERO;
  if (!isBroken()) return shardMultiplier();
  const base = Decimal.pow(10, (state.photons.log10() - HORIZON.log10()) / 100).floor();
  return Decimal.max(1, base).times(shardMultiplier()).floor();
}

function resetHorizon() {
  state.calibration = startingCalibration();
  state.calibrationRun = 0;
  for (const g of ARRAYS) state.tuning[g.id] = 0;
  state.calibrationUpgrades = [];
  state.recals = 0;
  state.decodes = 0;
  state.telemetryUpgrades = [];
  state.repeatables.amplifier = 0;
  state.repeatables.decoder = 0;
  state.horizonTime = 0;
  resetRecal();
}

function cross() {
  const gain = pendingShards();
  if (gain.lt(1)) return false;
  state.shards = state.shards.plus(gain);
  state.shardsEarned = state.shardsEarned.plus(gain);
  state.stats.crossings++;
  state.stats.fastestCross = Math.min(state.stats.fastestCross, state.horizonTime);
  once('firstCross', SIGNAL_LINES.firstCross);
  if (state.challenge) {
    const c = CHALLENGES.find(x => x.id === state.challenge);
    if (!challengeDone(c.id)) {
      state.challengesDone.push(c.id);
      addLog(SIGNAL_LINES.challenge(c.name));
    }
    state.challenge = null;
  }
  resetHorizon();
  return true;
}

function startChallenge(id) {
  if (!state.stats.crossings || !CHALLENGES.some(c => c.id === id)) return false;
  resetHorizon();
  state.challenge = id;
  return true;
}

function abandonChallenge() {
  if (!state.challenge) return false;
  resetHorizon();
  state.challenge = null;
  return true;
}

// ---------- Automation ----------

const autoTimers = { buyers: 0 };

function autobuyersUnlocked() {
  return decodeMilestone(5);
}

function autobuyerInterval() {
  return decodeMilestone(10) ? 0 : 2;
}

function parseAutoValue(value) {
  const d = safeDecimal(String(value).trim());
  return d && d.gte(0) ? d : null;
}

// Modes: 'amount' fires when the pending gain reaches the value, 'time' after that many seconds in
// the current run, 'multiple' when the pending gain reaches value x the amount you already have.
function autoShouldFire(setting, pending, runTime, current) {
  if (pending.lt(1)) return false;
  const value = parseAutoValue(setting.value);
  if (!value) return false;
  if (setting.mode === 'time') return runTime >= value.toNumber();
  if (setting.mode === 'multiple') return pending.gte(value.times(current));
  return pending.gte(value);
}

function runAutomation(dt) {
  const a = state.automation;
  if (autobuyersUnlocked()) {
    autoTimers.buyers += dt;
    if (autoTimers.buyers >= autobuyerInterval()) {
      autoTimers.buyers = 0;
      if (a.upgrades) buyAllPhotonUpgrades();
      if (a.arrays) {
        for (let i = ARRAYS.length - 1; i >= 0; i--) {
          if (a.arrayToggles[ARRAYS[i].id]) buyArray(ARRAYS[i], 'max');
        }
      }
    }
  }
  if (hasCalibration('ampauto') && a.repeatables) autoBuyTelemetryRepeatables();
  if (hasCalibration('autodecode') && a.decode.on
    && autoShouldFire(a.decode, pendingTelemetry(), state.run.time, state.telemetryRun)) {
    decode();
  }
  if (hasHorizon('autorecal') && a.recal.on
    && autoShouldFire(a.recal, new Decimal(pendingCalibration()), state.recalTime, new Decimal(state.calibrationRun))) {
    recalibrate();
  }
  if (hasHorizon('autocross') && isBroken() && a.cross.on
    && autoShouldFire(a.cross, pendingShards(), state.horizonTime, state.shardsEarned)) {
    cross();
  }
}

// ---------- Progress, achievements, time ----------

function checkProgress() {
  if (state.run.photons.gte(BALANCE.decodeThreshold)) once('telemetry', SIGNAL_LINES.decodeReady);
  if (state.telemetryRun.gte(BALANCE.recalThreshold)) once('calibration', SIGNAL_LINES.recalReady);
  if (canCross()) once('horizon', SIGNAL_LINES.horizonReached);
  for (const g of ARRAYS) {
    if (!state.flags[`seen-${g.id}`] && arrayVisible(g)) state.flags[`seen-${g.id}`] = true;
  }
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements.includes(a.id) && a.check()) {
      state.achievements.push(a.id);
      hooks.achievement(a);
    }
  }
  if (!state.flags.lightspeed && state.photons.gte(LIGHTSPEED)) {
    once('lightspeed', SIGNAL_LINES.lightspeed);
    hooks.lightspeed();
  }
}

function tick(dt) {
  state.stats.timePlayed += dt;
  state.run.time += dt;
  state.recalTime += dt;
  state.horizonTime += dt;
  const pps = photonsPerSecond();
  let gain = pps.times(dt);
  if (hasTelemetry('echo')) gain = gain.plus(gatherAmount(pps).times(4 * dt));
  earn(gain);
  runAutomation(dt);
  checkProgress();
}

// Long gaps (offline time, a hidden tab) run as up to 1,000 ticks so automation keeps working.
function advance(seconds) {
  if (!(seconds > 0)) return;
  if (seconds <= 1) {
    tick(seconds);
    return;
  }
  const ticks = Math.min(1000, Math.ceil(seconds / 0.05));
  const dt = seconds / ticks;
  for (let i = 0; i < ticks; i++) tick(dt);
}
