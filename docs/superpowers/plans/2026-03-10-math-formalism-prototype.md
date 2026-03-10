# Math Formalism Prototype Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simulated agentic Claude chat interface that demonstrates the Math Formalism Ideation MCP App with split-screen layout, typewriter chat, expandable tool-call blocks, and interactive math visualization.

**Architecture:** Component-based React app with a SimulationContext provider managing all shared state via useReducer. Left panel is a Claude-style chat with simulated message flow; right panel renders the math visualization (KaTeX formula, step cards, Observable Plot graph, parameter sliders). A SimulationEngine orchestrates timing via setTimeout chains.

**Tech Stack:** React 19, TypeScript, Vite, KaTeX, Observable Plot, math.js, GSAP, CSS Modules

**Spec:** `docs/superpowers/specs/2026-03-10-math-formalism-prototype-design.md`

---

## Chunk 1: Project Scaffolding & Core Types

### Task 1: Scaffold Vite React Project

**Files:**
- Create: `math-formalism-prototype/package.json`
- Create: `math-formalism-prototype/index.html`
- Create: `math-formalism-prototype/vite.config.ts`
- Create: `math-formalism-prototype/tsconfig.json`
- Create: `math-formalism-prototype/src/main.tsx`
- Create: `math-formalism-prototype/src/vite-env.d.ts`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p math-formalism-prototype/src
```

- [ ] **Step 2: Create package.json**

Create `math-formalism-prototype/package.json`:
```json
{
  "name": "math-formalism-prototype",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "katex": "^0.16.38",
    "@observablehq/plot": "^0.6.17",
    "mathjs": "^15.1.1",
    "gsap": "^3.14.2"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@types/katex": "^0.16.7",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

Create `math-formalism-prototype/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
});
```

- [ ] **Step 4: Create tsconfig.json**

Create `math-formalism-prototype/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create index.html**

Create `math-formalism-prototype/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Math Formalism Prototype</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.38/dist/katex.min.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 6: Create entry point and vite-env**

Create `math-formalism-prototype/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />
```

Create `math-formalism-prototype/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Create placeholder App**

Create `math-formalism-prototype/src/App.tsx`:
```tsx
export function App() {
  return <div>Math Formalism Prototype</div>;
}
```

- [ ] **Step 8: Install dependencies and verify**

```bash
cd math-formalism-prototype && npm install && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add math-formalism-prototype/
git commit -m "feat: scaffold math-formalism-prototype Vite React project"
```

---

### Task 2: Define Types and Scenario Interface

**Files:**
- Create: `math-formalism-prototype/src/types.ts`

- [ ] **Step 1: Create types file**

Mirror `FormulaPayload` and related types from `math-formalism-ideation/src/types.ts`, plus add the `Scenario` and `SimulationState` interfaces.

Create `math-formalism-prototype/src/types.ts`:
```typescript
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
```

- [ ] **Step 2: Verify types compile**

```bash
cd math-formalism-prototype && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add math-formalism-prototype/src/types.ts
git commit -m "feat: add FormulaPayload, Scenario, and SimulationState types"
```

---

### Task 3: Create Scenario JSON Files

**Files:**
- Create: `math-formalism-prototype/src/scenarios/exponential-decay.json`
- Create: `math-formalism-prototype/src/scenarios/normal-distribution.json`

- [ ] **Step 1: Create scenarios directory**

```bash
mkdir -p math-formalism-prototype/src/scenarios
```

- [ ] **Step 2: Create exponential decay scenario**

Adapt from `math-formalism-ideation/test-payload.json`, wrapping it in the `Scenario` interface with `prompt`, `thinking`, `toolCallName`, `response`, and `payload` fields.

Create `math-formalism-prototype/src/scenarios/exponential-decay.json`:
```json
{
  "prompt": "Explain exponential decay and show me how the decay constant affects the curve",
  "thinking": "I'll create an interactive visualization of exponential decay, showing how N(t) = N₀·e^(-λt) behaves as we vary the decay constant λ...",
  "toolCallName": "visualize_formula",
  "response": "Exponential decay describes how a quantity decreases over time at a rate proportional to its current value. The formula N(t) = N₀·e^(-λt) captures this beautifully — the decay constant λ controls how quickly the substance diminishes, while the initial mass N₀ sets the starting point.\n\nI've set up an interactive visualization where you can:\n- Step through the derivation to see how each component contributes\n- Adjust the decay constant λ to see faster or slower decay\n- Change the initial mass N₀ to explore different starting conditions\n\nNotice how the curve never quite reaches zero — it asymptotically approaches it. Each equal time interval reduces the remaining quantity by the same fraction, which is the hallmark of exponential behavior.",
  "payload": {
    "formula": {
      "latex": "N(t) = N_0 \\cdot e^{-\\lambda t}",
      "description": "Exponential Decay: Radioactive substance mass over time",
      "domain": "physics"
    },
    "annotations": [
      {
        "id": "result",
        "latexFragment": "N(t)",
        "label": "Remaining mass",
        "description": "The quantity of substance remaining at time t"
      },
      {
        "id": "initial",
        "latexFragment": "N_0",
        "label": "Initial mass",
        "description": "The starting quantity of substance at t=0"
      },
      {
        "id": "decay",
        "latexFragment": "e^{-\\lambda t}",
        "label": "Decay factor",
        "description": "The exponential decay factor — determines how quickly the substance decays"
      },
      {
        "id": "rate",
        "latexFragment": "\\lambda",
        "label": "Decay constant",
        "description": "The rate of decay — higher values mean faster decay"
      }
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "The Initial Condition",
        "narrative": "At time t=0, we start with N₀ units of our substance. This is our starting point — the full, undecayed quantity.",
        "algebraDetail": "N(0) = N_0 \\cdot e^{-\\lambda \\cdot 0} = N_0 \\cdot e^{0} = N_0 \\cdot 1 = N_0",
        "highlightIds": ["initial"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "Time (t)", "domain": [0, 10] },
            "y": { "label": "N(t)", "domain": [0, 110] }
          },
          "highlightRegions": [
            { "annotationId": "initial", "type": "point", "coords": { "x": 0, "y": 100 } }
          ]
        }
      },
      {
        "id": "step-2",
        "title": "The Decay Constant λ",
        "narrative": "The decay constant λ controls how fast the substance decays. A larger λ means faster decay. It's the probability per unit time that any given atom will decay.",
        "algebraDetail": "\\text{Half-life: } t_{1/2} = \\frac{\\ln 2}{\\lambda} \\approx \\frac{0.693}{\\lambda}",
        "highlightIds": ["rate", "decay"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "Time (t)", "domain": [0, 10] },
            "y": { "label": "N(t)", "domain": [0, 110] }
          }
        }
      },
      {
        "id": "step-3",
        "title": "The Exponential Decay Curve",
        "narrative": "As time progresses, the decay factor e^(-λt) shrinks exponentially. The curve never reaches zero — it asymptotically approaches it. Each equal time interval reduces the remaining quantity by the same fraction.",
        "algebraDetail": "N(t) = 100 \\cdot e^{-0.3t}",
        "highlightIds": ["decay", "result"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "Time (t)", "domain": [0, 10] },
            "y": { "label": "N(t)", "domain": [0, 110] }
          }
        }
      },
      {
        "id": "step-4",
        "title": "Half-Life in Action",
        "narrative": "The half-life is the time it takes for half the substance to decay. For λ=0.3, the half-life is about 2.31 time units. After one half-life, 50% remains. After two, 25%. After three, 12.5%.",
        "algebraDetail": "t_{1/2} = \\frac{\\ln 2}{0.3} \\approx 2.31 \\quad \\Rightarrow \\quad N(2.31) = 100 \\cdot e^{-0.3 \\cdot 2.31} \\approx 50",
        "highlightIds": ["result", "rate"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "Time (t)", "domain": [0, 10] },
            "y": { "label": "N(t)", "domain": [0, 110] }
          },
          "highlightRegions": [
            { "annotationId": "result", "type": "point", "coords": { "x": 2.31, "y": 50 } }
          ]
        }
      }
    ],
    "parameters": [
      { "name": "N_0", "label": "Initial mass (N₀)", "min": 1, "max": 200, "default": 100, "step": 1 },
      { "name": "lambda", "label": "Decay constant (λ)", "min": 0.01, "max": 2, "default": 0.3, "step": 0.01 }
    ],
    "graph": {
      "type": "function-plot",
      "config": {
        "expression": "N_0 * exp(-lambda * x)"
      }
    }
  }
}
```

- [ ] **Step 3: Create normal distribution scenario**

Create `math-formalism-prototype/src/scenarios/normal-distribution.json`:
```json
{
  "prompt": "Show me the normal distribution and how mean and standard deviation shape the bell curve",
  "thinking": "I'll visualize the Gaussian distribution f(x) = (1/σ√(2π))·e^(-(x-μ)²/(2σ²)), showing how μ shifts and σ stretches the bell curve...",
  "toolCallName": "visualize_formula",
  "response": "The normal distribution — the famous bell curve — is one of the most important distributions in statistics. Its shape is entirely determined by two parameters: the mean μ (which centers the curve) and the standard deviation σ (which controls its width).\n\nI've set up an interactive visualization where you can:\n- Step through the anatomy of the bell curve\n- Slide μ to shift the center left or right\n- Adjust σ to make the curve taller and narrower (small σ) or shorter and wider (large σ)\n\nThe key insight: about 68% of data falls within one σ of the mean, 95% within two, and 99.7% within three. This is the empirical rule that makes the normal distribution so powerful in practice.",
  "payload": {
    "formula": {
      "latex": "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\cdot e^{-\\frac{(x - \\mu)^2}{2\\sigma^2}}",
      "description": "Normal Distribution: The Gaussian probability density function",
      "domain": "statistics"
    },
    "annotations": [
      {
        "id": "output",
        "latexFragment": "f(x)",
        "label": "Probability density",
        "description": "The probability density at point x"
      },
      {
        "id": "normalizer",
        "latexFragment": "\\frac{1}{\\sigma\\sqrt{2\\pi}}",
        "label": "Normalization constant",
        "description": "Ensures the total area under the curve equals 1"
      },
      {
        "id": "exponent",
        "latexFragment": "e^{-\\frac{(x - \\mu)^2}{2\\sigma^2}}",
        "label": "Gaussian kernel",
        "description": "The bell-shaped exponential term — creates the symmetric falloff from the mean"
      },
      {
        "id": "mean",
        "latexFragment": "\\mu",
        "label": "Mean",
        "description": "The center of the distribution — where the peak occurs"
      },
      {
        "id": "std",
        "latexFragment": "\\sigma",
        "label": "Standard deviation",
        "description": "Controls the width of the bell curve — larger σ means more spread"
      }
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "The Bell Curve Shape",
        "narrative": "The normal distribution creates a symmetric, bell-shaped curve centered at the mean μ. The peak represents the most likely value, with probability tapering symmetrically in both directions.",
        "algebraDetail": "f(\\mu) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\cdot e^{0} = \\frac{1}{\\sigma\\sqrt{2\\pi}}",
        "highlightIds": ["output", "mean"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "x", "domain": [-5, 5] },
            "y": { "label": "f(x)", "domain": [0, 0.5] }
          },
          "highlightRegions": [
            { "annotationId": "mean", "type": "point", "coords": { "x": 0, "y": 0.3989 } }
          ]
        }
      },
      {
        "id": "step-2",
        "title": "The Mean μ Shifts the Center",
        "narrative": "Changing μ slides the entire curve left or right without changing its shape. The mean is both the center of symmetry and the expected value of the distribution.",
        "algebraDetail": "\\text{When } \\mu = 0: f(0) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\quad \\text{(peak at origin)}",
        "highlightIds": ["mean"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "x", "domain": [-5, 5] },
            "y": { "label": "f(x)", "domain": [0, 0.5] }
          }
        }
      },
      {
        "id": "step-3",
        "title": "Standard Deviation σ Controls Width",
        "narrative": "A smaller σ produces a tall, narrow peak — the data is tightly clustered around the mean. A larger σ produces a short, wide curve — the data is more spread out. The area under the curve always equals 1.",
        "algebraDetail": "\\sigma = 1: f(\\mu) \\approx 0.399 \\quad \\sigma = 2: f(\\mu) \\approx 0.199 \\quad \\sigma = 0.5: f(\\mu) \\approx 0.798",
        "highlightIds": ["std", "normalizer"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "x", "domain": [-5, 5] },
            "y": { "label": "f(x)", "domain": [0, 0.85] }
          }
        }
      },
      {
        "id": "step-4",
        "title": "The 68-95-99.7 Rule",
        "narrative": "The empirical rule: ~68% of data falls within 1σ of the mean, ~95% within 2σ, and ~99.7% within 3σ. This makes the normal distribution a powerful tool for understanding how data clusters and for detecting outliers.",
        "algebraDetail": "P(\\mu - \\sigma \\leq X \\leq \\mu + \\sigma) \\approx 0.6827 \\quad P(\\mu - 2\\sigma \\leq X \\leq \\mu + 2\\sigma) \\approx 0.9545",
        "highlightIds": ["std", "exponent"],
        "graphState": {
          "data": [],
          "axes": {
            "x": { "label": "x", "domain": [-5, 5] },
            "y": { "label": "f(x)", "domain": [0, 0.5] }
          },
          "highlightRegions": [
            { "annotationId": "std", "type": "region", "coords": { "x1": -1, "x2": 1 } }
          ]
        }
      }
    ],
    "parameters": [
      { "name": "mu", "label": "Mean (μ)", "min": -3, "max": 3, "default": 0, "step": 0.1 },
      { "name": "sigma", "label": "Standard deviation (σ)", "min": 0.2, "max": 3, "default": 1, "step": 0.1 }
    ],
    "graph": {
      "type": "distribution",
      "config": {
        "expression": "(1 / (sigma * sqrt(2 * pi))) * exp(-((x - mu)^2) / (2 * sigma^2))"
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add math-formalism-prototype/src/scenarios/
git commit -m "feat: add exponential decay and normal distribution scenarios"
```

---

## Chunk 2: Simulation Engine & State Management

### Task 4: Build Simulation Engine

**Files:**
- Create: `math-formalism-prototype/src/simulation/engine.ts`

- [ ] **Step 1: Create simulation directory**

```bash
mkdir -p math-formalism-prototype/src/simulation
```

- [ ] **Step 2: Create engine.ts**

The engine orchestrates the timed sequence of simulation phases by dispatching actions via setTimeout chains.

Create `math-formalism-prototype/src/simulation/engine.ts`:
```typescript
import type { Scenario, SimulationPhase, Message, FormulaPayload } from '../types';

export type SimulationAction =
  | { type: 'START_SIMULATION'; scenario: Scenario }
  | { type: 'ADVANCE_PHASE'; phase: SimulationPhase; message?: Message }
  | { type: 'STREAM_TEXT'; text: string }
  | { type: 'SET_PAYLOAD'; payload: FormulaPayload }
  | { type: 'SET_STEP'; index: number }
  | { type: 'UPDATE_PARAMETER'; name: string; value: number }
  | { type: 'TOGGLE_TOOL_EXPAND'; messageId: string }
  | { type: 'TOGGLE_PLAY' };

let idCounter = 0;
function nextId(): string {
  return `msg-${++idCounter}`;
}

/**
 * Run a simulated Claude response sequence.
 * Returns a cleanup function that cancels all pending timeouts.
 */
export function runSimulation(
  scenario: Scenario,
  dispatch: (action: SimulationAction) => void,
): () => void {
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  function schedule(fn: () => void, delay: number) {
    timeouts.push(setTimeout(fn, delay));
  }

  let elapsed = 0;

  // 1. User message appears instantly
  dispatch({
    type: 'ADVANCE_PHASE',
    phase: 'thinking',
    message: {
      id: nextId(),
      role: 'user',
      content: scenario.prompt,
    },
  });

  // 2. Thinking indicator (400ms)
  elapsed += 400;
  // Phase already set to 'thinking' above

  // 3. Tool call appears (1.2s after thinking starts)
  elapsed += 1200;
  schedule(() => {
    dispatch({
      type: 'ADVANCE_PHASE',
      phase: 'tool-call',
      message: {
        id: nextId(),
        role: 'tool-call',
        content: scenario.toolCallName,
        toolPayload: scenario.payload,
        isExpanded: false,
      },
    });
  }, elapsed);

  // 4. Response streaming begins (600ms after tool call)
  elapsed += 600;
  const streamStart = elapsed;
  const responseText = scenario.response;
  const charDelay = 30; // ms per character

  schedule(() => {
    dispatch({ type: 'ADVANCE_PHASE', phase: 'streaming' });
    dispatch({ type: 'SET_PAYLOAD', payload: scenario.payload });

    // Stream characters one at a time
    for (let i = 0; i <= responseText.length; i++) {
      schedule(() => {
        dispatch({ type: 'STREAM_TEXT', text: responseText.slice(0, i) });
        if (i === responseText.length) {
          dispatch({
            type: 'ADVANCE_PHASE',
            phase: 'complete',
            message: {
              id: nextId(),
              role: 'assistant',
              content: responseText,
            },
          });
        }
      }, i * charDelay);
    }
  }, streamStart);

  return () => {
    timeouts.forEach(clearTimeout);
  };
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd math-formalism-prototype && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add math-formalism-prototype/src/simulation/engine.ts
git commit -m "feat: add simulation engine with timed phase orchestration"
```

---

### Task 5: Build useSimulation Hook & Context

**Files:**
- Create: `math-formalism-prototype/src/simulation/useSimulation.ts`
- Create: `math-formalism-prototype/src/simulation/SimulationContext.tsx`

- [ ] **Step 1: Create the reducer and hook**

Create `math-formalism-prototype/src/simulation/useSimulation.ts`:
```typescript
import { useReducer, useCallback, useRef } from 'react';
import type { SimulationState, Scenario } from '../types';
import { type SimulationAction, runSimulation } from './engine';
import { evaluateWithParameters } from '../eval/evaluator';

const initialState: SimulationState = {
  phase: 'idle',
  messages: [],
  activeScenario: null,
  payload: null,
  activeStepIndex: 0,
  parameterValues: {},
  isPlaying: false,
  streamedText: '',
};

function reducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'START_SIMULATION':
      return {
        ...initialState,
        phase: 'idle',
        activeScenario: action.scenario,
      };

    case 'ADVANCE_PHASE': {
      const messages = action.message
        ? [...state.messages, action.message]
        : state.messages;
      return {
        ...state,
        phase: action.phase,
        messages,
        streamedText: action.phase === 'complete' ? '' : state.streamedText,
      };
    }

    case 'STREAM_TEXT':
      return { ...state, streamedText: action.text };

    case 'SET_PAYLOAD': {
      const parameterValues: Record<string, number> = {};
      for (const p of action.payload.parameters) {
        parameterValues[p.name] = p.default;
      }
      return {
        ...state,
        payload: action.payload,
        parameterValues,
        activeStepIndex: 0,
      };
    }

    case 'SET_STEP':
      return { ...state, activeStepIndex: action.index };

    case 'UPDATE_PARAMETER':
      return {
        ...state,
        parameterValues: {
          ...state.parameterValues,
          [action.name]: action.value,
        },
      };

    case 'TOGGLE_TOOL_EXPAND':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, isExpanded: !m.isExpanded } : m,
        ),
      };

    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };

    default:
      return state;
  }
}

