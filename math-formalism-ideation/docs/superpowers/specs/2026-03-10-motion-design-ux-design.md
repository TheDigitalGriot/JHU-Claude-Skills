# Motion Design & UX Enhancement — Design Spec

**Date:** 2026-03-10
**Status:** Approved
**Approach:** D3 Transition Layer + Scene Composition Engine (Approach A)

---

## Summary

Enhance the Math Formalism Ideation app's chart visualization with cinematic motion design and storytelling UX. Replace Observable Plot with D3 for native data morphing, build a scene composition engine for interstitial animations, and implement a 3-phase loading flow that turns dead time into narrative on-ramps.

The goal: the right panel becomes a **stage** where data morphs and tells a story, with conceptual explainer animations bridging between steps to help visual learners understand how each analytical technique mutates the data.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scroll interaction model | Continuous scroll + data morphing | NYT/Pudding-style scrollytelling. Steps scroll freely, chart morphs when steps enter viewport. Time-based animation (not scrub-linked) for reliability. |
| Interstitial role | Both scene-setters and conceptual explainers | Scene-setters for loading (real-world context), explainers between steps (comprehension bridges for data mutations). |
| Interstitial placement | Right panel takeover | Chart cross-fades to conceptual animation, plays, then morphs into next chart state. Left panel has narrative card. Keeps right panel as the storytelling stage. |
| Animation sourcing | Programmatic SVG + GSAP (engine), Claude as art director (authoring) | Scene composition engine renders SVG primitives driven by GSAP timelines. Claude provides structured scene directives in the payload. |
| Chart rendering | D3 (replacing Observable Plot) | Full control over every SVG element. Native `transition()` and `interpolate()` for data morphing. Curves reshape, points migrate, axes rescale — not just dissolve. |

---

## Architecture

Four systems coordinate to deliver the motion design:

### System 1: D3 Chart Engine

Replaces Observable Plot. Renders all chart types as D3-managed SVG with enter/update/exit transitions.

**File structure:**
```
src/chart/
├── engine.ts           // orchestrator — manages the SVG canvas, delegates to renderers
├── renderers/
│   ├── function-plot.ts  // line/area charts (d3.line, d3.area)
│   ├── distribution.ts   // area + line overlay with fill
│   ├── scatter.ts        // circle elements with enter/exit
│   ├── bar.ts            // rect elements with height transitions
│   └── vector-field.ts   // arrow/vector marks
└── transitions.ts      // D3 interpolation helpers, easing mappings
```

> **Note:** `surface-3d` is deferred from this iteration. It requires WebGL/Three.js, which is a separate rendering paradigm from D3 SVG. It will be addressed in a future spec. Payloads with `graphType: "surface-3d"` fall back to a scatter projection.

**Key behaviors:**
- Each renderer module implements `enter(data, svg)`, `update(data, svg, transition)`, and `exit(svg, transition)`
- The engine maintains a persistent SVG element — never clears `innerHTML`
- Same-type transitions use D3's `transition().attr()` for smooth data interpolation
- Cross-type transitions call `exit()` on the old renderer, then `enter()` on the new one
- Axes, grid lines, and labels transition independently from data marks

### System 2: Transition Manager

Coordinates what happens when the active step changes. The decision brain.

**Decision logic:**
```
step changes →
  if step has interstitial AND scrolling forward AND scroll velocity is low:
    → enter INTERSTITIAL state
    → scene engine plays interstitial
    → scene elements morph into chart data
    → chart engine enters with new data
  if same chart type (no interstitial):
    → D3 data interpolation (morph)
  if different chart type (no interstitial):
    → exit old renderer → enter new renderer with stagger
```

**Scroll velocity threshold:** Interstitials trigger when scroll velocity drops below `INTERSTITIAL_VELOCITY_THRESHOLD` (default: `200` px/s). Above this threshold, the transition manager skips the interstitial and jumps directly to the chart state. This constant lives in `src/stage/transition-manager.ts`.

**Edge cases:**
- **Fast scrolling:** Cancel in-flight animations, jump to target step's chart state. Interstitials are skipped.
- **Scroll backwards:** Chart data morphs in reverse, interstitials do NOT replay
- **Slider adjustment during interstitial:** Sliders disabled (dimmed with tooltip: "Adjustable after visualization loads") until chart is interactive
- **Autoplay:** During autoplay, interstitials play at their full `duration`, then autoplay resumes after the chart enters INTERACTIVE. Autoplay timer pauses during INTERSTITIAL state.

### System 3: Scene Composition Engine

Builds and animates interstitial scenes — both loading scene setters and between-step conceptual explainers.

