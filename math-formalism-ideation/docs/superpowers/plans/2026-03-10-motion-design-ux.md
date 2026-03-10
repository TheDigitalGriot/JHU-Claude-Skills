# Motion Design & UX Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Observable Plot with D3 for data-morphing chart transitions, build a scene composition engine for interstitial animations, and implement a stage manager with a 3-phase loading flow.

**Architecture:** Four systems — D3 Chart Engine (renders charts), Scene Composition Engine (renders interstitials), Stage Manager (controls right panel state), Transition Manager (decides what to animate). All render to a shared SVG canvas in the right panel. GSAP drives scene animations, D3 drives chart transitions.

**Tech Stack:** TypeScript, D3.js v7, GSAP 3.14 (ScrollTrigger, ScrollToPlugin, Flip), KaTeX, mathjs, Vite

**Spec:** `docs/superpowers/specs/2026-03-10-motion-design-ux-design.md`

---

## File Structure

### New files
```
src/
├── types.ts                  // MODIFY: add StepV2, SceneDirective, VisualHint, StepTransition, TransitionDefaults, StageState
├── chart/
│   ├── engine.ts             // D3 chart orchestrator — manages persistent SVG, delegates to renderers
│   ├── renderers/
│   │   ├── function-plot.ts  // line/area (d3.line, d3.area) with enter/update/exit
│   │   ├── distribution.ts   // area + line overlay
│   │   ├── scatter.ts        // circle elements
│   │   ├── bar.ts            // rect elements
│   │   └── vector-field.ts   // arrow/vector marks
│   └── transitions.ts        // D3 interpolation helpers, easing mapping (GSAP ease → D3 ease)
├── scene/
│   ├── engine.ts             // Scene compositor — takes SceneDirective, builds GSAP timeline on SVG
│   ├── primitives/
│   │   ├── particles.ts      // particles-scatter, particles-cluster
│   │   ├── classify.ts       // split-classify, outlier-isolate
│   │   ├── shapes.ts         // bell-curve-form, confidence-band, axis-scale
│   │   ├── grids.ts          // matrix-grid, heatmap-pulse, tree-partition
│   │   ├── arrows.ts         // flow-arrows
│   │   └── icons.ts          // icon-flow
│   └── presets/
│       ├── statistics.ts     // default loading scenes for statistics domain
│       ├── finance.ts        // default loading scenes for finance domain
│       └── general.ts        // fallback loading scene
├── stage/
│   ├── manager.ts            // Stage state machine (LOADING/REVEALING/INTERACTIVE/INTERSTITIAL)
│   └── transition-manager.ts // Decides: data morph vs chart-type change vs interstitial
```

### Modified files
```
src/types.ts                  // Add new interfaces
src/mcp-app.ts                // Rewire to use stage manager instead of direct renderGraph calls
src/renderer/steps.ts         // Handle optional algebraDetail/highlightIds
src/renderer/controls.ts      // Disable during INTERSTITIAL, pause autoplay
src/renderer/sliders.ts       // Disable/enable based on stage state
src/global.css                // Stage states, disabled slider styles, interstitial narrative
mcp-app.html                  // Add narrative overlay element to sticky-panel
```

### Removed
```
src/renderer/graph.ts         // Replaced by src/chart/engine.ts + renderers
src/animation/timeline.ts     // Replaced by src/stage/manager.ts + transition-manager.ts
```

### Dependencies
```
ADD:    d3 @types/d3
REMOVE: @observablehq/plot
```

---

## Chunk 1: Foundation — Types, Dependencies, D3 Chart Engine

### Task 1: Install Dependencies and Update Types

**Files:**
- Modify: `package.json`
- Modify: `src/types.ts`

- [ ] **Step 1: Install D3, remove Observable Plot**

```bash
cd c:/Users/digit/Developer/jhu-claude-skills/math-formalism-ideation
npm install d3
npm install -D @types/d3
npm uninstall @observablehq/plot
```

- [ ] **Step 2: Add new interfaces to types.ts**

Add after the existing `FormulaPayload` interface in `src/types.ts`:

```typescript
// ─── Scene Composition Types ───

export type SceneType = "scene-setter" | "explainer";

export type SceneMood = "dramatic" | "calm" | "urgent" | "analytical";

export type PrimitiveType =
  | "particles-scatter"
  | "particles-cluster"
  | "tree-partition"
  | "flow-arrows"
  | "bell-curve-form"
  | "split-classify"
  | "heatmap-pulse"
  | "axis-scale"
  | "icon-flow"
  | "outlier-isolate"
  | "confidence-band"
  | "matrix-grid";

export interface VisualHint {
  primitive: PrimitiveType;
  config?: {
    count?: number;
    color?: string;
    labels?: string[];
    delay?: number;
    [key: string]: unknown;
  };
}

export interface SceneDirective {
  type: SceneType;
  narrative: string;
  visualHints: VisualHint[];
  duration?: number;
  mood?: SceneMood;
}

// ─── Transition Types ───

export type MorphType = "interpolate" | "crossfade" | "stagger-enter" | "none";

export interface StepTransition {
  morph: MorphType;
  duration?: number;
  easing?: string;
  delay?: number;
}

export interface TransitionDefaults {
  morph: MorphType;
  duration: number;
  easing: string;
}

// ─── Stage Types ───

export type StageState = "loading" | "revealing" | "interactive" | "interstitial";

// ─── Extended Step ───

export interface StepV2 {
  id: string;
  title: string;
  narrative: string;
  algebraDetail?: string;
  highlightIds?: string[];
  graphType?: GraphType;
  graphState: GraphState;
  interstitial?: SceneDirective;
  transition?: StepTransition;
}

// ─── Extended Payload ───

export interface FormulaPayloadV2 extends Omit<FormulaPayload, "steps"> {
  steps: StepV2[];
  loadingScene?: SceneDirective;
  transitions?: TransitionDefaults;
}
```

- [ ] **Step 3: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: No new errors (existing code still uses old types).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/types.ts
git commit -m "feat: add motion design types and swap d3 for observable plot"
```

---

### Task 2: D3 Chart Engine — Core Orchestrator

**Files:**
- Create: `src/chart/engine.ts`
- Create: `src/chart/transitions.ts`

- [ ] **Step 1: Create transitions.ts — easing and interpolation helpers**

Create `src/chart/transitions.ts`:

```typescript
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
```

- [ ] **Step 2: Create engine.ts — the chart orchestrator**

Create `src/chart/engine.ts`:

```typescript
import * as d3 from "d3";
import type { GraphType, GraphState, StepTransition, FormulaPayloadV2 } from "../types.js";
import { getAnnotationColor } from "../types.js";
import { createTransition, DEFAULT_DURATION, DEFAULT_EASING } from "./transitions.js";

// ─── Renderer Interface ───

export interface ChartRenderer {
  enter(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: Record<string, unknown>[],
    graphState: GraphState,
    config: Record<string, unknown>,
  ): void;

  update(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: Record<string, unknown>[],
    graphState: GraphState,
    config: Record<string, unknown>,
    transition: d3.Transition<any, any, any, any>,
  ): void;

  exit(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    transition: d3.Transition<any, any, any, any>,
  ): void;
}

// ─── Registry ───

const renderers = new Map<GraphType, ChartRenderer>();

export function registerRenderer(type: GraphType, renderer: ChartRenderer): void {
  renderers.set(type, renderer);
}

// ─── Engine State ───

let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
let marksGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
let axesGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
let highlightsGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
let currentType: GraphType | null = null;
let currentRenderer: ChartRenderer | null = null;

/**
 * Initialize the D3 chart engine on a container element.
 * Creates the persistent SVG and layer groups.
 */
export function initChartEngine(container: HTMLElement): void {
  // Clear any previous content
  d3.select(container).selectAll("*").remove();

  const width = container.clientWidth;
  const height = Math.max(300, container.clientHeight);

  svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background", "transparent");

  // Layer order: axes (back) → marks → highlights (front)
  axesGroup = svg.append("g").attr("class", "chart-axes");
  marksGroup = svg.append("g").attr("class", "chart-marks");
  highlightsGroup = svg.append("g").attr("class", "chart-highlights");
}

/**
 * Get the raw SVG element (for scene engine handoff).
 */
export function getSvgElement(): SVGSVGElement | null {
  return svg?.node() ?? null;
}

/**
 * Get the SVG selection (for scene engine handoff).
 */
export function getSvgSelection(): d3.Selection<SVGSVGElement, unknown, null, undefined> | null {
  return svg;
}

/**
 * Resize the SVG to match its container.
 */
export function resizeChart(container: HTMLElement): void {
  if (!svg) return;
  const width = container.clientWidth;
  const height = Math.max(300, container.clientHeight);
  svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);
}

/**
 * Render or transition to a new chart state.
 */
export function renderChart(
  graphType: GraphType,
  graphState: GraphState,
  config: Record<string, unknown>,
  stepTransition?: StepTransition,
): void {
  if (!svg || !marksGroup || !axesGroup) return;

  const renderer = renderers.get(graphType);
  if (!renderer) {
    console.warn(`No renderer registered for graph type: ${graphType}`);
    return;
  }

  const duration = stepTransition?.duration ?? DEFAULT_DURATION;
  const easing = stepTransition?.easing ?? DEFAULT_EASING;

  // Render axes
  renderAxes(graphState, duration, easing);

  // Same type → update (morph)
  if (currentType === graphType && currentRenderer === renderer) {
    const t = createTransition(marksGroup, duration, easing);
    renderer.update(marksGroup, graphState.data, graphState, config, t);
  } else {
    // Different type → exit old, enter new
    if (currentRenderer) {
      const exitT = createTransition(marksGroup, duration / 2, easing);
      currentRenderer.exit(marksGroup, exitT);
    }

    // Clear marks group after exit transition completes
    const delay = currentRenderer ? duration / 2 : 0;
    setTimeout(() => {
      if (!marksGroup) return;
      marksGroup.selectAll("*").remove();
      renderer.enter(marksGroup, graphState.data, graphState, config);
    }, delay);
  }

  // Render highlight regions
  renderHighlights(graphState, config);

  currentType = graphType;
  currentRenderer = renderer;
}

