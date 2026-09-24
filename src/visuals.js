'use strict';

const sky = {
  canvas: null,
  ctx: null,
  stars: [],
  particles: [],
  width: 0,
  height: 0,
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  last: 0,
};

const LAYER_TINTS = {
  photons: [56, 189, 248],
  telemetry: [52, 211, 153],
  calibration: [251, 191, 36],
  horizon: [167, 139, 250],
};

function currentTint() {
  if (state.flags.horizon) return LAYER_TINTS.horizon;
  if (state.flags.calibration) return LAYER_TINTS.calibration;
  if (state.flags.telemetry) return LAYER_TINTS.telemetry;
  return LAYER_TINTS.photons;
}

function resizeSky() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  sky.width = window.innerWidth;
  sky.height = window.innerHeight;
  sky.canvas.width = sky.width * ratio;
  sky.canvas.height = sky.height * ratio;
  sky.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const count = Math.round((sky.width * sky.height) / 6000);
  sky.stars = Array.from({ length: Math.min(count, 350) }, () => ({
    x: Math.random() * sky.width,
    y: Math.random() * sky.height,
    z: 0.2 + Math.random() * 0.8,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

// Warp speed grows with the size of your production, so the sky visibly speeds up as you progress.
function warpSpeed() {
  const pps = photonsPerSecond();
  const orders = pps.gt(1) ? pps.log10() : 0;
  return 4 + Math.min(orders, 1000) * 0.35 + (state.signal.surge > 0 ? 60 : 0);
}

function burst(x, y, colour = [125, 211, 252], count = 18) {
  if (sky.reduced) return;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 160;
    sky.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, colour });
  }
  if (sky.particles.length > 400) sky.particles.splice(0, sky.particles.length - 400);
}

function burstFrom(el, colour, count) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, colour, count);
}

function drawSky(now) {
  const dt = Math.min(0.1, (now - sky.last) / 1000 || 0);
  sky.last = now;
  const { ctx, width, height } = sky;
  const [r, g, b] = currentTint();
  ctx.clearRect(0, 0, width, height);

  const speed = sky.reduced ? 0 : warpSpeed();
  const streak = Math.min(40, speed / 6);
  for (const s of sky.stars) {
    s.y += speed * s.z * dt;
    s.x -= speed * s.z * dt * 0.25;
    if (s.y > height) { s.y -= height; s.x = Math.random() * width; }
    if (s.x < 0) s.x += width;
    s.twinkle += dt * 2;
    const alpha = (0.35 + 0.45 * s.z) * (0.75 + 0.25 * Math.sin(s.twinkle));
    ctx.strokeStyle = ctx.fillStyle = `rgba(${200 + (r >> 3)},${220 + (g >> 4)},255,${alpha})`;
    if (streak > 2) {
      ctx.lineWidth = s.z * 1.4;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + streak * s.z * 0.25, s.y - streak * s.z);
      ctx.stroke();
    } else {
      ctx.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6);
    }
  }

  for (const p of sky.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt * 1.4;
    ctx.fillStyle = `rgba(${p.colour[0]},${p.colour[1]},${p.colour[2]},${Math.max(0, p.life)})`;
    ctx.fillRect(p.x, p.y, 2.2, 2.2);
  }
  sky.particles = sky.particles.filter(p => p.life > 0);
  requestAnimationFrame(drawSky);
}

function initSky() {
  sky.canvas = h('canvas', { id: 'sky', 'aria-hidden': 'true' });
  sky.ctx = sky.canvas.getContext('2d');
  document.body.prepend(sky.canvas);
  resizeSky();
  window.addEventListener('resize', resizeSky);
  requestAnimationFrame(drawSky);
  scheduleComet();
}

// ---------- Comets ----------

function scheduleComet() {
  const gap = SIGNAL.cometMinGap + Math.random() * (SIGNAL.cometMaxGap - SIGNAL.cometMinGap);
  setTimeout(spawnComet, gap * 1000);
}

function spawnComet() {
  scheduleComet();
  if (document.hidden || modalOpen || !state.arrays.collector) return;
  const fromLeft = Math.random() < 0.5;
  const top = 15 + Math.random() * 55;
  const duration = 9;
  const comet = h('button', {
    class: 'comet',
    'aria-label': 'Catch the comet',
    title: 'Catch the comet',
    style: `top:${top}vh; left:${fromLeft ? -8 : 108}vw; --dx:${fromLeft ? 116 : -116}vw; --dur:${duration}s; --tilt:${fromLeft ? 1 : -1};`,
    onclick: () => {
      const { reward, fragment } = claimComet();
      burstFrom(comet, [253, 224, 71], 40);
      toast(`Comet caught: +${format(reward)} photons${fragment ? ' and a Star Fragment' : ''}.`, 'achievement');
      comet.remove();
      refresh();
    },
  });
  document.body.append(comet);
  setTimeout(() => comet.remove(), duration * 1000);
}