**File structure:**
```
src/scene/
├── engine.ts           // timeline builder — takes SceneDirective, returns GSAP timeline
├── primitives/
│   ├── particles.ts    // particles-scatter, particles-cluster
│   ├── icons.ts        // icon-flow
│   ├── arrows.ts       // flow-arrows
│   ├── shapes.ts       // bell-curve-form, confidence-band, axis-scale
│   ├── classify.ts     // split-classify, outlier-isolate
│   └── grids.ts        // matrix-grid, heatmap-pulse, tree-partition
└── presets/
    ├── statistics.ts   // domain-specific default compositions
    ├── finance.ts
    └── general.ts
```

**Composition rules:**
- Primitives in `visualHints[]` play sequentially. Each primitive's total duration is `sceneDuration / visualHints.length`. The `delay` field in `VisualHint.config` adds additional delay *before* that primitive starts (shifting subsequent primitives later).
- The last primitive's SVG elements become the "seed" for the chart morph
- Particles → data points, partition lines → axes, grid cells → bar rects

**Scene-to-chart handoff protocol:**
The handoff is owned by the **stage manager**, which coordinates between the scene engine and chart engine:

1. The scene engine tags all SVG elements in the final primitive with `data-handoff="true"` and `data-handoff-role` attributes (`"point"`, `"line"`, `"rect"`, `"axis"`, `"label"`).
2. When the scene completes, the stage manager calls `chartEngine.enterFromHandoff(svg, graphState)` instead of `chartEngine.enter(data, svg)`.
3. The chart engine's `enterFromHandoff` reads the tagged elements and transitions them to their final data-driven positions using D3 transitions.
4. **Mismatch strategy:** If the scene has fewer elements than the chart needs, new elements are created at the centroid of existing handoff elements and animate outward. If the scene has more, excess elements fade out during the transition. The target element count always comes from `graphState.data.length`.

**Error/fallback for scene composition:**
If a `VisualHint` fails to render (invalid config, unknown primitive), the scene engine skips that primitive, logs a warning, and continues with the next one. If *all* primitives fail, the interstitial is skipped entirely and the stage manager transitions directly to the chart state.

**Primitives vocabulary (12):**

| Primitive | Visual | Use Case |
|-----------|--------|----------|
| `particles-scatter` | Dots at random positions, Brownian drift | Raw/unstructured data |
| `particles-cluster` | Dots gravitate into groups | Clustering, pattern emergence |
| `tree-partition` | Lines draw sequentially, splitting space | Decision trees, isolation forest |
| `outlier-isolate` | Edge points pulse red, separate from cluster | Anomaly detection |
| `flow-arrows` | Sequential arrows between nodes | Pipelines, process stages |
| `bell-curve-form` | Gaussian draws from center outward | Normal distribution, probability |
| `split-classify` | Elements sort into labeled bins | Binary classification |
| `matrix-grid` | Grid cells light up sequentially | Confusion matrices, heatmaps |
| `icon-flow` | Domain emoji/icons with connecting arrows | Real-world processes |
| `heatmap-pulse` | Grid illuminates with varying intensity | Correlation, feature importance |
| `axis-scale` | Axes draw in, stretch, tick marks appear | Coordinate system setup |
| `confidence-band` | Region grows outward from center line | Confidence intervals, error bands |

### System 4: Stage Manager

Controls the right panel as a stage. Manages what's currently visible and coordinates handoffs.

**State machine:**
```
LOADING ──(data arrives)──→ REVEALING ──(morph complete)──→ INTERACTIVE
                                                              ↑    │
                                                              │    │ step has interstitial
                                                              │    ↓
                                                          INTERSTITIAL
                                                     (scene complete → enter next chart)

INTERACTIVE ──(step without interstitial)──→ INTERACTIVE (data morph, stays in state)
```

**States:**
- **LOADING:** Scene engine owns the full right panel. Plays `loadingScene` from payload. Loops until data arrives.
- **REVEALING:** Scene elements transform into first chart's data elements (e.g., scattered particles migrate to form histogram bars). Steps populate left panel. Sliders slide up.
- **INTERACTIVE:** Chart engine owns the SVG. Sliders are live. ScrollTrigger active.
- **INTERSTITIAL:** Chart exits → scene engine plays explainer → scene elements morph into next chart → back to INTERACTIVE.

---

## The 3-Phase Loading Flow

### Phase 1: LOADING — Real-World Scene Setter

1. User clicks Submit
2. `ontoolinputpartial` fires — if `loadingScene` is available in the partial JSON, the scene engine composes it. **Fallback:** If `loadingScene` hasn't arrived yet (LLM token ordering is non-deterministic), a generic domain-themed loading animation plays based on `formula.domain` if available, or a neutral particles animation otherwise.
3. Stage manager enters LOADING state
4. Left panel: chat dims, shows "Using visualize_formula..."
5. Right panel: scene engine takes full control, composes `loadingScene.visualHints` into animated real-world illustration (or the fallback)
6. If a real `loadingScene` arrives in a later partial update, it cross-fades into the generic animation
7. Animation loops until full payload arrives

