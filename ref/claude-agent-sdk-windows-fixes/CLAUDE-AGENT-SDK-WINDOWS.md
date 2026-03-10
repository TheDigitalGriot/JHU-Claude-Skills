# Claude Agent SDK — Windows + Max Subscription Fixes

## Overview

This document covers all the fixes needed to use `@anthropic-ai/claude-agent-sdk` in a **Node.js/TypeScript** project on Windows 11, powered by a Claude Code Max subscription (no API keys needed).

These were discovered while wiring the Math Formalism Ideation MCP app to Claude via the Agent SDK.

## Prerequisites

1. **Claude Code CLI installed globally:** `npm install -g @anthropic-ai/claude-code`
2. **Authenticated:** `claude login` (OAuth with your Max subscription)
3. **SDK in your project:** `npm install @anthropic-ai/claude-agent-sdk`

---

## Fix 1: `spawn EINVAL` — Windows `.cmd` Wrapper

### Problem

On Windows, `npm install -g` creates wrapper scripts:
- `claude.cmd` — batch file wrapper
- `claude.ps1` — PowerShell wrapper

The SDK spawns the CLI via `child_process.spawn()`, but `.cmd` files can't be spawned directly without `shell: true`.

### Solution

Point the SDK at the actual `cli.js` file and use `executable: 'node'`.

```typescript
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function findClaudeCodeExecutable(): string | undefined {
  if (process.platform === "win32") {
    try {
      const cmdResult = execSync("where claude.cmd", { encoding: "utf-8" })
        .trim()
        .split("\n")[0];
      if (fs.existsSync(cmdResult)) return cmdResult;
    } catch { /* fall through */ }

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
    } catch { /* fall through */ }
  }
  return undefined;
}

function resolveCliPath(claudeCodePath: string) {
  const isCmd = claudeCodePath.endsWith(".cmd");
  if (!isCmd) return { cliJsPath: claudeCodePath, useNodeExecutable: false };

  const npmDir = path.dirname(claudeCodePath);
  const cliJsPath = path.join(
    npmDir, "node_modules", "@anthropic-ai", "claude-code", "cli.js"
  );

  if (!fs.existsSync(cliJsPath)) {
    throw new Error(`cli.js not found at: ${cliJsPath}`);
  }

  // FIX 2: Convert backslashes to forward slashes (see below)
  return { cliJsPath: cliJsPath.replace(/\\/g, "/"), useNodeExecutable: true };
}
```

### Usage

```typescript
const claudeCodePath = findClaudeCodeExecutable();
const { cliJsPath, useNodeExecutable } = resolveCliPath(claudeCodePath);

const result = query({
  prompt: "Hello!",
  options: {
    pathToClaudeCodeExecutable: cliJsPath,
    ...(useNodeExecutable && { executable: "node" as const }),
    // ... other options
  },
});
```

---

## Fix 2: Backslash Path Mangling

### Problem

When you pass a Windows path like `C:\Users\digit\AppData\Roaming\npm\node_modules\...` to `pathToClaudeCodeExecutable`, the SDK passes it as a CLI argument internally. The backslashes get eaten during spawn argument handling, producing a mangled path like:

```
Cannot find module 'C:\Users\digit\...\UsersdigitAppDataRoaming\npm\node_modules...'
```

### Solution

Convert all backslashes to forward slashes before passing to the SDK:

```typescript
cliJsPath = cliJsPath.replace(/\\/g, "/");
// Result: C:/Users/digit/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/cli.js
```

Node.js handles forward-slash paths on Windows natively, and they survive the spawn argument chain.

### How we found it

Enabled debug stderr output:

```typescript
const result = query({
  prompt: "test",
  options: {
    pathToClaudeCodeExecutable: cliJsPath,
    executable: "node",
    stderr: (data) => process.stderr.write("[STDERR] " + data),
  },
});
```

The stderr showed `Error: Cannot find module` with the mangled path.

---

## Fix 3: Nested Session Detection

### Problem

