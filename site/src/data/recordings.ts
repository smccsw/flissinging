export type Recording = {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
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
    src: "/audio/minuet-in-g-beethoven.ogg",
    licenseLabel: "Public Domain / CC Public Domain Mark 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Minuet_in_G_(Beethoven),_piano.ogg"
  },
  {
    id: "maple-leaf-rag",
    title: "Maple Leaf Rag (Scott Joplin, 1916)",
    subtitle: "Piano roll recording (public domain)",
    src: "/audio/maple-leaf-rag-joplin-1916.ogg",
    licenseLabel: "Public Domain (US) / Public Domain Mark",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Maple_leaf_rag_-_played_by_Scott_Joplin_1916_V2.ogg"
  }
];

