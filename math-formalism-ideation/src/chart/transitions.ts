import * as d3 from "d3";

/**
 * Map GSAP ease strings to D3 easing functions.
 * Falls back to d3.easeCubicInOut for unknown strings.
 */
const EASE_MAP: Record<string, (t: number) => number> = {
  "power1.inOut": d3.easeQuadInOut,
  "power2.inOut": d3.easeCubicInOut,
  "power3.inOut": d3.easePolyInOut.exponent(4),
  "power2.out": d3.easeCubicOut,
  "sine.inOut": d3.easeSinInOut,
  "linear": d3.easeLinear,
};

export function getD3Ease(gsapEase: string): (t: number) => number {
  return EASE_MAP[gsapEase] ?? d3.easeCubicInOut;
}

export const DEFAULT_DURATION = 800;
export const DEFAULT_EASING = "power2.inOut";

/**
 * Create a D3 transition on a selection with spec-driven config.
 */
export function createTransition(
  selection: d3.Selection<any, any, any, any>,
  duration: number = DEFAULT_DURATION,
  easing: string = DEFAULT_EASING,
): d3.Transition<any, any, any, any> {
  return selection.transition()
    .duration(duration)
    .ease(getD3Ease(easing));
}
