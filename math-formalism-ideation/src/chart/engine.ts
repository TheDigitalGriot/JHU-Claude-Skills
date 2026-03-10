import * as d3 from "d3";
import type { GraphType, GraphState, StepTransition } from "../types.js";
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
  renderHighlights(graphState);

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
