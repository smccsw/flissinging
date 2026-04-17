export type Recording = {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  /**
   * Path relative to Astro base URL (no leading slash).
   * Example: "audio/example.ogg" or "audio/track.mp3"
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
    id: "volatile-reaction",
    title: "Volatile Reaction",
    subtitle: "Instrumental rock · Kevin MacLeod / incompetech.com (CC BY 3.0 — credit required if you reuse the file)",
    src: "audio/volatile-reaction-kevin-macleod.mp3",
    playbackGain: 0.92,
    licenseLabel: "Creative Commons Attribution 3.0 Unported",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    sourceUrl: "https://incompetech.com/music/royalty-free/"
  }
];

