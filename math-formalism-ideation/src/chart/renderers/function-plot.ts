import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const functionPlotRenderer: ChartRenderer = {
  enter(svg, data, _graphState: GraphState, config) {
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
      .transition().duration(800).ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);
  },
  update(svg, data, _graphState: GraphState, _config, transition) {
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
    svg.selectAll(".line-path").transition(transition).style("opacity", 0).remove();
  },
};
