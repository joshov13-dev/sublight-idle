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
    const px = s.x - sky.mouseX * 30 * s.z;
    const py = s.y - sky.mouseY * 30 * s.z;
    if (streak > 2) {
      ctx.lineWidth = s.z * 1.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + streak * s.z * 0.25, py - streak * s.z);
      ctx.stroke();
    } else {
      ctx.fillRect(px, py, s.z * 1.6, s.z * 1.6);
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

// ---------- Parallax ----------

sky.mouseX = 0;
sky.mouseY = 0;
window.addEventListener('pointermove', e => {
  sky.mouseX = e.clientX / window.innerWidth - 0.5;
  sky.mouseY = e.clientY / window.innerHeight - 0.5;
});

// ---------- Orrery: the photon core with every array orbiting it ----------

const ARRAY_HUES = [199, 186, 160, 95, 45, 25, 330, 265];

const orrery = { canvas: null, ctx: null, ripples: [], w: 0, h: 0, pulse: 0 };

function sizeOrrery() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = orrery.canvas.getBoundingClientRect();
  orrery.w = rect.width;
  orrery.h = rect.height;
  orrery.canvas.width = rect.width * ratio;
  orrery.canvas.height = rect.height * ratio;
  orrery.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function orreryPulse() {
  orrery.pulse = 1;
  orrery.ripples.push({ r: 0, life: 1 });
}

function drawOrrery(now) {
  requestAnimationFrame(drawOrrery);
  const { canvas, ctx } = orrery;
  if (!canvas.isConnected || canvas.offsetParent === null) return;
  if (canvas.getBoundingClientRect().width !== orrery.w) sizeOrrery();
  const { w, h } = orrery;
  const t = sky.reduced ? 0 : now / 1000;
  const cx = w / 2;
  const cy = h / 2;
  ctx.clearRect(0, 0, w, h);

  const pps = photonsPerSecond();
  const power = pps.gt(1) ? Math.min(1, pps.log10() / 60) : 0;
  const coreR = 24 + power * 16 + orrery.pulse * 7;
  orrery.pulse *= 0.9;

  // Orbits: one ring per array type you own, bodies scale with how many you own.
  const maxR = Math.min(w / 2, h / 2 + 90) - 12;
  ARRAYS.forEach((gen, i) => {
    const owned = state.arrays[gen.id];
    const radius = coreR + 22 + (i / (ARRAYS.length - 1)) * (maxR - coreR - 22);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.42);
    ctx.strokeStyle = owned ? `hsla(${ARRAY_HUES[i]},80%,70%,0.22)` : 'rgba(148,163,184,0.1)';
    ctx.setLineDash(owned ? [] : [2, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (!owned) return;
    const bodies = Math.min(14, 1 + Math.floor(Math.log2(owned)));
    const speed = 0.5 / (1 + i * 0.35);
    for (let b = 0; b < bodies; b++) {
      const a = t * speed + (b / bodies) * Math.PI * 2 + i;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius * 0.42;
      const front = Math.sin(a) > 0;
      const size = (front ? 2.6 : 1.6) + (b === 0 ? 1.2 : 0);
      ctx.fillStyle = `hsla(${ARRAY_HUES[i]},85%,${front ? 72 : 55}%,${front ? 1 : 0.55})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      if (b === 0) {
        const trail = ctx.createLinearGradient(x, y, cx + Math.cos(a - 0.5) * radius, cy + Math.sin(a - 0.5) * radius * 0.42);
        trail.addColorStop(0, `hsla(${ARRAY_HUES[i]},85%,70%,0.35)`);
        trail.addColorStop(1, 'hsla(0,0%,100%,0)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.42);
        ctx.beginPath();
        ctx.arc(0, 0, radius, a - 0.5, a);
        ctx.restore();
        ctx.stroke();
      }
    }
  });

  // The core: layered warm light, a hot white centre and slow corona flicker.
  const flicker = 1 + Math.sin(t * 3.1) * 0.04 + Math.sin(t * 7.3) * 0.02;
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4.5 * flicker);
  halo.addColorStop(0, 'rgba(255,236,200,0.55)');
  halo.addColorStop(0.25, 'rgba(251,191,36,0.18)');
  halo.addColorStop(1, 'rgba(251,146,60,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 4.5 * flicker, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
  body.addColorStop(0, '#fffdf5');
  body.addColorStop(0.55, '#fde68a');
  body.addColorStop(1, '#f59e0b');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  for (const r of orrery.ripples) {
    r.r += 2.4;
    r.life -= 0.025;
    ctx.strokeStyle = `rgba(253,230,138,${Math.max(0, r.life) * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, coreR + r.r, (coreR + r.r) * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  orrery.ripples = orrery.ripples.filter(r => r.life > 0);
}

function mountOrrery(canvas) {
  orrery.canvas = canvas;
  orrery.ctx = canvas.getContext('2d');
  requestAnimationFrame(() => { sizeOrrery(); requestAnimationFrame(drawOrrery); });
}