export function useSimulation() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cancelRef = useRef<(() => void) | null>(null);

  const startSimulation = useCallback((scenario: Scenario) => {
    // Cancel any running simulation
    cancelRef.current?.();
    dispatch({ type: 'START_SIMULATION', scenario });
    // Start the new simulation on next tick so state resets first
    const cancel = runSimulation(scenario, dispatch);
    cancelRef.current = cancel;
  }, []);

  const setStep = useCallback((index: number) => {
    dispatch({ type: 'SET_STEP', index });
  }, []);

  const updateParameter = useCallback((name: string, value: number) => {
    dispatch({ type: 'UPDATE_PARAMETER', name, value });
  }, []);

  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);

  const toggleToolExpand = useCallback((messageId: string) => {
    dispatch({ type: 'TOGGLE_TOOL_EXPAND', messageId });
  }, []);

  // Compute graph data from parameters
  const graphData = state.payload
    ? evaluateWithParameters(
        state.payload,
        state.parameterValues,
        state.payload.steps[state.activeStepIndex]?.graphState ?? { data: [] },
      )
    : null;

  return {
    state,
    graphData,
    startSimulation,
    setStep,
    updateParameter,
    togglePlay,
    toggleToolExpand,
    dispatch,
  };
}
```

- [ ] **Step 2: Create the context provider**

Create `math-formalism-prototype/src/simulation/SimulationContext.tsx`:
```tsx
import { createContext, useContext } from 'react';
import type { SimulationState, Scenario, GraphState } from '../types';