/**
 * Enter chart from a scene handoff.
 * Adopts tagged SVG elements and transitions them to data positions.
 * Implements the mismatch strategy from the spec:
 *  - If scene has fewer elements than data needs → new elements created at centroid of handoff elements
 *  - If scene has more → excess fade out during transition
 *  - Target count always comes from graphState.data.length
 */
export function enterFromHandoff(
  graphType: GraphType,
  graphState: GraphState,
  config: Record<string, unknown>,
  duration: number = DEFAULT_DURATION,
  easing: string = DEFAULT_EASING,
): void {
  if (!svg || !marksGroup) return;

  const renderer = renderers.get(graphType);
  if (!renderer) return;

  // Render axes with animation
  renderAxes(graphState, duration, easing);

  // Collect handoff elements from the scene engine
  const handoffElements = svg.selectAll<SVGElement, unknown>("[data-handoff='true']");
  const handoffNodes: SVGElement[] = [];

  handoffElements.each(function () {
    handoffNodes.push(this as SVGElement);
    marksGroup!.node()!.appendChild(this as Node);
  });

  const targetCount = graphState.data.length;
  const handoffCount = handoffNodes.length;

  // Compute centroid of handoff elements for spawning new ones
  let centroidX = 0;
  let centroidY = 0;
  if (handoffCount > 0) {
    for (const el of handoffNodes) {
      const cx = parseFloat(el.getAttribute("cx") ?? el.getAttribute("x") ?? "0");
      const cy = parseFloat(el.getAttribute("cy") ?? el.getAttribute("y") ?? "0");
      centroidX += cx;
      centroidY += cy;
    }
    centroidX /= handoffCount;
    centroidY /= handoffCount;
  }

  // Mismatch: create additional elements at centroid if needed
  if (handoffCount < targetCount) {
    const ns = "http://www.w3.org/2000/svg";
    for (let i = handoffCount; i < targetCount; i++) {
      const el = document.createElementNS(ns, "circle");
      el.setAttribute("cx", String(centroidX));
      el.setAttribute("cy", String(centroidY));
      el.setAttribute("r", "2");
      el.setAttribute("fill", "var(--color-ring-primary)");
      el.setAttribute("opacity", "0.3");
      el.setAttribute("data-handoff", "true");
      marksGroup.node()!.appendChild(el);
    }
  }

  // Mismatch: fade out excess elements
  if (handoffCount > targetCount) {
    const t = createTransition(d3.selectAll(handoffNodes.slice(targetCount)), duration, easing);
    t.style("opacity", 0).remove();
  }

  // Now clear handoff attributes and let renderer enter with fresh elements.
  // The handoff elements serve as visual continuity — they'll be replaced by
  // the renderer's enter() but the overlap creates the morph illusion.
  const fadeT = createTransition(marksGroup.selectAll("[data-handoff]"), duration * 0.4, easing);
  fadeT.style("opacity", 0).remove();

  // Delayed enter of actual chart elements (starts as handoff elements fade)
  setTimeout(() => {
    if (!marksGroup) return;
    renderer.enter(marksGroup, graphState.data, graphState, config);
  }, duration * 0.2);

  currentType = graphType;
  currentRenderer = renderer;
}

/**
 * Exit the current chart (for interstitial takeover).
 */
export function exitChart(duration: number = 400, easing: string = DEFAULT_EASING): void {
  if (!marksGroup || !currentRenderer) return;
  const t = createTransition(marksGroup, duration, easing);
  currentRenderer.exit(marksGroup, t);

  // Fade axes
  if (axesGroup) {
    createTransition(axesGroup, duration, easing)
      .style("opacity", 0);
  }
  if (highlightsGroup) {
    createTransition(highlightsGroup, duration, easing)
      .style("opacity", 0);
  }

  currentType = null;
  currentRenderer = null;
}

/**
 * Tear down the chart engine completely.
 */
export function teardownChartEngine(): void {
  if (svg) {
    svg.remove();
    svg = null;
  }
  marksGroup = null;
  axesGroup = null;
  highlightsGroup = null;
  currentType = null;
  currentRenderer = null;
}

// ─── Internal: Axes ───

function renderAxes(
  graphState: GraphState,
  duration: number,
  easing: string,
): void {
  if (!axesGroup || !svg) return;

  axesGroup.style("opacity", 1);

  const svgNode = svg.node()!;
  const width = svgNode.clientWidth || parseInt(svg.attr("width"));
  const height = svgNode.clientHeight || parseInt(svg.attr("height"));
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };

  const xDomain = graphState.axes?.x?.domain ?? [0, 1];
  const yDomain = graphState.axes?.y?.domain ?? [0, 1];

  const xScale = d3.scaleLinear()
    .domain(xDomain)
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain(yDomain)
    .range([height - margin.bottom, margin.top]);

  // X axis
  let xAxisG = axesGroup.select<SVGGElement>(".x-axis");
  if (xAxisG.empty()) {
    xAxisG = axesGroup.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`);
  }
  const xAxisT = createTransition(xAxisG, duration, easing);
  (xAxisG as any).transition(xAxisT).call(d3.axisBottom(xScale));

  // Y axis
  let yAxisG = axesGroup.select<SVGGElement>(".y-axis");
  if (yAxisG.empty()) {
    yAxisG = axesGroup.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left},0)`);
  }
  const yAxisT = createTransition(yAxisG, duration, easing);
  (yAxisG as any).transition(yAxisT).call(d3.axisLeft(yScale));

  // Axis labels
  const xLabel = graphState.axes?.x?.label ?? "x";
  const yLabel = graphState.axes?.y?.label ?? "y";

  let xLabelEl = axesGroup.select<SVGTextElement>(".x-label");
  if (xLabelEl.empty()) {
    xLabelEl = axesGroup.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("fill", "var(--color-text-secondary)")
      .attr("font-size", "12px");
  }
  xLabelEl
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 4)
    .text(`${xLabel} →`);

  let yLabelEl = axesGroup.select<SVGTextElement>(".y-label");
  if (yLabelEl.empty()) {
    yLabelEl = axesGroup.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("fill", "var(--color-text-secondary)")
      .attr("font-size", "12px");
  }
  yLabelEl
    .attr("x", -(margin.top + height - margin.bottom) / 2)
    .attr("y", 14)
    .attr("transform", "rotate(-90)")
    .text(yLabel);

  // Grid lines
  let gridG = axesGroup.select<SVGGElement>(".grid");
  if (gridG.empty()) {
    gridG = axesGroup.append("g").attr("class", "grid");
  }

  const gridT = createTransition(gridG, duration, easing);

  // Horizontal grid
  const yTicks = yScale.ticks();
  const hLines = gridG.selectAll<SVGLineElement, number>(".grid-h").data(yTicks);
  hLines.enter()
    .append("line").attr("class", "grid-h")
    .attr("stroke", "var(--color-border)").attr("stroke-opacity", 0.3)
    .attr("x1", margin.left).attr("x2", width - margin.right)
    .attr("y1", d => yScale(d)).attr("y2", d => yScale(d));
  hLines.transition(gridT as any)
    .attr("y1", d => yScale(d)).attr("y2", d => yScale(d));
  hLines.exit().remove();

  // Vertical grid
  const xTicks = xScale.ticks();
  const vLines = gridG.selectAll<SVGLineElement, number>(".grid-v").data(xTicks);
  vLines.enter()
    .append("line").attr("class", "grid-v")
    .attr("stroke", "var(--color-border)").attr("stroke-opacity", 0.3)
    .attr("y1", margin.top).attr("y2", height - margin.bottom)
    .attr("x1", d => xScale(d)).attr("x2", d => xScale(d));
  vLines.transition(gridT as any)
    .attr("x1", d => xScale(d)).attr("x2", d => xScale(d));
  vLines.exit().remove();

  // Store scales on the SVG for renderers to access
  (svg as any).__scales = { x: xScale, y: yScale, margin };
}

// ─── Internal: Highlight Regions ───

function renderHighlights(
  graphState: GraphState,
  _config: Record<string, unknown>,
): void {
  if (!highlightsGroup) return;

  highlightsGroup.style("opacity", 1);

  const regions = graphState.highlightRegions ?? [];
  const dots = highlightsGroup.selectAll<SVGCircleElement, typeof regions[number]>(".highlight-dot")
    .data(regions.filter(r => r.type === "point"), d => d.annotationId);

  // Access scales stored by renderAxes
  const scales = (svg as any)?.__scales;
  if (!scales) return;

  dots.enter()
    .append("circle")
    .attr("class", "highlight-dot")
    .attr("r", 6)
    .attr("fill-opacity", 0.8)
    .merge(dots)
    .attr("cx", d => scales.x(d.coords.x ?? 0))
    .attr("cy", d => scales.y(d.coords.y ?? 0))
    .attr("fill", d => {
      const idx = parseInt(d.annotationId.replace(/\D/g, ""), 10) || 0;
      return getAnnotationColor(idx);
    });

  dots.exit().remove();
}

