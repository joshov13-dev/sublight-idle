'use strict';

const NOTATIONS = {
  scientific: 'Scientific (1.23e45)',
  engineering: 'Engineering (123.45e42)',
  letters: 'Letters (1.23 Qi)',
  logarithm: 'Logarithm (e45.09)',
};

const LETTER_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

let currentNotation = 'scientific';

function setNotation(name) {
  currentNotation = NOTATIONS[name] ? name : 'scientific';
}

function formatExponent(e) {
  return e < 1e6 ? e.toLocaleString('en-GB') : format(new Decimal(e));
}

function splitMantissa(d, places) {
  let m = d.mantissa;
  let e = d.exponent;
  if (Number(m.toFixed(places)) >= 10) {
    m /= 10;
    e += 1;
  }
  return [m, e];
}

function format(value, places = 2) {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (Number.isNaN(d.mantissa) || Number.isNaN(d.exponent)) return '?';
  if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent)) return 'Infinite';
  if (d.lt(0)) return `-${format(d.neg(), places)}`;
  if (d.lt(1e6)) return formatSmall(d.toNumber());

  if (currentNotation === 'logarithm') return `e${d.log10().toFixed(places)}`;

  const [m, e] = splitMantissa(d, places);
  if (currentNotation === 'scientific') return `${m.toFixed(places)}e${formatExponent(e)}`;

  const e3 = Math.floor(e / 3) * 3;
  let m3 = m * Math.pow(10, e - e3);
  if (currentNotation === 'letters' && e3 / 3 < LETTER_SUFFIXES.length) {
    return `${m3.toFixed(places)} ${LETTER_SUFFIXES[e3 / 3]}`;
  }
  if (currentNotation === 'letters') return `${m.toFixed(places)}e${formatExponent(e)}`;
  return `${m3.toFixed(places)}e${formatExponent(e3)}`;
}

function formatSmall(n) {
  if (n === 0) return '0';
  if (n < 0.01) return n.toExponential(1);
  if (n < 10) return trimZeros(n.toFixed(2));
  if (n < 100) return trimZeros(n.toFixed(1));
  return Math.floor(n + 1e-6).toLocaleString('en-GB');
}

function trimZeros(s) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

function formatInt(value) {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (d.lt(1e6)) return Math.floor(d.toNumber() + 1e-6).toLocaleString('en-GB');
  return format(d);
}

function formatMult(value) {
  return `x${format(value)}`;
}

function formatTime(seconds, precise = false) {
  if (!Number.isFinite(seconds)) return 'never';
  if (precise && seconds < 60) return `${seconds.toFixed(1)}s`;
  seconds = Math.floor(seconds);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}
