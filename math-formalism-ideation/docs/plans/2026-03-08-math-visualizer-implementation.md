# Math Formalism Ideation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP App that transforms mathematical ideas into animated, interactive formula visualizations with scrolly-telling step-by-step traces, dynamic graphs, and in-app parameter controls.

**Architecture:** MCP server (Express + stdio transports) registers a `visualize_formula` tool and an `update_formula_parameters` app-only tool, both linked to a single HTML resource. The client is a vanilla TypeScript app bundled into a single HTML file via Vite, using KaTeX for formulas, Observable Plot for graphs, GSAP ScrollTrigger for scroll-driven animation, and math.js for client-side parameter evaluation.

**Tech Stack:** TypeScript, Vite + vite-plugin-singlefile, KaTeX, @observablehq/plot, GSAP (ScrollTrigger + ScrollToPlugin), mathjs, @modelcontextprotocol/ext-apps, @modelcontextprotocol/sdk, zod

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`
- Create: `mcp-app.html`
- Create: `.gitignore`

**Step 1: Initialize package.json**

```bash
cd c:/Users/digit/Developer/jhu-claude-skills/math-formalism-ideation
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk zod express cors katex mathjs
npm install -D typescript vite vite-plugin-singlefile concurrently cross-env @types/node @types/express @types/cors tsx
```

Note: GSAP and @observablehq/plot will also be installed here. Observable Plot is an npm package. GSAP's free version is on npm as `gsap`.

```bash
npm install @observablehq/plot gsap
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "server.ts"]
}
```

**Step 4: Create tsconfig.server.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["server.ts"]
}
```

**Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const INPUT = process.env.INPUT;
if (!INPUT) {
  throw new Error("INPUT environment variable is not set");
}