/**
 * Get the current scales (for renderers to use).
 */
export function getScales(): { x: d3.ScaleLinear<number, number>; y: d3.ScaleLinear<number, number>; margin: { top: number; right: number; bottom: number; left: number } } | null {
  return (svg as any)?.__scales ?? null;
}
```

- [ ] **Step 3: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: Clean compile for new files (existing graph.ts will still compile since Observable Plot is removed but the file isn't imported yet from the modified entry point).

- [ ] **Step 4: Commit**

```bash
git add src/chart/engine.ts src/chart/transitions.ts
git commit -m "feat: add D3 chart engine orchestrator and transition helpers"
```

---

### Task 3: D3 Chart Renderers

**Files:**
- Create: `src/chart/renderers/function-plot.ts`
- Create: `src/chart/renderers/distribution.ts`
- Create: `src/chart/renderers/scatter.ts`
- Create: `src/chart/renderers/bar.ts`
- Create: `src/chart/renderers/vector-field.ts`

- [ ] **Step 1: Create function-plot renderer**

Create `src/chart/renderers/function-plot.ts`:

```typescript
import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const functionPlotRenderer: ChartRenderer = {
  enter(svg, data, graphState, config) {
    const scales = getScales();
    if (!scales) return;

    const line = d3.line<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);

    const color = (config.color as string) ?? "var(--color-ring-primary)";

    svg.append("path")
      .datum(data)
      .attr("class", "line-path")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line)
      .attr("stroke-dasharray", function () {
        const length = (this as SVGPathElement).getTotalLength();
        return `${length} ${length}`;
      })
      .attr("stroke-dashoffset", function () {
        return (this as SVGPathElement).getTotalLength();
      })
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);
  },

  update(svg, data, graphState, config, transition) {
    const scales = getScales();
    if (!scales) return;

    const line = d3.line<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);

    svg.select<SVGPathElement>(".line-path")
      .datum(data)
      .transition(transition)
      .attr("d", line)
      .attr("stroke-dasharray", "none")
      .attr("stroke-dashoffset", 0);
  },

  exit(svg, transition) {
    svg.selectAll(".line-path")
      .transition(transition)
      .style("opacity", 0)
      .remove();
  },
};
```

- [ ] **Step 2: Create distribution renderer**

Create `src/chart/renderers/distribution.ts`:

```typescript
import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const distributionRenderer: ChartRenderer = {
  enter(svg, data, graphState, config) {
    const scales = getScales();
    if (!scales) return;

    const color = (config.color as string) ?? "var(--color-ring-primary)";

    // Area fill
    const area = d3.area<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y0(scales.y(0))
      .y1(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("class", "dist-area")
      .attr("fill", color)
      .attr("fill-opacity", 0)
      .attr("d", area)
      .transition().duration(600).ease(d3.easeCubicInOut)
      .attr("fill-opacity", 0.3);

    // Line stroke
    const line = d3.line<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("class", "dist-line")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line)
      .style("opacity", 0)
      .transition().duration(600).delay(200).ease(d3.easeCubicInOut)
      .style("opacity", 1);
  },

  update(svg, data, graphState, config, transition) {
    const scales = getScales();
    if (!scales) return;

    const area = d3.area<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y0(scales.y(0))
      .y1(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);

    const line = d3.line<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);

    svg.select<SVGPathElement>(".dist-area")
      .datum(data)
      .transition(transition)
      .attr("d", area);

    svg.select<SVGPathElement>(".dist-line")
      .datum(data)
      .transition(transition)
      .attr("d", line);
  },

  exit(svg, transition) {
    svg.selectAll(".dist-area, .dist-line")
      .transition(transition)
      .style("opacity", 0)
      .remove();
  },
};
```

- [ ] **Step 3: Create scatter renderer**

Create `src/chart/renderers/scatter.ts`:

```typescript
import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const scatterRenderer: ChartRenderer = {
  enter(svg, data, graphState, config) {
    const scales = getScales();
    if (!scales) return;

    const color = (config.color as string) ?? "var(--color-ring-primary)";

    svg.selectAll<SVGCircleElement, Record<string, unknown>>(".scatter-dot")
      .data(data, (d: any) => `${d.x}-${d.y}`)
      .enter()
      .append("circle")
      .attr("class", "scatter-dot")
      .attr("cx", d => scales.x(d.x as number))
      .attr("cy", d => scales.y(d.y as number))
      .attr("r", 0)
      .attr("fill", color)
      .attr("fill-opacity", 0.7)
      .transition()
      .duration(400)
      .delay((_, i) => i * 5)
      .ease(d3.easeBackOut)
      .attr("r", 3);
  },

  update(svg, data, graphState, config, transition) {
    const scales = getScales();
    if (!scales) return;

    const color = (config.color as string) ?? "var(--color-ring-primary)";

    const dots = svg.selectAll<SVGCircleElement, Record<string, unknown>>(".scatter-dot")
      .data(data, (d: any) => `${d.x}-${d.y}`);

    // Enter new dots
    dots.enter()
      .append("circle")
      .attr("class", "scatter-dot")
      .attr("cx", d => scales.x(d.x as number))
      .attr("cy", d => scales.y(d.y as number))
      .attr("r", 0)
      .attr("fill", color)
      .attr("fill-opacity", 0.7)
      .transition(transition)
      .attr("r", 3);

    // Update existing dots
    dots.transition(transition)
      .attr("cx", d => scales.x(d.x as number))
      .attr("cy", d => scales.y(d.y as number))
      .attr("fill", color);

    // Exit removed dots
    dots.exit()
      .transition(transition)
      .attr("r", 0)
      .remove();
  },

  exit(svg, transition) {
    svg.selectAll(".scatter-dot")
      .transition(transition)
      .attr("r", 0)
      .style("opacity", 0)
      .remove();
  },
};
```

- [ ] **Step 4: Create bar renderer**

Create `src/chart/renderers/bar.ts`:

```typescript
import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const barRenderer: ChartRenderer = {
  enter(svg, data, graphState, config) {
    const scales = getScales();
    if (!scales) return;

    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const categories = data.map(d => d.category as string);
    const bandwidth = (scales.x.range()[1] - scales.x.range()[0]) / Math.max(categories.length, 1) * 0.8;

    svg.selectAll<SVGRectElement, Record<string, unknown>>(".bar-rect")
      .data(data, (d: any) => d.category)
      .enter()
      .append("rect")
      .attr("class", "bar-rect")
      .attr("x", (_, i) => scales.x.range()[0] + i * (bandwidth / 0.8) + bandwidth * 0.1)
      .attr("y", scales.y(0))
      .attr("width", bandwidth)
      .attr("height", 0)
      .attr("fill", color)
      .attr("rx", 2)
      .transition()
      .duration(600)
      .delay((_, i) => i * 50)
      .ease(d3.easeCubicOut)
      .attr("y", d => scales.y(d.value as number))
      .attr("height", d => scales.y(0) - scales.y(d.value as number));
  },

  update(svg, data, graphState, config, transition) {
    const scales = getScales();
    if (!scales) return;

    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const bandwidth = (scales.x.range()[1] - scales.x.range()[0]) / Math.max(data.length, 1) * 0.8;

    const bars = svg.selectAll<SVGRectElement, Record<string, unknown>>(".bar-rect")
      .data(data, (d: any) => d.category);

    bars.enter()
      .append("rect")
      .attr("class", "bar-rect")
      .attr("x", (_, i) => scales.x.range()[0] + i * (bandwidth / 0.8) + bandwidth * 0.1)
      .attr("y", scales.y(0))
      .attr("width", bandwidth)
      .attr("height", 0)
      .attr("fill", color)
      .attr("rx", 2)
      .transition(transition)
      .attr("y", d => scales.y(d.value as number))
      .attr("height", d => scales.y(0) - scales.y(d.value as number));

    bars.transition(transition)
      .attr("x", (_, i) => scales.x.range()[0] + i * (bandwidth / 0.8) + bandwidth * 0.1)
      .attr("width", bandwidth)
      .attr("y", d => scales.y(d.value as number))
      .attr("height", d => scales.y(0) - scales.y(d.value as number))
      .attr("fill", color);

    bars.exit().transition(transition).attr("height", 0).attr("y", scales.y(0)).remove();
  },

  exit(svg, transition) {
    svg.selectAll(".bar-rect")
      .transition(transition)
      .attr("height", 0)
      .attr("y", function () {
        const scales = getScales();
        return scales ? scales.y(0) : 0;
      })
      .remove();
  },
};
```

- [ ] **Step 5: Create vector-field renderer**

Create `src/chart/renderers/vector-field.ts`:

```typescript
import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const vectorFieldRenderer: ChartRenderer = {
  enter(svg, data, graphState, config) {
    const scales = getScales();
    if (!scales) return;

    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const lengthScale = 15;

    svg.selectAll<SVGLineElement, Record<string, unknown>>(".vector-arrow")
      .data(data)
      .enter()
      .append("line")
      .attr("class", "vector-arrow")
      .attr("x1", d => scales.x(d.x as number))
      .attr("y1", d => scales.y(d.y as number))
      .attr("x2", d => {
        const angle = (d.angle as number) * Math.PI / 180;
        const mag = (d.magnitude as number) ?? 1;
        return scales.x(d.x as number) + Math.cos(angle) * mag * lengthScale;
      })
      .attr("y2", d => {
        const angle = (d.angle as number) * Math.PI / 180;
        const mag = (d.magnitude as number) ?? 1;
        return scales.y(d.y as number) - Math.sin(angle) * mag * lengthScale;
      })
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)")
      .style("opacity", 0)
      .transition().duration(400).delay((_, i) => i * 10)
      .style("opacity", 0.7);

    // Arrowhead marker (add once)
    if (svg.select("defs").empty()) {
      const defs = svg.append("defs");
      defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 9).attr("refY", 5)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", color);
    }
  },

  update(svg, data, graphState, config, transition) {
    const scales = getScales();
    if (!scales) return;

    const lengthScale = 15;

    const arrows = svg.selectAll<SVGLineElement, Record<string, unknown>>(".vector-arrow")
      .data(data);

    arrows.transition(transition)
      .attr("x1", d => scales.x(d.x as number))
      .attr("y1", d => scales.y(d.y as number))
      .attr("x2", d => {
        const angle = (d.angle as number) * Math.PI / 180;
        const mag = (d.magnitude as number) ?? 1;
        return scales.x(d.x as number) + Math.cos(angle) * mag * lengthScale;
      })
      .attr("y2", d => {
        const angle = (d.angle as number) * Math.PI / 180;
        const mag = (d.magnitude as number) ?? 1;
        return scales.y(d.y as number) - Math.sin(angle) * mag * lengthScale;
      });

    arrows.exit().transition(transition).style("opacity", 0).remove();
  },

  exit(svg, transition) {
    svg.selectAll(".vector-arrow")
      .transition(transition)
      .style("opacity", 0)
      .remove();
  },
};
```

- [ ] **Step 6: Create renderer registration index**

Create `src/chart/renderers/index.ts`:

```typescript
import { registerRenderer } from "../engine.js";
import { functionPlotRenderer } from "./function-plot.js";
import { distributionRenderer } from "./distribution.js";
import { scatterRenderer } from "./scatter.js";
import { barRenderer } from "./bar.js";
import { vectorFieldRenderer } from "./vector-field.js";

