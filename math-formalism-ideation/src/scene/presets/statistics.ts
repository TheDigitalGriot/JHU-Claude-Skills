import type { SceneDirective } from "../../types.js";
export const statisticsLoadingScene: SceneDirective = {
  type: "scene-setter",
  narrative: "Analyzing statistical distributions...",
  visualHints: [
    { primitive: "particles-scatter", config: { count: 30 } },
    { primitive: "bell-curve-form" },
  ],
  mood: "analytical",
  duration: 2500,
};
