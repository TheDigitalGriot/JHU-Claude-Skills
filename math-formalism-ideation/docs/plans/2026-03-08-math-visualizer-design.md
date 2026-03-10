# Math Formalism Ideation — MCP App Design

## Overview

An MCP App that transforms mathematical ideas (natural language descriptions or LaTeX formulas) into animated, interactive formula visualizations. Inspired by CodeHike's scrollycoding layout, it provides a scrolly-telling step-by-step trace with sub-expression highlighting, dynamic graphs, and in-app parameter controls.

**Use cases:** General math exploration across any domain (calculus, linear algebra, statistics, physics, finance) and teaching/presenting concepts to others.

## Data Contract

Claude generates a structured `FormulaPayload` JSON that the app renders. The app is a pure renderer — it does not compute anything except real-time parameter slider re-evaluation.

```typescript
interface FormulaPayload {
  formula: {
    latex: string;
    description: string;
    domain: "calculus" | "linear-algebra" | "statistics" | "algebra" | "physics" | "finance" | "general";
  };

  annotations: Array<{
    id: string;
    latexFragment: string;
    label: string;
    description: string;
  }>;

  steps: Array<{
    id: string;
    title: string;
    narrative: string;
    algebraDetail: string;
    highlightIds: string[];
    graphState: GraphState;
  }>;

  parameters: Array<{
    name: string;
    label: string;
    min: number;
    max: number;
    default: number;
    step: number;
  }>;

  graph: {
    type: "function-plot" | "vector-field" | "distribution" | "scatter" | "bar" | "surface-3d";
    config: Record<string, any>;
  };
}
```

## Layout

Fixed formula bar as a persistent header, split panel below, bottom control bar.

```
┌─────────────────────────────────────────────────┐
│  Header: Formula title + description            │
├─────────────────────────────────────────────────┤
│  FORMULA BAR (fixed, full-width)                │
│  KaTeX-rendered expression with highlight spans │
├────────────────────┬────────────────────────────┤
│  SCROLL PANEL      │  STICKY PANEL              │
│  (left, 40%)       │  (right, 60%)              │
│                    │                            │
│  Step cards with   │  Observable Plot graph     │
│  conceptual        │  (animated, synced)        │
│  narrative +       │                            │
│  expandable        │  Parameter sliders         │
│  algebraic detail  │  (real-time tweaking)      │
├────────────────────┴────────────────────────────┤
│  ◀ Prev  │  Step N of M  │  Next ▶  │ ▶ Play  │
└─────────────────────────────────────────────────┘
```

- Responsive: vertical stacking on narrow viewports.

## Animation & Highlighting

**Sub-expression highlighting:** Each annotation maps to a `<span>` in the KaTeX output. Active spans get full opacity, colored glow, and 1.05x scale. Inactive spans drop to 0.4 opacity. 300ms ease-out transitions. Colors assigned from a palette by annotation index — consistent across formula, graph, and narration.

**Graph transitions:** Observable Plot re-renders with GSAP-interpolated data. Function curves morph, distributions shift shape, vectors rotate/scale, highlighted regions wipe in.

**Scroll timeline:** GSAP ScrollTrigger pins each step to a scroll range. Scrubbing interpolates smoothly between states. Button controls (prev/next/play) programmatically scroll to trigger the same timeline — no separate state.

**Parameter sliders:** Decoupled from the step timeline. math.js evaluates the formula client-side as sliders drag. Graph updates in real-time. Current values shown as annotations beneath the formula bar.

## MCP Server Architecture

### Tool 1: `visualize_formula`
- Primary tool, called by Claude
- Accepts natural language or LaTeX input
- Claude populates the full FormulaPayload
- Returns `_meta.ui.resourceUri` pointing to the app
- Text `content` fallback for non-UI hosts

### Tool 2: `update_formula_parameters`
- `visibility: ["app"]` — hidden from Claude, app-only
- For structural changes via chat ("add damping")
- App receives updated payload via `ontoolresult`, transitions with animations

### Resource: `math-visualizer://app`
- Single-file bundled HTML
- CSP configured for KaTeX fonts if needed

### Streaming
- `ontoolinputpartial` progressively renders: formula bar first, steps populate one by one

## Technology Stack

| Package | Purpose | ~Size |
|---------|---------|-------|
| `@modelcontextprotocol/ext-apps` | MCP App SDK | 20KB |
| `@modelcontextprotocol/sdk` | MCP server SDK | 50KB |
| `katex` | Formula rendering | 300KB |
| `@observablehq/plot` | Declarative graphs | 150KB |
| `gsap` + ScrollTrigger + ScrollToPlugin | Animation & scroll-sync | 100KB |
| `mathjs` | Client-side formula evaluation | 150KB |
| `zod` | Payload validation | 15KB |

**Total bundle:** ~800KB single-file HTML.

**Build:** Vite + vite-plugin-singlefile. tsx for server. Vanilla TypeScript client.

## Project Structure

```
math-formalism-ideation/
├── server.ts
├── main.ts
├── src/
│   ├── mcp-app.ts
│   ├── renderer/
│   │   ├── formula-bar.ts
│   │   ├── graph.ts
│   │   ├── steps.ts
│   │   ├── sliders.ts
│   │   └── controls.ts
│   ├── animation/
│   │   ├── timeline.ts
│   │   ├── highlights.ts
│   │   └── transitions.ts
│   ├── eval/
│   │   └── evaluator.ts
│   ├── types.ts
│   └── global.css
├── mcp-app.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

## Decisions

- **Vanilla TS over React/Vue:** The app is a custom scroll-driven renderer; frameworks add weight without benefit.
- **Observable Plot over raw D3:** High-level declarative API covers diverse math domains with less code, still D3-powered.
- **GSAP ScrollTrigger:** Purpose-built for the CodeHike-style scroll-sync pattern, battle-tested.
- **math.js for sliders:** Lightweight client-side evaluation avoids Claude round-trips for parameter tweaking.
- **Single GSAP timeline:** Both scroll and button controls drive the same timeline — no state sync issues.
