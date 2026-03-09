import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import type { FormulaPayload } from "../types.js";
import { highlightAnnotations } from "./highlights.js";
import { renderGraph } from "../renderer/graph.js";
import { setActiveStep } from "../renderer/steps.js";
import { updateControls } from "../renderer/controls.js";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

let triggers: ScrollTrigger[] = [];
let currentStepIndex = 0;

export function getCurrentStep(): number {
  return currentStepIndex;
}

/**
 * Set up ScrollTrigger instances for each step card.
 * When a card scrolls into view, it activates the corresponding
 * formula highlights and graph state.
 */
export function setupTimeline(
  cards: HTMLElement[],
  payload: FormulaPayload,
): void {
  // Clean up previous triggers
  teardownTimeline();

  const scrollPanel = document.getElementById("scroll-panel")!;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    const trigger = ScrollTrigger.create({
      trigger: card,
      scroller: scrollPanel,
      start: "top center",
      end: "bottom center",
      onEnter: () => activateStep(i, cards, payload),
      onEnterBack: () => activateStep(i, cards, payload),
    });

    triggers.push(trigger);
  }

  // Activate the first step
  if (cards.length > 0) {
    activateStep(0, cards, payload);
  }
}

function activateStep(
  index: number,
  cards: HTMLElement[],
  payload: FormulaPayload,
): void {
  currentStepIndex = index;
  const step = payload.steps[index];

  // Update step card visual state
  setActiveStep(index, cards);

  // Update formula highlights
  highlightAnnotations(step.highlightIds, payload.annotations);

  // Update graph
  renderGraph(payload, step.graphState);

  // Update controls bar
  updateControls(index, payload.steps.length);
}

/**
 * Programmatically scroll to a specific step.
 * Used by prev/next/play buttons.
 */
export function scrollToStep(
  index: number,
  cards: HTMLElement[],
  payload: FormulaPayload,
): void {
  if (index < 0 || index >= cards.length) return;

  const scrollPanel = document.getElementById("scroll-panel")!;

  gsap.to(scrollPanel, {
    scrollTo: { y: cards[index], offsetY: scrollPanel.clientHeight / 3 },
    duration: 0.5,
    ease: "power2.inOut",
  });

  activateStep(index, cards, payload);
}

/**
 * Clean up all ScrollTrigger instances.
 */
export function teardownTimeline(): void {
  for (const trigger of triggers) {
    trigger.kill();
  }
  triggers = [];
  currentStepIndex = 0;
}
