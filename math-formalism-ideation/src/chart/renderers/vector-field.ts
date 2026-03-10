import type { ChartRenderer } from "../engine.js";
import type { GraphState } from "../../types.js";
import { getScales } from "../engine.js";

export const vectorFieldRenderer: ChartRenderer = {
  enter(svg, data, _graphState: GraphState, config) {
    const scales = getScales();
    if (!scales) return;
    const color = (config.color as string) ?? "var(--color-ring-primary)";
    const lengthScale = 15;
    svg.selectAll<SVGLineElement, Record<string, unknown>>(".vector-arrow")
      .data(data).enter().append("line").attr("class", "vector-arrow")
      .attr("x1", d => scales.x(d.x as number)).attr("y1", d => scales.y(d.y as number))
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
      .attr("stroke", color).attr("stroke-width", 1.5).attr("marker-end", "url(#arrowhead)")
      .style("opacity", 0).transition().duration(400).delay((_, i) => i * 10).style("opacity", 0.7);
    // Arrowhead marker (add once)
    if (svg.select("defs").empty()) {
      const defs = svg.append("defs");
      defs.append("marker").attr("id", "arrowhead").attr("viewBox", "0 0 10 10")
        .attr("refX", 9).attr("refY", 5).attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto-start-reverse")
        .append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", color);
    }
  },
  update(svg, data, _graphState: GraphState, _config, transition) {
    const scales = getScales();
    if (!scales) return;
    const lengthScale = 15;
    const arrows = svg.selectAll<SVGLineElement, Record<string, unknown>>(".vector-arrow").data(data);
    arrows.transition(transition)
      .attr("x1", d => scales.x(d.x as number)).attr("y1", d => scales.y(d.y as number))
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
    svg.selectAll(".vector-arrow").transition(transition).style("opacity", 0).remove();
  },
};
