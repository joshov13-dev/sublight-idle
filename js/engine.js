// Pure game maths and actions. No DOM access in this file.
window.SL = window.SL || {};

SL.engine = (function () {
  const cfg = SL.config;
  const S = () => SL.state;

  function costScale() {
    return S().upgrades.compression ? 1.13 : cfg.BASE_COST_SCALE;
  }

  function genDef(id) {
    return cfg.generators.find(g => g.id === id);
  }

  // Cost of buying `count` more, starting from `owned`. Geometric series sum.
  function costFor(id, count) {
    const r = costScale();
    const owned = S().generators[id];
    const first = new Decimal(genDef(id).baseCost).mul(Decimal.pow(r, owned));
    return first.mul(Decimal.pow(r, count).sub(1)).div(r - 1);
  }

  function maxAffordable(id) {
    const r = costScale();
    const first = new Decimal(genDef(id).baseCost).mul(Decimal.pow(r, S().generators[id]));
    const n = S().photons.mul(r - 1).div(first).add(1).log10() / Math.log10(r);
    return Math.max(0, Math.floor(n));
  }

  // Global multiplier from all sources. Extend here as systems are added.
  function globalMultiplier() {
    let m = new Decimal(1);
    m = m.mul(S().pulsarCores.mul(cfg.CORE_BONUS).add(1));
    // TODO: telemetry byte-based multiplier
    return m;
  }

  function generatorOutput(id) {
    let per = new Decimal(genDef(id).production);
    if (S().upgrades.cryo && (id === 'dipole' || id === 'dish')) per = per.mul(2);
    return per.mul(S().generators[id]);
  }

  function photonsPerSec() {
    let total = new Decimal(0);
    cfg.generators.forEach(g => { total = total.add(generatorOutput(g.id)); });
    return total.mul(globalMultiplier());
  }

  function pingValue() {
    let v = new Decimal(cfg.PING_BASE);
    if (S().upgrades.signalAmp) v = v.add(photonsPerSec().mul(0.01));
    return v;
  }

  function addPhotons(amount) {
    S().photons = S().photons.add(amount);
    S().lifetimePhotons = S().lifetimePhotons.add(amount);
  }

  // --- Actions ---

  function ping() {
    addPhotons(pingValue());
  }

  function buyGenerator(id) {
    const mode = S().settings.buyMode;
    const count = mode === 'max' ? maxAffordable(id) : Number(mode);
    if (count <= 0) return false;
    const cost = costFor(id, count);
    if (S().photons.lt(cost)) return false;
    S().photons = S().photons.sub(cost);
    S().generators[id] += count;
    return true;
  }

  function buyUpgrade(id) {
    const def = cfg.upgrades.find(u => u.id === id);
    if (S().upgrades[id] || S().photons.lt(def.cost)) return false;
    S().photons = S().photons.sub(def.cost);
    S().upgrades[id] = true;
    return true;
  }

  // --- Prestige (stub) ---

  function coresOnReset() {
    return S().lifetimeBytes.div(cfg.CORE_DIVISOR).sqrt().floor();
  }

  function recalibrate() {
    // TODO: reset photons, generators, bytes; award coresOnReset(); keep automation.
  }

  // --- Time ---

  function checkUnlocks() {
    const u = S().unlocks;
    if (!u.telemetry && S().photons.gte(cfg.UNLOCK_BYTES_AT)) u.telemetry = true;
    if (!u.calibration && S().lifetimeBytes.gte(cfg.UNLOCK_CALIBRATION_AT)) u.calibration = true;
  }

  // Advance the simulation by `dt` seconds. Used by the loop and offline progress.
  function tick(dt) {
    addPhotons(photonsPerSec().mul(dt));
    // TODO: telemetry processing threads (photons -> bytes)
    // TODO: automation (auto-ping, autobuyers)
    checkUnlocks();
  }

  return {
    costFor, maxAffordable, photonsPerSec, pingValue, generatorOutput,
    ping, buyGenerator, buyUpgrade, coresOnReset, recalibrate, tick,
  };
})();
