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
  let timeAnalyser: AnalyserNode | null = null;
  let source: MediaElementAudioSourceNode | null = null;
  let raf = 0;
  let lastEnergy = 0;
  let peak = 0;

  const freqData = () => new Uint8Array(analyser?.frequencyBinCount ?? 0);
  let buf = new Uint8Array(0);
  let tbuf = new Uint8Array(0);

  function emit(energy: number) {
    const detail: EnergyEventDetail = { energy: clamp(energy, 0, 1) };
    window.dispatchEvent(new CustomEvent("fliss:audio-energy", { detail }));
  }

  function tick() {
    if (!analyser || !timeAnalyser) return;
    if (buf.length !== analyser.frequencyBinCount) buf = freqData();
    if (tbuf.length !== timeAnalyser.fftSize) tbuf = new Uint8Array(timeAnalyser.fftSize);

    analyser.getByteFrequencyData(buf);
    timeAnalyser.getByteTimeDomainData(tbuf);
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

    // RMS from waveform (captures "loudness" even for sparse piano).
    let rms = 0;
    for (let i = 0; i < tbuf.length; i++) {
      const v = (tbuf[i] - 128) / 128;
      rms += v * v;
    }
    rms = Math.sqrt(rms / Math.max(1, tbuf.length)); // 0..~1

    // Combine + auto-gain: make it "obvious" on quieter material.
    const combined = clamp(raw * 0.9 + rms * 1.25, 0, 1);
    const boosted = clamp(Math.pow(combined, 0.6) * 1.35, 0, 1);

    // Peak hold for punchy pulses.
    peak = Math.max(boosted, peak * 0.93);

    // Smooth but less sleepy than before.
    lastEnergy = lastEnergy * 0.7 + peak * 0.3;
    emit(lastEnergy);

    raf = requestAnimationFrame(tick);
  }

  async function ensureAudioGraph() {
    if (ctx) return;
    ctx = new AudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;

    timeAnalyser = ctx.createAnalyser();
    timeAnalyser.fftSize = 1024;
    timeAnalyser.smoothingTimeConstant = 0.5;

    source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    source.connect(timeAnalyser);
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