### Phase 2: REVEALING — Scene Morphs Into First Chart

1. `ontoolinput` fires — full payload arrives
2. Stage manager enters REVEALING state
3. Scene engine receives "wrap up" signal, plays exit sequence
4. **The key moment:** scene elements don't disappear — they transform into the first chart's data elements (e.g., scattered particles migrate to form histogram bars, axes draw in)
5. Left panel: step cards populate with staggered fade-in
6. Sliders slide up from bottom of right panel
7. First step activates → INTERACTIVE

### Phase 3: INTERACTIVE — Scrollytelling Begins

1. Chart engine owns the SVG, sliders are live
2. User scrolls through steps in left panel
3. ScrollTrigger detects step entering viewport
4. Transition manager checks incoming step:
   - Has interstitial? → INTERSTITIAL state
   - Same chart type? → D3 data interpolation
   - Different chart type? → exit old, enter new with stagger
5. Formula bar highlights update
6. Slider adjustments trigger immediate re-render (no interstitial)

---

## Payload Schema Extension

### New top-level fields on FormulaPayload

```typescript
interface FormulaPayload {
  // ... existing fields unchanged ...
  steps: StepV2[];           // Modified: steps now include motion directives

  // NEW
  loadingScene: SceneDirective;     // Scene setter for the loading state
  transitions: TransitionDefaults;  // Default transition config
}
```

### StepV2 — Step with Motion Directives

```typescript
interface StepV2 {
  // Existing fields
  id: string;
  title: string;
  narrative: string;
  algebraDetail?: string;         // Now optional — not all steps have algebraic detail (e.g., EDA, model eval)
  highlightIds?: string[];        // Now optional — not all steps highlight formula parts
  graphState: GraphState;

  // NEW
  graphType: GraphType;           // Per-step chart type — enables cross-type transitions
  interstitial?: SceneDirective;  // Conceptual explainer before this step's chart
  transition?: StepTransition;    // Override transition config for this step
}
```

> **Critical:** `graphType` on each step is what enables the transition manager to detect cross-type transitions (e.g., histogram → scatter). Previously `graph.type` was a single global value on the payload. The global `graph.type` is retained as a default for steps that omit `graphType`.

### SceneDirective — Claude's Art Direction

```typescript
interface SceneDirective {
  type: "scene-setter" | "explainer";
  narrative: string;              // Shown as subtitle during scene
  visualHints: VisualHint[];      // Composable primitives, played sequentially
  duration?: number;              // ms, default 2000
  mood?: "dramatic" | "calm" | "urgent" | "analytical";
  // Mood visual mapping:
  //   dramatic  → slower easing (power3.inOut), deeper colors, longer hold on key frames
  //   calm      → gentle easing (sine.inOut), muted opacity, slow drift
  //   urgent    → fast easing (power2.out), sharp movements, red/amber accents
  //   analytical → linear easing, precise movements, cool blue tones, grid overlays
}
```

### VisualHint — Composable Primitives

```typescript
interface VisualHint {
  primitive:
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
  config?: {
    count?: number;       // particle count, grid size, etc.
    color?: string;       // override theme color
    labels?: string[];    // text/emoji labels
    delay?: number;       // stagger delay (ms)
    [key: string]: unknown; // primitive-specific options
  };
}
```

### StepTransition — Per-Step Transition Config

```typescript
interface StepTransition {
  morph: "interpolate" | "crossfade" | "stagger-enter" | "none";
  duration?: number;    // ms, default 800
  easing?: string;      // GSAP ease string, default "power2.inOut"
  delay?: number;       // ms before transition starts
}

interface TransitionDefaults {
  morph: StepTransition["morph"];  // default: "interpolate"
  duration: number;                // default: 800
  easing: string;                  // default: "power2.inOut"
}
```

---

## Example Payload: Fraud Detection

