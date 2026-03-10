import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const iconFlow: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const labels = (config?.labels as string[]) ?? ["\ud83d\udcca", "\ud83d\udd2c", "\u2713"];
    const colors = (config?.colors as string[]) ?? ["#3b82f6", "#f59e0b", "#10b981"];
    const tl = gsap.timeline();
    const nodeCount = labels.length; const spacing = width / (nodeCount + 1); const cy = height / 2; const nodeR = 22;
    labels.forEach((label, i) => {
      const cx = spacing * (i + 1); const color = colors[i % colors.length];
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx)); circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(nodeR)); circle.setAttribute("fill", `${color}20`);
      circle.setAttribute("stroke", color); circle.setAttribute("stroke-width", "1.5");
      circle.setAttribute("opacity", "0"); group.appendChild(circle);
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(cx)); text.setAttribute("y", String(cy + 6));
      text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "18");
      text.setAttribute("opacity", "0"); text.textContent = label; group.appendChild(text);
      const nodeDelay = i * (duration * 0.5 / nodeCount);
      tl.to(circle, { opacity: 1, duration: duration * 0.12, ease: "back.out(1.7)" }, nodeDelay);
      tl.to(text, { opacity: 1, duration: duration * 0.12 }, nodeDelay + 0.05);
      if (i < nodeCount - 1) {
        const nextCx = spacing * (i + 2);
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(cx + nodeR + 6)); line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(cx + nodeR + 6)); line.setAttribute("y2", String(cy));
        line.setAttribute("stroke", "#555"); line.setAttribute("stroke-width", "1.5");
        group.appendChild(line);
        const arrowTip = document.createElementNS(ns, "polygon");
        const tipX = nextCx - nodeR - 6;
        arrowTip.setAttribute("points", `${tipX - 5},${cy - 3} ${tipX},${cy} ${tipX - 5},${cy + 3}`);
        arrowTip.setAttribute("fill", "#555"); arrowTip.setAttribute("opacity", "0");
        group.appendChild(arrowTip);
        const arrowDelay = nodeDelay + duration * 0.08;
        tl.to(line, { attr: { x2: tipX - 5 }, duration: duration * 0.15 }, arrowDelay);
        tl.to(arrowTip, { opacity: 1, duration: 0.08 }, arrowDelay + duration * 0.15);
      }
    });
    return tl;
  },
};