interface SimulationContextValue {
  state: SimulationState;
  graphData: GraphState | null;
  startSimulation: (scenario: Scenario) => void;
  setStep: (index: number) => void;
  updateParameter: (name: string, value: number) => void;
  togglePlay: () => void;
  toggleToolExpand: (messageId: string) => void;
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulationContext(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulationContext must be used within SimulationContext.Provider');
  return ctx;
}
```

- [ ] **Step 3: Create the evaluator**

Create `math-formalism-prototype/src/eval/evaluator.ts` (mirrored from MCP app):

```bash
mkdir -p math-formalism-prototype/src/eval
```

```typescript
import { evaluate } from 'mathjs';
import type { FormulaPayload, GraphState } from '../types';

export function evaluateWithParameters(
  payload: FormulaPayload,
  parameterValues: Record<string, number>,
  graphState: GraphState,
): GraphState {
  if (payload.graph.type !== 'function-plot' && payload.graph.type !== 'distribution') {
    return graphState;
  }

  const expression = payload.graph.config.expression as string | undefined;
  if (!expression) return graphState;

  const xDomain = graphState.axes?.x?.domain ?? [-10, 10];
  const numPoints = 200;
  const step = (xDomain[1] - xDomain[0]) / numPoints;

  const data: Record<string, unknown>[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = xDomain[0] + i * step;
    try {
      const scope = { x, ...parameterValues };
      const y = evaluate(expression, scope) as number;
      if (typeof y === 'number' && isFinite(y)) {
        data.push({ x, y });
      }
    } catch {
      // Skip points that fail to evaluate
    }
  }

  return { ...graphState, data };
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd math-formalism-prototype && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add math-formalism-prototype/src/simulation/ math-formalism-prototype/src/eval/
git commit -m "feat: add simulation hook, context provider, and math evaluator"
```

---

## Chunk 3: Chat Panel Components

### Task 6: Build Chat Panel Components

**Files:**
- Create: `math-formalism-prototype/src/components/UserMessage.tsx`
- Create: `math-formalism-prototype/src/components/UserMessage.module.css`
- Create: `math-formalism-prototype/src/components/AssistantMessage.tsx`
- Create: `math-formalism-prototype/src/components/AssistantMessage.module.css`
- Create: `math-formalism-prototype/src/components/ToolCallBlock.tsx`
- Create: `math-formalism-prototype/src/components/ToolCallBlock.module.css`
- Create: `math-formalism-prototype/src/components/MessageList.tsx`
- Create: `math-formalism-prototype/src/components/MessageList.module.css`
- Create: `math-formalism-prototype/src/components/InputBar.tsx`
- Create: `math-formalism-prototype/src/components/InputBar.module.css`
- Create: `math-formalism-prototype/src/components/ChatPanel.tsx`
- Create: `math-formalism-prototype/src/components/ChatPanel.module.css`

- [ ] **Step 1: Create components directory**

```bash
mkdir -p math-formalism-prototype/src/components
```

- [ ] **Step 2: Create UserMessage component**

Create `math-formalism-prototype/src/components/UserMessage.module.css`:
```css
.wrapper {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.bubble {
  background: rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
  max-width: 85%;
  color: #e0e0e0;
}
```

Create `math-formalism-prototype/src/components/UserMessage.tsx`:
```tsx
import styles from './UserMessage.module.css';

interface UserMessageProps {
  content: string;
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.bubble}>{content}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create AssistantMessage component**

Create `math-formalism-prototype/src/components/AssistantMessage.module.css`:
```css
.wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a574, #c4956a);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.bubble {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
  max-width: 85%;
  color: #e0e0e0;
  white-space: pre-wrap;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: #a78bfa;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

Create `math-formalism-prototype/src/components/AssistantMessage.tsx`:
```tsx
import styles from './AssistantMessage.module.css';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
}

export function AssistantMessage({ content, isStreaming = false }: AssistantMessageProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.avatar}>✦</div>
      <div className={styles.bubble}>
        {content}
        {isStreaming && <span className={styles.cursor} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ToolCallBlock component**

Create `math-formalism-prototype/src/components/ToolCallBlock.module.css`:
```css
.wrapper {
  margin-left: 32px;
  margin-bottom: 12px;
}

.header {
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #a78bfa;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.header:hover {
  background: rgba(99, 102, 241, 0.15);
}

.arrow {
  transition: transform 0.2s;
  font-size: 10px;
}

.arrowExpanded {
  transform: rotate(90deg);
}

.toolName {
  font-weight: 500;
}

.hint {
  color: #666;
  font-size: 11px;
  margin-left: auto;
}

.payload {
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 0 0 8px 8px;
  padding: 12px;
  font-size: 11px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #a0a0a0;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
```

Create `math-formalism-prototype/src/components/ToolCallBlock.tsx`:
```tsx
import styles from './ToolCallBlock.module.css';
import type { FormulaPayload } from '../types';

interface ToolCallBlockProps {
  toolName: string;
  payload?: FormulaPayload;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ToolCallBlock({ toolName, payload, isExpanded, onToggle }: ToolCallBlockProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header} onClick={onToggle}>
        <span className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ''}`}>▶</span>
        <span className={styles.toolName}>Using {toolName}</span>
        <span className={styles.hint}>{isExpanded ? 'click to collapse' : 'click to expand'}</span>
      </div>
      {isExpanded && payload && (
        <div className={styles.payload}>
          {JSON.stringify(payload, null, 2)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create MessageList component**

Create `math-formalism-prototype/src/components/MessageList.module.css`:
```css
.list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.thinking {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.thinkingAvatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a574, #c4956a);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.thinkingText {
  font-size: 12px;
  color: #888;
  padding: 6px 0;
}

.thinkingDot {
  color: #a78bfa;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.greeting {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.greetingAvatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a574, #c4956a);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.greetingBubble {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
  max-width: 85%;
  color: #e0e0e0;
}
```

Create `math-formalism-prototype/src/components/MessageList.tsx`:
```tsx
import { useRef, useEffect } from 'react';
import styles from './MessageList.module.css';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ToolCallBlock } from './ToolCallBlock';
import { useSimulationContext } from '../simulation/SimulationContext';

export function MessageList() {
  const { state, toggleToolExpand } = useSimulationContext();
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [state.messages, state.streamedText, state.phase]);

  return (
    <div className={styles.list} ref={listRef}>
      {/* Initial greeting */}
      <div className={styles.greeting}>
        <div className={styles.greetingAvatar}>✦</div>
        <div className={styles.greetingBubble}>
          I can help you explore mathematical concepts visually. Choose a formula from the dropdown or describe a concept you'd like to visualize!
        </div>
      </div>

      {/* Messages */}
      {state.messages.map((msg) => {
        if (msg.role === 'user') {
          return <UserMessage key={msg.id} content={msg.content} />;
        }
        if (msg.role === 'tool-call') {
          return (
            <ToolCallBlock
              key={msg.id}
              toolName={msg.content}
              payload={msg.toolPayload}
              isExpanded={msg.isExpanded ?? false}
              onToggle={() => toggleToolExpand(msg.id)}
            />
          );
        }
        if (msg.role === 'assistant') {
          return <AssistantMessage key={msg.id} content={msg.content} />;
        }
        return null;
      })}

      {/* Thinking indicator */}
      {state.phase === 'thinking' && (
        <div className={styles.thinking}>
          <div className={styles.thinkingAvatar}>✦</div>
          <div className={styles.thinkingText}>
            <span className={styles.thinkingDot}>●</span>{' '}
            {state.activeScenario?.thinking ?? 'Analyzing the mathematical concept...'}
          </div>
        </div>
      )}

      {/* Streaming text */}
      {state.phase === 'streaming' && state.streamedText && (
        <AssistantMessage content={state.streamedText} isStreaming />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create InputBar component**

Create `math-formalism-prototype/src/components/InputBar.module.css`:
```css
.bar {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 8px;
}

.select {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #ccc;
  padding: 8px 10px;
  font-size: 12px;
  min-width: 160px;
  cursor: pointer;
}

.select:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.5);
}

.submit {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 8px 20px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
}

.submit:hover {
  opacity: 0.9;
}

.submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

Create `math-formalism-prototype/src/components/InputBar.tsx`:
```tsx
import { useState, useCallback } from 'react';
import styles from './InputBar.module.css';
import type { Scenario } from '../types';
import { useSimulationContext } from '../simulation/SimulationContext';
import exponentialDecay from '../scenarios/exponential-decay.json';
import normalDistribution from '../scenarios/normal-distribution.json';

const scenarios: Record<string, Scenario> = {
  'exponential-decay': exponentialDecay as unknown as Scenario,
  'normal-distribution': normalDistribution as unknown as Scenario,
};

const scenarioLabels: Record<string, string> = {
  'exponential-decay': 'Exponential Decay',
  'normal-distribution': 'Normal Distribution',
};

export function InputBar() {
  const { state, startSimulation } = useSimulationContext();
  const [selectedKey, setSelectedKey] = useState('exponential-decay');

  const isRunning = state.phase !== 'idle' && state.phase !== 'complete';

  const handleSubmit = useCallback(() => {
    const scenario = scenarios[selectedKey];
    if (scenario) {
      startSimulation(scenario);
    }
  }, [selectedKey, startSimulation]);

  return (
    <div className={styles.bar}>
      <select
        className={styles.select}
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value)}
        disabled={isRunning}
      >
        {Object.entries(scenarioLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <button
        className={styles.submit}
        onClick={handleSubmit}
        disabled={isRunning}
      >
        Submit
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Create ChatPanel component**

Create `math-formalism-prototype/src/components/ChatPanel.module.css`:
```css
.panel {
  width: 40%;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a574, #c4956a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.title {
  font-weight: 600;
  font-size: 14px;
  color: #e0e0e0;
}

.subtitle {
  font-size: 11px;
  color: #888;
  margin-left: auto;
}
```

Create `math-formalism-prototype/src/components/ChatPanel.tsx`:
```tsx
import styles from './ChatPanel.module.css';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';

export function ChatPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.logo}>✦</div>
        <span className={styles.title}>Claude</span>
        <span className={styles.subtitle}>Math Formalism Ideation</span>
      </div>
      <MessageList />
      <InputBar />
    </div>
  );
}
```

- [ ] **Step 8: Verify compilation**

```bash
cd math-formalism-prototype && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add math-formalism-prototype/src/components/
git commit -m "feat: add chat panel components (messages, tool call block, input bar)"
```

---

## Chunk 4: Visualization Panel Components

### Task 8: Build Visualization Components

**Files:**
- Create: `math-formalism-prototype/src/components/FormulaBar.tsx`
- Create: `math-formalism-prototype/src/components/FormulaBar.module.css`
- Create: `math-formalism-prototype/src/components/StepCards.tsx`
- Create: `math-formalism-prototype/src/components/StepCards.module.css`
- Create: `math-formalism-prototype/src/components/GraphPanel.tsx`
- Create: `math-formalism-prototype/src/components/GraphPanel.module.css`
- Create: `math-formalism-prototype/src/components/ParameterSliders.tsx`
- Create: `math-formalism-prototype/src/components/ParameterSliders.module.css`
- Create: `math-formalism-prototype/src/components/StepControls.tsx`
- Create: `math-formalism-prototype/src/components/StepControls.module.css`
- Create: `math-formalism-prototype/src/components/VisualizationPanel.tsx`
- Create: `math-formalism-prototype/src/components/VisualizationPanel.module.css`

- [ ] **Step 1: Create FormulaBar**

Create `math-formalism-prototype/src/components/FormulaBar.module.css`:
```css
.bar {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
}

