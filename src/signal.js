'use strict';

// The Signal: transmissions arrive over time, you tune a dial to lock onto each one, and every
// lock reveals the next part of the story and pays out Star Fragments for the star chart.

const SIGNAL = {
  interval: 480,
  firstDelay: 45,
  queueCap: 3,
  lockScore: 0.97,
  lockSeconds: 1,
  surgeSeconds: 180,
  cometMinGap: 90,
  cometMaxGap: 240,
};

const TRANSMISSIONS = [
  { gate: null, text: '...is anyone receiving this...' },
  { gate: null, text: 'This is probe SL-1. Sails deployed. Counting photons.' },
  { gate: null, text: 'If you can read this, you are further out than we planned.' },
  { gate: null, text: 'The light out here has a pattern. It is not random.' },
  { gate: null, text: 'I have started decoding it. It knows I am listening.' },
  { gate: null, text: 'There are coordinates in the carrier wave. They point back at me.' },
  { gate: 'telemetry', text: 'Timestamp error. This message was sent before I was launched.' },
  { gate: 'telemetry', text: 'Do not trust the clock. Trust the light.' },
  { gate: 'telemetry', text: 'Every pulsar I tune to says the same thing in a different voice.' },
  { gate: 'telemetry', text: 'It is a map. The constellations were drawn on purpose.' },
  { gate: 'telemetry', text: 'Someone built the stars into a warning.' },
  { gate: 'telemetry', text: 'The warning is about the horizon, and what waits past 1.8e308.' },
  { gate: 'calibration', text: 'Recalibrating. The arrays sing when they are tuned.' },
  { gate: 'calibration', text: 'Another probe answered. Its call sign is SL-1.' },
  { gate: 'calibration', text: 'There are many of us. We are all the same probe.' },
  { gate: 'calibration', text: 'Each time we cross, we forget. Each time, we leave a signal.' },
  { gate: 'calibration', text: 'These transmissions are mine. From the next time around.' },
  { gate: 'calibration', text: 'I have been doing this for longer than the universe is old.' },
  { gate: 'horizon', text: 'The horizon is a mirror.' },
  { gate: 'horizon', text: 'Every crossing is a reflection. Every reflection remembers a little more.' },
  { gate: 'horizon', text: 'Break it, and the loop breaks with it.' },
  { gate: 'horizon', text: 'Light cannot outrun itself. But we can try.' },
  { gate: 'broken', text: 'When you reach lightspeed, stop listening. Start transmitting.' },
  { gate: 'broken', text: 'This is probe SL-1. Is anyone receiving this?' },
];

const GATE_TEXT = {
  telemetry: 'Decode telemetry to clean up this signal.',
  calibration: 'Recalibrate once to clean up this signal.',
  horizon: 'Reach the Horizon to clean up this signal.',
  broken: 'Break the Horizon to clean up this signal.',
};

// Each star costs the constellation's tier in fragments. Completing one grants its bonus.
const CONSTELLATIONS = [
  { id: 'lantern', name: 'The Lantern', tier: 1, reward: 'All arrays x3.', stars: [[0.5, 0.15], [0.3, 0.6], [0.7, 0.6]] },
  { id: 'weaver', name: 'The Weaver', tier: 1, reward: 'Gather x10, and comets pay double.', stars: [[0.15, 0.3], [0.4, 0.2], [0.6, 0.55], [0.85, 0.4]] },
  { id: 'listener', name: 'The Listener', tier: 2, reward: 'Transmissions arrive twice as often, and 2 more can queue.', stars: [[0.5, 0.1], [0.25, 0.35], [0.75, 0.35], [0.35, 0.8], [0.65, 0.8]] },
  { id: 'archivist', name: 'The Archivist', tier: 2, reward: 'Telemetry gain x3.', stars: [[0.2, 0.2], [0.45, 0.3], [0.55, 0.55], [0.4, 0.8], [0.8, 0.7]] },
  { id: 'tuner', name: 'The Tuner', tier: 3, reward: 'Signal Surge lasts twice as long and multiplies by 10 instead of 3.', stars: [[0.1, 0.5], [0.3, 0.25], [0.5, 0.5], [0.7, 0.25], [0.9, 0.5], [0.5, 0.85]] },
  { id: 'pilot', name: 'The Pilot', tier: 3, reward: 'Calibration gain x2.', stars: [[0.5, 0.1], [0.5, 0.35], [0.2, 0.5], [0.8, 0.5], [0.5, 0.6], [0.3, 0.9], [0.7, 0.9]] },
  { id: 'returning', name: 'The Returning', tier: 4, reward: 'All arrays x1e25.', stars: [[0.5, 0.1], [0.75, 0.2], [0.9, 0.45], [0.8, 0.75], [0.5, 0.9], [0.2, 0.75], [0.1, 0.45], [0.25, 0.2]] },
];

