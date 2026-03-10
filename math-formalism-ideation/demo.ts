/**
 * Demo: Claude Agent SDK → Math Formalism Ideation
 *
 * Uses your Claude Code Max subscription to generate FormulaPayloadV2
 * payloads via the visualize_formula MCP tool, then opens the app in
 * the browser so you can experience the full motion-design pipeline.
 *
 * Usage:
 *   1. Start the MCP server:  npm run start
 *   2. In another terminal:   npm run demo [-- "your prompt here"]
 *
 * Default prompt generates a Bayesian fraud-detection visualization.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ─── Windows .cmd → cli.js fix ───
// See ref/claude-electron-sdk-fix/CLAUDE-AGENT-SDK-ELECTRON.md

function findClaudeCodeExecutable(): string | undefined {
  if (process.platform === "win32") {
    // Try where claude.cmd first
    try {
      const cmdResult = execSync("where claude.cmd", { encoding: "utf-8" })
        .trim()
        .split("\n")[0];
      if (fs.existsSync(cmdResult)) return cmdResult;
    } catch {
      // Fall through
    }

    // Check common npm global paths
    const npmGlobalPaths = [
      path.join(process.env.APPDATA || "", "npm", "claude.cmd"),
      path.join(process.env.LOCALAPPDATA || "", "npm", "claude.cmd"),
    ];
    for (const p of npmGlobalPaths) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    try {
      const result = execSync("which claude", { encoding: "utf-8" }).trim();
      if (fs.existsSync(result)) return result;
    } catch {
      // Fall through
    }
  }
  return undefined;
}

function resolveCliPath(claudeCodePath: string): {
  cliJsPath: string;
  useNodeExecutable: boolean;
} {
  const isCmd = claudeCodePath.endsWith(".cmd");
  if (!isCmd) return { cliJsPath: claudeCodePath, useNodeExecutable: false };

  const npmDir = path.dirname(claudeCodePath);
  const cliJsPath = path.join(
    npmDir,
    "node_modules",
    "@anthropic-ai",
    "claude-code",
    "cli.js",
  );

  if (!fs.existsSync(cliJsPath)) {
    throw new Error(`cli.js not found at: ${cliJsPath}`);
  }

  // Convert backslashes to forward slashes — the SDK passes this as a CLI arg
  // and Windows backslashes get eaten in the spawn argument handling
  return { cliJsPath: cliJsPath.replace(/\\/g, "/"), useNodeExecutable: true };
}

// ─── Prompt ───

const DEFAULT_PROMPT = `Visualize Bayes' theorem applied to fraud detection.

Formula: P(Fraud|Flagged) = P(Flagged|Fraud) * P(Fraud) / P(Flagged)

Create a rich, multi-step exploration:
1. Start with the prior probability of fraud (base rate ~0.1%)
2. Show how the likelihood P(Flagged|Fraud) amplifies the signal
3. Demonstrate the normalizing denominator P(Flagged) and why it matters
4. Reveal the posterior — how dramatically the probability shifts
5. Let the user adjust the base rate and sensitivity via parameters

Make it feel dramatic — use a loading scene with particles scattering into clusters
to represent transactions being classified. Use interstitial scenes between key steps
(e.g., a split-classify animation between step 2 and 3). Use data morphing transitions
where chart types stay the same, and crossfade transitions where they change.

Parameters should include:
- base_rate (0.001 to 0.1, default 0.001, step 0.001) — P(Fraud)
- sensitivity (0.5 to 0.99, default 0.95, step 0.01) — P(Flagged|Fraud)
- false_positive_rate (0.01 to 0.3, default 0.05, step 0.01) — P(Flagged|¬Fraud)

Use "distribution" as the default graph type, with scatter for the prior visualization
and bar for the final posterior comparison.`;

const userPrompt = process.argv.slice(2).join(" ") || DEFAULT_PROMPT;

const SYSTEM_PROMPT = `You are a mathematical visualization designer for the Math Formalism Ideation app.

When asked to visualize a formula, call the visualize_formula tool with a complete
FormulaPayloadV2. The payload schema supports motion design features:

- loadingScene: A SceneDirective with visual primitives that play while the app loads
- transitions: Default morph/duration/easing for step transitions
- Per-step fields:
  - graphType: Override the default graph type for specific steps
  - interstitial: A SceneDirective that plays as a mini-animation between steps
  - transition: Per-step morph/duration/easing override
  - algebraDetail and highlightIds are optional

Scene primitives you can use in visualHints:
  particles-scatter, particles-cluster, tree-partition, flow-arrows,
  bell-curve-form, split-classify, heatmap-pulse, axis-scale,
  icon-flow, outlier-isolate, confidence-band, matrix-grid

Moods: dramatic, calm, urgent, analytical

Morph types: interpolate (smooth data morph), crossfade (for chart type changes),
  stagger-enter (elements enter one by one), none

Make the visualization feel cinematic and immersive. Use the loading scene to set
the mood, interstitials to create narrative beats, and varied transitions to keep
the experience dynamic.

Each step needs valid graphState.data — arrays of objects with numeric values that
D3 can plot. For function-plot: [{x, y}]. For distribution: [{x, y}].
For scatter: [{x, y}]. For bar: [{label, value}].`;

// ─── Main ───

// Clear env var that prevents nested Claude Code sessions
// (set when running from within Claude Code / Agent SDK)
delete process.env.CLAUDECODE;

async function main() {
  // Find and resolve Claude CLI path
  const claudeCodePath = findClaudeCodeExecutable();
  if (!claudeCodePath) {
    console.error(
      "Could not find Claude Code CLI. Install with: npm install -g @anthropic-ai/claude-code",
    );
    process.exit(1);
  }

  const { cliJsPath, useNodeExecutable } = resolveCliPath(claudeCodePath);
  console.log(`Claude CLI: ${cliJsPath}`);
  console.log(
    `Runtime: ${useNodeExecutable ? "node (Windows .cmd fix)" : "native"}\n`,
  );

  console.log(`Prompt: ${userPrompt.slice(0, 100)}...`);
  console.log("─".repeat(60));

  const mcpServerUrl = process.env.MCP_URL ?? "http://localhost:3001/mcp";

  const result = query({
    prompt: userPrompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      permissionMode: "acceptEdits",
      maxTurns: 5,
      pathToClaudeCodeExecutable: cliJsPath,
      ...(useNodeExecutable && { executable: "node" as const }),
      allowedTools: [
        "mcp__math-visualizer__visualize_formula",
      ],
      mcpServers: {
        "math-visualizer": {
          type: "http",
          url: mcpServerUrl,
        },
      },
    },
  });

  let savedPayload = false;

  for await (const message of result) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          console.log(`\nClaude: ${block.text}`);
        } else if (block.type === "tool_use") {
          console.log(`\n[Calling tool: ${block.name}]`);
          // Capture the payload and save for browser preview
          if (
            block.name === "mcp__math-visualizer__visualize_formula" &&
            block.input &&
            typeof block.input === "object" &&
            "payload" in block.input
          ) {
            const payloadPath = path.join(
              import.meta.dirname,
              "dist",
              "last-payload.json",
            );
            fs.writeFileSync(
              payloadPath,
              JSON.stringify(block.input.payload, null, 2),
            );
            savedPayload = true;
            console.log(`[Payload saved to ${payloadPath}]`);
          }
        }
      }
    } else if (message.type === "result") {
      console.log("\n" + "─".repeat(60));
      console.log("Session complete.");
      if (message.subtype === "error_max_turns") {
        console.log("(Reached max turns limit)");
      }
    }
  }

  if (savedPayload) {
    console.log("\nPreview the visualization at http://localhost:3001/");
  } else {
    console.log("\nNo payload was generated. Try running again.");
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
