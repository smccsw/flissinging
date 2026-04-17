export type FxPalette = {
  id: string;
  label: string;
  washA: [number, number, number];
  washB: [number, number, number];
  /** Maps particle random hue (0..360) before scroll/time offsets. */
  dotHueScale: number;
  dotHueShift: number;
  dotScrollHue: number;
  dotTimeHue: number;
  dotSat: number;
};

export const FX_PALETTES: FxPalette[] = [
  {
    id: "aurora",
    label: "Aurora",
    washA: [168, 85, 247],
    washB: [34, 211, 238],
    dotHueScale: 1,
    dotHueShift: 0,
    dotScrollHue: 120,
    dotTimeHue: 6,
    dotSat: 98
  },
  {
    id: "ocean",
    label: "Ocean",
    washA: [30, 90, 180],
    washB: [0, 170, 195],
    dotHueScale: 0.42,
    dotHueShift: 188,
    dotScrollHue: 48,
    dotTimeHue: 3.5,
    dotSat: 92
  },
  {
    id: "ember",
    label: "Ember",
    washA: [220, 90, 40],
    washB: [244, 63, 94],
    dotHueScale: 0.35,
    dotHueShift: 8,
    dotScrollHue: 55,
    dotTimeHue: 4,
    dotSat: 96
  },
  {
    id: "forest",
    label: "Forest",
    washA: [22, 101, 52],
    washB: [74, 222, 128],
    dotHueScale: 0.5,
    dotHueShift: 95,
    dotScrollHue: 45,
    dotTimeHue: 3,
    dotSat: 88
  },
  {
    id: "lilac",
    label: "Lilac",
    washA: [167, 139, 250],
    washB: [244, 114, 182],
    dotHueScale: 0.55,
    dotHueShift: 285,
    dotScrollHue: 70,
    dotTimeHue: 5,
    dotSat: 95
  },
  {
    id: "noir",
    label: "Noir",
    washA: [71, 85, 105],
    washB: [148, 163, 184],
    dotHueScale: 0.18,
    dotHueShift: 215,
    dotScrollHue: 25,
    dotTimeHue: 2,
    dotSat: 38
  }
];

export const FX_PALETTE_STORAGE_KEY = "fliss:fxPalette";

export function getFxPaletteById(id: string): FxPalette {
  return FX_PALETTES.find((p) => p.id === id) ?? FX_PALETTES[0];
}

export function readFxPaletteId(): string {
  try {
    const raw = localStorage.getItem(FX_PALETTE_STORAGE_KEY);
    if (!raw) return FX_PALETTES[0].id;
    return FX_PALETTES.some((p) => p.id === raw) ? raw : FX_PALETTES[0].id;
  } catch {
    return FX_PALETTES[0].id;
  }
}

export function writeFxPaletteId(id: string) {
  const next = FX_PALETTES.some((p) => p.id === id) ? id : FX_PALETTES[0].id;
  try {
    localStorage.setItem(FX_PALETTE_STORAGE_KEY, next);
  } catch {
    // ignore
  }
}

/** Keeps static layout glow blobs roughly aligned with the canvas palette. */
export function syncFxLayoutGlows(p: FxPalette) {
  const a = document.querySelector<HTMLElement>('[data-fx-glow="a"]');
  const b = document.querySelector<HTMLElement>('[data-fx-glow="b"]');
  const [ar, ag, ab] = p.washA;
  const [br, bg, bb] = p.washB;
  if (a) {
    a.style.background = `radial-gradient(circle, rgba(${ar},${ag},${ab},0.16) 0%, transparent 68%)`;
  }
  if (b) {
    b.style.background = `radial-gradient(circle, rgba(${br},${bg},${bb},0.14) 0%, transparent 68%)`;
  }
}
