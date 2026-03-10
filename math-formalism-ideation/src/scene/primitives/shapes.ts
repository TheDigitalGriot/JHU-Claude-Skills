import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const bellCurveForm: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const tl = gsap.timeline();
    const color = config?.color ?? "var(--color-ring-primary)";
    const mu = (config?.mu as number) ?? 0; const sigma = (config?.sigma as number) ?? 1;
    const margin = 40; const plotW = width - margin * 2; const plotH = height - margin * 2 - 20;
    const points = 100;
    const pathData: string[] = []; const areaData: string[] = [];
    for (let i = 0; i <= points; i++) {
      const t = i / points; const x = margin + t * plotW;
      const xVal = mu - 4 * sigma + t * 8 * sigma;
      const yVal = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((xVal - mu) / sigma) ** 2);
      const maxY = 1 / (sigma * Math.sqrt(2 * Math.PI));
      const y = margin + plotH - (yVal / maxY) * plotH * 0.9;
      pathData.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
      areaData.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    areaData.push(`L ${margin + plotW} ${margin + plotH} L ${margin} ${margin + plotH} Z`);
    const area = document.createElementNS(ns, "path");
    area.setAttribute("d", areaData.join(" ")); area.setAttribute("fill", color);
    area.setAttribute("fill-opacity", "0"); area.setAttribute("data-handoff-role", "line");
    group.appendChild(area);
    const line = document.createElementNS(ns, "path");
    line.setAttribute("d", pathData.join(" ")); line.setAttribute("fill", "none");
    line.setAttribute("stroke", color); line.setAttribute("stroke-width", "2.5");
    const totalLength = 800;
    line.setAttribute("stroke-dasharray", `${totalLength} ${totalLength}`);
    line.setAttribute("stroke-dashoffset", String(totalLength));
    line.setAttribute("data-handoff-role", "line"); group.appendChild(line);
    const baseline = document.createElementNS(ns, "line");
    baseline.setAttribute("x1", String(margin)); baseline.setAttribute("y1", String(margin + plotH));
    baseline.setAttribute("x2", String(margin + plotW)); baseline.setAttribute("y2", String(margin + plotH));
    baseline.setAttribute("stroke", "var(--color-border)"); baseline.setAttribute("stroke-width", "1");
    baseline.setAttribute("opacity", "0"); baseline.setAttribute("data-handoff-role", "axis");
    group.appendChild(baseline);
    tl.to(baseline, { opacity: 0.5, duration: duration * 0.15 }, 0);
    tl.to(line, { strokeDashoffset: 0, duration: duration * 0.6, ease: "power2.inOut" }, duration * 0.1);
    tl.to(area, { fillOpacity: 0.2, duration: duration * 0.3, ease: "power2.out" }, duration * 0.5);
    return tl;
  },
};

export const confidenceBand: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const tl = gsap.timeline();
    const color = config?.color ?? "var(--color-ring-primary)";
    const label = (config?.label as string) ?? "95%";
    const margin = 40; const plotW = width - margin * 2; const plotH = height - margin * 2 - 20;
    const centerPoints: string[] = []; const upperPoints: string[] = []; const lowerPoints: string[] = [];
    for (let i = 0; i <= 50; i++) {
      const t = i / 50; const x = margin + t * plotW;
      const cy = margin + plotH * 0.3 + Math.sin(t * Math.PI) * plotH * 0.2;
      const band = 15 + t * 20;
      centerPoints.push(`${i === 0 ? "M" : "L"} ${x} ${cy}`);
      upperPoints.push(`${i === 0 ? "M" : "L"} ${x} ${cy - band}`);
      lowerPoints.push(`L ${x} ${cy + band}`);
    }
    const bandPath = upperPoints.join(" ") + " " + lowerPoints.reverse().join(" ") + " Z";
    const bandEl = document.createElementNS(ns, "path");
    bandEl.setAttribute("d", bandPath); bandEl.setAttribute("fill", color);
    bandEl.setAttribute("fill-opacity", "0"); group.appendChild(bandEl);
    const centerLine = document.createElementNS(ns, "path");
    centerLine.setAttribute("d", centerPoints.join(" ")); centerLine.setAttribute("fill", "none");
    centerLine.setAttribute("stroke", color); centerLine.setAttribute("stroke-width", "2");
    centerLine.setAttribute("opacity", "0"); centerLine.setAttribute("data-handoff-role", "line");
    group.appendChild(centerLine);
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(width - margin - 10)); text.setAttribute("y", String(margin + plotH * 0.5));
    text.setAttribute("fill", color); text.setAttribute("font-size", "11"); text.setAttribute("opacity", "0");
    text.textContent = label; group.appendChild(text);
    tl.to(centerLine, { opacity: 1, duration: duration * 0.3 }, 0);
    tl.to(bandEl, { fillOpacity: 0.15, duration: duration * 0.5, ease: "power2.out" }, duration * 0.2);
    tl.to(text, { opacity: 0.6, duration: duration * 0.2 }, duration * 0.6);
    return tl;
  },
};

export const axisScale: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const tl = gsap.timeline();
    const xLabel = (config?.xLabel as string) ?? "x"; const yLabel = (config?.yLabel as string) ?? "y";
    const margin = 40;
    const xAxis = document.createElementNS(ns, "line");
    xAxis.setAttribute("x1", String(margin)); xAxis.setAttribute("y1", String(height - margin - 20));
    xAxis.setAttribute("x2", String(margin)); xAxis.setAttribute("y2", String(height - margin - 20));
    xAxis.setAttribute("stroke", "var(--color-text-secondary)"); xAxis.setAttribute("stroke-width", "1.5");
    xAxis.setAttribute("data-handoff-role", "axis"); group.appendChild(xAxis);
    const yAxis = document.createElementNS(ns, "line");
    yAxis.setAttribute("x1", String(margin)); yAxis.setAttribute("y1", String(height - margin - 20));
    yAxis.setAttribute("x2", String(margin)); yAxis.setAttribute("y2", String(height - margin - 20));
    yAxis.setAttribute("stroke", "var(--color-text-secondary)"); yAxis.setAttribute("stroke-width", "1.5");
    yAxis.setAttribute("data-handoff-role", "axis"); group.appendChild(yAxis);
    tl.to(xAxis, { attr: { x2: width - margin }, duration: duration * 0.4, ease: "power2.out" }, 0);
    tl.to(yAxis, { attr: { y2: margin }, duration: duration * 0.4, ease: "power2.out" }, 0.1);
    const xText = document.createElementNS(ns, "text");
    xText.setAttribute("x", String(width - margin)); xText.setAttribute("y", String(height - margin - 4));
    xText.setAttribute("fill", "var(--color-text-secondary)"); xText.setAttribute("font-size", "12");
    xText.setAttribute("opacity", "0"); xText.textContent = `${xLabel} \u2192`; group.appendChild(xText);
    const yText = document.createElementNS(ns, "text");
    yText.setAttribute("x", String(margin - 8)); yText.setAttribute("y", String(margin));
    yText.setAttribute("fill", "var(--color-text-secondary)"); yText.setAttribute("font-size", "12");
    yText.setAttribute("opacity", "0"); yText.textContent = `${yLabel} \u2191`; group.appendChild(yText);
    tl.to([xText, yText], { opacity: 0.7, duration: duration * 0.2 }, duration * 0.4);
    return tl;
  },
};
