// === FormulaPayload types (mirrored from math-formalism-ideation) ===

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
  data: Record<string, unknown>[];
  axes?: {
    x?: { label?: string; domain?: [number, number] };
    y?: { label?: string; domain?: [number, number] };
  };
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

export const HIGHLIGHT_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export function getAnnotationColor(index: number): string {
  return HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
}

// === Scenario types ===

export interface Scenario {
  prompt: string;
  thinking?: string;
  toolCallName: string;
  response: string;
  payload: FormulaPayload;
}

// === Simulation state ===

export type SimulationPhase = 'idle' | 'thinking' | 'tool-call' | 'streaming' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool-call';
  content: string;
  toolPayload?: FormulaPayload;
  isExpanded?: boolean;
}

export interface SimulationState {
  phase: SimulationPhase;
  messages: Message[];
  activeScenario: Scenario | null;
  payload: FormulaPayload | null;
  activeStepIndex: number;
  parameterValues: Record<string, number>;
  isPlaying: boolean;
  streamedText: string;
}
