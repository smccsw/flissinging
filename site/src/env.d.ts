/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Sanity project id (safe to expose; used at build time). */
  readonly PUBLIC_SANITY_PROJECT_ID?: string;
  /** Dataset name, usually `production`. */
  readonly PUBLIC_SANITY_DATASET?: string;
  /** Optional read token for private datasets or draft perspective (GitHub Actions secret). */
  readonly SANITY_READ_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
