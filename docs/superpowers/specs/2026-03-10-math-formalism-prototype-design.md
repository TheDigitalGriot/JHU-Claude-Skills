# Math Formalism Prototype — Design Spec

**Date:** 2026-03-10
**Status:** Approved
**Concept:** "The Art of Possible" — translating the mind's eye into immersive, interactive mathematical visualization

## Overview

A simulated agentic Claude chat interface that demonstrates the Math Formalism Ideation MCP App. Users submit a prompt, watch a simulated Claude response stream with tool-call fidelity, and interact with a rich math visualization — all without requiring API keys or MCP infrastructure.

The prototype exists to let collaborators (especially Sean @altivection01) experience the end goal of the MCP app and contribute payload scenarios.

## Architecture

**Approach:** Component-based React app (Vite + TypeScript)

**Layout:** Split-screen
- Left panel (~40%) — Claude-style chat interface
- Right panel (~60%) — Math visualization canvas

### Component Tree

```
App
├── ChatPanel
│   ├── MessageList
│   │   ├── UserMessage
│   │   ├── AssistantMessage (typewriter effect)
│   │   └── ToolCallBlock (expandable JSON payload viewer)
│   └── InputBar
│       ├── PayloadSelector (dropdown)
│       └── SubmitButton
├── VisualizationPanel
│   ├── FormulaBar (KaTeX + color-coded annotations)
│   ├── ContentArea
│   │   ├── StepCards (scrollable, active state synced)
│   │   └── GraphPanel (Observable Plot)
│   ├── ParameterSliders (math.js re-evaluation)
│   └── StepControls (prev/next/play)
└── SimulationEngine (non-visual)
    ├── scenarios/ (JSON payload files)
    ├── chat scripts (pre-written sequences)
    └── timing orchestration
```

## Simulation Flow

```
User clicks Submit
  → (instant) User message bubble appears
  → (400ms) "Thinking..." indicator
  → (1.2s) ToolCallBlock appears ("Using Visualize Formula", expandable)
  → (600ms) Assistant response typewriter begins (~30ms/char)
  → (simultaneous) Visualization panel activates:
      - Formula bar renders (KaTeX)
      - Step cards fade in (200ms stagger)
      - Graph draws with entrance animation
      - Parameter sliders appear
  → Visualization is fully interactive
```

## Data Shape

Each scenario is a single JSON file:

```typescript
interface Scenario {
  prompt: string;              // User's message text
  thinking?: string;           // Flavor text for thinking indicator
  toolCallName: string;        // "Visualize Formula"
  response: string;            // Claude's text explanation
  payload: FormulaPayload;     // Full payload (same schema as MCP app)
}
```

`FormulaPayload` is mirrored from `math-formalism-ideation/src/types.ts`.

## Included Scenarios

1. **Exponential Decay** — adapted from existing `test-payload.json`
2. **Normal Distribution** — new, statistics-focused (for Sean)

## Project Structure

```
math-formalism-prototype/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts
│   ├── components/
│   │   ├── ChatPanel.tsx
│   │   ├── MessageList.tsx
│   │   ├── UserMessage.tsx
│   │   ├── AssistantMessage.tsx
│   │   ├── ToolCallBlock.tsx
│   │   ├── InputBar.tsx
│   │   ├── VisualizationPanel.tsx
│   │   ├── FormulaBar.tsx
│   │   ├── StepCards.tsx
│   │   ├── GraphPanel.tsx
│   │   ├── ParameterSliders.tsx
│   │   └── StepControls.tsx
│   ├── simulation/
│   │   ├── engine.ts
│   │   └── useSimulation.ts
│   ├── hooks/
│   │   └── useTypewriter.ts
│   └── scenarios/
│       ├── exponential-decay.json
│       └── normal-distribution.json
└── docs/
    └── creating-payloads.md
```

## Tech Stack

- React 19 + TypeScript
- Vite (dev server + build)
- KaTeX (formula rendering)
- Observable Plot (graphs)
- math.js (parameter re-evaluation)
- GSAP (step animations)
- CSS Modules (dark theme, no Tailwind)

## README Contents

