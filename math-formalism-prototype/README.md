# Math Formalism Prototype

A simulated agentic Claude chat interface demonstrating the **Math Formalism Ideation** MCP App — interactive mathematical formula visualization with step-by-step derivations, dynamic graphs, and parameter controls.

## Origin

This prototype was born from a conversation between [The Digital Griot](https://github.com/) and [Sean](https://github.com/altivection01) about mathematical formalism — specifically, the idea of making abstract mathematical concepts tangible through interactive, multi-sensory visualization. What started as a seed about expressing mathematical formalism evolved into a vision for an MCP App that lets Claude transform any mathematical concept into an immersive, explorable experience.

This prototype simulates that end-to-end experience so collaborators can see the vision and contribute.

## What This Is

A **simulated prototype** of the Math Formalism Ideation MCP App. It demonstrates:

- **Split-screen layout** — Claude chat on the left, math visualization on the right
- **Simulated Claude response** — Thinking indicator → tool call block → streaming text
- **Expandable tool calls** — Click to inspect the full structured payload
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
- GSAP (animations)
- CSS Modules (dark theme)

## Credits

- **The Digital Griot** — concept, design, implementation
- **[Sean](https://github.com/altivection01)** — mathematical formalism inspiration, statistics domain expertise