export function registerAllRenderers(): void {
  registerRenderer("function-plot", functionPlotRenderer);
  registerRenderer("distribution", distributionRenderer);
  registerRenderer("scatter", scatterRenderer);
  registerRenderer("bar", barRenderer);
  registerRenderer("vector-field", vectorFieldRenderer);
  // surface-3d is not yet implemented — alias to scatter as a fallback
  registerRenderer("surface-3d" as any, scatterRenderer);
}
```

- [ ] **Step 7: Verify build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/chart/
git commit -m "feat: add D3 chart renderers for all 5 graph types"
```

---

## Chunk 2: Scene Composition Engine

### Task 4: Scene Engine Core

**Files:**
- Create: `src/scene/engine.ts`

- [ ] **Step 1: Create the scene composition engine**

Create `src/scene/engine.ts`:

```typescript
import gsap from "gsap";
import type { SceneDirective, VisualHint, SceneMood } from "../types.js";

// ─── Primitive Renderer Interface ───

export interface PrimitiveRenderer {
  /**
   * Create SVG elements for this primitive and return a GSAP timeline
   * that animates them. Elements should be appended to the provided SVG group.
   */
  render(
    group: SVGGElement,
    config: VisualHint["config"],
    width: number,
    height: number,
    duration: number,
  ): gsap.core.Timeline;
}

// ─── Registry ───

const primitives = new Map<string, PrimitiveRenderer>();

export function registerPrimitive(name: string, renderer: PrimitiveRenderer): void {
  primitives.set(name, renderer);
}

// ─── Mood Presets ───

const MOOD_PRESETS: Record<SceneMood, { ease: string; colorAccent: string; timeScale: number }> = {
  dramatic: { ease: "power3.inOut", colorAccent: "#f59e0b", timeScale: 0.8 },
  calm: { ease: "sine.inOut", colorAccent: "#60a5fa", timeScale: 0.6 },
  urgent: { ease: "power2.out", colorAccent: "#ef4444", timeScale: 1.3 },
  analytical: { ease: "linear", colorAccent: "#60a5fa", timeScale: 1.0 },
};

// ─── Engine State ───

let currentTimeline: gsap.core.Timeline | null = null;
let sceneGroup: SVGGElement | null = null;

/**
 * Build and play a scene from a SceneDirective.
 * Returns the master timeline for external control.
 */
export function playScene(
  svgElement: SVGSVGElement,
  directive: SceneDirective,
  onComplete?: () => void,
): gsap.core.Timeline {
  // Kill any existing scene
  stopScene();

  const width = svgElement.clientWidth || parseInt(svgElement.getAttribute("width") ?? "400");
  const height = svgElement.clientHeight || parseInt(svgElement.getAttribute("height") ?? "300");

  // Create scene group
  const ns = "http://www.w3.org/2000/svg";
  sceneGroup = document.createElementNS(ns, "g");
  sceneGroup.setAttribute("class", "scene-group");
  svgElement.appendChild(sceneGroup);

  const mood = MOOD_PRESETS[directive.mood ?? "analytical"];
  const totalDuration = directive.duration ?? 2000;
  const hintCount = directive.visualHints.length;
  const perHintDuration = hintCount > 0 ? totalDuration / hintCount : totalDuration;

  // Build master timeline
  const master = gsap.timeline({
    onComplete: () => {
      onComplete?.();
    },
  });
  master.timeScale(mood.timeScale);

  // Add narrative text
  const narrativeEl = document.createElementNS(ns, "text");
  narrativeEl.setAttribute("x", String(width / 2));
  narrativeEl.setAttribute("y", String(height - 20));
  narrativeEl.setAttribute("text-anchor", "middle");
  narrativeEl.setAttribute("fill", "var(--color-text-secondary)");
  narrativeEl.setAttribute("font-size", "13");
  narrativeEl.setAttribute("class", "scene-narrative");
  narrativeEl.textContent = directive.narrative;
  sceneGroup.appendChild(narrativeEl);

  master.from(narrativeEl, { opacity: 0, y: "+=10", duration: 0.4, ease: mood.ease });

  // Compose primitives sequentially
  let timeOffset = 0.4; // after narrative fade-in

  for (const hint of directive.visualHints) {
    const renderer = primitives.get(hint.primitive);
    if (!renderer) {
      console.warn(`Unknown scene primitive: ${hint.primitive}`);
      continue;
    }

    const hintGroup = document.createElementNS(ns, "g");
    hintGroup.setAttribute("class", `primitive-${hint.primitive}`);
    sceneGroup.appendChild(hintGroup);

    const extraDelay = (hint.config?.delay ?? 0) / 1000;
    const hintDurationSec = perHintDuration / 1000;

    try {
      const primitiveTimeline = renderer.render(
        hintGroup,
        hint.config,
        width,
        height,
        hintDurationSec,
      );

      master.add(primitiveTimeline, timeOffset + extraDelay);
      timeOffset += hintDurationSec + extraDelay;
    } catch (err) {
      console.warn(`Scene primitive "${hint.primitive}" failed:`, err);
      sceneGroup.removeChild(hintGroup);
    }
  }

  currentTimeline = master;
  return master;
}

/**
 * Play a looping scene (for loading state).
 */
export function playLoopingScene(
  svgElement: SVGSVGElement,
  directive: SceneDirective,
): gsap.core.Timeline {
  const timeline = playScene(svgElement, directive);
  timeline.repeat(-1).repeatDelay(0.5);
  return timeline;
}

/**
 * Stop the current scene and clean up.
 */
export function stopScene(): void {
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }
  if (sceneGroup) {
    sceneGroup.remove();
    sceneGroup = null;
  }
}

/**
 * Signal the scene to wrap up — plays exit animation.
 * Returns a promise that resolves when the exit is complete.
 */
export function exitScene(duration: number = 400): Promise<void> {
  return new Promise((resolve) => {
    if (!sceneGroup || !currentTimeline) {
      resolve();
      return;
    }

    // Stop looping
    currentTimeline.repeat(0);

    // Tag elements for potential handoff
    const elements = sceneGroup.querySelectorAll("circle, rect, line, path, ellipse");
    elements.forEach(el => {
      el.setAttribute("data-handoff", "true");
    });

    // Fade out narrative
    const narrative = sceneGroup.querySelector(".scene-narrative");
    if (narrative) {
      gsap.to(narrative, { opacity: 0, duration: duration / 1000 });
    }

    // Resolve after duration (handoff elements remain)
    setTimeout(resolve, duration);
  });
}

/**
 * Clean up scene elements after handoff is complete.
 */
export function cleanupAfterHandoff(): void {
  if (sceneGroup) {
    // Remove only non-handoff elements; handoff elements are now owned by chart engine
    const nonHandoff = sceneGroup.querySelectorAll(":not([data-handoff])");
    nonHandoff.forEach(el => el.remove());

    // Remove the scene group if empty
    if (sceneGroup.childElementCount === 0) {
      sceneGroup.remove();
    }
    sceneGroup = null;
  }
  currentTimeline = null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scene/engine.ts
git commit -m "feat: add scene composition engine core"
```

---

### Task 5: Scene Primitives — Particles

**Files:**
- Create: `src/scene/primitives/particles.ts`

- [ ] **Step 1: Create particles-scatter and particles-cluster**

Create `src/scene/primitives/particles.ts`:

