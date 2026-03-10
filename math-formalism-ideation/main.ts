import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "./server.js";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

async function startStreamableHTTPServer(
  createServer: () => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve last demo payload as JSON (written by demo.ts)
  app.use("/api/payload", (_req: Request, res: Response) => {
    const payloadPath = path.join(DIST_DIR, "last-payload.json");
    if (!fs.existsSync(payloadPath)) {
      res.status(404).json({ error: "No payload yet. Run: npm run demo" });
      return;
    }
    res.setHeader("Content-Type", "application/json");
    fs.createReadStream(payloadPath).pipe(res);
  });

  // Serve built files (mcp-app.html, last-payload.json) from dist/
  app.use(express.static(DIST_DIR));

  // MCP endpoint
  app.use("/mcp", async (req: Request, res: Response) => {
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

  // Serve the built HTML app for browser preview (must be after /mcp and /api)
  app.use("/", (_req: Request, res: Response) => {
    const htmlPath = path.join(DIST_DIR, "mcp-app.html");
    if (!fs.existsSync(htmlPath)) {
      res.status(404).send("App not built yet. Run: npm run build");
      return;
    }
    res.setHeader("Content-Type", "text/html");
    fs.createReadStream(htmlPath).pipe(res);
  });

  const httpServer = app.listen(port, () => {
    console.log(`Math Visualizer MCP server listening on http://localhost:${port}/mcp`);
    console.log(`Preview app at http://localhost:${port}/`);
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
