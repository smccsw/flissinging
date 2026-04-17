export type Recording = {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  /**
   * Path relative to Astro base URL (no leading slash).
   * Example: "audio/example.ogg"
   */
  src: string;
  licenseLabel: string;
  licenseUrl: string;
  sourceUrl: string;
  /**
   * Linear gain in the WebAudio chain (1 ≈ source level). Use >1 for quieter masters so playback and visuals match louder tracks.
   */
  playbackGain?: number;
};

// Temporary sample recordings for development.
// Later: these will come from Sanity (CMS).
export const recordings: Recording[] = [
  {
    id: "minuet-in-g",
    title: "Minuet in G (Beethoven)",
    subtitle: "Public domain recording (Musopen / Wikimedia Commons)",
    src: "audio/minuet-in-g-beethoven.ogg",
    playbackGain: 1,
    licenseLabel: "Public Domain / CC Public Domain Mark 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Minuet_in_G_(Beethoven),_piano.ogg"
  },
  {
    id: "rondo-alla-turca",
    title: "Rondo alla turca (Mozart, K. 331)",
    subtitle: "Public domain (Wikimedia Commons; synthesized from Mutopia MIDI)",
    src: "audio/rondo-alla-turca-mozart.ogg",
    playbackGain: 1.35,
    licenseLabel: "Public Domain / CC Public Domain Mark 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Rondo_Alla_Turka.ogg"
  }
];

