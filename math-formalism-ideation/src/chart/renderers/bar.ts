import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const barRenderer: ChartRenderer = {
  enter(svg, data, _graphState: GraphState, config) {
    const scales = getScales();
    if (!scales) return;
    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const categories = data.map(d => d.category as string);
    const bandwidth = (scales.x.range()[1] - scales.x.range()[0]) / Math.max(categories.length, 1) * 0.8;
    svg.selectAll<SVGRectElement, Record<string, unknown>>(".bar-rect")
      .data(data, (d: any) => d.category).enter().append("rect").attr("class", "bar-rect")
      .attr("x", (_, i) => scales.x.range()[0] + i * (bandwidth / 0.8) + bandwidth * 0.1)
      .attr("y", scales.y(0)).attr("width", bandwidth).attr("height", 0)
      .attr("fill", color).attr("rx", 2)
      .transition().duration(600).delay((_, i) => i * 50).ease(d3.easeCubicOut)
      .attr("y", d => scales.y(d.value as number))
      .attr("height", d => scales.y(0) - scales.y(d.value as number));
  },
  update(svg, data, _graphState: GraphState, config, transition) {
    const scales = getScales();
    if (!scales) return;
    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const bandwidth = (scales.x.range()[1] - scales.x.range()[0]) / Math.max(data.length, 1) * 0.8;
    const bars = svg.selectAll<SVGRectElement, Record<string, unknown>>(".bar-rect")
      .data(data, (d: any) => d.category);
    bars.enter().append("rect").attr("class", "bar-rect")
      .attr("x", (_, i) => scales.x.range()[0] + i * (bandwidth / 0.8) + bandwidth * 0.1)
      .attr("y", scales.y(0)).attr("width", bandwidth).attr("height", 0)
      .attr("fill", color).attr("rx", 2)
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
    svg.selectAll(".bar-rect").transition(transition)
      .attr("height", 0)
      .attr("y", function () { const scales = getScales(); return scales ? scales.y(0) : 0; })
      .remove();
  },
};
