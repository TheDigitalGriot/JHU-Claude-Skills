import type { SceneDirective } from "../../types.js";
export const generalLoadingScene: SceneDirective = {
  type: "scene-setter",
  narrative: "Building your visualization...",
  visualHints: [
    { primitive: "particles-scatter", config: { count: 25 } },
    { primitive: "axis-scale" },
  ],
  mood: "calm",
  duration: 2500,
};
