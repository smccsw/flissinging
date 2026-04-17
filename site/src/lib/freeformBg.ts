type Vec2 = { x: number; y: number };

const STORAGE_KEY = "fliss:fxEnabled";

type AudioEnergyDetail = { energy: number };

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
  let beat = 0;
  let beatDecay = 0.86;

  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  let width = 0;
  let height = 0;
  let pixelRatio = dpr();

  // Particle field: lightweight “free-form” motion without dependencies.
  const rng = mulberry32(1337);
  const baseCount = 140;
  const particles: Array<{ p: Vec2; v: Vec2; s: number; hue: number }> = [];

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
      particles.push({
        p: { x: rng() * width, y: rng() * height },
        v: { x: (rng() - 0.5) * 0.4, y: (rng() - 0.5) * 0.4 },
        s: 0.6 + rng() * 1.6,
        hue: rng() * 360
      });
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
    if (delta > 0.12) beat = Math.min(1, beat + delta * 1.8);
    beat *= beatDecay;

    // Background wash that subtly changes with scroll.
    const cA: [number, number, number] = [168, 85, 247]; // fuchsia-ish
    const cB: [number, number, number] = [34, 211, 238]; // cyan-ish
    const c = mixColor(cA, cB, clamp(sp + energy * 0.25, 0, 1));

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    // Darken wash to increase contrast while keeping color.
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 - energy * 0.08})`;
    ctx.fillRect(0, 0, width, height);

    const g = ctx.createRadialGradient(width * 0.5, height * (0.3 + sp * 0.2), 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.8);
    g.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.10 + energy * 0.22 + beat * 0.20})`);
    g.addColorStop(0.6, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Motion field
    const flow = 0.9 + sp * 1.2 + energy * 2.2 + beat * 2.4;
    const swirl = 0.6 + sp * 1.4 + energy * 1.5 + beat * 1.5;
    const centerX = width * (0.45 + 0.1 * Math.sin(time * 0.2));
    const centerY = height * (0.4 + 0.08 * Math.cos(time * 0.17));

    ctx.globalCompositeOperation = "lighter";

    // Optional connective tissue: draw a few short lines for “energy”.
    const connectDist = (Math.min(width, height) * 0.06) * (1 + energy * 1.4 + beat * 1.8);
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
        const alpha = (0.02 + energy * 0.10 + beat * 0.14) * strength;
        if (alpha <= 0.01) continue;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.p.x, a.p.y);
        ctx.lineTo(b.p.x, b.p.y);
        ctx.stroke();
      }
    }

    for (const pt of particles) {
      const dx = (pt.p.x - centerX) / Math.max(1, width);
      const dy = (pt.p.y - centerY) / Math.max(1, height);
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;

      // Curl-ish field using trig, stable + cheap.
      const a = Math.atan2(dy, dx) + Math.sin(time * 0.6 + dist * 8) * 0.35 * swirl;
      const fx = -Math.sin(a) * (0.25 + 0.65 / (1 + dist * 6)) * flow;
      const fy = Math.cos(a) * (0.25 + 0.65 / (1 + dist * 6)) * flow;

      // Velocity integration (with gentle damping).
      pt.v.x = pt.v.x * 0.92 + fx * 0.18;
      pt.v.y = pt.v.y * 0.92 + fy * 0.18;

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
        (1.05 + energy * 1.05 + beat * 0.9);

      const hue = (pt.hue + sp * 120 + time * 6) % 360;
      ctx.fillStyle = `hsla(${hue}, 95%, ${74 + energy * 18 + beat * 10}%, ${alpha + energy * 0.18 + beat * 0.22})`;
      ctx.beginPath();
      ctx.arc(pt.p.x, pt.p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Tiny hot core for contrast.
      if (energy > 0.08) {
        ctx.fillStyle = `rgba(255,255,255,${0.03 + energy * 0.08 + beat * 0.10})`;
        ctx.beginPath();
        ctx.arc(pt.p.x, pt.p.y, Math.max(0.6, size * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
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

  window.addEventListener("resize", () => {
    if (!running) return;
    resize();
  });

  // Initial
  syncToggleUI();
  if (enabled) start();
}

