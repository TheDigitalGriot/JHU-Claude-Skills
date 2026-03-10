# MCP Apps — Complete Guide

How the `create-mcp-app` skill works and what it produces. This document captures the full knowledge so it can be referenced without the skill plugin.

## What Is an MCP App?

An MCP App is an interactive UI that runs inside MCP-enabled hosts like **Claude Desktop**. It combines two parts:

1. **Tool** — Called by the LLM/host, returns structured data
2. **Resource** — Serves a bundled HTML file that displays the data as rich, interactive UI

The tool's `_meta.ui.resourceUri` links them together. When Claude calls the tool, the host fetches the resource and renders it as an embedded iframe alongside the conversation.

```
User asks question
  → Claude decides to call the tool
  → Host renders the resource (HTML UI) in an iframe
  → Server returns structured result
  → UI receives the result via ontoolinput/ontoolresult callbacks
  → User sees interactive visualization inline in the chat
```

## Architecture

### Server Side (Node.js / TypeScript)

The server registers tools and resources using `@modelcontextprotocol/sdk` and `@modelcontextprotocol/ext-apps`:

```typescript
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "My App", version: "1.0.0" });
const resourceUri = "ui://my-app/app.html";

// Register a tool that links to the UI resource
registerAppTool(server, "my-tool", {
  title: "My Tool",
  description: "Does something and shows UI",
  inputSchema: { query: z.string() },
  outputSchema: z.object({ result: z.string() }),
  _meta: { ui: { resourceUri } },  // <-- Links tool to UI
}, async ({ query }) => {
  return {
    content: [{ type: "text", text: "Fallback for non-UI hosts" }],
    structuredContent: { result: "data for the UI" },
  };
});

// Register the resource that serves the bundled HTML
registerAppResource(server, resourceUri, resourceUri, {
  mimeType: RESOURCE_MIME_TYPE,
}, async () => {
  const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
  return { contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }] };
});
```

### Client Side (Browser / iframe)

The HTML app uses the `App` class from `@modelcontextprotocol/ext-apps` to communicate with the host:

```typescript
import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "My App", version: "1.0.0" });

// Register ALL handlers BEFORE connecting
app.ontoolinput = (params) => {
  // Called when the tool is invoked — params.arguments contains the structured input
  renderUI(params.arguments);
};

app.ontoolresult = (result) => {
  // Called when the tool returns — result.structuredContent has the data
  updateUI(result.structuredContent);
};

app.ontoolinputpartial = (params) => {
  // Streaming: called as Claude generates the input (partial/healed JSON)
  showPreview(params.arguments);
};

app.onhostcontextchanged = (ctx) => {
  // Theme, fonts, styles from the host
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
};

app.onteardown = async () => {
  cleanup();
  return {};
};

app.onerror = console.error;

// Connect AFTER all handlers are registered
await app.connect();
```

### Transport Modes

The server entry point (`main.ts`) supports two transports:

- **Streamable HTTP** (default) — For testing with basic-host, runs on a port (e.g., 3001)
- **stdio** (`--stdio` flag) — For Claude Desktop, communicates via stdin/stdout

```typescript
if (process.argv.includes("--stdio")) {
  await server.connect(new StdioServerTransport());
} else {
  // Express + StreamableHTTPServerTransport on port 3001
}
```

## App Lifecycle

```
1. Host calls tool → server processes → returns structuredContent
2. Host fetches resource → gets bundled HTML
3. Host renders HTML in iframe
4. App.connect() establishes postMessage channel with host
5. Host sends ontoolinput (full arguments) or ontoolinputpartial (streaming)
6. Host sends ontoolresult (server's response)
7. App renders UI based on received data
8. User interacts with UI (sliders, buttons, etc.)
9. App can call server tools: app.callServerTool({ name, arguments })
10. App can send messages back to Claude: app.sendMessage(...)
11. Host sends onteardown when view is closed → app cleans up
```

## App-Only Tools

Tools with `visibility: ["app"]` are hidden from the LLM — only the app UI can call them. Useful for:

- Polling for live data
- Updating server-side state from UI interactions
- Fetching chunked data (large files, pagination)

```typescript
registerAppTool(server, "poll-data", {
  description: "Poll for updates",
  inputSchema: {},
  _meta: { ui: { resourceUri, visibility: ["app"] } },  // Hidden from Claude
}, async () => {
  return { content: [{ type: "text", text: "data" }], structuredContent: latestData };
});
```

The app calls it with:
```typescript
const result = await app.callServerTool({ name: "poll-data", arguments: {} });
```

## Build System

MCP Apps must be **single-file HTML** — all JS, CSS, and assets inlined into one `.html` file. This is because the resource is served as a string over the MCP protocol.

