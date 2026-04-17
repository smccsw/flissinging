type EnergyEventDetail = {
  energy: number; // 0..1
  sourceId?: string;
};

declare global {
  interface WindowEventMap {
    "fliss:audio-energy": CustomEvent<EnergyEventDetail>;
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function attachAudioReactivePlayer() {
  if (typeof window === "undefined") return;

  const audio = document.querySelector<HTMLAudioElement>("[data-recording-audio]");
  if (!audio) return;

  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaElementAudioSourceNode | null = null;
  let raf = 0;
  let lastEnergy = 0;

  const freqData = () => new Uint8Array(analyser?.frequencyBinCount ?? 0);
  let buf = new Uint8Array(0);

  function emit(energy: number) {
    const detail: EnergyEventDetail = { energy: clamp(energy, 0, 1) };
    window.dispatchEvent(new CustomEvent("fliss:audio-energy", { detail }));
  }

  function tick() {
    if (!analyser) return;
    if (buf.length !== analyser.frequencyBinCount) buf = freqData();

    analyser.getByteFrequencyData(buf);
    // Weighted average: bias towards mid/high frequencies for "sparkle".
    let sum = 0;
    let wsum = 0;
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i] / 255;
      const w = 0.35 + 0.65 * (i / (buf.length - 1));
      sum += x * w;
      wsum += w;
    }
    const raw = wsum ? sum / wsum : 0;

    // Smooth + slightly boost.
    const energy = clamp(raw * 1.35, 0, 1);
    lastEnergy = lastEnergy * 0.82 + energy * 0.18;
    emit(lastEnergy);

    raf = requestAnimationFrame(tick);
  }

  async function ensureAudioGraph() {
    if (ctx) return;
    ctx = new AudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;

    source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
  }

  async function onPlay() {
    await ensureAudioGraph();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function onPause() {
    cancelAnimationFrame(raf);
    emit(0);
  }

  function onEnded() {
    cancelAnimationFrame(raf);
    emit(0);
  }

  audio.addEventListener("play", onPlay);
  audio.addEventListener("pause", onPause);
  audio.addEventListener("ended", onEnded);

  // If the page gets hidden, stop pumping frames.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      emit(0);
    } else if (!audio.paused) {
      raf = requestAnimationFrame(tick);
    }
  });
}

