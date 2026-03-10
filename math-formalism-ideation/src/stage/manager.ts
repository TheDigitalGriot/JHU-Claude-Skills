import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import type {
  FormulaPayloadV2,
  StepV2,
  StageState,
  GraphType,
  MathDomain,
} from "../types.js";
import {
  initChartEngine,
  renderChart,
  enterFromHandoff,
  exitChart,
  teardownChartEngine,
  getSvgElement,
} from "../chart/engine.js";
import {
  playScene,
  playLoopingScene,
  stopScene,
  exitScene,
  cleanupAfterHandoff,
} from "../scene/engine.js";
import { decideTransition, getStepGraphType, type TransitionDecision } from "./transition-manager.js";
import { highlightAnnotations } from "../animation/highlights.js";
import { setActiveStep } from "../renderer/steps.js";
import { updateControls, disableControls, enableControls } from "../renderer/controls.js";
import { generalLoadingScene } from "../scene/presets/general.js";
import { statisticsLoadingScene } from "../scene/presets/statistics.js";
import { financeLoadingScene } from "../scene/presets/finance.js";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// ─── State ───

let state: StageState = "loading";
let currentPayload: FormulaPayloadV2 | null = null;
let currentStepIndex = 0;
let stepCards: HTMLElement[] = [];
let triggers: ScrollTrigger[] = [];
let lastScrollTime = 0;
let lastScrollY = 0;

// ─── DOM Refs ───

let graphContainer: HTMLElement | null = null;
let scrollPanel: HTMLElement | null = null;

// ─── Public API ───

export function getState(): StageState {
  return state;
}

export function getCurrentStep(): number {
  return currentStepIndex;
}

/**
 * Initialize the stage manager with DOM references.
 */
export function initStage(
  _graphContainer: HTMLElement,
  _scrollPanel: HTMLElement,
): void {
  graphContainer = _graphContainer;
  scrollPanel = _scrollPanel;
  initChartEngine(graphContainer);
}

/**
 * Handle partial payload during loading (progressive rendering).
 * If a loadingScene is available, play it. Otherwise use domain fallback.
 */
export function handlePartialPayload(partial: Partial<FormulaPayloadV2>): void {
  if (state !== "loading") return;

  const svgEl = getSvgElement();
  if (!svgEl) return;

  const scene = partial.loadingScene ?? getDomainFallbackScene(partial.formula?.domain);
  if (scene) {
    playLoopingScene(svgEl, scene);
  }
}

/**
 * Handle full payload arrival — trigger the reveal sequence.
 */
export async function handleFullPayload(
  payload: FormulaPayloadV2,
  cards: HTMLElement[],
): Promise<void> {
  currentPayload = payload;
  stepCards = cards;
  currentStepIndex = 0;

  // Phase 2: REVEALING
  state = "revealing";
  disableControls();

  const svgEl = getSvgElement();
  if (!svgEl) return;

  // Exit the loading scene (elements get tagged for handoff)
  await exitScene(400);

  // Determine first step's chart type
  const firstStep = payload.steps[0];
  if (!firstStep) return;

  const graphType = getStepGraphType(firstStep, payload.graph.type);

  // Morph scene elements into the first chart
  enterFromHandoff(
    graphType,
    firstStep.graphState,
    payload.graph.config,
    1200,
    "power2.inOut",
  );

  // Clean up remaining scene elements after handoff animation
  setTimeout(() => {
    cleanupAfterHandoff();
  }, 1300);

  // Wait for reveal animation, then go interactive
  setTimeout(() => {
    state = "interactive";
    enableControls();
    updateControls(0, payload.steps.length);
    highlightAnnotations(firstStep.highlightIds ?? [], payload.annotations);
    setupScrollTriggers();
  }, 1500);
}

/**
 * Navigate to a specific step (from controls or autoplay).
 */
export function navigateToStep(index: number): void {
  if (!currentPayload || index < 0 || index >= currentPayload.steps.length) return;
  if (state === "interstitial") return; // locked during interstitial

  const scrollDir = index > currentStepIndex ? "forward" : "backward";

  // Scroll the panel
  if (scrollPanel && stepCards[index]) {
    gsap.to(scrollPanel, {
      scrollTo: { y: stepCards[index], offsetY: scrollPanel.clientHeight / 3 },
      duration: 0.5,
      ease: "power2.inOut",
    });
  }

  activateStep(index, scrollDir, 0);
}