1. Project name + one-line description
2. Concept provenance — collaboration between The Digital Griot and Sean (@altivection01), spawned from a conversation about mathematical formalism
3. What this is — simulated prototype of the MCP App experience
4. Quick start — `npm install && npm run dev`
5. How it works — simulation engine, split-screen, payload-driven
6. Creating custom payloads — schema reference, Claude prompt templates, drop-in workflow
7. Roadmap — real MCP integration, Claude Desktop, more domains
8. Credits — contributors with GitHub links

## State Management

A single React context (`SimulationContext`) holds all shared state at the `App` level:

```typescript
interface SimulationState {
  phase: 'idle' | 'thinking' | 'tool-call' | 'streaming' | 'complete';
  messages: Message[];           // chat message history
  activeScenario: Scenario | null;
  payload: FormulaPayload | null;
  activeStepIndex: number;
  parameterValues: Record<string, number>;
  isPlaying: boolean;
}
```

State flows down via context; updates happen through dispatched actions:
- `START_SIMULATION` — resets state, begins timing sequence
- `ADVANCE_PHASE` — moves through thinking → tool-call → streaming → complete
- `SET_STEP` — syncs StepCards, GraphPanel, and FormulaBar highlights
- `UPDATE_PARAMETER` — triggers math.js re-evaluation, updates graph data

`ChatPanel` reads `messages` and `phase`. `VisualizationPanel` reads `payload`, `activeStepIndex`, and `parameterValues`. No prop drilling beyond one level.

## Simulation Engine Contract

`engine.ts` exports a single function:

```typescript
function runSimulation(
  scenario: Scenario,
  dispatch: (action: SimulationAction) => void
): () => void  // returns cleanup/cancel function
```

It orchestrates the timing sequence using `setTimeout` chains, dispatching actions at each phase transition. The returned function cancels all pending timeouts (for when the user switches scenarios mid-simulation).

`useSimulation.ts` wraps this in a React hook:

```typescript
function useSimulation(): {
  state: SimulationState;
  startSimulation: (scenario: Scenario) => void;
  setStep: (index: number) => void;
  updateParameter: (name: string, value: number) => void;
  togglePlay: () => void;
}
```

The `thinking` field on `Scenario` is optional — when absent, the thinking indicator shows default text ("Analyzing the mathematical concept...").

## Parameter Re-evaluation Pipeline

For `function-plot` graph types, the `graph.config.expression` field (e.g., `"N_0 * exp(-lambda * x)"`) is the source of truth. The `graphState.data` arrays in steps are intentionally empty for expression-driven graphs.

When parameters change:
1. `ParameterSliders` dispatches `UPDATE_PARAMETER` with `{ name, value }`
2. The reducer calls `evaluateWithParameters(expression, parameterValues, xDomain)` from math.js
3. This samples the expression across 200 points over the x-axis domain
4. The resulting `[{ x, y }]` array is passed to Observable Plot for rendering

This mirrors the existing pipeline in `math-formalism-ideation/src/eval/evaluator.ts`.

## Error Handling

Lightweight for a prototype:
- **Malformed scenario JSON:** TypeScript imports catch shape errors at build time. Runtime validation is not needed since scenarios are bundled, not user-uploaded.
- **KaTeX failures:** Wrap `katex.renderToString` in try/catch; show the raw LaTeX string on failure.
- **math.js errors:** Catch evaluation exceptions (e.g., division by zero); display last valid graph state and show an inline warning.
- **Observable Plot edge cases:** Guard against empty/NaN data arrays before rendering.

## Testing

Manual testing only for v1. Scenario JSON files are validated at build time via TypeScript's type system (imported with `as const satisfies Scenario`). No automated visual or unit tests required for the prototype — the goal is rapid iteration and concept validation.

## Viewport

Desktop-only. The 40/60 split-screen layout targets viewports 1024px+. No responsive breakpoints for v1.

## Design Principles

- **Immersive, not demonstrative** — the prototype should feel like using the real thing
- **Payload-driven** — adding new math concepts requires zero code changes
- **Faithful to MCP** — the tool-call flow mirrors what Claude Desktop actually shows
- **Inviting collaboration** — Sean should be able to create a scenario in 10 minutes
