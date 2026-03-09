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
  data: z.array(z.record(z.string(), z.unknown())),
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
        coords: z.record(z.string(), z.number()),
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
    config: z.record(z.string(), z.unknown()),
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
        parameterValues: z.record(z.string(), z.number()),
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
