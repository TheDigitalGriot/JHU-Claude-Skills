import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const splitClassify: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const labels = (config?.labels as string[]) ?? ["Class A", "Class B"];
    const colors = (config?.colors as string[]) ?? ["#10b981", "#ef4444"];
    const count = config?.count ?? 20;
    const tl = gsap.timeline();
    const binWidth = 80;
    const binHeight = 60;
    const binY = height / 2;
    const bins = labels.map((label, i) => ({
      x: (width / (labels.length + 1)) * (i + 1), y: binY, label, color: colors[i % colors.length],
    }));
    bins.forEach((bin) => {
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(bin.x - binWidth / 2)); rect.setAttribute("y", String(bin.y));
      rect.setAttribute("width", String(binWidth)); rect.setAttribute("height", String(binHeight));
      rect.setAttribute("rx", "6"); rect.setAttribute("fill", `${bin.color}20`);
      rect.setAttribute("stroke", bin.color); rect.setAttribute("stroke-width", "1.5");
      rect.setAttribute("opacity", "0"); group.appendChild(rect);
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(bin.x)); text.setAttribute("y", String(bin.y + binHeight + 18));
      text.setAttribute("text-anchor", "middle"); text.setAttribute("fill", "var(--color-text-secondary)");
      text.setAttribute("font-size", "11"); text.textContent = bin.label;
      text.setAttribute("opacity", "0"); group.appendChild(text);
      tl.to([rect, text], { opacity: 1, duration: duration * 0.2, ease: "power2.out" }, 0);
    });
    for (let i = 0; i < count; i++) {
      const circle = document.createElementNS(ns, "circle");
      const startX = width / 2 + (Math.random() - 0.5) * 100;
      const startY = binY - 60 + (Math.random() - 0.5) * 30;
      circle.setAttribute("cx", String(startX)); circle.setAttribute("cy", String(startY));
      circle.setAttribute("r", "3"); circle.setAttribute("opacity", "0");
      circle.setAttribute("data-handoff-role", "point");
      const binIdx = Math.random() > 0.5 ? 0 : 1;
      const bin = bins[binIdx % bins.length];
      circle.setAttribute("fill", bin.color); group.appendChild(circle);
      tl.to(circle, { opacity: 0.8, duration: 0.15 }, duration * 0.15 + i * (duration * 0.3 / count));
      tl.to(circle, {
        cx: bin.x + (Math.random() - 0.5) * (binWidth - 10),
        cy: bin.y + 10 + Math.random() * (binHeight - 20),
        duration: duration * 0.4, ease: "power2.in",
      }, duration * 0.3 + i * (duration * 0.3 / count));
    }
    return tl;
  },
};

export const outlierIsolate: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const count = config?.count ?? 5;
    const color = config?.color ?? "#ef4444";
    const tl = gsap.timeline();
    const normalCount = 15;
    const cx = width / 2; const cy = height / 2;
    for (let i = 0; i < normalCount; i++) {
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx + (Math.random() - 0.5) * 40));
      circle.setAttribute("cy", String(cy + (Math.random() - 0.5) * 40));
      circle.setAttribute("r", "3"); circle.setAttribute("fill", "var(--color-ring-primary)");
      circle.setAttribute("opacity", "0"); circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);
      tl.to(circle, { opacity: 0.5, duration: duration * 0.15 }, i * 0.02);
    }
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 80 + Math.random() * 40;
      const ox = cx + Math.cos(angle) * dist; const oy = cy + Math.sin(angle) * dist;
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(ox)); circle.setAttribute("cy", String(oy));
      circle.setAttribute("r", "4"); circle.setAttribute("fill", color);
      circle.setAttribute("opacity", "0"); circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);
      const ring = document.createElementNS(ns, "circle");
      ring.setAttribute("cx", String(ox)); ring.setAttribute("cy", String(oy));
      ring.setAttribute("r", "12"); ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", color); ring.setAttribute("stroke-width", "1");
      ring.setAttribute("stroke-dasharray", "3,2"); ring.setAttribute("opacity", "0");
      group.appendChild(ring);
      const startT = duration * 0.3 + i * (duration * 0.3 / count);
      tl.to(circle, { opacity: 0.9, duration: duration * 0.15 }, startT);
      tl.to(ring, { opacity: 0.5, duration: duration * 0.2 }, startT + duration * 0.1);
      tl.to(ring, { r: 16, opacity: 0, duration: duration * 0.3, ease: "power2.out", repeat: 1, yoyo: true }, startT + duration * 0.2);
    }
    return tl;
  },
};
