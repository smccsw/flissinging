/**
 * Prefix a path with Astro `base` so internal links work on GitHub Pages
 * (e.g. base `/flissinging/` + `recordings` → `/flissinging/recordings`).
 */
export function sitePath(path: string): string {
  const base = import.meta.env.BASE_URL;
  if (!path || path === "/") return base;
  const trimmed = path.replace(/^\/+/, "");
  return `${base}${trimmed}`;
}
