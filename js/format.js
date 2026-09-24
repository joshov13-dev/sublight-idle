// Number formatting. Mode is stored in state.settings.notation.
window.SL = window.SL || {};

SL.format = (function () {
  const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  function num(value, mode) {
    const d = new Decimal(value);
    if (d.lt(1e6)) return d.lt(100) && !d.floor().eq(d) ? d.toFixed(1) : d.floor().toNumber().toLocaleString('en-GB');

    if (mode === 'engineering') {
      const tier = Math.floor(d.exponent / 3);
      if (tier < SUFFIXES.length) {
        return d.div(Decimal.pow(10, tier * 3)).toFixed(2) + SUFFIXES[tier];
      }
    }
    return d.mantissa.toFixed(2) + 'e' + d.exponent;
  }

  return { num };
})();