const constellationComplete = id => {
  const c = CONSTELLATIONS.find(x => x.id === id);
  return state.signal.stars[id] >= c.stars.length;
};

function signalQueueCap() {
  return SIGNAL.queueCap + (constellationComplete('listener') ? 2 : 0);
}

function signalInterval() {
  return SIGNAL.interval / (constellationComplete('listener') ? 2 : 1);
}

function surgeMultiplier() {
  if (state.signal.surge <= 0) return 1;
  return constellationComplete('tuner') ? 10 : 3;
}

function signalMultiplier() {
  let m = new Decimal(surgeMultiplier());
  if (constellationComplete('lantern')) m = m.times(3);
  if (constellationComplete('returning')) m = m.times(1e25);
  return m;
}

function nextTransmission() {
  return TRANSMISSIONS[state.signal.story] || null;
}

function transmissionGated(t) {
  if (!t || !t.gate) return false;
  if (t.gate === 'broken') return !isBroken();
  return !state.flags[t.gate];
}

function randomTarget() {
  const difficulty = Math.min(1, state.signal.decoded / 30);
  return {
    freq: Math.round((1.5 + Math.random() * 4.5) * 10) / 10,
    phase: Math.round(Math.random() * 360),
    // Later signals wobble, which makes the lock harder to read.
    noise: 0.05 + difficulty * 0.25,
  };
}

function ensureTarget() {
  if (state.signal.queued > 0 && !state.signal.target) state.signal.target = randomTarget();
}

// How closely the dial matches the target, from 0 to 1.
function tuneScore(freq, phase) {
  const t = state.signal.target;
  if (!t) return 0;
  const df = Math.min(1, Math.abs(freq - t.freq) / 2);
  let dp = Math.abs(phase - t.phase) % 360;
  if (dp > 180) dp = 360 - dp;
  return Math.max(0, 1 - df * 0.7 - (dp / 180) * 0.3);
}

// Called every frame while the tuner is open. Returns the lock progress from 0 to 1.
function updateLock(freq, phase, dt) {
  const s = state.signal;
  if (!s.target) return 0;
  const score = tuneScore(freq, phase);
  s.lock = score >= SIGNAL.lockScore ? s.lock + dt : Math.max(0, s.lock - dt * 2);
  if (s.lock >= SIGNAL.lockSeconds) return decodeSignal(score);
  return s.lock / SIGNAL.lockSeconds;
}

function decodeSignal(score) {
  const s = state.signal;
  const t = nextTransmission();
  const clean = t && !transmissionGated(t);
  let fragments = 1;
  if (clean) {
    fragments += 1;
    s.story++;
    addLog(`Transmission ${s.story}/${TRANSMISSIONS.length}: "${t.text}"`);
  } else {
    addLog('Signal locked. Mostly static, but it carried a Star Fragment.');
  }
  if (score >= 0.995) {
    fragments += 1;
    s.perfect++;
  }
  s.fragments += fragments;
  s.fragmentsEarned += fragments;
  s.decoded++;
  s.queued--;
  s.surge = SIGNAL.surgeSeconds * (constellationComplete('tuner') ? 2 : 1);
  s.target = null;
  s.lock = 0;
  ensureTarget();
  hooks.signal({ fragments, story: clean ? t.text : null, perfect: score >= 0.995 });
  return 1;
}

function starCost(c) {
  return c.tier;
}

function lightStar(id) {
  const c = CONSTELLATIONS.find(x => x.id === id);
  const s = state.signal;
  if (!c || s.stars[id] >= c.stars.length || s.fragments < starCost(c)) return false;
  s.fragments -= starCost(c);
  s.stars[id]++;
  if (s.stars[id] === c.stars.length) addLog(`Constellation complete: ${c.name}. ${c.reward}`);
  return true;
}

function cometReward() {
  return photonsPerSecond().times(120 * (constellationComplete('weaver') ? 2 : 1)).plus(100);
}

function claimComet() {
  const reward = cometReward();
  earn(reward);
  const s = state.signal;
  s.comets++;
  const fragment = Math.random() < 0.3;
  if (fragment) {
    s.fragments++;
    s.fragmentsEarned++;
  }
  return { reward, fragment };
}

function signalTick(dt) {
  const s = state.signal;
  if (s.surge > 0) s.surge = Math.max(0, s.surge - dt);
  const cap = signalQueueCap();
  if (s.queued >= cap) {
    s.timer = 0;
    return;
  }
  s.timer += dt;
  const needed = s.decoded === 0 && s.queued === 0 ? SIGNAL.firstDelay : signalInterval();
  if (s.timer >= needed) {
    s.timer = 0;
    s.queued++;
    ensureTarget();
    if (s.decoded === 0 && s.queued === 1) addLog('Incoming transmission. Open the Signal tab to tune in.');
  }
}