**Required tools:**
- **Vite** — Build tool
- **vite-plugin-singlefile** — Inlines all chunks into a single HTML file

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    rollupOptions: { input: process.env.INPUT },
    outDir: "dist",
    emptyOutDir: false,
  },
});
```

**Typical npm scripts:**
```json
{
  "dev": "cross-env NODE_ENV=development concurrently \"cross-env INPUT=mcp-app.html vite build --watch\" \"tsx --watch main.ts\"",
  "build": "tsc --noEmit && cross-env INPUT=mcp-app.html vite build",
  "serve": "tsx main.ts",
  "serve:stdio": "tsx main.ts --stdio"
}
```

## Framework Options

| Framework | SDK Support | Notes |
|-----------|-------------|-------|
| **Vanilla TS** | Manual `App` class | Lightest weight, full control |
| **React** | `useApp()` hook provided | Familiar DX, adds ~40KB |
| **Vue/Svelte/Preact/Solid** | Manual `App` class | Use framework's lifecycle with `App` |

For React, the SDK provides a `useApp` hook:
```tsx
const { app, toolInput, toolResult, hostContext } = useApp();
```

## Host Theming

The host provides CSS variables and theme info. Always set fallbacks:

```css
:root {
  color-scheme: light dark;
  --color-text-primary: light-dark(#1f2937, #f3f4f6);
  --color-background-primary: light-dark(#ffffff, #1a1a1a);
  --color-ring-primary: light-dark(#3b82f6, #60a5fa);
  /* ... more variables */
}
```

Apply host overrides in `onhostcontextchanged`:
```typescript
app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
};
```

## Content Security Policy (CSP)

MCP App HTML has **no same-origin server**. ALL network requests (even to localhost) require CSP configuration in the resource's `contents[]`:

```typescript
registerAppResource(server, uri, uri, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
  contents: [{
    uri,
    mimeType: RESOURCE_MIME_TYPE,
    text: html,
    _meta: {
      ui: {
        csp: { connectSrc: ["https://api.example.com"] },
        domain: "example.com",  // For CORS
      },
    },
  }],
}));
```

## Streaming / Progressive Rendering

Use `ontoolinputpartial` to show progress as Claude generates the tool input:

```typescript
app.ontoolinputpartial = (params) => {
  // params.arguments is "healed" JSON — partial but valid
  // Use for preview only, don't rely on completeness
  showPreview(params.arguments);
};

app.ontoolinput = (params) => {
  // Full, complete input — safe to render fully
  renderComplete(params.arguments);
};
```

> **Important:** Partial arguments are "healed" JSON — the host closes unclosed brackets to produce valid JSON. Objects may be incomplete. Use only for preview UI.

## Advanced Patterns

### Polling for Live Data
```typescript
let intervalId: number | null = null;

function startPolling() {
  if (intervalId !== null) return;
  poll();
  intervalId = window.setInterval(poll, 2000);
}

async function poll() {
  const result = await app.callServerTool({ name: "poll-data", arguments: {} });
  updateUI(result.structuredContent);
}

app.onteardown = async () => { stopPolling(); return {}; };
```

### Sending Messages to Claude
```typescript
await app.sendMessage(
  { role: "user", content: [{ type: "text", text: "Update the chart" }] },
  { signal: AbortSignal.timeout(5000) },
);
```

### Debug Logging
```typescript
await app.sendLog({ level: "info", data: "Debug message" });
await app.sendLog({ level: "error", data: { error: err.message } });
```

### Fullscreen Mode
```typescript
const { isError } = await app.requestDisplayMode("fullscreen");
```

## Testing

### With basic-host (local browser)

```bash
# Terminal 1: Your server
npm run build && npm run serve

# Terminal 2: basic-host
git clone --branch "v$(npm view @modelcontextprotocol/ext-apps version)" --depth 1 \
  https://github.com/modelcontextprotocol/ext-apps.git /tmp/mcp-ext-apps
cd /tmp/mcp-ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm run start
# Open http://localhost:8080
```

On Windows PowerShell, set env vars separately:
```powershell
$env:SERVERS='["http://localhost:3001/mcp"]'; npm run serve
```

### With Claude Desktop (production)

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-app": {
      "command": "npx",
      "args": ["tsx", "main.ts", "--stdio"],
      "cwd": "C:\\path\\to\\your\\project"
    }
  }
}
```

Restart Claude Desktop. The tool appears in Claude's tool list. Ask Claude to use it naturally.

## Common Mistakes

1. **No text fallback** — Always provide `content` array for non-UI hosts
2. **Missing CSP** — All network requests need CSP configuration
3. **CSP in wrong location** — `_meta.ui.csp` goes in `contents[]` objects, not in `registerAppResource()` config
4. **Handlers after connect** — Register ALL handlers BEFORE `app.connect()`
5. **No streaming** — Use `ontoolinputpartial` for large inputs to show progress
6. **Zod v3 vs v4** — If using Zod v4+, `z.record()` requires key schema: `z.record(z.string(), valueSchema)`

## Required Dependencies

```bash
# Runtime
npm install @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk zod express cors

# Dev
npm install -D typescript vite vite-plugin-singlefile concurrently cross-env @types/node @types/express @types/cors tsx
```

## Project Structure (Typical)

```
my-mcp-app/
├── server.ts              # MCP server: registerAppTool + registerAppResource
├── main.ts                # Entry point: HTTP + stdio transports
├── src/
│   ├── mcp-app.ts         # Client app: App lifecycle + UI rendering
│   ├── global.css         # Styles with host variable fallbacks
│   └── ...                # Additional modules
├── mcp-app.html           # HTML entry point (references src/mcp-app.ts)
├── vite.config.ts         # Vite + vite-plugin-singlefile
├── tsconfig.json          # Client TypeScript config (ESNext, DOM)
├── tsconfig.server.json   # Server TypeScript config (NodeNext)
├── package.json
└── .gitignore             # node_modules/, dist/
```

## Reference

- **SDK repo:** https://github.com/modelcontextprotocol/ext-apps
- **Examples:** `examples/basic-server-vanillajs/`, `basic-server-react/`, etc.
- **API docs:** `src/app.ts` (App class), `src/server/index.ts` (registration helpers), `src/spec.types.ts` (all types)
- **Patterns:** `docs/patterns.md` (polling, chunking, CSP, theming, fullscreen, etc.)
