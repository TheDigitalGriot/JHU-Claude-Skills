import type { SceneDirective } from "../../types.js";
export const financeLoadingScene: SceneDirective = {
  type: "scene-setter",
  narrative: "Analyzing transaction patterns...",
  visualHints: [
    { primitive: "icon-flow", config: { labels: ["\ud83d\udcb3", "\ud83d\udd0d", "\u2713"], colors: ["#3b82f6", "#f59e0b", "#10b981"] } },
    { primitive: "particles-scatter", config: { count: 35 } },
  ],
  mood: "analytical",
  duration: 2500,
};