```typescript
import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";
import type { VisualHint } from "../../types.js";

const ns = "http://www.w3.org/2000/svg";

export const particlesScatter: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const count = config?.count ?? 30;
    const color = config?.color ?? "var(--color-ring-primary)";
    const tl = gsap.timeline();

    const circles: SVGCircleElement[] = [];
    for (let i = 0; i < count; i++) {
      const cx = Math.random() * (width - 40) + 20;
      const cy = Math.random() * (height - 60) + 20;
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", "3");
      circle.setAttribute("fill", color);
      circle.setAttribute("opacity", "0");
      circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);
      circles.push(circle);
    }

    // Fade in with stagger
    tl.to(circles, {
      opacity: 0.7,
      duration: duration * 0.3,
      stagger: { each: duration * 0.5 / count, from: "random" },
      ease: "power2.out",
    });

    // Brownian drift
    circles.forEach(circle => {
      const drift = () => {
        gsap.to(circle, {
          cx: `+=${(Math.random() - 0.5) * 20}`,
          cy: `+=${(Math.random() - 0.5) * 20}`,
          duration: 1 + Math.random(),
          ease: "sine.inOut",
          onComplete: drift,
        });
      };
      tl.call(drift, [], duration * 0.4);
    });

    return tl;
  },
};

export const particlesCluster: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const count = config?.count ?? 30;
    const groups = (config?.groups as number) ?? 2;
    const colors = (config?.colors as string[]) ?? ["#60a5fa", "#10b981", "#f59e0b"];
    const tl = gsap.timeline();

    // Define cluster centers
    const centers = Array.from({ length: groups }, (_, i) => ({
      x: (width / (groups + 1)) * (i + 1),
      y: height / 2 + (Math.random() - 0.5) * 60,
    }));

    const circles: SVGCircleElement[] = [];
    for (let i = 0; i < count; i++) {
      const cx = Math.random() * (width - 40) + 20;
      const cy = Math.random() * (height - 60) + 20;
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", "3");
      circle.setAttribute("fill", colors[i % groups % colors.length]);
      circle.setAttribute("opacity", "0.7");
      circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);
      circles.push(circle);
    }

    // Start scattered
    tl.from(circles, {
      opacity: 0,
      duration: duration * 0.2,
      stagger: 0.01,
    });

    // Gravitate to clusters
    circles.forEach((circle, i) => {
      const center = centers[i % groups];
      tl.to(circle, {
        cx: center.x + (Math.random() - 0.5) * 30,
        cy: center.y + (Math.random() - 0.5) * 30,
        duration: duration * 0.6,
        ease: "power2.inOut",
      }, duration * 0.3);
    });

    // Draw cluster boundaries
    centers.forEach((center, i) => {
      const ellipse = document.createElementNS(ns, "ellipse");
      ellipse.setAttribute("cx", String(center.x));
      ellipse.setAttribute("cy", String(center.y));
      ellipse.setAttribute("rx", "25");
      ellipse.setAttribute("ry", "20");
      ellipse.setAttribute("fill", "none");
      ellipse.setAttribute("stroke", colors[i % colors.length]);
      ellipse.setAttribute("stroke-width", "1");
      ellipse.setAttribute("stroke-dasharray", "4,3");
      ellipse.setAttribute("opacity", "0");
      group.appendChild(ellipse);

      tl.to(ellipse, { opacity: 0.4, duration: duration * 0.2 }, duration * 0.7);
    });

    return tl;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/scene/primitives/particles.ts
git commit -m "feat: add particles-scatter and particles-cluster scene primitives"
```

---

### Task 6: Scene Primitives — Classify, Grids, Shapes, Arrows, Icons

**Files:**
- Create: `src/scene/primitives/classify.ts`
- Create: `src/scene/primitives/grids.ts`
- Create: `src/scene/primitives/shapes.ts`
- Create: `src/scene/primitives/arrows.ts`
- Create: `src/scene/primitives/icons.ts`

- [ ] **Step 1: Create classify.ts (split-classify, outlier-isolate)**

Create `src/scene/primitives/classify.ts`:

```typescript
import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const splitClassify: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const labels = (config?.labels as string[]) ?? ["Class A", "Class B"];
    const colors = (config?.colors as string[]) ?? ["#10b981", "#ef4444"];
    const count = config?.count ?? 20;
    const tl = gsap.timeline();

    const binWidth = 80;
    const binHeight = 60;
    const binY = height / 2;
    const bins = labels.map((label, i) => ({
      x: (width / (labels.length + 1)) * (i + 1),
      y: binY,
      label,
      color: colors[i % colors.length],
    }));

    // Draw bins
    bins.forEach((bin) => {
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(bin.x - binWidth / 2));
      rect.setAttribute("y", String(bin.y));
      rect.setAttribute("width", String(binWidth));
      rect.setAttribute("height", String(binHeight));
      rect.setAttribute("rx", "6");
      rect.setAttribute("fill", `${bin.color}20`);
      rect.setAttribute("stroke", bin.color);
      rect.setAttribute("stroke-width", "1.5");
      rect.setAttribute("opacity", "0");
      group.appendChild(rect);

      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(bin.x));
      text.setAttribute("y", String(bin.y + binHeight + 18));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "var(--color-text-secondary)");
      text.setAttribute("font-size", "11");
      text.textContent = bin.label;
      text.setAttribute("opacity", "0");
      group.appendChild(text);

      tl.to([rect, text], { opacity: 1, duration: duration * 0.2, ease: "power2.out" }, 0);
    });

    // Create particles at top, then sort into bins
    for (let i = 0; i < count; i++) {
      const circle = document.createElementNS(ns, "circle");
      const startX = width / 2 + (Math.random() - 0.5) * 100;
      const startY = binY - 60 + (Math.random() - 0.5) * 30;
      circle.setAttribute("cx", String(startX));
      circle.setAttribute("cy", String(startY));
      circle.setAttribute("r", "3");
      circle.setAttribute("opacity", "0");
      circle.setAttribute("data-handoff-role", "point");

      const binIdx = Math.random() > 0.5 ? 0 : 1;
      const bin = bins[binIdx % bins.length];
      circle.setAttribute("fill", bin.color);
      group.appendChild(circle);

      tl.to(circle, { opacity: 0.8, duration: 0.15 }, duration * 0.15 + i * (duration * 0.3 / count));
      tl.to(circle, {
        cx: bin.x + (Math.random() - 0.5) * (binWidth - 10),
        cy: bin.y + 10 + Math.random() * (binHeight - 20),
        duration: duration * 0.4,
        ease: "power2.in",
      }, duration * 0.3 + i * (duration * 0.3 / count));
    }

    return tl;
  },
};

export const outlierIsolate: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const count = config?.count ?? 5;
    const color = config?.color ?? "#ef4444";
    const tl = gsap.timeline();

    // Cluster of normal points (center)
    const normalCount = 15;
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < normalCount; i++) {
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx + (Math.random() - 0.5) * 40));
      circle.setAttribute("cy", String(cy + (Math.random() - 0.5) * 40));
      circle.setAttribute("r", "3");
      circle.setAttribute("fill", "var(--color-ring-primary)");
      circle.setAttribute("opacity", "0");
      circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);

      tl.to(circle, { opacity: 0.5, duration: duration * 0.15 }, i * 0.02);
    }

    // Outlier points (edges)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 80 + Math.random() * 40;
      const ox = cx + Math.cos(angle) * dist;
      const oy = cy + Math.sin(angle) * dist;

      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(ox));
      circle.setAttribute("cy", String(oy));
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", color);
      circle.setAttribute("opacity", "0");
      circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);

      // Ring around outlier
      const ring = document.createElementNS(ns, "circle");
      ring.setAttribute("cx", String(ox));
      ring.setAttribute("cy", String(oy));
      ring.setAttribute("r", "12");
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", color);
      ring.setAttribute("stroke-width", "1");
      ring.setAttribute("stroke-dasharray", "3,2");
      ring.setAttribute("opacity", "0");
      group.appendChild(ring);

      const startT = duration * 0.3 + i * (duration * 0.3 / count);
      tl.to(circle, { opacity: 0.9, duration: duration * 0.15 }, startT);
      tl.to(ring, { opacity: 0.5, duration: duration * 0.2 }, startT + duration * 0.1);

      // Pulse
      tl.to(ring, {
        r: 16,
        opacity: 0,
        duration: duration * 0.3,
        ease: "power2.out",
        repeat: 1,
        yoyo: true,
      }, startT + duration * 0.2);
    }

    return tl;
  },
};
```

- [ ] **Step 2: Create grids.ts (tree-partition, matrix-grid, heatmap-pulse)**

Create `src/scene/primitives/grids.ts`:

