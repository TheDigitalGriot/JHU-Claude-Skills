import { registerRenderer } from "../engine.js";
import { functionPlotRenderer } from "./function-plot.js";
import { distributionRenderer } from "./distribution.js";
import { scatterRenderer } from "./scatter.js";
import { barRenderer } from "./bar.js";
import { vectorFieldRenderer } from "./vector-field.js";

export function registerAllRenderers(): void {
  registerRenderer("function-plot", functionPlotRenderer);
  registerRenderer("distribution", distributionRenderer);
  registerRenderer("scatter", scatterRenderer);
  registerRenderer("bar", barRenderer);
  registerRenderer("vector-field", vectorFieldRenderer);
  // surface-3d is not yet implemented — alias to scatter as a fallback
  registerRenderer("surface-3d" as any, scatterRenderer);
}
