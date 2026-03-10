import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const flowArrows: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const nodes = (config?.labels as string[]) ?? ["A", "B", "C"];
    const color = config?.color ?? "#8b5cf6";
    const tl = gsap.timeline();
    const nodeCount = nodes.length; const spacing = width / (nodeCount + 1); const cy = height / 2; const nodeR = 18;
    nodes.forEach((label, i) => {
      const cx = spacing * (i + 1);
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx)); circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(nodeR)); circle.setAttribute("fill", `${color}20`);
      circle.setAttribute("stroke", color); circle.setAttribute("stroke-width", "1.5");
      circle.setAttribute("opacity", "0"); group.appendChild(circle);
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(cx)); text.setAttribute("y", String(cy + 4));
      text.setAttribute("text-anchor", "middle"); text.setAttribute("fill", "var(--color-text-primary)");
      text.setAttribute("font-size", "14"); text.setAttribute("opacity", "0");
      text.textContent = label; group.appendChild(text);
      const nodeDelay = i * (duration * 0.5 / nodeCount);
      tl.to([circle, text], { opacity: 1, duration: duration * 0.15 }, nodeDelay);
      if (i < nodeCount - 1) {
        const nextCx = spacing * (i + 2);
        const arrow = document.createElementNS(ns, "line");
        arrow.setAttribute("x1", String(cx + nodeR + 4)); arrow.setAttribute("y1", String(cy));
        arrow.setAttribute("x2", String(cx + nodeR + 4)); arrow.setAttribute("y2", String(cy));
        arrow.setAttribute("stroke", color); arrow.setAttribute("stroke-width", "2");
        arrow.setAttribute("opacity", "0.6"); arrow.setAttribute("data-handoff-role", "line");
        group.appendChild(arrow);
        const arrowHead = document.createElementNS(ns, "polygon");
        const tipX = nextCx - nodeR - 4;
        arrowHead.setAttribute("points", `${tipX - 6},${cy - 4} ${tipX},${cy} ${tipX - 6},${cy + 4}`);
        arrowHead.setAttribute("fill", color); arrowHead.setAttribute("opacity", "0");
        group.appendChild(arrowHead);
        const arrowDelay = nodeDelay + duration * 0.1;
        tl.to(arrow, { attr: { x2: tipX - 6 }, duration: duration * 0.2, ease: "power2.out" }, arrowDelay);
        tl.to(arrowHead, { opacity: 0.6, duration: 0.1 }, arrowDelay + duration * 0.2);
      }
    });
    return tl;
  },
};