```typescript
import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const treePartition: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const depth = (config?.depth as number) ?? 3;
    const tl = gsap.timeline();
    const margin = 40;

    // Draw partition lines recursively
    const lines: SVGLineElement[] = [];

    function addSplit(x1: number, y1: number, x2: number, y2: number, d: number, horizontal: boolean) {
      if (d > depth) return;

      const line = document.createElementNS(ns, "line");
      if (horizontal) {
        const splitY = y1 + (y2 - y1) * (0.3 + Math.random() * 0.4);
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(splitY));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(splitY));
        addSplit(x1, y1, x2, splitY, d + 1, false);
        addSplit(x1, splitY, x2, y2, d + 1, false);
      } else {
        const splitX = x1 + (x2 - x1) * (0.3 + Math.random() * 0.4);
        line.setAttribute("x1", String(splitX));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(splitX));
        line.setAttribute("y2", String(y2));
        addSplit(x1, y1, splitX, y2, d + 1, true);
        addSplit(splitX, y1, x2, y2, d + 1, true);
      }

      line.setAttribute("stroke", "#f59e0b");
      line.setAttribute("stroke-width", String(Math.max(1, 2 - d * 0.3)));
      line.setAttribute("stroke-dasharray", "4,3");
      line.setAttribute("opacity", "0");
      line.setAttribute("data-handoff-role", "line");
      group.appendChild(line);
      lines.push(line);
    }

    addSplit(margin, margin, width - margin, height - margin - 20, 0, Math.random() > 0.5);

    // Animate lines sequentially
    lines.forEach((line, i) => {
      tl.to(line, {
        opacity: 0.6,
        duration: duration * 0.8 / Math.max(lines.length, 1),
        ease: "power2.out",
      }, i * (duration * 0.7 / Math.max(lines.length, 1)));
    });

    return tl;
  },
};

export const matrixGrid: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const rows = (config?.rows as number) ?? 2;
    const cols = (config?.cols as number) ?? 2;
    const labels = (config?.labels as string[]) ?? [];
    const tl = gsap.timeline();

    const cellSize = Math.min((width - 80) / cols, (height - 80) / rows, 60);
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2 - 10;

    const colors = ["#10b981", "#ef444430", "#ef444430", "#10b981"];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(startX + c * cellSize));
        rect.setAttribute("y", String(startY + r * cellSize));
        rect.setAttribute("width", String(cellSize - 2));
        rect.setAttribute("height", String(cellSize - 2));
        rect.setAttribute("rx", "4");
        rect.setAttribute("fill", colors[i % colors.length]);
        rect.setAttribute("opacity", "0");
        rect.setAttribute("data-handoff-role", "rect");
        group.appendChild(rect);

        if (labels[i]) {
          const text = document.createElementNS(ns, "text");
          text.setAttribute("x", String(startX + c * cellSize + cellSize / 2));
          text.setAttribute("y", String(startY + r * cellSize + cellSize / 2 + 4));
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("fill", "var(--color-text-primary)");
          text.setAttribute("font-size", "11");
          text.setAttribute("font-weight", "600");
          text.setAttribute("opacity", "0");
          text.textContent = labels[i];
          group.appendChild(text);

          tl.to([rect, text], {
            opacity: i === 0 || i === rows * cols - 1 ? 0.8 : 0.4,
            duration: duration * 0.2,
            ease: "power2.out",
          }, i * (duration * 0.6 / (rows * cols)));
        } else {
          tl.to(rect, {
            opacity: 0.6,
            duration: duration * 0.2,
          }, i * (duration * 0.6 / (rows * cols)));
        }
      }
    }

    return tl;
  },
};

export const heatmapPulse: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const rows = (config?.rows as number) ?? 4;
    const cols = (config?.cols as number) ?? 4;
    const tl = gsap.timeline();

    const cellSize = Math.min((width - 60) / cols, (height - 60) / rows, 40);
    const startX = (width - cols * cellSize) / 2;
    const startY = (height - rows * cellSize) / 2 - 10;
    const color = config?.color ?? "var(--color-ring-primary)";

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const intensity = Math.random();
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(startX + c * cellSize));
        rect.setAttribute("y", String(startY + r * cellSize));
        rect.setAttribute("width", String(cellSize - 2));
        rect.setAttribute("height", String(cellSize - 2));
        rect.setAttribute("rx", "2");
        rect.setAttribute("fill", color);
        rect.setAttribute("opacity", "0");
        group.appendChild(rect);

        const i = r * cols + c;
        tl.to(rect, {
          opacity: 0.1 + intensity * 0.8,
          duration: duration * 0.15,
          ease: "power2.out",
        }, i * (duration * 0.5 / (rows * cols)));
      }
    }

    return tl;
  },
};
```

- [ ] **Step 3: Create shapes.ts (bell-curve-form, confidence-band, axis-scale)**

Create `src/scene/primitives/shapes.ts`:

```typescript
import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const bellCurveForm: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const tl = gsap.timeline();
    const color = config?.color ?? "var(--color-ring-primary)";
    const mu = (config?.mu as number) ?? 0;
    const sigma = (config?.sigma as number) ?? 1;

    const margin = 40;
    const plotW = width - margin * 2;
    const plotH = height - margin * 2 - 20;
    const points = 100;

    // Generate gaussian points
    const pathData: string[] = [];
    const areaData: string[] = [];
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const x = margin + t * plotW;
      const xVal = mu - 4 * sigma + t * 8 * sigma;
      const yVal = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((xVal - mu) / sigma) ** 2);
      const maxY = 1 / (sigma * Math.sqrt(2 * Math.PI));
      const y = margin + plotH - (yVal / maxY) * plotH * 0.9;

      pathData.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
      areaData.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    areaData.push(`L ${margin + plotW} ${margin + plotH} L ${margin} ${margin + plotH} Z`);

    // Area fill
    const area = document.createElementNS(ns, "path");
    area.setAttribute("d", areaData.join(" "));
    area.setAttribute("fill", color);
    area.setAttribute("fill-opacity", "0");
    area.setAttribute("data-handoff-role", "line");
    group.appendChild(area);

    // Line stroke
    const line = document.createElementNS(ns, "path");
    line.setAttribute("d", pathData.join(" "));
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "2.5");
    const totalLength = 800; // approximate
    line.setAttribute("stroke-dasharray", `${totalLength} ${totalLength}`);
    line.setAttribute("stroke-dashoffset", String(totalLength));
    line.setAttribute("data-handoff-role", "line");
    group.appendChild(line);

    // Baseline
    const baseline = document.createElementNS(ns, "line");
    baseline.setAttribute("x1", String(margin));
    baseline.setAttribute("y1", String(margin + plotH));
    baseline.setAttribute("x2", String(margin + plotW));
    baseline.setAttribute("y2", String(margin + plotH));
    baseline.setAttribute("stroke", "var(--color-border)");
    baseline.setAttribute("stroke-width", "1");
    baseline.setAttribute("opacity", "0");
    baseline.setAttribute("data-handoff-role", "axis");
    group.appendChild(baseline);

    tl.to(baseline, { opacity: 0.5, duration: duration * 0.15 }, 0);
    tl.to(line, { strokeDashoffset: 0, duration: duration * 0.6, ease: "power2.inOut" }, duration * 0.1);
    tl.to(area, { fillOpacity: 0.2, duration: duration * 0.3, ease: "power2.out" }, duration * 0.5);

    return tl;
  },
};

export const confidenceBand: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const tl = gsap.timeline();
    const color = config?.color ?? "var(--color-ring-primary)";
    const label = (config?.label as string) ?? "95%";

    const margin = 40;
    const plotW = width - margin * 2;
    const plotH = height - margin * 2 - 20;

    // Center line
    const centerPoints: string[] = [];
    const upperPoints: string[] = [];
    const lowerPoints: string[] = [];

    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const x = margin + t * plotW;
      const cy = margin + plotH * 0.3 + Math.sin(t * Math.PI) * plotH * 0.2;
      const band = 15 + t * 20;

      centerPoints.push(`${i === 0 ? "M" : "L"} ${x} ${cy}`);
      upperPoints.push(`${i === 0 ? "M" : "L"} ${x} ${cy - band}`);
      lowerPoints.push(`L ${x} ${cy + band}`);
    }

    const bandPath = upperPoints.join(" ") + " " + lowerPoints.reverse().join(" ") + " Z";

    const band = document.createElementNS(ns, "path");
    band.setAttribute("d", bandPath);
    band.setAttribute("fill", color);
    band.setAttribute("fill-opacity", "0");
    group.appendChild(band);

    const centerLine = document.createElementNS(ns, "path");
    centerLine.setAttribute("d", centerPoints.join(" "));
    centerLine.setAttribute("fill", "none");
    centerLine.setAttribute("stroke", color);
    centerLine.setAttribute("stroke-width", "2");
    centerLine.setAttribute("opacity", "0");
    centerLine.setAttribute("data-handoff-role", "line");
    group.appendChild(centerLine);

    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(width - margin - 10));
    text.setAttribute("y", String(margin + plotH * 0.5));
    text.setAttribute("fill", color);
    text.setAttribute("font-size", "11");
    text.setAttribute("opacity", "0");
    text.textContent = label;
    group.appendChild(text);

    tl.to(centerLine, { opacity: 1, duration: duration * 0.3 }, 0);
    tl.to(band, { fillOpacity: 0.15, duration: duration * 0.5, ease: "power2.out" }, duration * 0.2);
    tl.to(text, { opacity: 0.6, duration: duration * 0.2 }, duration * 0.6);

    return tl;
  },
};

export const axisScale: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const tl = gsap.timeline();
    const xLabel = (config?.xLabel as string) ?? "x";
    const yLabel = (config?.yLabel as string) ?? "y";

    const margin = 40;

    // X axis
    const xAxis = document.createElementNS(ns, "line");
    xAxis.setAttribute("x1", String(margin));
    xAxis.setAttribute("y1", String(height - margin - 20));
    xAxis.setAttribute("x2", String(margin));
    xAxis.setAttribute("y2", String(height - margin - 20));
    xAxis.setAttribute("stroke", "var(--color-text-secondary)");
    xAxis.setAttribute("stroke-width", "1.5");
    xAxis.setAttribute("data-handoff-role", "axis");
    group.appendChild(xAxis);

    // Y axis
    const yAxis = document.createElementNS(ns, "line");
    yAxis.setAttribute("x1", String(margin));
    yAxis.setAttribute("y1", String(height - margin - 20));
    yAxis.setAttribute("x2", String(margin));
    yAxis.setAttribute("y2", String(height - margin - 20));
    yAxis.setAttribute("stroke", "var(--color-text-secondary)");
    yAxis.setAttribute("stroke-width", "1.5");
    yAxis.setAttribute("data-handoff-role", "axis");
    group.appendChild(yAxis);

    // Animate axes drawing in
    tl.to(xAxis, { attr: { x2: width - margin }, duration: duration * 0.4, ease: "power2.out" }, 0);
    tl.to(yAxis, { attr: { y2: margin }, duration: duration * 0.4, ease: "power2.out" }, 0.1);

    // Labels
    const xText = document.createElementNS(ns, "text");
    xText.setAttribute("x", String(width - margin));
    xText.setAttribute("y", String(height - margin - 4));
    xText.setAttribute("fill", "var(--color-text-secondary)");
    xText.setAttribute("font-size", "12");
    xText.setAttribute("opacity", "0");
    xText.textContent = `${xLabel} →`;
    group.appendChild(xText);

    const yText = document.createElementNS(ns, "text");
    yText.setAttribute("x", String(margin - 8));
    yText.setAttribute("y", String(margin));
    yText.setAttribute("fill", "var(--color-text-secondary)");
    yText.setAttribute("font-size", "12");
    yText.setAttribute("opacity", "0");
    yText.textContent = `${yLabel} ↑`;
    group.appendChild(yText);

    tl.to([xText, yText], { opacity: 0.7, duration: duration * 0.2 }, duration * 0.4);

    return tl;
  },
};
```

