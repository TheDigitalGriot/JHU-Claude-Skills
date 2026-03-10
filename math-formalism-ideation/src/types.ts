export type MathDomain =
  | "calculus"
  | "linear-algebra"
  | "statistics"
  | "algebra"
  | "physics"
  | "finance"
  | "general";

export type GraphType =
  | "function-plot"
  | "vector-field"
  | "distribution"
  | "scatter"
  | "bar"
  | "surface-3d";

export interface GraphState {
  /** Data series to plot — format depends on graph.type */
  data: Record<string, unknown>[];
  /** Axis labels, ranges, titles */
  axes?: {
    x?: { label?: string; domain?: [number, number] };
    y?: { label?: string; domain?: [number, number] };
  };
  /** IDs of annotations to visually mark on the graph */
  highlightRegions?: Array<{
    annotationId: string;
    type: "point" | "region" | "line";
    coords: Record<string, number>;
  }>;
}

export interface Annotation {
  id: string;
  latexFragment: string;
  label: string;
  description: string;
}

export interface Step {
  id: string;
  title: string;
  narrative: string;
  algebraDetail: string;
  highlightIds: string[];
  graphState: GraphState;
}

export interface Parameter {
  name: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
}

export interface FormulaPayload {
  formula: {
    latex: string;
    description: string;
    domain: MathDomain;
  };
  annotations: Annotation[];
  steps: Step[];
  parameters: Parameter[];
  graph: {
    type: GraphType;
    config: Record<string, unknown>;
  };
}

/** Highlight color palette — assigned by annotation index */
export const HIGHLIGHT_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function getAnnotationColor(index: number): string {
  return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
}

// ─── Scene Composition Types ───

export type SceneType = "scene-setter" | "explainer";

export type SceneMood = "dramatic" | "calm" | "urgent" | "analytical";

export type PrimitiveType =
  | "particles-scatter"
  | "particles-cluster"
  | "tree-partition"
  | "flow-arrows"
  | "bell-curve-form"
  | "split-classify"
  | "heatmap-pulse"
  | "axis-scale"
  | "icon-flow"
  | "outlier-isolate"
  | "confidence-band"
  | "matrix-grid";

export interface VisualHint {
  primitive: PrimitiveType;
  config?: {
    count?: number;
    color?: string;
    labels?: string[];
    delay?: number;
    [key: string]: unknown;
  };
}

export interface SceneDirective {
  type: SceneType;
  narrative: string;
  visualHints: VisualHint[];
  duration?: number;
  mood?: SceneMood;
}

// ─── Transition Types ───

export type MorphType = "interpolate" | "crossfade" | "stagger-enter" | "none";

export interface StepTransition {
  morph: MorphType;
  duration?: number;
  easing?: string;
  delay?: number;
}

export interface TransitionDefaults {
  morph: MorphType;
  duration: number;
  easing: string;
}

// ─── Stage Types ───

export type StageState = "loading" | "revealing" | "interactive" | "interstitial";

// ─── Extended Step ───

export interface StepV2 {
  id: string;
  title: string;
  narrative: string;
  algebraDetail?: string;
  highlightIds?: string[];
  graphType?: GraphType;
  graphState: GraphState;
  interstitial?: SceneDirective;
  transition?: StepTransition;
}

// ─── Extended Payload ───

export interface FormulaPayloadV2 extends Omit<FormulaPayload, "steps"> {
  steps: StepV2[];
  loadingScene?: SceneDirective;
  transitions?: TransitionDefaults;
}
