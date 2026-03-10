import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const treePartition: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const depth = (config?.depth as number) ?? 3;
    const tl = gsap.timeline();
    const margin = 40;
    const lines: SVGLineElement[] = [];
    function addSplit(x1: number, y1: number, x2: number, y2: number, d: number, horizontal: boolean) {
      if (d > depth) return;
      const line = document.createElementNS(ns, "line");
      if (horizontal) {
        const splitY = y1 + (y2 - y1) * (0.3 + Math.random() * 0.4);
        line.setAttribute("x1", String(x1)); line.setAttribute("y1", String(splitY));
        line.setAttribute("x2", String(x2)); line.setAttribute("y2", String(splitY));
        addSplit(x1, y1, x2, splitY, d + 1, false);
        addSplit(x1, splitY, x2, y2, d + 1, false);
      } else {
        const splitX = x1 + (x2 - x1) * (0.3 + Math.random() * 0.4);
        line.setAttribute("x1", String(splitX)); line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(splitX)); line.setAttribute("y2", String(y2));
        addSplit(x1, y1, splitX, y2, d + 1, true);
        addSplit(splitX, y1, x2, y2, d + 1, true);
      }
      line.setAttribute("stroke", "#f59e0b");
      line.setAttribute("stroke-width", String(Math.max(1, 2 - d * 0.3)));
      line.setAttribute("stroke-dasharray", "4,3"); line.setAttribute("opacity", "0");
      line.setAttribute("data-handoff-role", "line"); group.appendChild(line); lines.push(line);
    }
    addSplit(margin, margin, width - margin, height - margin - 20, 0, Math.random() > 0.5);
    lines.forEach((line, i) => {
      tl.to(line, { opacity: 0.6, duration: duration * 0.8 / Math.max(lines.length, 1), ease: "power2.out" },
        i * (duration * 0.7 / Math.max(lines.length, 1)));
    });
    return tl;
  },
};

export const matrixGrid: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const rows = (config?.rows as number) ?? 2;
    const cols = (config?.cols as number) ?? 2;
    const labels = (config?.labels as string[]) ?? [];
    const tl = gsap.timeline();
    const cellSize = Math.min((width - 80) / cols, (height - 80) / rows, 60);
    const gridWidth = cols * cellSize; const gridHeight = rows * cellSize;
    const startX = (width - gridWidth) / 2; const startY = (height - gridHeight) / 2 - 10;
    const colors = ["#10b981", "#ef444430", "#ef444430", "#10b981"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(startX + c * cellSize)); rect.setAttribute("y", String(startY + r * cellSize));
        rect.setAttribute("width", String(cellSize - 2)); rect.setAttribute("height", String(cellSize - 2));
        rect.setAttribute("rx", "4"); rect.setAttribute("fill", colors[i % colors.length]);
        rect.setAttribute("opacity", "0"); rect.setAttribute("data-handoff-role", "rect");
        group.appendChild(rect);
        if (labels[i]) {
          const text = document.createElementNS(ns, "text");
          text.setAttribute("x", String(startX + c * cellSize + cellSize / 2));
          text.setAttribute("y", String(startY + r * cellSize + cellSize / 2 + 4));
          text.setAttribute("text-anchor", "middle"); text.setAttribute("fill", "var(--color-text-primary)");
          text.setAttribute("font-size", "11"); text.setAttribute("font-weight", "600");
          text.setAttribute("opacity", "0"); text.textContent = labels[i]; group.appendChild(text);
          tl.to([rect, text], { opacity: i === 0 || i === rows * cols - 1 ? 0.8 : 0.4, duration: duration * 0.2, ease: "power2.out" },
            i * (duration * 0.6 / (rows * cols)));
        } else {
          tl.to(rect, { opacity: 0.6, duration: duration * 0.2 }, i * (duration * 0.6 / (rows * cols)));
        }
      }
    }
    return tl;
  },
};

export const heatmapPulse: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const rows = (config?.rows as number) ?? 4;
    const cols = (config?.cols as number) ?? 4;
    const tl = gsap.timeline();
    const cellSize = Math.min((width - 60) / cols, (height - 60) / rows, 40);
    const startX = (width - cols * cellSize) / 2; const startY = (height - rows * cellSize) / 2 - 10;
    const color = config?.color ?? "var(--color-ring-primary)";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const intensity = Math.random();
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(startX + c * cellSize)); rect.setAttribute("y", String(startY + r * cellSize));
        rect.setAttribute("width", String(cellSize - 2)); rect.setAttribute("height", String(cellSize - 2));
        rect.setAttribute("rx", "2"); rect.setAttribute("fill", color); rect.setAttribute("opacity", "0");
        group.appendChild(rect);
        const i = r * cols + c;
        tl.to(rect, { opacity: 0.1 + intensity * 0.8, duration: duration * 0.15, ease: "power2.out" },
          i * (duration * 0.5 / (rows * cols)));
      }
    }
    return tl;
  },
};