.formula {
  font-size: 20px;
  min-height: 40px;
}

.description {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}

/* Annotation colors are applied via JS (inline style --highlight-color) */
.bar :global([data-annotation-id]) {
  color: var(--highlight-color, inherit);
  transition: text-shadow 0.3s ease;
}

/* Highlight active annotations */
.bar :global([data-annotation-id].active) {
  text-shadow: 0 0 8px var(--highlight-color, currentColor);
}
```

Create `math-formalism-prototype/src/components/FormulaBar.tsx`:
```tsx
import { useRef, useEffect } from 'react';
import katex from 'katex';
import styles from './FormulaBar.module.css';
import type { Annotation } from '../types';
import { getAnnotationColor } from '../types';
import { useSimulationContext } from '../simulation/SimulationContext';

function buildAnnotatedLatex(latex: string, annotations: Annotation[]): string {
  let annotated = latex;
  for (const ann of annotations) {
    const escaped = ann.latexFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped);
    annotated = annotated.replace(regex, `\\htmlClass{ann-${ann.id}}{${ann.latexFragment}}`);
  }
  return annotated;
}

export function FormulaBar() {
  const { state } = useSimulationContext();
  const formulaRef = useRef<HTMLDivElement>(null);
  const payload = state.payload;

  useEffect(() => {
    if (!formulaRef.current || !payload) return;

    const annotated = buildAnnotatedLatex(payload.formula.latex, payload.annotations);
    try {
      katex.render(annotated, formulaRef.current, {
        displayMode: true,
        throwOnError: false,
        trust: true,
      });
    } catch {
      if (formulaRef.current) {
        formulaRef.current.textContent = payload.formula.latex;
      }
    }

    // Apply annotation colors
    for (let i = 0; i < payload.annotations.length; i++) {
      const ann = payload.annotations[i];
      const els = formulaRef.current.querySelectorAll(`.ann-${ann.id}`);
      els.forEach((el) => {
        (el as HTMLElement).dataset.annotationId = ann.id;
        (el as HTMLElement).title = ann.label;
        (el as HTMLElement).style.setProperty('--highlight-color', getAnnotationColor(i));
      });
    }

    // Highlight active step annotations
    const activeStep = payload.steps[state.activeStepIndex];
    if (activeStep) {
      formulaRef.current.querySelectorAll('[data-annotation-id]').forEach((el) => {
        el.classList.toggle('active', activeStep.highlightIds.includes((el as HTMLElement).dataset.annotationId!));
      });
    }
  }, [payload, state.activeStepIndex]);

  if (!payload) return null;

  return (
    <div className={styles.bar}>
      <div className={styles.formula} ref={formulaRef} />
      <div className={styles.description}>{payload.formula.description}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create StepCards**

Create `math-formalism-prototype/src/components/StepCards.module.css`:
```css
.panel {
  width: 45%;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.card {
  border-left: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 0 8px 8px 0;
  padding: 12px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.03);
  opacity: 0.5;
  cursor: pointer;
  transition: all 0.3s ease;
}

.card:hover {
  opacity: 0.8;
}

.cardActive {
  border-left-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  opacity: 1;
}

.stepLabel {
  font-size: 11px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
}

.stepLabelActive {
  color: #a78bfa;
}

.title {
  font-size: 13px;
  font-weight: 500;
  margin: 4px 0;
  color: #e0e0e0;
}

.narrative {
  font-size: 12px;
  color: #aaa;
  line-height: 1.4;
}

.algebra {
  font-size: 11px;
  margin-top: 8px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow-x: auto;
}
```

Create `math-formalism-prototype/src/components/StepCards.tsx`:
```tsx
import { useRef, useEffect } from 'react';
import katex from 'katex';
import gsap from 'gsap';
import styles from './StepCards.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';

export function StepCards() {
  const { state, setStep } = useSimulationContext();
  const payload = state.payload;
  const panelRef = useRef<HTMLDivElement>(null);
  const algebraRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasAnimated = useRef(false);

  // GSAP entrance animation — fade in with stagger
  useEffect(() => {
    if (!panelRef.current || !payload || hasAnimated.current) return;
    hasAnimated.current = true;
    const cards = panelRef.current.querySelectorAll('[data-step-card]');
    gsap.from(cards, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.2,
      ease: 'power2.out',
    });
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    payload.steps.forEach((step, i) => {
      const el = algebraRefs.current[i];
      if (el) {
        try {
          katex.render(step.algebraDetail, el, {
            displayMode: false,
            throwOnError: false,
          });
        } catch {
          el.textContent = step.algebraDetail;
        }
      }
    });
  }, [payload]);

  if (!payload) return null;

  // Reset animation flag when payload changes
  useEffect(() => {
    hasAnimated.current = false;
  }, [payload?.formula.latex]);

  return (
    <div className={styles.panel} ref={panelRef}>
      {payload.steps.map((step, i) => {
        const isActive = i === state.activeStepIndex;
        return (
          <div
            key={step.id}
            data-step-card
            className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
            onClick={() => setStep(i)}
          >
            <div className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>
              Step {i + 1}
            </div>
            <div className={styles.title}>{step.title}</div>
            {isActive && (
              <>
                <div className={styles.narrative}>{step.narrative}</div>
                <div
                  className={styles.algebra}
                  ref={(el) => { algebraRefs.current[i] = el; }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create GraphPanel**

Create `math-formalism-prototype/src/components/GraphPanel.module.css`:
```css
.panel {
  width: 55%;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.container {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 250px;
}

.placeholder {
  color: #555;
  font-size: 13px;
}
```

Create `math-formalism-prototype/src/components/GraphPanel.tsx`:
```tsx
import { useRef, useEffect } from 'react';
import * as Plot from '@observablehq/plot';
import gsap from 'gsap';
import styles from './GraphPanel.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';
import type { Annotation, GraphState, GraphType } from '../types';
import { getAnnotationColor } from '../types';

function buildPlot(
  container: HTMLElement,
  graphType: GraphType,
  graphState: GraphState,
  config: Record<string, unknown>,
  annotations?: Annotation[],
): HTMLElement | SVGElement {
  const marks: Plot.Markish[] = [];
  const width = container.clientWidth - 32;
  const height = Math.max(250, container.clientHeight - 32);

  const options: Plot.PlotOptions = {
    width,
    height,
    style: { background: 'transparent', color: '#999' },
    x: {
      label: graphState.axes?.x?.label ?? 'x',
      domain: graphState.axes?.x?.domain,
    },
    y: {
      label: graphState.axes?.y?.label ?? 'y',
      domain: graphState.axes?.y?.domain,
    },
  };

  switch (graphType) {
    case 'function-plot':
      marks.push(
        Plot.line(graphState.data, { x: 'x', y: 'y', stroke: '#6366f1', strokeWidth: 2 }),
        Plot.gridX(), Plot.gridY(),
      );
      break;
    case 'distribution':
      marks.push(
        Plot.areaY(graphState.data, { x: 'x', y: 'y', fill: '#6366f1', fillOpacity: 0.3 }),
        Plot.line(graphState.data, { x: 'x', y: 'y', stroke: '#6366f1', strokeWidth: 2 }),
        Plot.gridX(), Plot.gridY(),
      );
      break;
    case 'scatter':
      marks.push(
        Plot.dot(graphState.data, { x: 'x', y: 'y', fill: '#6366f1', r: 3 }),
        Plot.gridX(), Plot.gridY(),
      );
      break;
    default:
      marks.push(
        Plot.line(graphState.data, { x: 'x', y: 'y', stroke: '#6366f1' }),
        Plot.gridX(), Plot.gridY(),
      );
  }

  // Highlight regions
  if (graphState.highlightRegions) {
    for (const region of graphState.highlightRegions) {
      const annIndex = annotations?.findIndex(a => a.id === region.annotationId) ?? 0;
      const color = getAnnotationColor(Math.max(0, annIndex));
      if (region.type === 'point') {
        marks.push(
          Plot.dot([region.coords], { x: 'x', y: 'y', r: 6, fill: color, fillOpacity: 0.8 }),
        );
      }
    }
  }

  return Plot.plot({ ...options, marks });
}

export function GraphPanel() {
  const { state, graphData } = useSimulationContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const payload = state.payload;

  useEffect(() => {
    if (!containerRef.current || !payload || !graphData) return;
    containerRef.current.innerHTML = '';

    if (graphData.data.length === 0) return;

    const plot = buildPlot(containerRef.current, payload.graph.type, graphData, payload.graph.config, payload.annotations);
    containerRef.current.appendChild(plot);

    // GSAP entrance animation for the graph
    gsap.from(plot, {
      opacity: 0,
      scale: 0.95,
      duration: 0.5,
      ease: 'power2.out',
    });
  }, [payload, graphData, state.activeStepIndex]);

  return (
    <div className={styles.panel}>
      <div className={styles.container} ref={containerRef}>
        {!payload && <span className={styles.placeholder}>Graph will appear here</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ParameterSliders**

Create `math-formalism-prototype/src/components/ParameterSliders.module.css`:
```css
.container {
  display: flex;
  gap: 16px;
  padding: 0 16px;
  margin-top: 12px;
}

.slider {
  flex: 1;
}

.label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.value {
  color: #a78bfa;
  font-weight: 500;
}

.input {
  width: 100%;
  height: 4px;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.input::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6366f1;
  cursor: pointer;
}
```

Create `math-formalism-prototype/src/components/ParameterSliders.tsx`:
```tsx
import styles from './ParameterSliders.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';

export function ParameterSliders() {
  const { state, updateParameter } = useSimulationContext();
  const payload = state.payload;

  if (!payload) return null;

  return (
    <div className={styles.container}>
      {payload.parameters.map((param) => {
        const value = state.parameterValues[param.name] ?? param.default;
        return (
          <div key={param.name} className={styles.slider}>
            <div className={styles.label}>
              {param.label}: <span className={styles.value}>{value}</span>
            </div>
            <input
              type="range"
              className={styles.input}
              min={param.min}
              max={param.max}
              step={param.step}
              value={value}
              onChange={(e) => updateParameter(param.name, parseFloat(e.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create StepControls**

Create `math-formalism-prototype/src/components/StepControls.module.css`:
```css
.bar {
  padding: 10px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
}

.btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #888;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.3);
  color: #a78bfa;
}

.btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.indicator {
  color: #888;
}
```

Create `math-formalism-prototype/src/components/StepControls.tsx`:
```tsx
import styles from './StepControls.module.css';
import { useSimulationContext } from '../simulation/SimulationContext';

export function StepControls() {
  const { state, setStep } = useSimulationContext();
  const payload = state.payload;

  if (!payload) return null;

  const total = payload.steps.length;
  const current = state.activeStepIndex;

  return (
    <div className={styles.bar}>
      <button
        className={styles.btn}
        onClick={() => setStep(current - 1)}
        disabled={current <= 0}
      >
        ◀ Prev
      </button>
      <span className={styles.indicator}>
        Step {current + 1} of {total}
      </span>
      <button
        className={styles.btn}
        onClick={() => setStep(current + 1)}
        disabled={current >= total - 1}
      >
        Next ▶
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create VisualizationPanel**

Create `math-formalism-prototype/src/components/VisualizationPanel.module.css`:
```css
.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f0f1a;
  min-width: 0;
}

.contentArea {
  flex: 1;
  display: flex;
  min-height: 0;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
  font-size: 14px;
}
```

Create `math-formalism-prototype/src/components/VisualizationPanel.tsx`:
```tsx
import styles from './VisualizationPanel.module.css';
import { FormulaBar } from './FormulaBar';
import { StepCards } from './StepCards';
import { GraphPanel } from './GraphPanel';
import { ParameterSliders } from './ParameterSliders';
import { StepControls } from './StepControls';
import { useSimulationContext } from '../simulation/SimulationContext';

export function VisualizationPanel() {
  const { state } = useSimulationContext();

  if (!state.payload) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          Submit a prompt to see the visualization
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <FormulaBar />
      <div className={styles.contentArea}>
        <StepCards />
        <GraphPanel />
      </div>
      <ParameterSliders />
      <StepControls />
    </div>
  );
}
```

- [ ] **Step 7: Verify compilation**

```bash
cd math-formalism-prototype && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add math-formalism-prototype/src/components/
git commit -m "feat: add visualization panel components (formula, steps, graph, sliders, controls)"
```

---

## Chunk 5: App Assembly, Styles & README

### Task 9: Wire Up App with Context Provider

**Files:**
- Modify: `math-formalism-prototype/src/App.tsx`
- Create: `math-formalism-prototype/src/App.module.css`
- Create: `math-formalism-prototype/src/index.css`

- [ ] **Step 1: Create global styles**

Create `math-formalism-prototype/src/index.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

- [ ] **Step 2: Create App layout styles**

Create `math-formalism-prototype/src/App.module.css`:
```css
.app {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
```

- [ ] **Step 3: Update App.tsx with context provider and layout**

Replace `math-formalism-prototype/src/App.tsx`:
```tsx
import styles from './App.module.css';
import { ChatPanel } from './components/ChatPanel';
import { VisualizationPanel } from './components/VisualizationPanel';
import { SimulationContext } from './simulation/SimulationContext';
import { useSimulation } from './simulation/useSimulation';

export function App() {
  const simulation = useSimulation();

  return (
    <SimulationContext.Provider value={simulation}>
      <div className={styles.app}>
        <ChatPanel />
        <VisualizationPanel />
      </div>
    </SimulationContext.Provider>
  );
}
```

- [ ] **Step 4: Update main.tsx to import global CSS**

Replace `math-formalism-prototype/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Build and verify**

```bash
cd math-formalism-prototype && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 6: Manual test — start dev server**

```bash
cd math-formalism-prototype && npm run dev
```
Expected: Opens on localhost, shows split-screen layout. Selecting a scenario and clicking Submit triggers the simulation: thinking → tool call → streaming response → visualization renders with interactive graph and sliders.

- [ ] **Step 7: Commit**

```bash
git add math-formalism-prototype/src/App.tsx math-formalism-prototype/src/App.module.css math-formalism-prototype/src/index.css math-formalism-prototype/src/main.tsx
git commit -m "feat: wire up app with SimulationContext, split-screen layout, and global styles"
```

---

### Task 10: Create README and Documentation

**Files:**
- Create: `math-formalism-prototype/README.md`
- Create: `math-formalism-prototype/docs/creating-payloads.md`

- [ ] **Step 1: Create README**

Create `math-formalism-prototype/README.md`:
```markdown
# Math Formalism Prototype

A simulated agentic Claude chat interface demonstrating the **Math Formalism Ideation** MCP App — interactive mathematical formula visualization with step-by-step derivations, dynamic graphs, and parameter controls.

## Origin

This prototype was born from a conversation between [The Digital Griot](https://github.com/YOUR_GITHUB_HANDLE) and [Sean](https://github.com/altivection01) about mathematical formalism — specifically, the idea of making abstract mathematical concepts tangible through interactive, multi-sensory visualization. What started as a seed about expressing mathematical formalism evolved into a vision for an MCP App that lets Claude transform any mathematical concept into an immersive, explorable experience.

This prototype simulates that end-to-end experience so collaborators can see the vision and contribute.

## What This Is

A **simulated prototype** of the Math Formalism Ideation MCP App. It demonstrates:

- **Split-screen layout** — Claude chat on the left, math visualization on the right
- **Simulated Claude response** — Thinking indicator → tool call block → streaming text
- **Expandable tool calls** — Click to inspect the full structured payload (Option C fidelity)
- **Interactive visualization** — KaTeX formulas, scrollable step cards, Observable Plot graphs, parameter sliders
- **Multiple scenarios** — Exponential Decay and Normal Distribution included

No API keys or MCP infrastructure required — everything runs locally.

## Quick Start

```bash
cd math-formalism-prototype
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## How It Works

The app is driven by **scenario files** — JSON documents that contain everything needed to simulate a Claude interaction:

1. **User submits a prompt** (selected from a dropdown)
2. **Simulation engine** orchestrates a timed sequence:
   - User message appears instantly
   - "Thinking..." indicator (400ms)
   - Tool call block appears (1.2s) — expandable to show full JSON payload
   - Claude's response streams with typewriter effect (~30ms/char)
3. **Visualization activates simultaneously** with the response:
   - KaTeX formula with color-coded annotations
   - Step-by-step derivation cards (click to navigate)
   - Interactive graph (Observable Plot)
   - Parameter sliders (re-evaluate with math.js in real-time)

## Creating Custom Payloads

See [docs/creating-payloads.md](docs/creating-payloads.md) for the full guide, including:
- The `FormulaPayload` schema explained
- Example prompts to give Claude for generating valid payloads
- How to add new scenarios to the prototype

## Included Scenarios

| Scenario | Domain | Concept |
|----------|--------|---------|
| Exponential Decay | Physics | N(t) = N₀·e^(-λt) — radioactive decay with adjustable decay constant |
| Normal Distribution | Statistics | f(x) = (1/σ√2π)·e^(-(x-μ)²/2σ²) — bell curve with adjustable mean and standard deviation |

## Roadmap

- [ ] Real MCP integration with Claude Desktop
- [ ] More mathematical domains (linear algebra, calculus, finance)
- [ ] 3D surface plots for multivariable functions
- [ ] User-authored scenarios via file upload
- [ ] Collaborative annotation and sharing

## Tech Stack

- React 19 + TypeScript
- Vite
- KaTeX (formula rendering)
- Observable Plot (graphs)
- math.js (parameter re-evaluation)
- CSS Modules (dark theme)

## Credits

- **[The Digital Griot](https://github.com/YOUR_GITHUB_HANDLE)** — concept, design, implementation
- **[Sean](https://github.com/altivection01)** — mathematical formalism inspiration, statistics domain expertise
```

- [ ] **Step 2: Create payload creation guide**

```bash
mkdir -p math-formalism-prototype/docs
```

Create `math-formalism-prototype/docs/creating-payloads.md`:
```markdown
# Creating Custom Payloads

This guide explains how to create new scenario files for the Math Formalism Prototype.

## The Scenario Schema

Each scenario is a JSON file in `src/scenarios/` with this structure:

```json
{
  "prompt": "The user's question or request",
  "thinking": "Optional flavor text shown during the thinking phase",
  "toolCallName": "visualize_formula",
  "response": "Claude's text explanation that streams with typewriter effect",
  "payload": { /* FormulaPayload — see below */ }
}
```

## The FormulaPayload Schema

```json
{
  "formula": {
    "latex": "LaTeX expression (e.g., 'f(x) = x^2')",
    "description": "Human-readable description",
    "domain": "One of: calculus, linear-algebra, statistics, algebra, physics, finance, general"
  },
  "annotations": [
    {
      "id": "unique-id",
      "latexFragment": "The LaTeX substring to highlight",
      "label": "Short label",
      "description": "What this part of the formula means"
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "title": "Step Title",
      "narrative": "Prose explanation of this step",
      "algebraDetail": "LaTeX showing the algebra for this step",
      "highlightIds": ["annotation-ids", "to-highlight"],
      "graphState": {
        "data": [],
        "axes": {
          "x": { "label": "x-axis label", "domain": [min, max] },
          "y": { "label": "y-axis label", "domain": [min, max] }
        },
        "highlightRegions": [
          { "annotationId": "id", "type": "point", "coords": { "x": 0, "y": 0 } }
        ]
      }
    }
  ],
  "parameters": [
    {
      "name": "variable_name",
      "label": "Display Label",
      "min": 0,
      "max": 100,
      "default": 50,
      "step": 1
    }
  ],
  "graph": {
    "type": "One of: function-plot, distribution, scatter, bar, vector-field, surface-3d",
    "config": {
      "expression": "math.js expression using parameter names and x as the variable"
    }
  }
}
```

## Using Claude to Generate Payloads

You can ask Claude to generate valid payloads! Here are some example prompts:

### Prompt Template 1: From a concept

```
Generate a FormulaPayload JSON for the concept of [CONCEPT NAME].

The payload should follow this schema: [paste the schema above]

Include:
- 4 steps that build understanding progressively
- Annotations for each meaningful part of the formula
- A math.js expression in graph.config.expression using parameter names
- 2-3 interactive parameters with sensible ranges
- Appropriate axis domains for the graph

The graph.type should be "[function-plot|distribution|scatter]" and the domain should be "[relevant domain]".
```

### Prompt Template 2: From a formula

```
I want to visualize this formula: [FORMULA IN LATEX]

Generate a complete FormulaPayload JSON that:
1. Breaks the formula into annotated components
2. Creates 4 steps that explain the formula progressively
3. Includes interactive parameters for the key variables
4. Uses a math.js expression for the graph (using 'x' as the independent variable)

Follow this schema: [paste schema]
```

### Prompt Template 3: Statistics focus

```
Create a FormulaPayload for the [DISTRIBUTION NAME] distribution.

Focus on:
- How the parameters shape the distribution
- Key properties (mean, variance, mode)
- The empirical rule or practical interpretation
- Use graph.type: "distribution" for filled area + line rendering
```

## Adding a Scenario to the Prototype

1. Save your JSON file to `src/scenarios/your-scenario.json`
2. Open `src/components/InputBar.tsx`
3. Add an import: `import yourScenario from '../scenarios/your-scenario.json';`
4. Add to the `scenarios` object: `'your-scenario': yourScenario as unknown as Scenario`
5. Add to `scenarioLabels`: `'your-scenario': 'Your Scenario Name'`
6. The new scenario will appear in the dropdown automatically

## Tips

- **Keep `graphState.data` arrays empty** for `function-plot` and `distribution` types — the graph is generated dynamically from `graph.config.expression`
- **Parameter names in the expression** must match the `name` field in `parameters` (e.g., if `parameters` has `{ name: "sigma" }`, use `sigma` in the expression)
- **Use `x` as the independent variable** in expressions — it's sampled across the x-axis domain
- **Annotation IDs** should be simple, lowercase strings (e.g., "mean", "variance", "slope")
- **Test your expression** at [mathjs.org](https://mathjs.org/) before adding it to a payload
```

- [ ] **Step 3: Commit**

```bash
git add math-formalism-prototype/README.md math-formalism-prototype/docs/
git commit -m "docs: add README with concept provenance and payload creation guide"
```

---

### Task 11: Add .gitignore

**Files:**
- Create: `math-formalism-prototype/.gitignore`

- [ ] **Step 1: Create .gitignore**

Create `math-formalism-prototype/.gitignore`:
```
node_modules
dist
*.local
```

- [ ] **Step 2: Commit**

```bash
git add math-formalism-prototype/.gitignore
git commit -m "chore: add .gitignore for math-formalism-prototype"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Clean install and build**

```bash
cd math-formalism-prototype && rm -rf node_modules && npm install && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run dev server and manually verify**

```bash
cd math-formalism-prototype && npm run dev
```

Manual verification checklist:
1. Page loads with split-screen layout (chat left, empty viz right)
2. Chat shows Claude greeting message
3. Dropdown has two options: Exponential Decay, Normal Distribution
4. Click Submit with Exponential Decay selected:
   - User message bubble appears
   - Thinking indicator shows with purple dot
   - Tool call block appears ("Using visualize_formula")
   - Click tool call to expand → JSON payload visible
   - Response text streams with typewriter effect and cursor
   - Visualization panel shows: formula, steps, graph, sliders
5. Click through steps → graph and formula highlights update
6. Drag parameter sliders → graph re-evaluates in real-time
7. Switch to Normal Distribution and submit → different formula, bell curve graph
8. Step controls (prev/next) navigate correctly

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A math-formalism-prototype/
git commit -m "fix: address issues found during manual verification"
```
