import * as Plot from "@observablehq/plot";
import type { FormulaPayload, GraphState, GraphType } from "../types.js";
import { getAnnotationColor } from "../types.js";

const graphContainer = document.getElementById("graph-container")!;

/**
 * Build an Observable Plot specification from the graph state and type.
 */
function buildPlot(
  graphType: GraphType,
  graphState: GraphState,
  config: Record<string, unknown>,
): HTMLElement | SVGElement {
  const marks: Plot.Markish[] = [];
  const options: Plot.PlotOptions = {
    width: graphContainer.clientWidth - 32,
    height: Math.max(300, graphContainer.clientHeight - 32),
    style: {
      background: "transparent",
      color: "var(--color-text-primary)",
    },
    x: {
      label: graphState.axes?.x?.label ?? "x",
      domain: graphState.axes?.x?.domain,
    },
    y: {
      label: graphState.axes?.y?.label ?? "y",
      domain: graphState.axes?.y?.domain,
    },
  };

  switch (graphType) {
    case "function-plot": {
      marks.push(
        Plot.line(graphState.data, {
          x: "x",
          y: "y",
          stroke: config.color as string ?? "var(--color-ring-primary)",
          strokeWidth: 2,
        }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    case "scatter": {
      marks.push(
        Plot.dot(graphState.data, {
          x: "x",
          y: "y",
          fill: "var(--color-ring-primary)",
          r: 3,
        }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    case "distribution": {
      marks.push(
        Plot.areaY(graphState.data, {
          x: "x",
          y: "y",
          fill: "var(--color-ring-primary)",
          fillOpacity: 0.3,
        }),
        Plot.line(graphState.data, {
          x: "x",
          y: "y",
          stroke: "var(--color-ring-primary)",
          strokeWidth: 2,
        }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    case "bar": {
      marks.push(
        Plot.barY(graphState.data, {
          x: "category",
          y: "value",
          fill: "var(--color-ring-primary)",
        }),
      );
      break;
    }
    case "vector-field": {
      marks.push(
        Plot.vector(graphState.data, {
          x: "x",
          y: "y",
          rotate: "angle",
          length: "magnitude",
          stroke: "var(--color-ring-primary)",
        }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    default: {
      marks.push(
        Plot.line(graphState.data, { x: "x", y: "y", stroke: "var(--color-ring-primary)" }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
    }
  }

  // Add highlight regions
  if (graphState.highlightRegions) {
    for (const region of graphState.highlightRegions) {
      const color = getAnnotationColor(
        parseInt(region.annotationId.replace(/\D/g, ""), 10) || 0,
      );
      if (region.type === "point") {
        marks.push(
          Plot.dot([region.coords], {
            x: "x",
            y: "y",
            r: 6,
            fill: color,
            fillOpacity: 0.8,
          }),
        );
      }
    }
  }

  return Plot.plot({ ...options, marks });
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
