type Vec2 = { x: number; y: number };

const STORAGE_KEY = "fliss:fxEnabled";

type AudioEnergyDetail = { energy: number };
type AudioSpectrumDetail = {
  energy: number;
  bands: { low: number; mid: number; high: number };
  transient: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function fxDefaultEnabled() {
  // Default to enabled on desktop-ish screens, disabled on small screens.
  return window.matchMedia?.("(min-width: 1024px)")?.matches ?? true;
}

function readEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return fxDefaultEnabled();
    return raw === "1";
  } catch {
    return fxDefaultEnabled();
  }
}

function writeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

function getScrollProgress() {
  const doc = document.documentElement;
  const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
  return clamp(doc.scrollTop / max, 0, 1);
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function initFreeformBackground() {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  const canvas = document.querySelector<HTMLCanvasElement>("[data-freeform-bg]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-freeform-toggle]");
  if (!canvas || !toggle) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let enabled = readEnabled();
  let running = false;
  let raf = 0;

  // Audio energy (0..1) pushed by the audio player when music is playing.
  let energy = 0;
  let energyTarget = 0;
  let bandLow = 0;
  let bandMid = 0;
  let bandHigh = 0;
  let transient = 0;
  let beat = 0;
  let beatDecay = 0.86;
  let ripplePhase = 0;

  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  let width = 0;
  let height = 0;
  let pixelRatio = dpr();

  // Particle field: lightweight “free-form” motion without dependencies.
  const rng = mulberry32(1337);
  const baseCount = 140;
  const particles: Array<{ p: Vec2; v: Vec2; s: number; hue: number }> = [];
  const phase = new WeakMap<{ p: Vec2; v: Vec2; s: number; hue: number }, number>();

  function desiredCount() {
    const small = window.matchMedia?.("(max-width: 767px)")?.matches ?? false;
    const mid = window.matchMedia?.("(max-width: 1023px)")?.matches ?? false;
    if (small) return 50;
    if (mid) return 90;
    return baseCount;
  }

  function seedParticles() {
    particles.length = 0;
    const count = desiredCount();
    for (let i = 0; i < count; i++) {
      const pt = {
        p: { x: rng() * width, y: rng() * height },
        v: { x: (rng() - 0.5) * 0.4, y: (rng() - 0.5) * 0.4 },
        s: 0.6 + rng() * 1.6,
        hue: rng() * 360
      };
      particles.push(pt);
      phase.set(pt, rng() * Math.PI * 2);
    }
  }

  function resize() {
    pixelRatio = dpr();
    const nextW = Math.max(1, Math.floor(window.innerWidth));
    const nextH = Math.max(1, Math.floor(window.innerHeight));
    width = nextW;
    height = nextH;
    canvas.width = Math.floor(nextW * pixelRatio);
    canvas.height = Math.floor(nextH * pixelRatio);
    canvas.style.width = `${nextW}px`;
    canvas.style.height = `${nextH}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    seedParticles();
  }

  function draw(t: number) {
    const time = t * 0.001;
    const sp = getScrollProgress();

    // Smooth energy so visuals feel musical, not jittery.
    energyTarget = clamp(energyTarget, 0, 1);
    energy = energy * 0.85 + energyTarget * 0.15;
    // A simple beat detector: when energy rises quickly, punch a pulse.
    const delta = energyTarget - energy;
    if (delta > 0.06) {
      beat = Math.min(1, beat + delta * 2.6);
      ripplePhase = 1;
    }
    beat *= beatDecay;
    ripplePhase = Math.max(0, ripplePhase - 0.02);

    // Background wash that subtly changes with scroll.
    const cA: [number, number, number] = [168, 85, 247]; // fuchsia-ish
    const cB: [number, number, number] = [34, 211, 238]; // cyan-ish
    const c = mixColor(cA, cB, clamp(sp + energy * 0.25, 0, 1));

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    // Darken wash to increase contrast while keeping color.
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 - energy * 0.18})`;
    ctx.fillRect(0, 0, width, height);

    const g = ctx.createRadialGradient(
      width * 0.5,
      height * (0.3 + sp * 0.2),
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.85
    );
    g.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.14 + energy * 0.42 + beat * 0.35})`);
    g.addColorStop(0.6, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Big ripple ring on beats (very visible).
    if (ripplePhase > 0) {
      const r = (Math.min(width, height) * 0.18) * (1 + (1 - ripplePhase) * 2.8);
      const ring = ctx.createRadialGradient(width * 0.5, height * 0.45, r * 0.55, width * 0.5, height * 0.45, r);
      ring.addColorStop(0, "rgba(255,255,255,0)");
      ring.addColorStop(0.72, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.06 + beat * 0.22})`);
      ring.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ring;
      ctx.fillRect(0, 0, width, height);
    }

    // Motion field
    const flow = 0.85 + sp * 1.0 + energy * 1.8 + beat * 2.0 + transient * 2.2 + bandMid * 0.9;
    const swirl = 0.55 + sp * 1.2 + energy * 1.2 + beat * 1.2 + transient * 1.6 + bandHigh * 0.9;

    // Keep colors by default; we'll use additive blending for bloom only.
    ctx.globalCompositeOperation = "source-over";

    // Optional connective tissue: draw a few short lines for “energy”.
    const connectDist =
      (Math.min(width, height) * 0.055) * (1 + energy * 1.2 + beat * 1.4 + transient * 1.8 + bandHigh * 0.8);
    const connectDist2 = connectDist * connectDist;
    ctx.lineWidth = 1;

    // Only connect a subset (cheap).
    const step = energy > 0.15 ? 2 : 3;
    for (let i = 0; i < particles.length; i += step) {
      const a = particles[i];
      for (let j = i + step; j < particles.length; j += step) {
        const b = particles[j];
        const dx = a.p.x - b.p.x;
        const dy = a.p.y - b.p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > connectDist2) continue;
        const d = Math.sqrt(d2);
        const strength = 1 - d / connectDist;
        const alpha = (0.02 + energy * 0.12 + beat * 0.18 + transient * 0.22 + bandHigh * 0.08) * strength;
        if (alpha <= 0.01) continue;
        // Tint lines slightly so we don't wash everything to white.
        ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.p.x, a.p.y);
        ctx.lineTo(b.p.x, b.p.y);
        ctx.stroke();
      }
    }

    for (const pt of particles) {
      const nx = pt.p.x / Math.max(1, width);
      const ny = pt.p.y / Math.max(1, height);

      // Per-particle "center" avoids a single global disc orbit.
      const ph = phase.get(pt) ?? 0;
      const cx =
        width *
        (0.42 +
          0.12 * Math.sin(time * 0.23 + ph) +
          0.08 * Math.sin(time * 0.61 + ph * 2.1) +
          0.05 * bandLow * Math.sin(time * 2.2 + transient * 6));
      const cy =
        height *
        (0.38 +
          0.1 * Math.cos(time * 0.19 + ph * 1.3) +
          0.07 * Math.cos(time * 0.53 + ph * 1.9) +
          0.05 * bandMid * Math.cos(time * 2.0 + transient * 5));

      const dx = (pt.p.x - cx) / Math.max(1, width);
      const dy = (pt.p.y - cy) / Math.max(1, height);
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;

      // Curl-ish field using trig, stable + cheap.
      const a =
        Math.atan2(dy, dx) +
        Math.sin(time * 0.55 + dist * 8 + ph) * 0.28 * swirl +
        Math.sin(time * 1.1 + nx * 10 + ny * 7 + ph) * 0.18 * (0.6 + transient);

      const falloff = 0.22 + 0.72 / (1 + dist * (5.2 + bandHigh * 2.0));
      const fx = -Math.sin(a) * falloff * flow;
      const fy = Math.cos(a) * falloff * flow;

      // A cheap pseudo-curl noise field to break symmetry further.
      const n1 = Math.sin((nx + time * 0.12) * 12.7 + ph) * Math.cos((ny - time * 0.09) * 11.3 - ph);
      const n2 = Math.cos((nx - time * 0.11) * 10.9 + ph * 0.7) * Math.sin((ny + time * 0.13) * 13.1 - ph * 0.9);
      const curlx = (n1 - n2) * (0.12 + 0.22 * transient + 0.12 * bandHigh);
      const curly = (n2 + n1) * (0.10 + 0.18 * transient + 0.10 * bandHigh);

      // Velocity integration (with gentle damping).
      // Add a little per-particle divergence so the field doesn't collapse into a single blob.
      const jitter = (0.06 + energy * 0.06) * (0.5 + 0.5 * Math.sin(time * 0.7 + ph));
      const jx = Math.cos(ph + time * 0.45) * jitter;
      const jy = Math.sin(ph - time * 0.4) * jitter;

      pt.v.x = pt.v.x * 0.9 + (fx + curlx + jx) * 0.22;
      pt.v.y = pt.v.y * 0.9 + (fy + curly + jy) * 0.22;

      // Cap velocity to avoid streaky clumps.
      const vmax = 1.8 + energy * 1.6 + beat * 1.8 + transient * 1.2;
      const vx = pt.v.x;
      const vy = pt.v.y;
      const v2 = vx * vx + vy * vy;
      if (v2 > vmax * vmax) {
        const s = vmax / Math.sqrt(v2);
        pt.v.x *= s;
        pt.v.y *= s;
      }

      pt.p.x += pt.v.x;
      pt.p.y += pt.v.y;

      // Wrap edges.
      if (pt.p.x < -10) pt.p.x = width + 10;
      if (pt.p.x > width + 10) pt.p.x = -10;
      if (pt.p.y < -10) pt.p.y = height + 10;
      if (pt.p.y > height + 10) pt.p.y = -10;

      const alpha = 0.12 + 0.12 * Math.sin(time + dist * 6);
      const size =
        pt.s *
        (0.8 + 0.6 * (1 - clamp(dist * 1.4, 0, 1))) *
        (1.05 + energy * 0.85 + beat * 0.75 + transient * 0.55 + bandHigh * 0.35);

      const hue = (pt.hue + sp * 120 + time * 6) % 360;
      ctx.fillStyle = `hsla(${hue}, 98%, ${76 + energy * 14 + beat * 10}%, ${alpha + energy * 0.26 + beat * 0.26})`;
      ctx.beginPath();
      ctx.arc(pt.p.x, pt.p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Tiny hot core for contrast.
      if (energy > 0.08) {
        // Keep cores colored (not pure white).
        ctx.fillStyle = `hsla(${hue}, 98%, 86%, ${0.05 + energy * 0.12 + beat * 0.14 + transient * 0.22})`;
        ctx.beginPath();
        ctx.arc(pt.p.x, pt.p.y, Math.max(0.6, size * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Additive bloom pass (kept small to avoid whitening).
    if (energy > 0.05) {
      ctx.globalCompositeOperation = "lighter";
      const bloom = clamp(energy * 0.18 + beat * 0.22, 0, 0.35);
      ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${bloom})`;
      ctx.fillRect(0, 0, width, height);
    }

    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, width, height);
  }

  function syncToggleUI() {
    toggle.textContent = enabled ? "FX On" : "FX Off";
    toggle.classList.toggle("opacity-60", !enabled);
  }

  toggle.addEventListener("click", () => {
    enabled = !enabled;
    writeEnabled(enabled);
    syncToggleUI();
    if (enabled) start();
    else stop();
  });

  window.addEventListener("fliss:audio-energy", (ev: Event) => {
    const detail = (ev as CustomEvent<AudioEnergyDetail>).detail;
    energyTarget = clamp(detail?.energy ?? 0, 0, 1);
  });

  window.addEventListener("fliss:audio-spectrum", (ev: Event) => {
    const detail = (ev as CustomEvent<AudioSpectrumDetail>).detail;
    energyTarget = clamp(detail?.energy ?? energyTarget, 0, 1);
    bandLow = clamp(detail?.bands?.low ?? 0, 0, 1);
    bandMid = clamp(detail?.bands?.mid ?? 0, 0, 1);
    bandHigh = clamp(detail?.bands?.high ?? 0, 0, 1);
    transient = clamp(detail?.transient ?? 0, 0, 1);
  });

  window.addEventListener("resize", () => {
    if (!running) return;
    resize();
  });

  // Initial
  syncToggleUI();
  if (enabled) start();
}