```typescript
{
  formula: {
    latex: "P(\\text{fraud} | X) = \\frac{P(X | \\text{fraud}) \\cdot P(\\text{fraud})}{P(X)}",
    description: "Fraud Detection: Bayesian Classification",
    domain: "finance"
  },
  loadingScene: {
    type: "scene-setter",
    narrative: "Analyzing transaction patterns across thousands of card payments...",
    visualHints: [
      { primitive: "icon-flow", config: { labels: ["💳", "🏪", "🏦"] } },
      { primitive: "particles-scatter", config: { count: 40 } }
    ],
    mood: "analytical"
  },
  transitions: { morph: "interpolate", duration: 800, easing: "power2.inOut" },
  steps: [
    {
      id: "eda-amount-dist",
      title: "Transaction Amount Distribution",
      narrative: "Most transactions cluster under $200, but fraud often hides in the long tail...",
      algebraDetail: "\\text{histogram}(x) = \\frac{\\text{count}(x \\in [a,b])}{N \\cdot \\Delta x}",
      highlightIds: [],
      graphType: "distribution",
      graphState: { /* histogram data */ },
      transition: { morph: "stagger-enter", duration: 1200 }
    },
    {
      id: "anomaly-isolation-forest",
      title: "Isolation Forest: Finding Outliers",
      narrative: "The algorithm isolates anomalies by recursively partitioning the feature space...",
      highlightIds: ["anomaly-score"],
      graphType: "scatter",
      graphState: { /* scatter with anomaly scores */ },
      interstitial: {
        type: "explainer",
        narrative: "How does the algorithm know which transactions are suspicious?",
        visualHints: [
          { primitive: "particles-scatter", config: { count: 60 } },
          { primitive: "tree-partition" },
          { primitive: "outlier-isolate", config: { color: "#ef4444" } }
        ],
        mood: "analytical",
        duration: 3000
      },
      transition: { morph: "interpolate" }
    },
    {
      id: "model-confusion-matrix",
      title: "Model Performance: Confusion Matrix",
      narrative: "How well does the model distinguish fraud from legitimate transactions?",
      graphType: "bar",
      graphState: { /* confusion matrix data */ },
      interstitial: {
        type: "explainer",
        narrative: "Each transaction gets classified — but not every prediction is correct...",
        visualHints: [
          { primitive: "split-classify", config: { labels: ["Legit ✓", "Fraud ✗"], count: 30 } },
          { primitive: "matrix-grid", config: { labels: ["TN", "FP", "FN", "TP"] } }
        ],
        mood: "analytical",
        duration: 2500
      }
    }
  ]
}
```

---

## Migration Path

### What changes from current codebase

| Current | New | Impact |
|---------|-----|--------|
| `src/renderer/graph.ts` (Observable Plot) | `src/chart/engine.ts` + `src/chart/renderers/*` (D3) | **Full rewrite** of chart rendering |
| `src/animation/timeline.ts` (ScrollTrigger) | `src/stage/manager.ts` + `src/stage/transition-manager.ts` | **Major rewrite** — adds state machine, interstitial coordination |
| `src/animation/highlights.ts` | Unchanged | Formula bar highlights stay the same |
| `src/renderer/steps.ts` | Minor changes — add interstitial card rendering | **Small modification** |
| `src/renderer/controls.ts` | Minor changes — disable during interstitial | **Small modification** |
| `src/renderer/sliders.ts` | Minor changes — disable/enable during states | **Small modification** |
| `src/renderer/formula-bar.ts` | Unchanged | |
| `src/eval/evaluator.ts` | Unchanged | |
| `src/types.ts` | Add `StepV2`, `SceneDirective`, `VisualHint`, `StepTransition`, `TransitionDefaults` | **Extension** |
| `src/mcp-app.ts` | Update to use stage manager, handle new payload fields | **Moderate rewrite** |
| `src/global.css` | Add stage/interstitial states, disabled slider styles | **Extension** |
| (new) `src/chart/*` | D3 chart engine and renderers | **Net new** |
| (new) `src/scene/*` | Scene composition engine and primitives | **Net new** |
| (new) `src/stage/*` | Stage manager and transition manager | **Net new** |

### Dependencies

| Current | Change |
|---------|--------|
| `@observablehq/plot` | **Remove** |
| `d3` (+ `@types/d3`) | **Add** |
| `gsap` | Keep (already installed) |

---

## Success Criteria

1. **Chart morphing:** When scrolling between steps of the same chart type, data points interpolate smoothly — curves reshape, bars grow/shrink, dots migrate. No innerHTML replacement.
2. **Interstitial playback:** Between-step conceptual explainers play as composed SVG animations when the user scrolls forward at normal speed.
3. **Loading flow:** The 3-phase sequence (scene setter → morph → interactive) plays on initial payload delivery.
4. **Scene-to-chart handoff:** The last primitive's SVG elements visually transform into the chart's data elements — no jarring cut.
5. **Edge cases:** Fast scrolling skips animations cleanly. Backwards scrolling morphs without replaying interstitials. Sliders disabled during interstitials.
6. **Payload backward compatibility:** Payloads without `loadingScene`, `interstitial`, or `transition` fields render correctly with default behaviors (instant chart render, no interstitials).
