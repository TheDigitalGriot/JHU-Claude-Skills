import gsap from "gsap";
import { getAnnotationColor } from "../types.js";
import type { Annotation } from "../types.js";

/**
 * Highlight specific annotations in the formula bar, dimming all others.
 */
export function highlightAnnotations(
  highlightIds: string[],
  allAnnotations: Annotation[],
): void {
  const formulaDisplay = document.getElementById("formula-display")!;

  for (let i = 0; i < allAnnotations.length; i++) {
    const annotation = allAnnotations[i];
    const elements = formulaDisplay.querySelectorAll(
      `[data-annotation-id="${annotation.id}"]`,
    );
    const isActive = highlightIds.includes(annotation.id);
    const color = getAnnotationColor(i);

    elements.forEach((el) => {
      gsap.to(el, {
        opacity: isActive ? 1 : 0.4,
        scale: isActive ? 1.05 : 1,
        duration: 0.3,
        ease: "power2.out",
        overwrite: true,
      });

      if (isActive) {
        (el as HTMLElement).style.filter = `drop-shadow(0 0 6px ${color})`;
        el.classList.add("active");
        el.classList.remove("inactive");
      } else {
        (el as HTMLElement).style.filter = "none";
        el.classList.add("inactive");
        el.classList.remove("active");
      }
    });
  }
}

/**
 * Reset all annotations to full opacity (no highlights).
 */
export function clearHighlights(allAnnotations: Annotation[]): void {
  const formulaDisplay = document.getElementById("formula-display")!;

  for (const annotation of allAnnotations) {
    const elements = formulaDisplay.querySelectorAll(
      `[data-annotation-id="${annotation.id}"]`,
    );
    elements.forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
        overwrite: true,
      });
      (el as HTMLElement).style.filter = "none";
      el.classList.remove("active", "inactive");
    });
  }
}
