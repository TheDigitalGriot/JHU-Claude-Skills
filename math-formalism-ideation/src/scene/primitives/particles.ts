import gsap from "gsap";
import type { PrimitiveRenderer } from "../engine.js";

const ns = "http://www.w3.org/2000/svg";

export const particlesScatter: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const count = config?.count ?? 30;
    const color = config?.color ?? "var(--color-ring-primary)";
    const tl = gsap.timeline();

    const circles: SVGCircleElement[] = [];
    for (let i = 0; i < count; i++) {
      const cx = Math.random() * (width - 40) + 20;
      const cy = Math.random() * (height - 60) + 20;
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", "3");
      circle.setAttribute("fill", color);
      circle.setAttribute("opacity", "0");
      circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);
      circles.push(circle);
    }

    // Fade in with stagger
    tl.to(circles, {
      opacity: 0.7,
      duration: duration * 0.3,
      stagger: { each: duration * 0.5 / count, from: "random" },
      ease: "power2.out",
    });

    // Brownian drift
    circles.forEach(circle => {
      const drift = () => {
        gsap.to(circle, {
          cx: `+=${(Math.random() - 0.5) * 20}`,
          cy: `+=${(Math.random() - 0.5) * 20}`,
          duration: 1 + Math.random(),
          ease: "sine.inOut",
          onComplete: drift,
        });
      };
      tl.call(drift, [], duration * 0.4);
    });

    return tl;
  },
};

export const particlesCluster: PrimitiveRenderer = {
  render(group, config, width, height, duration) {
    const count = config?.count ?? 30;
    const groups = (config?.groups as number) ?? 2;
    const colors = (config?.colors as string[]) ?? ["#60a5fa", "#10b981", "#f59e0b"];
    const tl = gsap.timeline();

    // Define cluster centers
    const centers = Array.from({ length: groups }, (_, i) => ({
      x: (width / (groups + 1)) * (i + 1),
      y: height / 2 + (Math.random() - 0.5) * 60,
    }));

    const circles: SVGCircleElement[] = [];
    for (let i = 0; i < count; i++) {
      const cx = Math.random() * (width - 40) + 20;
      const cy = Math.random() * (height - 60) + 20;
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", "3");
      circle.setAttribute("fill", colors[i % groups % colors.length]);
      circle.setAttribute("opacity", "0.7");
      circle.setAttribute("data-handoff-role", "point");
      group.appendChild(circle);
      circles.push(circle);
    }

    // Start scattered
    tl.from(circles, {
      opacity: 0,
      duration: duration * 0.2,
      stagger: 0.01,
    });

    // Gravitate to clusters
    circles.forEach((circle, i) => {
      const center = centers[i % groups];
      tl.to(circle, {
        cx: center.x + (Math.random() - 0.5) * 30,
        cy: center.y + (Math.random() - 0.5) * 30,
        duration: duration * 0.6,
        ease: "power2.inOut",
      }, duration * 0.3);
    });

    // Draw cluster boundaries
    centers.forEach((center, i) => {
      const ellipse = document.createElementNS(ns, "ellipse");
      ellipse.setAttribute("cx", String(center.x));
      ellipse.setAttribute("cy", String(center.y));
      ellipse.setAttribute("rx", "25");
      ellipse.setAttribute("ry", "20");
      ellipse.setAttribute("fill", "none");
      ellipse.setAttribute("stroke", colors[i % colors.length]);
      ellipse.setAttribute("stroke-width", "1");
      ellipse.setAttribute("stroke-dasharray", "4,3");
      ellipse.setAttribute("opacity", "0");
      group.appendChild(ellipse);

      tl.to(ellipse, { opacity: 0.4, duration: duration * 0.2 }, duration * 0.7);
    });

    return tl;
  },
};
