import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const scatterRenderer: ChartRenderer = {
  enter(svg, data, _graphState: GraphState, config) {
    const scales = getScales();
    if (!scales) return;
    const color = (config.color as string) ?? "var(--color-ring-primary)";
    svg.selectAll<SVGCircleElement, Record<string, unknown>>(".scatter-dot")
      .data(data, (d: any) => `${d.x}-${d.y}`)
      .enter().append("circle").attr("class", "scatter-dot")
      .attr("cx", d => scales.x(d.x as number)).attr("cy", d => scales.y(d.y as number))
      .attr("r", 0).attr("fill", color).attr("fill-opacity", 0.7)
      .transition().duration(400).delay((_, i) => i * 5).ease(d3.easeBackOut).attr("r", 3);
  },
  update(svg, data, _graphState: GraphState, config, transition) {
    const scales = getScales();
    if (!scales) return;
    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const dots = svg.selectAll<SVGCircleElement, Record<string, unknown>>(".scatter-dot")
      .data(data, (d: any) => `${d.x}-${d.y}`);
    dots.enter().append("circle").attr("class", "scatter-dot")
      .attr("cx", d => scales.x(d.x as number)).attr("cy", d => scales.y(d.y as number))
      .attr("r", 0).attr("fill", color).attr("fill-opacity", 0.7)
      .transition(transition).attr("r", 3);
    dots.transition(transition)
      .attr("cx", d => scales.x(d.x as number)).attr("cy", d => scales.y(d.y as number)).attr("fill", color);
    dots.exit().transition(transition).attr("r", 0).remove();
  },
  exit(svg, transition) {
    svg.selectAll(".scatter-dot").transition(transition).attr("r", 0).style("opacity", 0).remove();
  },
};