/**
 * Check if the stage is accepting slider input.
 */
export function canAdjustSliders(): boolean {
  return state === "interactive";
}

/**
 * Update the chart for a parameter change (no interstitial).
 */
export function updateChartForParameters(
  graphType: GraphType,
  graphState: import("../types.js").GraphState,
  config: Record<string, unknown>,
): void {
  if (state !== "interactive") return;
  renderChart(graphType, graphState, config, { morph: "interpolate", duration: 200 });
}

/**
 * Clean up everything.
 */
export function teardownStage(): void {
  teardownScrollTriggers();
  stopScene();
  teardownChartEngine();
  state = "loading";
  currentPayload = null;
  currentStepIndex = 0;
  stepCards = [];
}

// ─── Internal: Step Activation ───

async function activateStep(
  index: number,
  scrollDirection: "forward" | "backward",
  scrollVelocity: number,
): Promise<void> {
  if (!currentPayload) return;

  const fromStep = currentStepIndex >= 0 ? currentPayload.steps[currentStepIndex] : null;
  const toStep = currentPayload.steps[index];
  if (!toStep) return;

  const decision = decideTransition(
    fromStep,
    toStep,
    scrollDirection,
    scrollVelocity,
    currentPayload.graph.type,
    currentPayload.transitions,
  );

  currentStepIndex = index;

  // Update left panel
  setActiveStep(index, stepCards);
  highlightAnnotations(toStep.highlightIds ?? [], currentPayload.annotations);
  updateControls(index, currentPayload.steps.length);

  // Execute the transition
  await executeTransition(decision, toStep);
}

async function executeTransition(
  decision: TransitionDecision,
  toStep: StepV2,
): Promise<void> {
  if (!currentPayload) return;

  const graphType = getStepGraphType(toStep, currentPayload.graph.type);
  const config = currentPayload.graph.config;

  switch (decision.type) {
    case "data-morph":
    case "chart-type-change":
      renderChart(graphType, toStep.graphState, config, decision.transition);
      break;

    case "interstitial": {
      state = "interstitial";
      disableControls();

      const svgEl = getSvgElement();
      if (!svgEl || !toStep.interstitial) {
        // Fallback: just render chart
        state = "interactive";
        enableControls();
        renderChart(graphType, toStep.graphState, config, decision.transition);
        return;
      }

      // Exit current chart
      exitChart(400);

      // Play interstitial scene
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          playScene(svgEl, toStep.interstitial!, () => {
            resolve();
          });
        }, 450);
      });

      // Exit scene and morph into chart
      await exitScene(300);
      enterFromHandoff(graphType, toStep.graphState, config, decision.transition.duration, decision.transition.easing);

      setTimeout(() => {
        cleanupAfterHandoff();
        state = "interactive";
        enableControls();
      }, (decision.transition.duration ?? 800) + 100);

      break;
    }

    case "none":
      break;
  }
}

// ─── Internal: Scroll Triggers ───

function setupScrollTriggers(): void {
  teardownScrollTriggers();
  if (!scrollPanel || stepCards.length === 0) return;

  for (let i = 0; i < stepCards.length; i++) {
    const trigger = ScrollTrigger.create({
      trigger: stepCards[i],
      scroller: scrollPanel,
      start: "top center",
      end: "bottom center",
      onEnter: () => {
        const now = Date.now();
        const velocity = computeScrollVelocity(now);
        activateStep(i, "forward", velocity);
      },
      onEnterBack: () => {
        const now = Date.now();
        const velocity = computeScrollVelocity(now);
        activateStep(i, "backward", velocity);
      },
    });
    triggers.push(trigger);
  }
}

function teardownScrollTriggers(): void {
  for (const trigger of triggers) {
    trigger.kill();
  }
  triggers = [];
}

function computeScrollVelocity(now: number): number {
  if (!scrollPanel) return 0;
  const dt = (now - lastScrollTime) / 1000;
  const dy = Math.abs(scrollPanel.scrollTop - lastScrollY);
  lastScrollTime = now;
  lastScrollY = scrollPanel.scrollTop;
  return dt > 0 ? dy / dt : 0;
}

// ─── Internal: Domain Fallback Scenes ───

function getDomainFallbackScene(domain?: MathDomain | string): import("../types.js").SceneDirective {
  switch (domain) {
    case "statistics": return statisticsLoadingScene;
    case "finance": return financeLoadingScene;
    default: return generalLoadingScene;
  }
}
