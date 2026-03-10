import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";

import type { FormulaPayloadV2 } from "./types.js";
import { renderFormulaBar, updateParameterDisplay } from "./renderer/formula-bar.js";
import { renderSteps } from "./renderer/steps.js";
import { renderSliders } from "./renderer/sliders.js";
import {
  initControls,
  setPlaying,
  startAutoPlay,
  stopAutoPlay,
} from "./renderer/controls.js";
import { evaluateWithParameters } from "./eval/evaluator.js";
import { registerAllRenderers } from "./chart/renderers/index.js";
import { registerAllPrimitives } from "./scene/primitives/index.js";
import {
  initStage,
  handlePartialPayload,
  handleFullPayload,
  navigateToStep,
  canAdjustSliders,
  updateChartForParameters,
  teardownStage,
  getCurrentStep,
  getState,
} from "./stage/manager.js";
import { getStepGraphType } from "./stage/transition-manager.js";

// State
let currentPayload: FormulaPayloadV2 | null = null;
let stepCards: HTMLElement[] = [];
let parameterValues: Record<string, number> = {};

// DOM
const headerTitle = document.getElementById("formula-title")!;
const headerDescription = document.getElementById("formula-description")!;

function handleHostContextChanged(ctx: McpUiHostContext) {
  const mainEl = document.querySelector(".main") as HTMLElement;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

/**
 * Fully render a FormulaPayloadV2 into the UI.
 */
async function renderPayload(payload: FormulaPayloadV2): Promise<void> {
  currentPayload = payload;

  // Header
  headerTitle.textContent = payload.formula.description;
  headerDescription.textContent = `Domain: ${payload.formula.domain}`;

  // Formula bar
  renderFormulaBar(payload.formula.latex, payload.annotations);

  // Steps
  stepCards = renderSteps(payload.steps);

  // Sliders
  parameterValues = renderSliders(payload.parameters, (values) => {
    if (!canAdjustSliders()) return;
    parameterValues = values;
    updateParameterDisplay(payload.parameters, values);

    if (currentPayload && currentPayload.steps.length > 0) {
      const currentStep = getCurrentStep();
      const step = currentPayload.steps[currentStep];
      const graphType = getStepGraphType(step, currentPayload.graph.type);
      const updatedGraphState = evaluateWithParameters(
        currentPayload,
        values,
        step.graphState,
      );
      updateChartForParameters(graphType, updatedGraphState, currentPayload.graph.config);
    }
  });

  updateParameterDisplay(payload.parameters, parameterValues);

  // Hand off to stage manager for the reveal sequence
  await handleFullPayload(payload, stepCards);
}

// === MCP App Setup ===

const app = new App({ name: "Math Visualizer", version: "1.0.0" });

// Register handlers BEFORE connecting

app.onteardown = async () => {
  teardownStage();
  stopAutoPlay();
  return {};
};

app.ontoolinputpartial = (params) => {
  const partial = params.arguments?.payload as Partial<FormulaPayloadV2> | undefined;
  if (partial?.formula?.latex) {
    headerTitle.textContent = partial.formula.description ?? "Loading...";
    try {
      renderFormulaBar(partial.formula.latex, partial.annotations ?? []);
    } catch { /* Partial KaTeX may fail */ }
  }
  // Feed partial to stage manager for loading scene
  if (partial) {
    handlePartialPayload(partial);
  }
};

app.ontoolinput = (params) => {
  const payload = params.arguments?.payload as FormulaPayloadV2 | undefined;
  if (payload) {
    renderPayload(payload);
  }
};

app.ontoolresult = (result: CallToolResult) => {
  // Handle updates from update_formula_parameters or re-invocations
  const payload = result.structuredContent as FormulaPayloadV2 | undefined;
  if (payload?.formula) {
    renderPayload(payload);
  }
};

app.ontoolcancelled = () => {
  headerTitle.textContent = "Cancelled";
};

app.onerror = console.error;

app.onhostcontextchanged = handleHostContextChanged;

// Navigation controls
initControls(
  (direction) => {
    if (!currentPayload) return;
    const current = getCurrentStep();
    const next = direction === "next"
      ? Math.min(current + 1, currentPayload.steps.length - 1)
      : Math.max(current - 1, 0);
    navigateToStep(next);
  },
  (playing) => {
    if (!currentPayload) return;
    if (playing) {
      startAutoPlay(() => {
        if (!currentPayload) return;
        // Pause autoplay ticks while an interstitial is playing
        if (getState() === "interstitial") return;
        const current = getCurrentStep();
        if (current >= currentPayload.steps.length - 1) {
          setPlaying(false);
          stopAutoPlay();
          return;
        }
        navigateToStep(current + 1);
      });
    } else {
      stopAutoPlay();
    }
  },
);

// Register all chart renderers and scene primitives
registerAllRenderers();
registerAllPrimitives();

// Initialize the stage manager
const graphContainer = document.getElementById("graph-container")!;
const scrollPanel = document.getElementById("scroll-panel")!;
initStage(graphContainer, scrollPanel);

// Connect to host
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
});