- [ ] **Step 4: Create arrows.ts (flow-arrows)**

Create `src/scene/primitives/arrows.ts`:

```typescript
import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const flowArrows: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const nodes = (config?.labels as string[]) ?? ["A", "B", "C"];
    const color = config?.color ?? "#8b5cf6";
    const tl = gsap.timeline();

    const nodeCount = nodes.length;
    const spacing = width / (nodeCount + 1);
    const cy = height / 2;
    const nodeR = 18;

    nodes.forEach((label, i) => {
      const cx = spacing * (i + 1);

      // Node circle
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(nodeR));
      circle.setAttribute("fill", `${color}20`);
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", "1.5");
      circle.setAttribute("opacity", "0");
      group.appendChild(circle);

      // Label
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(cx));
      text.setAttribute("y", String(cy + 4));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "var(--color-text-primary)");
      text.setAttribute("font-size", "14");
      text.setAttribute("opacity", "0");
      text.textContent = label;
      group.appendChild(text);

      const nodeDelay = i * (duration * 0.5 / nodeCount);
      tl.to([circle, text], { opacity: 1, duration: duration * 0.15 }, nodeDelay);

      // Arrow to next node
      if (i < nodeCount - 1) {
        const nextCx = spacing * (i + 2);
        const arrow = document.createElementNS(ns, "line");
        arrow.setAttribute("x1", String(cx + nodeR + 4));
        arrow.setAttribute("y1", String(cy));
        arrow.setAttribute("x2", String(cx + nodeR + 4));
        arrow.setAttribute("y2", String(cy));
        arrow.setAttribute("stroke", color);
        arrow.setAttribute("stroke-width", "2");
        arrow.setAttribute("opacity", "0.6");
        arrow.setAttribute("data-handoff-role", "line");
        group.appendChild(arrow);

        const arrowHead = document.createElementNS(ns, "polygon");
        const tipX = nextCx - nodeR - 4;
        arrowHead.setAttribute("points", `${tipX - 6},${cy - 4} ${tipX},${cy} ${tipX - 6},${cy + 4}`);
        arrowHead.setAttribute("fill", color);
        arrowHead.setAttribute("opacity", "0");
        group.appendChild(arrowHead);

        const arrowDelay = nodeDelay + duration * 0.1;
        tl.to(arrow, { attr: { x2: tipX - 6 }, duration: duration * 0.2, ease: "power2.out" }, arrowDelay);
        tl.to(arrowHead, { opacity: 0.6, duration: 0.1 }, arrowDelay + duration * 0.2);
      }
    });

    return tl;
  },
};
```

- [ ] **Step 5: Create icons.ts (icon-flow)**

Create `src/scene/primitives/icons.ts`:

```typescript
import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const iconFlow: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const labels = (config?.labels as string[]) ?? ["📊", "🔬", "✓"];
    const colors = (config?.colors as string[]) ?? ["#3b82f6", "#f59e0b", "#10b981"];
    const tl = gsap.timeline();

    const nodeCount = labels.length;
    const spacing = width / (nodeCount + 1);
    const cy = height / 2;
    const nodeR = 22;

    labels.forEach((label, i) => {
      const cx = spacing * (i + 1);
      const color = colors[i % colors.length];

      // Circle background
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(nodeR));
      circle.setAttribute("fill", `${color}20`);
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", "1.5");
      circle.setAttribute("opacity", "0");
      group.appendChild(circle);

      // Emoji/text label
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(cx));
      text.setAttribute("y", String(cy + 6));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "18");
      text.setAttribute("opacity", "0");
      text.textContent = label;
      group.appendChild(text);

      const nodeDelay = i * (duration * 0.5 / nodeCount);
      tl.to(circle, { opacity: 1, duration: duration * 0.12, ease: "back.out(1.7)" }, nodeDelay);
      tl.to(text, { opacity: 1, duration: duration * 0.12 }, nodeDelay + 0.05);

      // Connector to next
      if (i < nodeCount - 1) {
        const nextCx = spacing * (i + 2);
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(cx + nodeR + 6));
        line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(cx + nodeR + 6));
        line.setAttribute("y2", String(cy));
        line.setAttribute("stroke", "#555");
        line.setAttribute("stroke-width", "1.5");
        group.appendChild(line);

        const arrowTip = document.createElementNS(ns, "polygon");
        const tipX = nextCx - nodeR - 6;
        arrowTip.setAttribute("points", `${tipX - 5},${cy - 3} ${tipX},${cy} ${tipX - 5},${cy + 3}`);
        arrowTip.setAttribute("fill", "#555");
        arrowTip.setAttribute("opacity", "0");
        group.appendChild(arrowTip);

        const arrowDelay = nodeDelay + duration * 0.08;
        tl.to(line, { attr: { x2: tipX - 5 }, duration: duration * 0.15 }, arrowDelay);
        tl.to(arrowTip, { opacity: 1, duration: 0.08 }, arrowDelay + duration * 0.15);
      }
    });

    return tl;
  },
};
```

- [ ] **Step 6: Create primitive registration index**

Create `src/scene/primitives/index.ts`:

```typescript
import { registerPrimitive } from "../engine.js";
import { particlesScatter, particlesCluster } from "./particles.js";
import { splitClassify, outlierIsolate } from "./classify.js";
import { treePartition, matrixGrid, heatmapPulse } from "./grids.js";
import { bellCurveForm, confidenceBand, axisScale } from "./shapes.js";
import { flowArrows } from "./arrows.js";
import { iconFlow } from "./icons.js";

export function registerAllPrimitives(): void {
  registerPrimitive("particles-scatter", particlesScatter);
  registerPrimitive("particles-cluster", particlesCluster);
  registerPrimitive("split-classify", splitClassify);
  registerPrimitive("outlier-isolate", outlierIsolate);
  registerPrimitive("tree-partition", treePartition);
  registerPrimitive("matrix-grid", matrixGrid);
  registerPrimitive("heatmap-pulse", heatmapPulse);
  registerPrimitive("bell-curve-form", bellCurveForm);
  registerPrimitive("confidence-band", confidenceBand);
  registerPrimitive("axis-scale", axisScale);
  registerPrimitive("flow-arrows", flowArrows);
  registerPrimitive("icon-flow", iconFlow);
}
```

- [ ] **Step 7: Create domain presets**

Create `src/scene/presets/general.ts`:

```typescript
import type { SceneDirective } from "../../types.js";

/** Fallback loading scene when no loadingScene is provided and domain is unknown. */
export const generalLoadingScene: SceneDirective = {
  type: "scene-setter",
  narrative: "Building your visualization...",
  visualHints: [
    { primitive: "particles-scatter", config: { count: 25 } },
    { primitive: "axis-scale" },
  ],
  mood: "calm",
  duration: 2500,
};
```

Create `src/scene/presets/statistics.ts`:

```typescript
import type { SceneDirective } from "../../types.js";

export const statisticsLoadingScene: SceneDirective = {
  type: "scene-setter",
  narrative: "Analyzing statistical distributions...",
  visualHints: [
    { primitive: "particles-scatter", config: { count: 30 } },
    { primitive: "bell-curve-form" },
  ],
  mood: "analytical",
  duration: 2500,
};
```

Create `src/scene/presets/finance.ts`:

```typescript
import type { SceneDirective } from "../../types.js";

export const financeLoadingScene: SceneDirective = {
  type: "scene-setter",
  narrative: "Analyzing transaction patterns...",
  visualHints: [
    { primitive: "icon-flow", config: { labels: ["💳", "🔍", "✓"], colors: ["#3b82f6", "#f59e0b", "#10b981"] } },
    { primitive: "particles-scatter", config: { count: 35 } },
  ],
  mood: "analytical",
  duration: 2500,
};
```