When running the Agent SDK from within a Claude Code session (e.g., from Claude Code's Bash tool, or from a process that was launched by Claude Code), the `CLAUDECODE` environment variable is set. The CLI detects this and refuses to start:

```
Error: Claude Code cannot be launched inside another Claude Code session.
Nested sessions share runtime resources and will crash all active sessions.
```

### Solution

Clear the environment variable before spawning:

```typescript
delete process.env.CLAUDECODE;
```

Place this at the top of your script, before calling `query()`.

### Note

This is only needed when your script might be invoked from within Claude Code (e.g., during development/testing from Claude Code's terminal). In production, this variable won't be set.

---

## Complete Working Example

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Fix 3: Clear nested session detection
delete process.env.CLAUDECODE;

function findClaudeCodeExecutable(): string | undefined {
  if (process.platform === "win32") {
    try {
      return execSync("where claude.cmd", { encoding: "utf-8" }).trim().split("\n")[0];
    } catch { /* fall through */ }
    const p = path.join(process.env.APPDATA || "", "npm", "claude.cmd");
    if (fs.existsSync(p)) return p;
  } else {
    try {
      return execSync("which claude", { encoding: "utf-8" }).trim();
    } catch { /* fall through */ }
  }
  return undefined;
}

function resolveCliPath(claudeCodePath: string) {
  const isCmd = claudeCodePath.endsWith(".cmd");
  if (!isCmd) return { cliJsPath: claudeCodePath, useNodeExecutable: false };

  const npmDir = path.dirname(claudeCodePath);
  const cliJsPath = path.join(
    npmDir, "node_modules", "@anthropic-ai", "claude-code", "cli.js"
  );
  if (!fs.existsSync(cliJsPath)) throw new Error(`cli.js not found at: ${cliJsPath}`);

  // Fix 2: Forward slashes survive spawn argument handling
  return { cliJsPath: cliJsPath.replace(/\\/g, "/"), useNodeExecutable: true };
}

async function main() {
  const claudeCodePath = findClaudeCodeExecutable();
  if (!claudeCodePath) throw new Error("Claude Code CLI not found");

  const { cliJsPath, useNodeExecutable } = resolveCliPath(claudeCodePath);

  const result = query({
    prompt: "Say hello!",
    options: {
      maxTurns: 1,
      permissionMode: "acceptEdits",
      pathToClaudeCodeExecutable: cliJsPath,               // Fix 1: actual cli.js path
      ...(useNodeExecutable && { executable: "node" as const }), // Fix 1: use node runtime
    },
  });

  for await (const message of result) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") console.log(block.text);
      }
    }
  }
}

main();
```

---

## Connecting to an MCP Server

To have Claude call tools on a running MCP server:

```typescript
const result = query({
  prompt: "Visualize Bayes' theorem",
  options: {
    pathToClaudeCodeExecutable: cliJsPath,
    ...(useNodeExecutable && { executable: "node" as const }),
    permissionMode: "acceptEdits",
    maxTurns: 5,
    allowedTools: ["mcp__my-server__my_tool"],
    mcpServers: {
      "my-server": {
        type: "http",
        url: "http://localhost:3001/mcp",
      },
    },
  },
});
```

The SDK spawns Claude Code, which connects to your MCP server and calls tools as needed. No API keys — uses your Max subscription auth from `claude login`.

---

## Debugging Tips

### Enable stderr capture

```typescript
options: {
  stderr: (data: string) => process.stderr.write("[STDERR] " + data),
}
```

### Enable SDK debug logs

```bash
DEBUG_CLAUDE_AGENT_SDK=1 npx tsx demo.ts
```

Writes debug logs to `~/.claude/debug/sdk-*.txt`.

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `spawn EINVAL` | Spawning `.cmd` directly | Use `executable: 'node'` + `cli.js` path |
| `Cannot find module` with mangled path | Backslashes in path | Replace `\` with `/` |
| `Cannot be launched inside another Claude Code session` | `CLAUDECODE` env var set | `delete process.env.CLAUDECODE` |
| `Claude Code executable not found` | Path incorrect or missing | Check `pathToClaudeCodeExecutable` |
| `Not authenticated` | Haven't run `claude login` | Run `claude login` in terminal |

## Tested Environment

- Windows 11 Home (10.0.26200)
- Node.js v24.11.1
- @anthropic-ai/claude-agent-sdk ^0.2.72
- @anthropic-ai/claude-code 2.1.71 (global)
- tsx 4.21.0

## See Also

- `ref/claude-electron-sdk-fix/` — Electron-specific version of Fix 1 (spawn EINVAL)
- `math-formalism-ideation/demo.ts` — Full working demo with MCP server integration
