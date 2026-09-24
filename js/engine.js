// Pure game maths and actions. No DOM access in this file.
window.SL = window.SL || {};

SL.engine = (function () {
  const cfg = SL.config;
  const S = () => SL.state;

  // --- Generators ---

  function costScale() {
    return S().upgrades.compression ? cfg.COMPRESSED_COST_SCALE : cfg.BASE_COST_SCALE;
  }

  function genDef(id) {
    return cfg.generators.find(g => g.id === id);
  }

  // Cost of buying `count` more, starting from `owned`. Geometric series sum.
  function costFor(id, count) {
    const r = costScale();
    const first = new Decimal(genDef(id).baseCost).mul(Decimal.pow(r, S().generators[id]));
    if (count === 1) return first;   // avoids series rounding making 15 cost 15.0000001
    return first.mul(Decimal.pow(r, count).sub(1)).div(r - 1);
  }

  function maxAffordable(id) {
    const r = costScale();
    const first = new Decimal(genDef(id).baseCost).mul(Decimal.pow(r, S().generators[id]));
    const n = Math.floor(S().photons.mul(r - 1).div(first).add(1).log10() / Math.log10(r));
    // Guard against floating point rounding up by one.
    if (n > 0 && costFor(id, n).gt(S().photons)) return n - 1;
    return Math.max(0, n);
  }

  function buyGeneratorCount(id, count) {
    if (count <= 0) return false;
    const cost = costFor(id, count);
    if (S().photons.lt(cost)) return false;
    S().photons = S().photons.sub(cost);
    S().generators[id] += count;
    return true;
  }

  // --- Multipliers ---

  function coreMultiplier() {
    return S().pulsarCores.mul(cfg.CORE_BONUS).add(1);
  }

  function indexingMultiplier() {
    const lvl = S().telemetry.indexing || 0;
    return new Decimal(1).add(0.1 * lvl * S().bytes.add(1).log10());
  }

  function globalMultiplier() {
    return coreMultiplier().mul(indexingMultiplier());
  }

  function generatorOutput(id) {
    let per = new Decimal(genDef(id).production);
    if (S().upgrades.cryo && (id === 'dipole' || id === 'dish')) per = per.mul(2);
    return per.mul(S().generators[id]).mul(globalMultiplier());
  }

  function grossPhotonsPerSec() {
    let total = new Decimal(0);
    cfg.generators.forEach(g => { total = total.add(generatorOutput(g.id)); });
    return total;
  }

  // --- Telemetry ---

  function divertedShare() {
    return Math.min(1, S().threads.active * cfg.THREAD_SHARE);
  }

  function eccRefund() {
    return 0.1 * (S().telemetry.ecc || 0);
  }

  // Photons/sec after threads take their share. This is what the player sees.
  function photonsPerSec() {
    return grossPhotonsPerSec().mul(1 - divertedShare() * (1 - eccRefund()));
  }

  function bytesPerSec() {
    const packets = Math.pow(1.5, S().telemetry.packets || 0);
    return grossPhotonsPerSec().mul(divertedShare()).div(cfg.PHOTONS_PER_BYTE).mul(packets);
  }

  function threadCost() {
    return new Decimal(cfg.THREAD_BASE_COST).mul(Decimal.pow(cfg.THREAD_COST_SCALE, S().threads.owned));
  }

  function buyThread() {
    const t = S().threads;
    if (t.owned >= cfg.MAX_THREADS || S().photons.lt(threadCost())) return false;
    S().photons = S().photons.sub(threadCost());
    t.owned += 1;
    t.active += 1;   // new threads start working straight away
    return true;
  }

  function setActiveThreads(n) {
    const t = S().threads;
    t.active = Math.max(0, Math.min(t.owned, n));
  }

  function telemetryDef(id) {
    return cfg.telemetryUpgrades.find(u => u.id === id);
  }

  function telemetryCost(id) {
    const def = telemetryDef(id);
    return new Decimal(def.baseCost).mul(Decimal.pow(def.scale, S().telemetry[id] || 0));
  }

  function telemetryMaxed(id) {
    return (S().telemetry[id] || 0) >= telemetryDef(id).maxLevel;
  }

  function buyTelemetry(id) {
    if (telemetryMaxed(id)) return false;
    const cost = telemetryCost(id);
    if (S().bytes.lt(cost)) return false;
    S().bytes = S().bytes.sub(cost);
    S().telemetry[id] = (S().telemetry[id] || 0) + 1;
    return true;
  }

  // --- Ping and spectrometer ---

  function pingValue() {
    let v = new Decimal(cfg.PING_BASE).mul(coreMultiplier());
    if (S().upgrades.signalAmp) v = v.add(photonsPerSec().mul(0.01));
    return v;
  }

  function addPhotons(amount) {
    S().photons = S().photons.add(amount);
    S().lifetimePhotons = S().lifetimePhotons.add(amount);
  }

  function addBytes(amount) {
    S().bytes = S().bytes.add(amount);
    S().bytesThisRun = S().bytesThisRun.add(amount);
    S().lifetimeBytes = S().lifetimeBytes.add(amount);
  }

  function ping() {
    addPhotons(pingValue());
    S().stats.pings += 1;
  }

  function buyGenerator(id) {
    const mode = S().settings.buyMode;
    return buyGeneratorCount(id, mode === 'max' ? maxAffordable(id) : Number(mode));
  }

  function buyUpgrade(id) {
    const def = cfg.upgrades.find(u => u.id === id);
    if (S().upgrades[id] || S().photons.lt(def.cost)) return false;
    S().photons = S().photons.sub(def.cost);
    S().upgrades[id] = true;
    return true;
  }

  // --- Calibration (prestige) ---

  function coresOnReset() {
    return S().bytesThisRun.div(cfg.CORE_DIVISOR).sqrt().floor();
  }

  // Bytes this run needed for one more core than coresOnReset() gives.
  function bytesForNextCore() {
    const next = coresOnReset().add(1);
    return next.mul(next).mul(cfg.CORE_DIVISOR);
  }

  function canRecalibrate() {
    return S().unlocks.calibration && coresOnReset().gte(1);
  }

  // Resets Photons, Generators and Bytes (plus the byte-bought Telemetry layer).
  // Keeps cores, spectrometer upgrades, automation, unlocks, settings and stats.
  function recalibrate() {
    if (!canRecalibrate()) return false;
    const s = S();
    const fresh = SL.newState();
    s.pulsarCores = s.pulsarCores.add(coresOnReset());
    s.photons = fresh.photons;
    s.bytes = fresh.bytes;
    s.bytesThisRun = fresh.bytesThisRun;
    s.generators = fresh.generators;
    s.telemetry = fresh.telemetry;
    s.threads = fresh.threads;
    s.stats.calibrations += 1;
    return true;
  }

  function perkUnlocked(id) {
    return S().pulsarCores.gte(cfg.perks.find(p => p.id === id).cores);
  }

  function perkActive(id) {
    return perkUnlocked(id) && S().automation[id] !== false;
  }

  function togglePerk(id) {
    if (perkUnlocked(id)) S().automation[id] = !perkActive(id);
  }

  // --- Time ---

  function runAutomation(dt) {
    if (perkActive('autoPing')) addPhotons(pingValue().mul(cfg.AUTO_PING_RATE * dt));
    cfg.generators.forEach(g => {
      if (perkActive('auto_' + g.id)) buyGeneratorCount(g.id, maxAffordable(g.id));
    });
    if (perkActive('autoThreads')) {
      while (buyThread()) { /* buy every thread we can afford */ }
      setActiveThreads(S().threads.owned);
    }
  }

  function checkUnlocks() {
    const u = S().unlocks;
    if (!u.telemetry && S().photons.gte(cfg.UNLOCK_BYTES_AT)) u.telemetry = true;
    if (!u.calibration && S().lifetimeBytes.gte(cfg.UNLOCK_CALIBRATION_AT)) u.calibration = true;
  }

  // Advance the simulation by `dt` seconds. Used by the loop and offline progress.
  function tick(dt) {
    const photons = photonsPerSec().mul(dt);
    const bytes = bytesPerSec().mul(dt);
    addPhotons(photons);
    addBytes(bytes);
    runAutomation(dt);
    checkUnlocks();
  }

  return {
    costFor, maxAffordable, generatorOutput, grossPhotonsPerSec, photonsPerSec, pingValue,
    coreMultiplier, indexingMultiplier, divertedShare, bytesPerSec,
    threadCost, buyThread, setActiveThreads,
    telemetryCost, telemetryMaxed, buyTelemetry,
    ping, buyGenerator, buyUpgrade,
    coresOnReset, bytesForNextCore, canRecalibrate, recalibrate,
    perkUnlocked, perkActive, togglePerk,
    tick,
  };
})();