- [ ] **Step 8: Verify build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/scene/
git commit -m "feat: add scene composition engine with 12 primitives and domain presets"
```

---

## Chunk 3: Stage Manager, Integration, and Cleanup

### Task 7: Pre-requisite Modifications for Stage Manager

**Files:**
- Modify: `src/renderer/controls.ts`
- Modify: `src/renderer/sliders.ts`
- Modify: `src/renderer/steps.ts`

These modifications are needed BEFORE the stage manager can compile, since it imports from these files.

- [ ] **Step 1: Add `disableControls` to controls.ts**

In `src/renderer/controls.ts`, add and export:

```typescript
export function disableControls(): void {
  const prevBtn = document.getElementById("btn-prev") as HTMLButtonElement;
  const nextBtn = document.getElementById("btn-next") as HTMLButtonElement;
  const playBtn = document.getElementById("btn-play") as HTMLButtonElement;
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
  if (playBtn) playBtn.disabled = true;
}
```

- [ ] **Step 2: Add slider disable/enable to sliders.ts**

Add to `src/renderer/sliders.ts`:

```typescript
export function disableSliders(): void {
  const container = document.getElementById("sliders-container");
  if (container) {
    container.classList.add("disabled");
    container.querySelectorAll("input").forEach(input => {
      (input as HTMLInputElement).disabled = true;
    });
  }
}

export function enableSliders(): void {
  const container = document.getElementById("sliders-container");
  if (container) {
    container.classList.remove("disabled");
    container.querySelectorAll("input").forEach(input => {
      (input as HTMLInputElement).disabled = false;
    });
  }
}
```

- [ ] **Step 3: Update steps.ts to accept StepV2**

In `src/renderer/steps.ts`:

1. Change the import from `Step` to `StepV2`:
```typescript
import type { StepV2 } from "../types.js";
```

2. Change the function signature:
```typescript
export function renderSteps(steps: StepV2[]): HTMLElement[] {
```

3. Wrap the toggle button and algebra section in a conditional:
```typescript
    // Only show algebra toggle if algebraDetail is present
    if (step.algebraDetail) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "expand-toggle";
      toggleBtn.textContent = "Show algebra ▸";

      const algebraEl = document.createElement("div");
      algebraEl.className = "algebra-detail";

      katex.render(step.algebraDetail, algebraEl, {
        displayMode: true,
        throwOnError: false,
      });

      toggleBtn.addEventListener("click", () => {
        const isExpanded = algebraEl.classList.toggle("expanded");
        toggleBtn.textContent = isExpanded ? "Hide algebra ▾" : "Show algebra ▸";
      });

      card.append(numberEl, titleEl, narrativeEl, toggleBtn, algebraEl);
    } else {
      card.append(numberEl, titleEl, narrativeEl);
    }
```

- [ ] **Step 4: Verify build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/controls.ts src/renderer/sliders.ts src/renderer/steps.ts
git commit -m "feat: add disableControls, slider disable/enable, and StepV2 support to renderers"
```

---

### Task 8: Stage Manager and Transition Manager

**Files:**
- Create: `src/stage/manager.ts`
- Create: `src/stage/transition-manager.ts`

- [ ] **Step 1: Create transition-manager.ts**

Create `src/stage/transition-manager.ts`:

```typescript
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
 */
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
```

- [ ] **Step 2: Create manager.ts — the stage state machine**

Create `src/stage/manager.ts`:

```typescript
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
  resizeChart,
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
```

- [ ] **Step 3: Verify build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/stage/
git commit -m "feat: add stage manager state machine and transition manager"
```

---

### Task 9: Integration — Rewire mcp-app.ts

**Files:**
- Modify: `src/mcp-app.ts`
- Modify: `src/renderer/steps.ts`
- Modify: `src/renderer/controls.ts`
- Modify: `src/renderer/sliders.ts`
- Modify: `mcp-app.html`

- [ ] **Step 1: Update mcp-app.html — add narrative overlay element**

In `mcp-app.html`, add a narrative overlay `<div>` inside `#sticky-panel`, before `#graph-container`:

```html
<!-- Inside #sticky-panel, before #graph-container -->
<div id="scene-narrative" class="scene-narrative-overlay"></div>
```

- [ ] **Step 2: Update controls.ts — add disableControls export**

In `src/renderer/controls.ts`, add/export `disableControls()` if not already present:

```typescript
export function disableControls(): void {
  const prevBtn = document.getElementById("btn-prev") as HTMLButtonElement;
  const nextBtn = document.getElementById("btn-next") as HTMLButtonElement;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}
```

- [ ] **Step 3: Update sliders.ts — add disable/enable**

Add to `src/renderer/sliders.ts`:

```typescript
export function disableSliders(): void {
  const container = document.getElementById("sliders-container");
  if (container) {
    container.classList.add("disabled");
    container.querySelectorAll("input").forEach(input => {
      (input as HTMLInputElement).disabled = true;
    });
  }
}

export function enableSliders(): void {
  const container = document.getElementById("sliders-container");
  if (container) {
    container.classList.remove("disabled");
    container.querySelectorAll("input").forEach(input => {
      (input as HTMLInputElement).disabled = false;
    });
  }
}
```

- [ ] **Step 4: Update steps.ts — handle optional fields**

In `src/renderer/steps.ts`, update the step card rendering to handle optional `algebraDetail`:

Change the `toggleBtn` and `algebraEl` section to wrap in an `if (step.algebraDetail)` check so the button isn't shown when there's no algebra.

- [ ] **Step 5: Rewire mcp-app.ts to use stage manager**

Replace the core orchestration in `src/mcp-app.ts`. The key changes:

1. Import stage manager instead of timeline/graph
2. Replace `renderPayload()` to use `handleFullPayload()`
3. Replace `ontoolinputpartial` to use `handlePartialPayload()`
4. Replace slider callback to use `updateChartForParameters()`
5. Replace navigation to use `navigateToStep()`
6. Register all renderers and primitives at startup

The new imports section:
```typescript
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
```

Initialization (add before `app.connect()`):
```typescript
// Register all chart renderers and scene primitives
registerAllRenderers();
registerAllPrimitives();

// Initialize the stage manager
const graphContainer = document.getElementById("graph-container")!;
const scrollPanel = document.getElementById("scroll-panel")!;
initStage(graphContainer, scrollPanel);
```

Replace `renderPayload()`:
```typescript
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
```

Replace `ontoolinputpartial`:
```typescript
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
```

Replace navigation controls:
```typescript
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
```

Replace teardown:
```typescript
app.onteardown = async () => {
  teardownStage();
  stopAutoPlay();
  return {};
};
```

- [ ] **Step 6: Verify build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/mcp-app.ts src/renderer/steps.ts src/renderer/controls.ts src/renderer/sliders.ts mcp-app.html
git commit -m "feat: rewire mcp-app to use stage manager and D3 chart engine"
```

---

### Task 10: CSS Updates

**Files:**
- Modify: `src/global.css`

- [ ] **Step 1: Add stage/interstitial CSS**

Add to `src/global.css`:

```css
/* === STAGE STATES === */

/* Scene narrative overlay */
.scene-narrative-overlay {
  position: absolute;
  bottom: 1rem;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  pointer-events: none;
  z-index: 5;
}

/* Disabled sliders during interstitial */
.sliders-container.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.sliders-container.disabled input[type="range"] {
  cursor: not-allowed;
}

/* D3 chart styling */
.chart-axes text {
  fill: var(--color-text-secondary);
  font-size: 11px;
}

.chart-axes line,
.chart-axes path {
  stroke: var(--color-text-secondary);
}

.chart-marks {
  /* marks layer */
}

/* Scene group narrative text */
.scene-narrative {
  font-family: var(--font-sans);
}

/* Step card transition for interstitial active */
.step-card.interstitial-active {
  border-color: var(--color-ring-primary);
  background: var(--color-background-secondary);
}

/* Sticky panel relative positioning for overlay */
.sticky-panel {
  position: relative;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/global.css
git commit -m "feat: add CSS for stage states, disabled sliders, and D3 chart styling"
```

---

### Task 11: Cleanup — Remove Old Files

**Files:**
- Delete: `src/renderer/graph.ts`
- Delete: `src/animation/timeline.ts`

- [ ] **Step 1: Remove old graph renderer and timeline**

```bash
cd c:/Users/digit/Developer/jhu-claude-skills/math-formalism-ideation
git rm src/renderer/graph.ts
git rm src/animation/timeline.ts
```

- [ ] **Step 2: Verify no remaining imports**

Search for any remaining imports of the deleted files:

```bash
grep -r "renderer/graph" src/ --include="*.ts"
grep -r "animation/timeline" src/ --include="*.ts"
```

Expected: No results (all imports should now point to chart/engine and stage/manager).

- [ ] **Step 3: Verify full build**

```bash
npx tsc --noEmit && npx vite build
```

Expected: Clean compile and successful bundle.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old Observable Plot renderer and timeline, complete migration to D3"
```

---

### Task 12: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
cd c:/Users/digit/Developer/jhu-claude-skills/math-formalism-ideation
npm run dev
```

- [ ] **Step 2: Verify the loading flow**

1. Open the app in a host that sends a `FormulaPayload`
2. Confirm: loading scene plays in the right panel during streaming
3. Confirm: scene morphs into first chart when payload arrives
4. Confirm: step cards populate in the left panel

- [ ] **Step 3: Verify scrollytelling**

1. Scroll through steps in the left panel
2. Confirm: chart morphs smoothly between same-type steps
3. Confirm: chart type changes animate (exit → enter)
4. Confirm: interstitials play when scrolling forward slowly

- [ ] **Step 4: Verify interactivity**

1. Adjust sliders → chart updates in real-time
2. Use prev/next buttons → step navigation works
3. Sliders disabled during interstitials
4. Fast scrolling skips interstitials

- [ ] **Step 5: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: smoke test fixes for motion design integration"
```
