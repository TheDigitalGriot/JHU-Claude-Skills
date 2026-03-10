import * as d3 from "d3";
import type { FormulaPayload, GraphState, GraphType } from "../types.js";
import { getAnnotationColor } from "../types.js";

const graphContainer = document.getElementById("graph-container")!;

/**
 * Build a D3 visualization from the graph state and type.
 * NOTE: Stubbed for Task 1 (dependency swap). Full D3 chart engine arrives in Task 2.
 */
function buildPlot(
  graphType: GraphType,
  graphState: GraphState,
  config: Record<string, unknown>,
): SVGSVGElement {
  const width = graphContainer.clientWidth - 32;
  const height = Math.max(300, graphContainer.clientHeight - 32);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "background: transparent; color: var(--color-text-primary);");

  const xLabel = graphState.axes?.x?.label ?? "x";
  const yLabel = graphState.axes?.y?.label ?? "y";

  const xDomain = graphState.axes?.x?.domain ?? d3.extent(graphState.data, (d) => d["x"] as number) as [number, number];
  const yDomain = graphState.axes?.y?.domain ?? d3.extent(graphState.data, (d) => d["y"] as number) as [number, number];

  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
  const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale))
    .append("text")
    .attr("x", innerW / 2)
    .attr("y", 35)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .text(xLabel);

  g.append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -40)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .text(yLabel);

  const strokeColor = (config.color as string) ?? "var(--color-ring-primary)";

  switch (graphType) {
    case "function-plot":
    case "distribution": {
      const line = d3
        .line<Record<string, unknown>>()
        .x((d) => xScale(d["x"] as number))
        .y((d) => yScale(d["y"] as number));

      if (graphType === "distribution") {
        const area = d3
          .area<Record<string, unknown>>()
          .x((d) => xScale(d["x"] as number))
          .y0(innerH)
          .y1((d) => yScale(d["y"] as number));

        g.append("path")
          .datum(graphState.data)
          .attr("d", area)
          .attr("fill", strokeColor)
          .attr("fill-opacity", 0.3);
      }

      g.append("path")
        .datum(graphState.data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2);
      break;
    }
    case "scatter": {
      g.selectAll("circle")
        .data(graphState.data)
        .join("circle")
        .attr("cx", (d) => xScale(d["x"] as number))
        .attr("cy", (d) => yScale(d["y"] as number))
        .attr("r", 3)
        .attr("fill", "var(--color-ring-primary)");
      break;
    }
    case "bar": {
      const categories = graphState.data.map((d) => String(d["category"]));
      const xBand = d3
        .scaleBand()
        .domain(categories)
        .range([0, innerW])
        .padding(0.2);

      g.selectAll("rect")
        .data(graphState.data)
        .join("rect")
        .attr("x", (d) => xBand(String(d["category"])) ?? 0)
        .attr("y", (d) => yScale(d["value"] as number))
        .attr("width", xBand.bandwidth())
        .attr("height", (d) => innerH - yScale(d["value"] as number))
        .attr("fill", "var(--color-ring-primary)");
      break;
    }
    default: {
      const line = d3
        .line<Record<string, unknown>>()
        .x((d) => xScale(d["x"] as number))
        .y((d) => yScale(d["y"] as number));

      g.append("path")
        .datum(graphState.data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2);
    }
  }

  // Highlight regions
  if (graphState.highlightRegions) {
    for (const region of graphState.highlightRegions) {
      const color = getAnnotationColor(
        parseInt(region.annotationId.replace(/\D/g, ""), 10) || 0,
      );
      if (region.type === "point") {
        g.append("circle")
          .attr("cx", xScale(region.coords["x"] ?? 0))
          .attr("cy", yScale(region.coords["y"] ?? 0))
          .attr("r", 6)
          .attr("fill", color)
          .attr("fill-opacity", 0.8);
      }
    }
  }

  return svg.node()!;
}

/**
 * Render or update the graph.
 */
export function renderGraph(
  payload: FormulaPayload,
  graphState: GraphState,
): void {
  graphContainer.innerHTML = "";
  const plot = buildPlot(payload.graph.type, graphState, payload.graph.config);
  graphContainer.appendChild(plot);
}
