import * as d3 from "d3";
import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const distributionRenderer: ChartRenderer = {
  enter(svg, data, _graphState: GraphState, config) {
    const scales = getScales();
    if (!scales) return;
    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const area = d3.area<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y0(scales.y(0))
      .y1(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);
    svg.append("path").datum(data)
      .attr("class", "dist-area").attr("fill", color).attr("fill-opacity", 0).attr("d", area)
      .transition().duration(600).ease(d3.easeCubicInOut).attr("fill-opacity", 0.3);
    const line = d3.line<Record<string, unknown>>()
      .x(d => scales.x(d.x as number))
      .y(d => scales.y(d.y as number))
      .curve(d3.curveMonotoneX);
    svg.append("path").datum(data)
      .attr("class", "dist-line").attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("d", line)
      .style("opacity", 0).transition().duration(600).delay(200).ease(d3.easeCubicInOut).style("opacity", 1);
  },
  update(svg, data, _graphState: GraphState, _config, transition) {
    const scales = getScales();
    if (!scales) return;
    const area = d3.area<Record<string, unknown>>()
      .x(d => scales.x(d.x as number)).y0(scales.y(0)).y1(d => scales.y(d.y as number)).curve(d3.curveMonotoneX);
    const line = d3.line<Record<string, unknown>>()
      .x(d => scales.x(d.x as number)).y(d => scales.y(d.y as number)).curve(d3.curveMonotoneX);
    svg.select<SVGPathElement>(".dist-area").datum(data).transition(transition).attr("d", area);
    svg.select<SVGPathElement>(".dist-line").datum(data).transition(transition).attr("d", line);
  },
  exit(svg, transition) {
    svg.selectAll(".dist-area, .dist-line").transition(transition).style("opacity", 0).remove();
  },
};
