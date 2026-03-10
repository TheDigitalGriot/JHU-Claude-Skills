import type { StepV2, StepTransition, TransitionDefaults, GraphType } from "../types.js";

export const INTERSTITIAL_VELOCITY_THRESHOLD = 200; // px/s

const DEFAULT_TRANSITIONS: TransitionDefaults = {
  morph: "interpolate",
  duration: 800,
  easing: "power2.inOut",
};

export type TransitionDecision =
  | { type: "data-morph"; transition: StepTransition }
  | { type: "chart-type-change"; transition: StepTransition }
  | { type: "interstitial"; transition: StepTransition }
  | { type: "none" };

/**
 * Decide how to transition between two steps.
 * @param payloadGraphType — the payload-level graph.type, used as fallback when step omits graphType
 */
export function decideTransition(
  fromStep: StepV2 | null,
  toStep: StepV2,
  scrollDirection: "forward" | "backward",
  scrollVelocity: number,
  payloadGraphType: GraphType,
  defaults?: TransitionDefaults,
): TransitionDecision {
  const d = defaults ?? DEFAULT_TRANSITIONS;

  const transition: StepTransition = {
    morph: toStep.transition?.morph ?? d.morph,
    duration: toStep.transition?.duration ?? d.duration,
    easing: toStep.transition?.easing ?? d.easing,
    delay: toStep.transition?.delay,
  };

  // Interstitial: only on forward scroll at low velocity
  if (
    toStep.interstitial &&
    scrollDirection === "forward" &&
    scrollVelocity < INTERSTITIAL_VELOCITY_THRESHOLD
  ) {
    return { type: "interstitial", transition };
  }

  if (!fromStep) {
    return { type: "data-morph", transition };
  }

  // Determine chart types — fall back to payload-level graph.type, not hardcoded
  const fromType = fromStep.graphType ?? payloadGraphType;
  const toType = toStep.graphType ?? payloadGraphType;

  if (fromType !== toType) {
    return { type: "chart-type-change", transition };
  }

  return { type: "data-morph", transition };
}

/**
 * Resolve the effective GraphType for a step.
 * Falls back to the payload-level graph.type.
 */
export function getStepGraphType(step: StepV2, fallback: GraphType): GraphType {
  return step.graphType ?? fallback;
}
