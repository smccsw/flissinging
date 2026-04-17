import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isDesktop(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function initScrollStory() {
  if (typeof window === "undefined") return;

  // Only animate on desktop and when motion is allowed.
  if (prefersReducedMotion() || !isDesktop()) return;

  gsap.registerPlugin(ScrollTrigger);

  const root = document.querySelector<HTMLElement>("[data-scrollstory-root]");
  if (!root) return;

  const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-scrollstory-panel]"));
  if (panels.length < 2) return;

  // Ensure base state
  gsap.set(panels, { opacity: 0, y: 16 });
  gsap.set(panels[0], { opacity: 1, y: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: `+=${panels.length * 700}`,
      scrub: true,
      pin: true
    }
  });

  panels.forEach((panel, idx) => {
    const at = idx * 1;
    // Fade in current
    tl.to(panel, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, at);
    // Fade out previous
    if (idx > 0) {
      tl.to(panels[idx - 1], { opacity: 0, y: -16, duration: 0.5, ease: "power2.in" }, at);
    }
  });
}

