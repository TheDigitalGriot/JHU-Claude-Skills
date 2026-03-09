import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";

import type { FormulaPayload } from "./types.js";
import { renderFormulaBar, updateParameterDisplay } from "./renderer/formula-bar.js";
import { renderSteps } from "./renderer/steps.js";
import { renderGraph } from "./renderer/graph.js";
import { renderSliders } from "./renderer/sliders.js";
import {
  initControls,
  updateControls,
  enableControls,
  setPlaying,
  startAutoPlay,
  stopAutoPlay,
} from "./renderer/controls.js";
import {
  setupTimeline,
  scrollToStep,
  getCurrentStep,
  teardownTimeline,
} from "./animation/timeline.js";
import { evaluateWithParameters } from "./eval/evaluator.js";

// State
let currentPayload: FormulaPayload | null = null;
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
 * Fully render a FormulaPayload into the UI.
 */
function renderPayload(payload: FormulaPayload): void {
  currentPayload = payload;

  // Header
  headerTitle.textContent = payload.formula.description;
  headerDescription.textContent = `Domain: ${payload.formula.domain}`;

  // Formula bar
  renderFormulaBar(payload.formula.latex, payload.annotations);

  // Steps
  stepCards = renderSteps(payload.steps);

  // Graph (initial state from first step)
  if (payload.steps.length > 0) {
    renderGraph(payload, payload.steps[0].graphState);
  }

  // Sliders
  parameterValues = renderSliders(payload.parameters, (values) => {
    parameterValues = values;
    updateParameterDisplay(payload.parameters, values);

    // Re-evaluate graph with new parameters
    if (currentPayload && currentPayload.steps.length > 0) {
      const currentStep = getCurrentStep();
      const updatedGraphState = evaluateWithParameters(
        currentPayload,
        values,
        currentPayload.steps[currentStep].graphState,
      );
      renderGraph(currentPayload, updatedGraphState);
    }
  });

  updateParameterDisplay(payload.parameters, parameterValues);

  // Enable controls
  enableControls();
  updateControls(0, payload.steps.length);

  // Set up scroll-driven timeline (after DOM is populated)
  requestAnimationFrame(() => {
    setupTimeline(stepCards, payload);
  });
}

// === MCP App Setup ===

const app = new App({ name: "Math Visualizer", version: "1.0.0" });

// Register handlers BEFORE connecting

app.onteardown = async () => {
  teardownTimeline();
  stopAutoPlay();
  return {};
};

app.ontoolinputpartial = (params) => {
  // Progressive rendering: show formula bar as soon as available
  const partial = params.arguments?.payload as Partial<FormulaPayload> | undefined;
  if (partial?.formula?.latex) {
    headerTitle.textContent = partial.formula.description ?? "Loading...";
    try {
      renderFormulaBar(partial.formula.latex, partial.annotations ?? []);
    } catch {
      // Partial KaTeX may fail — that's fine
    }
  }
};

app.ontoolinput = (params) => {
  const payload = params.arguments?.payload as FormulaPayload | undefined;
  if (payload) {
    renderPayload(payload);
  }
};

app.ontoolresult = (result: CallToolResult) => {
  // Handle updates from update_formula_parameters or re-invocations
  const payload = result.structuredContent as FormulaPayload | undefined;
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
    const next =
      direction === "next"
        ? Math.min(current + 1, currentPayload.steps.length - 1)
        : Math.max(current - 1, 0);
    scrollToStep(next, stepCards, currentPayload);
  },
  (playing) => {
    if (!currentPayload) return;
    if (playing) {
      startAutoPlay(() => {
        if (!currentPayload) return;
        const current = getCurrentStep();
        if (current >= currentPayload.steps.length - 1) {
          setPlaying(false);
          stopAutoPlay();
          return;
        }
        scrollToStep(current + 1, stepCards, currentPayload);
      });
    } else {
      stopAutoPlay();
    }
  },
);

// Connect to host
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
});
