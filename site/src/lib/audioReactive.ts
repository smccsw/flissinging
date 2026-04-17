type EnergyEventDetail = {
  energy: number; // 0..1
  sourceId?: string;
};

type SpectrumEventDetail = {
  energy: number; // 0..1 (overall loudness-ish)
  bands: {
    low: number; // 0..1
    mid: number; // 0..1
    high: number; // 0..1
  };
  transient: number; // 0..1 (note-ish peaks / onsets)
};

declare global {
  interface WindowEventMap {
    "fliss:audio-energy": CustomEvent<EnergyEventDetail>;
    "fliss:audio-spectrum": CustomEvent<SpectrumEventDetail>;
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
  let lastRms = 0;
  let lastTransient = 0;

  const freqData = () => new Uint8Array(analyser?.frequencyBinCount ?? 0);
  let buf = new Uint8Array(0);
  let prevBuf = new Uint8Array(0);
  let tbuf = new Uint8Array(0);

  function emit(energy: number) {
    const detail: EnergyEventDetail = { energy: clamp(energy, 0, 1) };
    window.dispatchEvent(new CustomEvent("fliss:audio-energy", { detail }));
  }

  function emitSpectrum(detail: SpectrumEventDetail) {
    window.dispatchEvent(new CustomEvent("fliss:audio-spectrum", { detail }));
  }

  function bandEnergy(buf: Uint8Array, i0: number, i1: number) {
    const lo = clamp(Math.floor(i0), 0, buf.length - 1);
    const hi = clamp(Math.floor(i1), 0, buf.length - 1);
    let sum = 0;
    let n = 0;
    for (let i = lo; i <= hi; i++) {
      sum += buf[i] / 255;
      n++;
    }
    return n ? sum / n : 0;
  }

  function tick() {
    if (!analyser || !timeAnalyser) return;
    if (buf.length !== analyser.frequencyBinCount) {
      buf = freqData();
      prevBuf = new Uint8Array(buf.length);
    }
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

    // Multi-band spectrum for more "note-ish" motion on dense piano textures.
    const n = buf.length;
    const low = bandEnergy(buf, 0, Math.floor(n * 0.12));
    const mid = bandEnergy(buf, Math.floor(n * 0.12), Math.floor(n * 0.45));
    const high = bandEnergy(buf, Math.floor(n * 0.45), n - 1);

    // Onset / transient detector: combine waveform attacks with spectral flux.
    // Spectral flux helps dense piano textures where RMS barely moves note-to-note.
    let flux = 0;
    for (let i = 0; i < n; i++) {
      const d = buf[i] - prevBuf[i];
      if (d > 0) flux += d / 255;
    }
    flux = clamp(flux / Math.max(1, n * 0.09), 0, 1);
    prevBuf.set(buf);

    const dr = clamp(rms - lastRms, 0, 1);
    lastRms = lastRms * 0.92 + rms * 0.08;
    const transientRaw = clamp(Math.max(dr * 8, flux * 1.35), 0, 1);
    lastTransient = lastTransient * 0.55 + transientRaw * 0.45;
    const transient = clamp(lastTransient, 0, 1);

    emitSpectrum({
      energy: lastEnergy,
      bands: {
        low: clamp(Math.pow(low, 0.75), 0, 1),
        mid: clamp(Math.pow(mid, 0.75), 0, 1),
        high: clamp(Math.pow(high, 0.75), 0, 1)
      },
      transient
    });

    raf = requestAnimationFrame(tick);
  }

  async function ensureAudioGraph() {
    if (ctx) return;
    ctx = new AudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    // Lower smoothing so fast passages can still modulate visuals.
    analyser.smoothingTimeConstant = 0.48;

    timeAnalyser = ctx.createAnalyser();
    timeAnalyser.fftSize = 1024;
    timeAnalyser.smoothingTimeConstant = 0.35;

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