const isDevelopment = process.env.NODE_ENV === "development";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    sourcemap: isDevelopment ? "inline" : undefined,
    cssMinify: !isDevelopment,
    minify: !isDevelopment,
    rollupOptions: {
      input: INPUT,
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
```

**Step 6: Create mcp-app.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Math Visualizer</title>
</head>
<body>
  <main class="main">
    <header class="header" id="header">
      <h1 id="formula-title">Math Visualizer</h1>
      <p id="formula-description">Waiting for formula...</p>
    </header>

    <section class="formula-bar" id="formula-bar">
      <div id="formula-display"></div>
      <div id="parameter-values" class="parameter-values"></div>
    </section>

    <div class="content-area">
      <div class="scroll-panel" id="scroll-panel"></div>
      <div class="sticky-panel" id="sticky-panel">
        <div class="graph-container" id="graph-container"></div>
        <div class="sliders-container" id="sliders-container"></div>
      </div>
    </div>

    <nav class="controls-bar" id="controls-bar">
      <button id="btn-prev" disabled>&#9664; Prev</button>
      <span id="step-indicator">Step 0 of 0</span>
      <button id="btn-next" disabled>Next &#9654;</button>
      <button id="btn-play" disabled>&#9654; Play</button>
    </nav>
  </main>
  <script type="module" src="/src/mcp-app.ts"></script>
</body>
</html>
```

**Step 7: Create .gitignore**

```
node_modules/
dist/
```

**Step 8: Add npm scripts to package.json**

```bash
npm pkg set type="module"
npm pkg set scripts.dev="cross-env NODE_ENV=development concurrently \"cross-env INPUT=mcp-app.html vite build --watch\" \"tsx --watch main.ts\""
npm pkg set scripts.build="tsc --noEmit && cross-env INPUT=mcp-app.html vite build"
npm pkg set scripts.serve="tsx main.ts"
npm pkg set scripts.start="cross-env NODE_ENV=development npm run build && npm run serve"
npm pkg set scripts.serve:stdio="tsx main.ts --stdio"
```

**Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.server.json vite.config.ts mcp-app.html .gitignore
git commit -m "feat: scaffold math-visualizer MCP app project"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types.ts`

**Step 1: Write type definitions**

Define the `FormulaPayload`, `GraphState`, and related types that form the data contract between Claude and the app.

```typescript
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
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add FormulaPayload type definitions"
```

---

### Task 3: MCP Server — Tools & Resource Registration

**Files:**
- Create: `server.ts`
- Create: `main.ts`

**Step 1: Write server.ts**

Register the `visualize_formula` tool, the `update_formula_parameters` app-only tool, and the HTML resource.

```typescript
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const GraphStateSchema = z.object({
  data: z.array(z.record(z.unknown())),
  axes: z
    .object({
      x: z.object({ label: z.string().optional(), domain: z.tuple([z.number(), z.number()]).optional() }).optional(),
      y: z.object({ label: z.string().optional(), domain: z.tuple([z.number(), z.number()]).optional() }).optional(),
    })
    .optional(),
  highlightRegions: z
    .array(
      z.object({
        annotationId: z.string(),
        type: z.enum(["point", "region", "line"]),
        coords: z.record(z.number()),
      }),
    )
    .optional(),
});

const FormulaPayloadSchema = z.object({
  formula: z.object({
    latex: z.string(),
    description: z.string(),
    domain: z.enum([
      "calculus",
      "linear-algebra",
      "statistics",
      "algebra",
      "physics",
      "finance",
      "general",
    ]),
  }),
  annotations: z.array(
    z.object({
      id: z.string(),
      latexFragment: z.string(),
      label: z.string(),
      description: z.string(),
    }),
  ),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      narrative: z.string(),
      algebraDetail: z.string(),
      highlightIds: z.array(z.string()),
      graphState: GraphStateSchema,
    }),
  ),
  parameters: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      min: z.number(),
      max: z.number(),
      default: z.number(),
      step: z.number(),
    }),
  ),
  graph: z.object({
    type: z.enum([
      "function-plot",
      "vector-field",
      "distribution",
      "scatter",
      "bar",
      "surface-3d",
    ]),
    config: z.record(z.unknown()),
  }),
});

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Math Formalism Ideation",
    version: "1.0.0",
  });

  const resourceUri = "math-visualizer://app/mcp-app.html";

  // Primary tool — Claude populates the full payload
  registerAppTool(
    server,
    "visualize_formula",
    {
      title: "Visualize Formula",
      description:
        "Visualize a mathematical formula with animated step-by-step traces, " +
        "dynamic graphs, and interactive parameter controls. Accepts natural " +
        "language math concepts or LaTeX expressions. Returns a structured " +
        "FormulaPayload that the UI renders as a scrolly-telling visualization.",
      inputSchema: { payload: FormulaPayloadSchema },
      outputSchema: FormulaPayloadSchema,
      _meta: { ui: { resourceUri } },
    },
    async ({ payload }): Promise<CallToolResult> => {
      // The server is a pass-through — Claude generates the payload,
      // the server validates and forwards it to the UI.
      return {
        content: [
          {
            type: "text",
            text: `Formula: ${payload.formula.latex}\n\n${payload.formula.description}\n\nSteps:\n${payload.steps.map((s: { title: string; narrative: string }, i: number) => `${i + 1}. ${s.title}: ${s.narrative}`).join("\n")}`,
          },
        ],
        structuredContent: payload,
      };
    },
  );

  // App-only tool — for parameter updates from the app UI
  registerAppTool(
    server,
    "update_formula_parameters",
    {
      title: "Update Formula Parameters",
      description: "Update formula parameters from the app UI.",
      inputSchema: {
        parameterValues: z.record(z.number()),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["app"],
        },
      },
    },
    async ({ parameterValues }): Promise<CallToolResult> => {
      return {
        content: [
          {
            type: "text",
            text: `Parameters updated: ${JSON.stringify(parameterValues)}`,
          },
        ],
        structuredContent: { parameterValues },
      };
    },
  );

  // Resource — serves the bundled single-file HTML
  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    },
  );

  return server;
}
```

**Step 2: Write main.ts**

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import { createServer } from "./server.js";

async function startStreamableHTTPServer(
  createServer: () => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, () => {
    console.log(`Math Visualizer MCP server listening on http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function startStdioServer(
  createServer: () => McpServer,
): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
  } else {
    await startStreamableHTTPServer(createServer);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
git add server.ts main.ts
git commit -m "feat: add MCP server with visualize_formula tool and resource"
```

---

### Task 4: Global CSS & Theme

**Files:**
- Create: `src/global.css`

**Step 1: Write global.css**

This establishes the layout grid, formula bar pinning, scroll/sticky panels, controls bar, and host theme variable fallbacks.

```css
:root {
  color-scheme: light dark;

  /* Host style variable fallbacks */
  --color-text-primary: light-dark(#1f2937, #f3f4f6);
  --color-text-secondary: light-dark(#6b7280, #9ca3af);
  --color-background-primary: light-dark(#ffffff, #111111);
  --color-background-secondary: light-dark(#f9fafb, #1a1a1a);
  --color-background-tertiary: light-dark(#f3f4f6, #222222);
  --color-border: light-dark(#e5e7eb, #333333);
  --color-ring-primary: light-dark(#3b82f6, #60a5fa);
  --border-radius-md: 6px;
  --border-radius-lg: 10px;
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-weight-normal: 400;
  --font-weight-bold: 700;
  --font-text-md-size: 1rem;
  --font-text-md-line-height: 1.5;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: var(--font-sans);
  font-size: var(--font-text-md-size);
  line-height: var(--font-text-md-line-height);
  color: var(--color-text-primary);
  background: var(--color-background-primary);
  height: 100%;
  overflow: hidden;
}

/* === MAIN LAYOUT === */
.main {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  height: 100%;
  overflow: hidden;
}

/* === HEADER === */
.header {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.header h1 {
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}

.header p {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* === FORMULA BAR (fixed row) === */
.formula-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-background-secondary);
  border-bottom: 1px solid var(--color-border);
  text-align: center;
}

.formula-bar .katex-display {
  margin: 0;
}

.parameter-values {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xs);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

/* === CONTENT AREA (split panels) === */
.content-area {
  display: grid;
  grid-template-columns: 40% 60%;
  overflow: hidden;
}

/* Scroll panel (left) */
.scroll-panel {
  overflow-y: auto;
  padding: var(--spacing-lg);
  scroll-behavior: smooth;
}

/* Step cards */
.step-card {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  background: var(--color-background-primary);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.step-card.active {
  border-color: var(--color-ring-primary);
  box-shadow: 0 0 0 2px var(--color-ring-primary), 0 4px 12px rgba(0, 0, 0, 0.1);
}

.step-card .step-title {
  font-weight: var(--font-weight-bold);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-xs);
}

.step-card .step-number {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-xs);
}

.step-card .step-narrative {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.step-card .expand-toggle {
  display: inline-block;
  margin-top: var(--spacing-sm);
  font-size: 0.8rem;
  color: var(--color-ring-primary);
  cursor: pointer;
  border: none;
  background: none;
  font-family: var(--font-sans);
}

.step-card .expand-toggle:hover {
  text-decoration: underline;
}

.step-card .algebra-detail {
  display: none;
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-background-tertiary);
  border-radius: var(--border-radius-md);
  font-size: 0.85rem;
}

.step-card .algebra-detail.expanded {
  display: block;
}

/* Sticky panel (right) */
.sticky-panel {
  position: sticky;
  top: 0;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  border-left: 1px solid var(--color-border);
}

.graph-container {
  flex: 1;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.graph-container svg {
  width: 100%;
  height: auto;
}

.sliders-container {
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.slider-group {
  margin-bottom: var(--spacing-sm);
}

.slider-group label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.slider-group input[type="range"] {
  width: 100%;
  accent-color: var(--color-ring-primary);
}

.slider-group .slider-value {
  font-family: var(--font-mono);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

/* === CONTROLS BAR === */
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  background: var(--color-background-secondary);
}

.controls-bar button {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  transition: background 0.15s ease;
}

.controls-bar button:hover:not(:disabled) {
  background: var(--color-background-tertiary);
}

.controls-bar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

#step-indicator {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  min-width: 100px;
  text-align: center;
}

/* === FORMULA HIGHLIGHT SPANS === */
.formula-bar [data-annotation-id] {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out, filter 0.3s ease-out;
  display: inline-block;
}

.formula-bar [data-annotation-id].inactive {
  opacity: 0.4;
}

.formula-bar [data-annotation-id].active {
  opacity: 1;
  transform: scale(1.05);
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .content-area {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .sticky-panel {
    position: relative;
    border-left: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 50vh;
  }

  .scroll-panel {
    max-height: 50vh;
  }
}

/* === LOADING STATE === */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  font-style: italic;
}
```

**Step 2: Commit**

```bash
git add src/global.css
git commit -m "feat: add global CSS with layout grid and theme variables"
```

---

### Task 5: Formula Bar Renderer

**Files:**
- Create: `src/renderer/formula-bar.ts`

**Step 1: Write formula-bar.ts**

Renders the KaTeX formula with annotated spans for sub-expression highlighting. Each annotation's `latexFragment` is wrapped in a `\htmlClass` KaTeX macro so we can target it with CSS/GSAP.

```typescript
import katex from "katex";
import type { Annotation, Parameter } from "../types.js";
import { getAnnotationColor } from "../types.js";

const formulaDisplay = document.getElementById("formula-display")!;
const parameterValuesEl = document.getElementById("parameter-values")!;

/**
 * Wraps each annotation's latexFragment in a \htmlClass{} macro so we can
 * target sub-expressions with data attributes for highlighting.
 *
 * KaTeX supports \htmlClass, \htmlId, and \htmlData for custom attributes.
 * We use \htmlClass to apply a CSS class with the annotation ID.
 */
function buildAnnotatedLatex(
  latex: string,
  annotations: Annotation[],
): string {
  let annotatedLatex = latex;

  for (const annotation of annotations) {
    // Wrap the first occurrence of the fragment in \htmlClass
    const escaped = annotation.latexFragment.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const regex = new RegExp(escaped);
    annotatedLatex = annotatedLatex.replace(
      regex,
      `\\htmlClass{ann-${annotation.id}}{${annotation.latexFragment}}`,
    );
  }

  return annotatedLatex;
}

/**
 * Render the formula into the formula bar with KaTeX.
 */
export function renderFormulaBar(
  latex: string,
  annotations: Annotation[],
): void {
  const annotatedLatex = buildAnnotatedLatex(latex, annotations);

  katex.render(annotatedLatex, formulaDisplay, {
    displayMode: true,
    throwOnError: false,
    trust: true, // Required for \htmlClass
  });

  // After rendering, find each annotation span and add data attributes + color
  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    const elements = formulaDisplay.querySelectorAll(`.ann-${annotation.id}`);
    elements.forEach((el) => {
      (el as HTMLElement).dataset.annotationId = annotation.id;
      (el as HTMLElement).title = annotation.label;
      (el as HTMLElement).style.setProperty(
        "--highlight-color",
        getAnnotationColor(i),
      );
    });
  }
}

/**
 * Update the parameter values display beneath the formula.
 */
export function updateParameterDisplay(
  parameters: Parameter[],
  values: Record<string, number>,
): void {
  parameterValuesEl.innerHTML = parameters
    .map((p) => {
      const val = values[p.name] ?? p.default;
      return `<span>${p.name} = ${val}</span>`;
    })
    .join("");
}
```

**Step 2: Commit**

```bash
git add src/renderer/formula-bar.ts
git commit -m "feat: add KaTeX formula bar renderer with annotation highlighting"
```

---

### Task 6: Step Cards Renderer

**Files:**
- Create: `src/renderer/steps.ts`

**Step 1: Write steps.ts**

Renders step cards into the scroll panel with narrative text and expandable algebraic detail.

```typescript
import katex from "katex";
import type { Step } from "../types.js";

const scrollPanel = document.getElementById("scroll-panel")!;

/**
 * Render all step cards into the scroll panel.
 * Returns the created card elements for ScrollTrigger binding.
 */
export function renderSteps(steps: Step[]): HTMLElement[] {
  scrollPanel.innerHTML = "";
  const cards: HTMLElement[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const card = document.createElement("div");
    card.className = "step-card";
    card.dataset.stepIndex = String(i);
    card.dataset.stepId = step.id;

    const numberEl = document.createElement("div");
    numberEl.className = "step-number";
    numberEl.textContent = `Step ${i + 1}`;

    const titleEl = document.createElement("div");
    titleEl.className = "step-title";
    titleEl.textContent = step.title;

    const narrativeEl = document.createElement("div");
    narrativeEl.className = "step-narrative";
    narrativeEl.textContent = step.narrative;

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "expand-toggle";
    toggleBtn.textContent = "Show algebra \u25B8";

    const algebraEl = document.createElement("div");
    algebraEl.className = "algebra-detail";

    // Render algebraic detail as KaTeX
    if (step.algebraDetail) {
      katex.render(step.algebraDetail, algebraEl, {
        displayMode: true,
        throwOnError: false,
      });
    }

    toggleBtn.addEventListener("click", () => {
      const isExpanded = algebraEl.classList.toggle("expanded");
      toggleBtn.textContent = isExpanded
        ? "Hide algebra \u25BE"
        : "Show algebra \u25B8";
    });

    card.append(numberEl, titleEl, narrativeEl, toggleBtn, algebraEl);
    scrollPanel.appendChild(card);
    cards.push(card);
  }

  return cards;
}

/**
 * Set the active step card (visual highlight).
 */
export function setActiveStep(index: number, cards: HTMLElement[]): void {
  for (let i = 0; i < cards.length; i++) {
    cards[i].classList.toggle("active", i === index);
  }
}
```

**Step 2: Commit**

```bash
git add src/renderer/steps.ts
git commit -m "feat: add step cards renderer with expandable algebra detail"
```

---

### Task 7: Graph Renderer

**Files:**
- Create: `src/renderer/graph.ts`

**Step 1: Write graph.ts**

Uses Observable Plot to render graphs based on the graph type and current step's graph state.

```typescript
import * as Plot from "@observablehq/plot";
import type { FormulaPayload, GraphState, GraphType } from "../types.js";
import { getAnnotationColor } from "../types.js";

const graphContainer = document.getElementById("graph-container")!;

/**
 * Build an Observable Plot specification from the graph state and type.
 */
function buildPlot(
  graphType: GraphType,
  graphState: GraphState,
  config: Record<string, unknown>,
): HTMLElement | SVGElement {
  const marks: Plot.Markish[] = [];
  const options: Plot.PlotOptions = {
    width: graphContainer.clientWidth - 32,
    height: Math.max(300, graphContainer.clientHeight - 32),
    style: {
      background: "transparent",
      color: "var(--color-text-primary)",
    },
    x: {
      label: graphState.axes?.x?.label ?? "x",
      domain: graphState.axes?.x?.domain,
    },
    y: {
      label: graphState.axes?.y?.label ?? "y",
      domain: graphState.axes?.y?.domain,
    },
  };

  switch (graphType) {
    case "function-plot": {
      // Expect data as [{x, y}, ...] series
      marks.push(
        Plot.line(graphState.data, {
          x: "x",
          y: "y",
          stroke: config.color as string ?? "var(--color-ring-primary)",
          strokeWidth: 2,
        }),
      );
      // Add grid
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    case "scatter": {
      marks.push(
        Plot.dot(graphState.data, {
          x: "x",
          y: "y",
          fill: "var(--color-ring-primary)",
          r: 3,
        }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    case "distribution": {
      marks.push(
        Plot.areaY(graphState.data, {
          x: "x",
          y: "y",
          fill: "var(--color-ring-primary)",
          fillOpacity: 0.3,
        }),
        Plot.line(graphState.data, {
          x: "x",
          y: "y",
          stroke: "var(--color-ring-primary)",
          strokeWidth: 2,
        }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    case "bar": {
      marks.push(
        Plot.barY(graphState.data, {
          x: "category",
          y: "value",
          fill: "var(--color-ring-primary)",
        }),
      );
      break;
    }
    case "vector-field": {
      marks.push(
        Plot.vector(graphState.data, {
          x: "x",
          y: "y",
          rotate: "angle",
          length: "magnitude",
          stroke: "var(--color-ring-primary)",
        }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
      break;
    }
    default: {
      // Fallback: function plot
      marks.push(
        Plot.line(graphState.data, { x: "x", y: "y", stroke: "var(--color-ring-primary)" }),
      );
      marks.push(Plot.gridX(), Plot.gridY());
    }
  }

  // Add highlight regions
  if (graphState.highlightRegions) {
    for (const region of graphState.highlightRegions) {
      const color = getAnnotationColor(
        parseInt(region.annotationId.replace(/\D/g, ""), 10) || 0,
      );
      if (region.type === "point") {
        marks.push(
          Plot.dot([region.coords], {
            x: "x",
            y: "y",
            r: 6,
            fill: color,
            fillOpacity: 0.8,
          }),
        );
      }
    }
  }

  return Plot.plot({ ...options, marks });
}

/**
 * Render or update the graph.
 */
export function renderGraph(
  payload: FormulaPayload,
  graphState: GraphState,
): void {
  graphContainer.innerHTML = "";
  const plot = buildPlot(payload.graph.type, graphState, payload.graph.config);
  graphContainer.appendChild(plot);
}
```

**Step 2: Commit**

```bash
git add src/renderer/graph.ts
git commit -m "feat: add Observable Plot graph renderer with multi-type support"
```

---

### Task 8: Parameter Sliders Renderer

**Files:**
- Create: `src/renderer/sliders.ts`

**Step 1: Write sliders.ts**

Renders parameter sliders and emits change events.

```typescript
import type { Parameter } from "../types.js";

const slidersContainer = document.getElementById("sliders-container")!;

export type SliderChangeCallback = (values: Record<string, number>) => void;

let currentValues: Record<string, number> = {};

/**
 * Render parameter sliders. Returns initial values.
 */
export function renderSliders(
  parameters: Parameter[],
  onChange: SliderChangeCallback,
): Record<string, number> {
  slidersContainer.innerHTML = "";
  currentValues = {};

  if (parameters.length === 0) {
    slidersContainer.style.display = "none";
    return currentValues;
  }

  slidersContainer.style.display = "block";

  for (const param of parameters) {
    currentValues[param.name] = param.default;

    const group = document.createElement("div");
    group.className = "slider-group";

    const label = document.createElement("label");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = param.label;

    const valueSpan = document.createElement("span");
    valueSpan.className = "slider-value";
    valueSpan.textContent = String(param.default);

    label.append(nameSpan, valueSpan);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(param.min);
    input.max = String(param.max);
    input.step = String(param.step);
    input.value = String(param.default);

    input.addEventListener("input", () => {
      const val = parseFloat(input.value);
      currentValues[param.name] = val;
      valueSpan.textContent = String(val);
      onChange({ ...currentValues });
    });

    group.append(label, input);
    slidersContainer.appendChild(group);
  }

  return { ...currentValues };
}

export function getSliderValues(): Record<string, number> {
  return { ...currentValues };
}
```

**Step 2: Commit**

```bash
git add src/renderer/sliders.ts
git commit -m "feat: add parameter slider renderer"
```

---

### Task 9: Controls Bar

**Files:**
- Create: `src/renderer/controls.ts`

**Step 1: Write controls.ts**

Prev/next/play buttons that drive navigation.

```typescript
export type NavigateCallback = (direction: "prev" | "next") => void;
export type PlayCallback = (playing: boolean) => void;

const btnPrev = document.getElementById("btn-prev") as HTMLButtonElement;
const btnNext = document.getElementById("btn-next") as HTMLButtonElement;
const btnPlay = document.getElementById("btn-play") as HTMLButtonElement;
const stepIndicator = document.getElementById("step-indicator")!;

let isPlaying = false;
let playInterval: number | null = null;

export function initControls(
  onNavigate: NavigateCallback,
  onPlay: PlayCallback,
): void {
  btnPrev.addEventListener("click", () => onNavigate("prev"));
  btnNext.addEventListener("click", () => onNavigate("next"));
  btnPlay.addEventListener("click", () => {
    isPlaying = !isPlaying;
    btnPlay.innerHTML = isPlaying ? "&#9646;&#9646; Pause" : "&#9654; Play";
    onPlay(isPlaying);
  });
}

export function updateControls(
  currentStep: number,
  totalSteps: number,
): void {
  stepIndicator.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
  btnPrev.disabled = currentStep <= 0;
  btnNext.disabled = currentStep >= totalSteps - 1;
  btnPrev.removeAttribute("disabled");
  btnNext.removeAttribute("disabled");
  if (currentStep <= 0) btnPrev.setAttribute("disabled", "");
  if (currentStep >= totalSteps - 1) btnNext.setAttribute("disabled", "");
}

export function enableControls(): void {
  btnPrev.disabled = false;
  btnNext.disabled = false;
  btnPlay.disabled = false;
}

export function setPlaying(playing: boolean): void {
  isPlaying = playing;
  btnPlay.innerHTML = isPlaying ? "&#9646;&#9646; Pause" : "&#9654; Play";
}

export function startAutoPlay(
  advanceFn: () => void,
  intervalMs = 3000,
): void {
  stopAutoPlay();
  playInterval = window.setInterval(advanceFn, intervalMs);
}

export function stopAutoPlay(): void {
  if (playInterval !== null) {
    clearInterval(playInterval);
    playInterval = null;
  }
}
```

**Step 2: Commit**

```bash
git add src/renderer/controls.ts
git commit -m "feat: add controls bar with prev/next/play navigation"
```

---

### Task 10: Sub-Expression Highlight Animations

**Files:**
- Create: `src/animation/highlights.ts`

**Step 1: Write highlights.ts**

GSAP-driven highlight animations for the formula bar annotations.

```typescript
import gsap from "gsap";
import { getAnnotationColor } from "../types.js";
import type { Annotation } from "../types.js";

/**
 * Highlight specific annotations in the formula bar, dimming all others.
 */
export function highlightAnnotations(
  highlightIds: string[],
  allAnnotations: Annotation[],
): void {
  const formulaDisplay = document.getElementById("formula-display")!;

  for (let i = 0; i < allAnnotations.length; i++) {
    const annotation = allAnnotations[i];
    const elements = formulaDisplay.querySelectorAll(
      `[data-annotation-id="${annotation.id}"]`,
    );
    const isActive = highlightIds.includes(annotation.id);
    const color = getAnnotationColor(i);

    elements.forEach((el) => {
      gsap.to(el, {
        opacity: isActive ? 1 : 0.4,
        scale: isActive ? 1.05 : 1,
        duration: 0.3,
        ease: "power2.out",
        overwrite: true,
      });

      if (isActive) {
        (el as HTMLElement).style.filter = `drop-shadow(0 0 6px ${color})`;
        el.classList.add("active");
        el.classList.remove("inactive");
      } else {
        (el as HTMLElement).style.filter = "none";
        el.classList.add("inactive");
        el.classList.remove("active");
      }
    });
  }
}

/**
 * Reset all annotations to full opacity (no highlights).
 */
export function clearHighlights(allAnnotations: Annotation[]): void {
  const formulaDisplay = document.getElementById("formula-display")!;

  for (const annotation of allAnnotations) {
    const elements = formulaDisplay.querySelectorAll(
      `[data-annotation-id="${annotation.id}"]`,
    );
    elements.forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
        overwrite: true,
      });
      (el as HTMLElement).style.filter = "none";
      el.classList.remove("active", "inactive");
    });
  }
}
```

**Step 2: Commit**

```bash
git add src/animation/highlights.ts
git commit -m "feat: add GSAP sub-expression highlight animations"
```

---

### Task 11: Timeline & Scroll Sync

**Files:**
- Create: `src/animation/timeline.ts`

**Step 1: Write timeline.ts**

GSAP ScrollTrigger setup that syncs scroll position with step activation, formula highlights, and graph transitions.

```typescript
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import type { FormulaPayload } from "../types.js";
import { highlightAnnotations } from "./highlights.js";
import { renderGraph } from "../renderer/graph.js";
import { setActiveStep } from "../renderer/steps.js";
import { updateControls } from "../renderer/controls.js";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

let triggers: ScrollTrigger[] = [];
let currentStepIndex = 0;

export function getCurrentStep(): number {
  return currentStepIndex;
}

/**
 * Set up ScrollTrigger instances for each step card.
 * When a card scrolls into view, it activates the corresponding
 * formula highlights and graph state.
 */
export function setupTimeline(
  cards: HTMLElement[],
  payload: FormulaPayload,
): void {
  // Clean up previous triggers
  teardownTimeline();

  const scrollPanel = document.getElementById("scroll-panel")!;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const step = payload.steps[i];

    const trigger = ScrollTrigger.create({
      trigger: card,
      scroller: scrollPanel,
      start: "top center",
      end: "bottom center",
      onEnter: () => activateStep(i, cards, payload),
      onEnterBack: () => activateStep(i, cards, payload),
    });

    triggers.push(trigger);
  }

  // Activate the first step
  if (cards.length > 0) {
    activateStep(0, cards, payload);
  }
}

function activateStep(
  index: number,
  cards: HTMLElement[],
  payload: FormulaPayload,
): void {
  currentStepIndex = index;
  const step = payload.steps[index];

  // Update step card visual state
  setActiveStep(index, cards);

  // Update formula highlights
  highlightAnnotations(step.highlightIds, payload.annotations);

  // Update graph
  renderGraph(payload, step.graphState);

  // Update controls bar
  updateControls(index, payload.steps.length);
}

/**
 * Programmatically scroll to a specific step.
 * Used by prev/next/play buttons.
 */
export function scrollToStep(
  index: number,
  cards: HTMLElement[],
  payload: FormulaPayload,
): void {
  if (index < 0 || index >= cards.length) return;

  const scrollPanel = document.getElementById("scroll-panel")!;

  gsap.to(scrollPanel, {
    scrollTo: { y: cards[index], offsetY: scrollPanel.clientHeight / 3 },
    duration: 0.5,
    ease: "power2.inOut",
  });

  activateStep(index, cards, payload);
}

/**
 * Clean up all ScrollTrigger instances.
 */
export function teardownTimeline(): void {
  for (const trigger of triggers) {
    trigger.kill();
  }
  triggers = [];
  currentStepIndex = 0;
}
```

**Step 2: Commit**

```bash
git add src/animation/timeline.ts
git commit -m "feat: add GSAP ScrollTrigger timeline for scroll-driven step sync"
```

---

### Task 12: Math.js Evaluator for Sliders

**Files:**
- Create: `src/eval/evaluator.ts`

**Step 1: Write evaluator.ts**

Wraps math.js for client-side formula re-evaluation when sliders change.

```typescript
import { evaluate, parse } from "mathjs";
import type { FormulaPayload, GraphState } from "../types.js";

/**
 * Re-evaluate the graph data for a function-plot by sampling the
 * formula expression with the given parameter values.
 *
 * For non-function-plot types, returns the current graphState unchanged
 * (the formula might not be a simple f(x)).
 */
export function evaluateWithParameters(
  payload: FormulaPayload,
  parameterValues: Record<string, number>,
  graphState: GraphState,
): GraphState {
  if (payload.graph.type !== "function-plot") {
    return graphState;
  }

  const expression = payload.graph.config.expression as string | undefined;
  if (!expression) {
    return graphState;
  }

  const xDomain = graphState.axes?.x?.domain ?? [-10, 10];
  const numPoints = 200;
  const step = (xDomain[1] - xDomain[0]) / numPoints;

  const data: Record<string, unknown>[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = xDomain[0] + i * step;
    try {
      const scope = { x, ...parameterValues };
      const y = evaluate(expression, scope) as number;
      if (typeof y === "number" && isFinite(y)) {
        data.push({ x, y });
      }
    } catch {
      // Skip points that fail to evaluate
    }
  }

  return {
    ...graphState,
    data,
  };
}
```

**Step 2: Commit**

```bash
git add src/eval/evaluator.ts
git commit -m "feat: add math.js evaluator for client-side parameter re-evaluation"
```

---

### Task 13: MCP App Client — Main Lifecycle

**Files:**
- Create: `src/mcp-app.ts`

**Step 1: Write mcp-app.ts**

The main app entry point: connects to the MCP host, handles `ontoolinput`, `ontoolinputpartial`, `ontoolresult`, and `onteardown`. Wires up all renderers and the animation timeline.

```typescript
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";

import type { FormulaPayload } from "./types.js";
import { renderFormulaBar, updateParameterDisplay } from "./renderer/formula-bar.js";
import { renderSteps } from "./renderer/steps.js";
import { renderGraph } from "./renderer/graph.js";
import { renderSliders } from "./renderer/sliders.js";
import {
  initControls,
  updateControls,
  enableControls,
  setPlaying,
  startAutoPlay,
  stopAutoPlay,
} from "./renderer/controls.js";
import {
  setupTimeline,
  scrollToStep,
  getCurrentStep,
  teardownTimeline,
} from "./animation/timeline.js";
import { clearHighlights } from "./animation/highlights.js";
import { evaluateWithParameters } from "./eval/evaluator.js";

// State
let currentPayload: FormulaPayload | null = null;
let stepCards: HTMLElement[] = [];
let parameterValues: Record<string, number> = {};

// DOM
const headerTitle = document.getElementById("formula-title")!;
const headerDescription = document.getElementById("formula-description")!;

function handleHostContextChanged(ctx: McpUiHostContext) {
  const mainEl = document.querySelector(".main") as HTMLElement;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

/**
 * Fully render a FormulaPayload into the UI.
 */
function renderPayload(payload: FormulaPayload): void {
  currentPayload = payload;

  // Header
  headerTitle.textContent = payload.formula.description;
  headerDescription.textContent = `Domain: ${payload.formula.domain}`;

  // Formula bar
  renderFormulaBar(payload.formula.latex, payload.annotations);

  // Steps
  stepCards = renderSteps(payload.steps);

  // Graph (initial state from first step)
  if (payload.steps.length > 0) {
    renderGraph(payload, payload.steps[0].graphState);
  }

  // Sliders
  parameterValues = renderSliders(payload.parameters, (values) => {
    parameterValues = values;
    updateParameterDisplay(payload.parameters, values);

    // Re-evaluate graph with new parameters
    if (currentPayload && currentPayload.steps.length > 0) {
      const currentStep = getCurrentStep();
      const updatedGraphState = evaluateWithParameters(
        currentPayload,
        values,
        currentPayload.steps[currentStep].graphState,
      );
      renderGraph(currentPayload, updatedGraphState);
    }
  });

  updateParameterDisplay(payload.parameters, parameterValues);

  // Enable controls
  enableControls();
  updateControls(0, payload.steps.length);

  // Set up scroll-driven timeline (after DOM is populated)
  requestAnimationFrame(() => {
    setupTimeline(stepCards, payload);
  });
}

// === MCP App Setup ===

const app = new App({ name: "Math Visualizer", version: "1.0.0" });

// Register handlers BEFORE connecting

app.onteardown = async () => {
  teardownTimeline();
  stopAutoPlay();
  return {};
};

app.ontoolinputpartial = (params) => {
  // Progressive rendering: show formula bar as soon as available
  const partial = params.arguments?.payload as Partial<FormulaPayload> | undefined;
  if (partial?.formula?.latex) {
    headerTitle.textContent = partial.formula.description ?? "Loading...";
    try {
      renderFormulaBar(partial.formula.latex, partial.annotations ?? []);
    } catch {
      // Partial KaTeX may fail — that's fine
    }
  }
};

app.ontoolinput = (params) => {
  const payload = params.arguments?.payload as FormulaPayload | undefined;
  if (payload) {
    renderPayload(payload);
  }
};

app.ontoolresult = (result: CallToolResult) => {
  // Handle updates from update_formula_parameters or re-invocations
  const payload = result.structuredContent as FormulaPayload | undefined;
  if (payload?.formula) {
    renderPayload(payload);
  }
};

app.ontoolcancelled = () => {
  headerTitle.textContent = "Cancelled";
};

app.onerror = console.error;

app.onhostcontextchanged = handleHostContextChanged;

// Navigation controls
initControls(
  (direction) => {
    if (!currentPayload) return;
    const current = getCurrentStep();
    const next =
      direction === "next"
        ? Math.min(current + 1, currentPayload.steps.length - 1)
        : Math.max(current - 1, 0);
    scrollToStep(next, stepCards, currentPayload);
  },
  (playing) => {
    if (!currentPayload) return;
    if (playing) {
      startAutoPlay(() => {
        if (!currentPayload) return;
        const current = getCurrentStep();
        if (current >= currentPayload.steps.length - 1) {
          setPlaying(false);
          stopAutoPlay();
          return;
        }
        scrollToStep(current + 1, stepCards, currentPayload);
      });
    } else {
      stopAutoPlay();
    }
  },
);

// Connect to host
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
});
```

**Step 2: Verify build compiles**

```bash
npm run build
```

Expected: No errors. `dist/mcp-app.html` is produced as a single-file bundle.

**Step 3: Commit**

```bash
git add src/mcp-app.ts
git commit -m "feat: add MCP app client with full lifecycle and rendering pipeline"
```

---

### Task 14: Build Verification & Manual Test

**Step 1: Build the project**

```bash
cd c:/Users/digit/Developer/jhu-claude-skills/math-formalism-ideation
npm run build
```

Expected: Clean build, `dist/mcp-app.html` exists.

**Step 2: Start the server**

```bash
npm run serve
```

Expected: `Math Visualizer MCP server listening on http://localhost:3001/mcp`

**Step 3: Test with basic-host**

In a separate terminal:

```bash
cd /tmp/mcp-ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm run start
```

Open `http://localhost:8080` in a browser. The tool `visualize_formula` should appear in the tool list. Calling it with a sample payload should render the visualization.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues from integration testing"
```

---

### Task 15: Sample Payload for Testing

**Files:**
- Create: `test-payload.json`

**Step 1: Create a sample payload for manual testing**

This provides a concrete test case — exponential decay — that exercises all features.

```json
{
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

Note: The `graphState.data` arrays are empty because the client-side evaluator (`evaluateWithParameters`) will generate the curve data from `graph.config.expression` and the parameter values. This is by design — Claude provides the expression, the app evaluates it.

**Step 2: Commit**

```bash
git add test-payload.json
git commit -m "feat: add sample exponential decay test payload"
```

---

### Task 16: Final Commit & Summary

**Step 1: Verify all files are committed**

```bash
git status
```

Expected: clean working tree.

**Step 2: Verify build one more time**

```bash
npm run build
```

Expected: clean build, `dist/mcp-app.html` is a single self-contained HTML file.
