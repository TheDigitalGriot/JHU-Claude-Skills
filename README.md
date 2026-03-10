# JHU Claude Skills

A laboratory for AI-assisted tools and interactive experiments built during the Johns Hopkins University Applied AI certificate program. What started as a collection of Claude Code skills has grown into a proving ground for ideas at the intersection of mathematical visualization, motion design, and agentic AI.

Built by [The Digital Griot](https://github.com/TheDigitalGriot), with mathematical formalism inspiration from [Sean](https://github.com/altivection01).

---

## Projects

### Math Formalism Ideation

**`math-formalism-ideation/`** — An MCP App that transforms mathematical formulas into cinematic, interactive explorations.

Claude receives a formula and produces a structured payload describing every aspect of the visualization: annotated LaTeX, step-by-step derivations, interactive graphs, parameter sliders, loading scenes, and transitions. The app renders it all with motion design that makes the math feel alive.

**Stack:** TypeScript, Express 5, MCP SDK, D3, KaTeX, GSAP, math.js, Zod, Vite

**Key features:**
- FormulaPayloadV2 schema with scene composition (12 visual primitives), morph transitions, and per-step interstitials
- D3 chart engine supporting function-plot, distribution, scatter, bar, and vector-field graph types
- Stage manager with state machine orchestration for loading, active, and transition states
- GSAP-powered sub-expression highlighting and scroll-driven step sync
- Claude Agent SDK demo (`demo.ts`) with battle-tested Windows 11 fixes for spawn, path, and session issues
- Standalone browser preview mode with fallback payload loading

```bash
cd math-formalism-ideation
npm install

# Start the MCP server + preview app
npm start
# Open http://localhost:3001

# Generate a visualization with Claude (requires Claude Code CLI)
npm run demo -- "Visualize the central limit theorem"
```

---

### Math Formalism Prototype

**`math-formalism-prototype/`** — The original React prototype that proved the concept before the MCP App existed.

A simulated agentic chat interface where pre-authored scenario files drive a timed sequence: thinking indicator, tool call block, streaming response, and synchronized visualization. No API keys needed.

**Stack:** React 19, TypeScript, Vite, KaTeX, Observable Plot, GSAP, math.js

```bash
cd math-formalism-prototype
npm install
npm run dev
# Open http://localhost:5173
```

---

### JHU Notebook Styler

**`jhu-notebook-styler/`** — A Claude Code skill that applies a branded three-tier blue color hierarchy to Jupyter notebook markdown headers for consistent, polished assignment submissions.

| Header | Color | Hex |
|--------|-------|-----|
| H1 | Dark blue | `#0444CD` |
| H2 | Medium blue | `#2F70F9` |
| H3 | Light blue (italic) | `#82A8F9` |

Idempotent, non-destructive, and aware of structural markers it should skip. Works as a Claude Code skill (auto-detected from prompts like "style this notebook") or standalone:

```bash
python3 jhu-notebook-styler/scripts/style_notebook.py input.ipynb
```

---

## Repository Structure

```
jhu-claude-skills/
├── math-formalism-ideation/     # MCP App — interactive formula visualization
│   ├── server.ts                #   MCP server + FormulaPayloadV2 validation
│   ├── main.ts                  #   Express server + preview routes
│   ├── demo.ts                  #   Claude Agent SDK demo (Windows-safe)
│   └── src/
│       ├── mcp-app.ts           #   Client app lifecycle
│       ├── chart/               #   D3 chart engine + renderers
│       ├── scene/               #   Scene composition (primitives, presets)
│       ├── stage/               #   Stage manager + transitions
│       ├── animation/           #   GSAP highlight animations
│       ├── renderer/            #   Formula bar, steps, sliders, controls
│       └── eval/                #   math.js parameter evaluator
│
├── math-formalism-prototype/    # React prototype — simulated chat + viz
│   └── src/
│       ├── components/          #   Chat panel, visualization panel, controls
│       ├── simulation/          #   Timed sequence engine
│       └── scenarios/           #   Pre-authored formula payloads
│
└── jhu-notebook-styler/         # Claude Code skill — notebook header styling
    ├── SKILL.md                 #   Skill definition + triggers
    └── scripts/                 #   Python styling script
```

## Credits

- **The Digital Griot** — concept, design, implementation
- **[Sean](https://github.com/altivection01)** — mathematical formalism inspiration, statistics domain expertise
