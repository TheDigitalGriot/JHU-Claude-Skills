import { registerPrimitive } from "../engine.js";
import { particlesScatter, particlesCluster } from "./particles.js";
import { splitClassify, outlierIsolate } from "./classify.js";
import { treePartition, matrixGrid, heatmapPulse } from "./grids.js";
import { bellCurveForm, confidenceBand, axisScale } from "./shapes.js";
import { flowArrows } from "./arrows.js";
import { iconFlow } from "./icons.js";

export function registerAllPrimitives(): void {
  registerPrimitive("particles-scatter", particlesScatter);
  registerPrimitive("particles-cluster", particlesCluster);
  registerPrimitive("split-classify", splitClassify);
  registerPrimitive("outlier-isolate", outlierIsolate);
  registerPrimitive("tree-partition", treePartition);
  registerPrimitive("matrix-grid", matrixGrid);
  registerPrimitive("heatmap-pulse", heatmapPulse);
  registerPrimitive("bell-curve-form", bellCurveForm);
  registerPrimitive("confidence-band", confidenceBand);
  registerPrimitive("axis-scale", axisScale);
  registerPrimitive("flow-arrows", flowArrows);
  registerPrimitive("icon-flow", iconFlow);
}
