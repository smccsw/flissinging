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
};

// Temporary sample recordings for development.
// Later: these will come from Sanity (CMS).
export const recordings: Recording[] = [
  {
    id: "minuet-in-g",
    title: "Minuet in G (Beethoven)",
    subtitle: "Public domain recording (Musopen / Wikimedia Commons)",
    src: "audio/minuet-in-g-beethoven.ogg",
    licenseLabel: "Public Domain / CC Public Domain Mark 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Minuet_in_G_(Beethoven),_piano.ogg"
  },
  {
    id: "fur-elise",
    title: "Für Elise (Beethoven)",
    subtitle: "Public domain recording (Wikimedia Commons)",
    src: "audio/fur-elise-beethoven.ogg",
    licenseLabel: "CC0 1.0 Universal (public domain dedication)",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:FurElise.ogg"
  }
];

