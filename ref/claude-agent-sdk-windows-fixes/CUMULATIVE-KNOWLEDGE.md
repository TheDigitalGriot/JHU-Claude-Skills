# Claude Agent SDK — Cumulative Knowledge Base

## Cross-Platform Integration Guide for Max Subscription

> Everything we know about connecting Claude Code Max subscriptions to apps across Windows 11 and macOS, covering Electron, Python, TypeScript, Web, and MCP Apps.

---

## 1. Authentication Model (All Platforms)

The Claude Agent SDK uses your **Claude Code Max subscription** — zero API keys, zero API costs.

```
npm install -g @anthropic-ai/claude-code
claude login   # OAuth flow, creds saved to ~/.claude/
```

The SDK spawns `claude` as a subprocess. Authentication is inherited from the CLI's stored credentials. This means every fix below is really about **getting the subprocess to spawn correctly**.

---

## 2. The Spawn Chain

Understanding the spawn chain is key to understanding every fix:

```
Your App
  └─ @anthropic-ai/claude-agent-sdk  (query() / ClaudeSDKClient)
       └─ child_process.spawn()
            └─ [executable] [pathToClaudeCodeExecutable] [...sdk-args]
                 └─ Claude Code CLI (authenticates, connects to API, runs tools)
```

The SDK assembles CLI arguments (`--output-format stream-json`, `--permission-mode`, `--mcp-config`, etc.) and spawns a process. Every platform-specific fix targets a different failure point in this chain.

---

## 3. Windows 11 Fixes

### Fix W1: `spawn EINVAL` — The `.cmd` Wrapper Problem

**Affects:** All Windows Node.js environments (Electron, tsx, node)

**Root cause:** `npm install -g` creates `claude.cmd` (a batch wrapper). Node's `spawn()` can't execute `.cmd` files without `shell: true`. The SDK doesn't set `shell: true`.

**Fix:** Bypass the wrapper. Point at the real `cli.js` and use `node` as the executable.

```typescript
// Detect
const claudePath = execSync("where claude.cmd", { encoding: "utf-8" }).trim().split("\n")[0];

// Or check common locations
const fallbacks = [
  path.join(process.env.APPDATA || "", "npm", "claude.cmd"),
  path.join(process.env.LOCALAPPDATA || "", "npm", "claude.cmd"),
];

// Resolve .cmd → cli.js
const npmDir = path.dirname(claudePath);
const cliJsPath = path.join(npmDir, "node_modules", "@anthropic-ai", "claude-code", "cli.js");

// Use node as executable
query({
  prompt: "...",
  options: {
    pathToClaudeCodeExecutable: cliJsPath,
    executable: "node",
  },
});
```

**Discovered:** Error message `spawn EINVAL` is diagnostic for attempting to spawn a `.cmd` file.

---

### Fix W2: Backslash Path Mangling

**Affects:** Windows Node.js when using tsx (possibly other TypeScript runners)

**Root cause:** The SDK passes `pathToClaudeCodeExecutable` as a CLI argument to the spawned process. Windows backslashes (`\`) are consumed as escape characters during argument serialization, producing mangled paths like `UsersdigitAppDataRoaming`.

**Fix:** Convert backslashes to forward slashes. Node.js handles forward-slash paths natively on Windows.

```typescript
cliJsPath = cliJsPath.replace(/\\/g, "/");
// C:\Users\digit\...\cli.js → C:/Users/digit/.../cli.js
```

**Discovered:** Enabled `stderr` capture on the SDK query and saw `Cannot find module` with the mangled path:

```typescript
options: {
  stderr: (data) => process.stderr.write("[STDERR] " + data),
}
```

---

### Fix W3: Nested Session Detection

**Affects:** Windows (and macOS) when running SDK from within a Claude Code session

**Root cause:** Claude Code sets the `CLAUDECODE` environment variable. The CLI checks for this and refuses to start to prevent nested session crashes.

**Fix:** Clear the variable before spawning:

```typescript
delete process.env.CLAUDECODE;
```

**When needed:** Only during development/testing from within Claude Code's terminal. Not needed in production.

---

### Fix W4: Python `pywin32` Dependency

**Affects:** Python SDK on Windows

**Root cause:** The Python SDK depends on `pywin32` for Windows-specific functionality. Missing it causes `pywintypes` import errors.

**Fix:** Install `pywin32` before or alongside the SDK:

```python
pip install pywin32 claude-agent-sdk
```

For embedded Python (Blender, Maya):
```python
subprocess.run([python_exe, "-m", "pip", "install", "--target", site_packages, "pywin32"])
subprocess.run([python_exe, "-m", "pip", "install", "--target", site_packages, "claude-agent-sdk"])
```

---

### Fix W5: Embedded Python Path Detection

**Affects:** Python SDK in embedded environments (Blender, Maya, etc.) on Windows

**Root cause:** `sys.executable` returns the host application (`blender.exe`), not Python. The SDK needs the actual Python binary.

**Fix:** Use `sys.prefix` to derive the Python path:

```python
import sys, os

def get_embedded_python():
    if sys.platform == "win32":
        exe = os.path.join(sys.prefix, "bin", "python.exe")
        if not os.path.exists(exe):
            exe = os.path.join(sys.prefix, "python.exe")
    else:
        exe = os.path.join(sys.prefix, "bin", "python3")
    return exe if os.path.exists(exe) else None
```

---

### Fix W6: Post-Install Restart Requirement

**Affects:** Python SDK in embedded environments on Windows

**Root cause:** Even after `pip install` + `importlib.invalidate_caches()` + adding to `sys.path`, the import may fail on first attempt in some embedded runtimes.

**Fix:** Track install state and prompt for application restart:

```python
_install_state = None  # None=unchecked, True=ready, False=failed, 'restart'=needs restart

# After install attempt:
try:
    import claude_agent_sdk
    _install_state = True
except ImportError:
    _install_state = 'restart'  # Needs full app restart
```

---

## 4. macOS Fixes

### Fix M1: Path Detection

macOS uses a straightforward path:

```typescript
const result = execSync("which claude", { encoding: "utf-8" }).trim();
```

No `.cmd` wrapper issue — the installed binary is directly executable. Fixes W1 and W2 are **not needed** on macOS.

### Fix M2: Nested Session Detection

Same as W3 — applies on macOS when running from within Claude Code.

```typescript
delete process.env.CLAUDECODE;
```

### Fix M3: Embedded Python (Blender/Maya on macOS)

Same concept as W5 but the path is different:

```python
exe = os.path.join(sys.prefix, "bin", "python3")  # No .exe extension
```

---

## 5. Integration Patterns by App Type

### Pattern A: Node.js CLI / Script (TypeScript)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

delete process.env.CLAUDECODE;  // Fix W3/M2

const result = query({
  prompt: "...",
  options: {
    pathToClaudeCodeExecutable: resolvedCliJsPath,  // Fix W1
    ...(isWindows && { executable: "node" as const }),  // Fix W1
    permissionMode: "acceptEdits",
    maxTurns: 5,
  },
});

for await (const msg of result) { /* ... */ }
```

### Pattern B: Electron Desktop App

**Main process** — spawns Claude via IPC handler:

```typescript
// main.ts
ipcMain.handle("claude-query", async (event, prompt) => {
  const { cliJsPath, useNodeExecutable } = resolveCliPath(findClaudeCodeExecutable());

  const result = query({
    prompt,
    options: {
      pathToClaudeCodeExecutable: cliJsPath,
      ...(useNodeExecutable && { executable: "node" as const }),
      maxTurns: 1,
    },
  });

  for await (const message of result) {
    if (message.type === "assistant") {
      event.sender.send("claude-stream", message.message.content);
    }
  }
});
```

**Preload** — bridges IPC:

```typescript
contextBridge.exposeInMainWorld("claude", {
  query: (prompt: string) => ipcRenderer.invoke("claude-query", prompt),
  onStream: (cb: Function) => ipcRenderer.on("claude-stream", (_, data) => cb(data)),
});
```

### Pattern C: MCP App with Agent SDK

The SDK can connect to a running MCP server and have Claude call tools on it:

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

Tool naming: `mcp__<server-name>__<tool-name>`

### Pattern D: Python Desktop App (Blender, Maya, etc.)

```python
import asyncio, threading
from claude_agent_sdk import query, ClaudeAgentOptions, tool, create_sdk_mcp_server

# Background event loop (never await on UI thread)
_loop = None
def get_loop():
    global _loop
    if _loop is None:
        def run():
            global _loop
            _loop = asyncio.new_event_loop()
            asyncio.set_event_loop(_loop)
            _loop.run_forever()
        threading.Thread(target=run, daemon=True).start()
        while _loop is None: pass
    return _loop

# Custom tools
@tool("get_scene", "Get current scene state", {})
async def get_scene(args):
    return {"content": [{"type": "text", "text": f"Objects: {len(scene.objects)}"}]}

server = create_sdk_mcp_server(name="myapp", tools=[get_scene])

# Query (non-blocking)
async def ask_claude(prompt):
    options = ClaudeAgentOptions(
        mcp_servers={"myapp": server},
        allowed_tools=["mcp__myapp__get_scene"],
        permission_mode="acceptEdits",
    )
    response = ""
    async for msg in query(prompt=prompt, options=options):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    response += block.text
    return response

# From UI thread:
future = asyncio.run_coroutine_threadsafe(ask_claude("Hello"), get_loop())
```

### Pattern E: TypeScript with Custom MCP Tools (In-Process)

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const getState = tool("get_state", "Get app state", z.object({}), async () => ({
  content: [{ type: "text", text: `Items: ${app.items.length}` }],
}));

const server = createSdkMcpServer({ name: "myapp", tools: [getState] });

const result = query({
  prompt: "What's the current state?",
  options: {
    mcpServers: { myapp: server },
    allowedTools: ["mcp__myapp__get_state"],
    permissionMode: "acceptEdits",
  },
});
```

---

## 6. Debugging Toolkit

### Enable stderr capture (TypeScript)

```typescript
options: { stderr: (data: string) => process.stderr.write("[STDERR] " + data) }
```

### Enable SDK debug logs

```bash
DEBUG_CLAUDE_AGENT_SDK=1 npx tsx demo.ts
# Writes to ~/.claude/debug/sdk-*.txt
```

### Error Reference

| Error | Platform | Cause | Fix |
|-------|----------|-------|-----|
| `spawn EINVAL` | Windows | Spawning `.cmd` wrapper | W1: `executable: 'node'` + `cli.js` path |
| `Cannot find module` (mangled path) | Windows + tsx | Backslash escaping | W2: Replace `\` with `/` |
| `Cannot be launched inside another session` | All | `CLAUDECODE` env var | W3/M2: `delete process.env.CLAUDECODE` |
| `No module named 'claude_agent_sdk'` | All (Python) | Wrong Python or missing install | Use `sys.prefix` path |
| `pywintypes` error | Windows (Python) | Missing `pywin32` | W4: Install `pywin32` |
| `Claude Code executable not found` | All | Wrong `pathToClaudeCodeExecutable` | Check path exists |
| `Not authenticated` | All | No `claude login` | Run `claude login` |
| `CLINotFoundError` | All (TypeScript) | CLI not installed globally | `npm i -g @anthropic-ai/claude-code` |
| `CLIConnectionError` | All | Auth failure | Re-run `claude login` |

---

## 7. SDK API Quick Reference

### TypeScript

| Function | Purpose |
|----------|---------|
| `query()` | One-off queries, async generator |
| `tool()` | Define MCP tool with Zod schema |
| `createSdkMcpServer()` | Bundle tools into in-process MCP server |

### Python

| Function | Purpose |
|----------|---------|
| `query()` | One-off queries, async generator |
| `ClaudeSDKClient` | Multi-turn conversations (context manager) |
| `@tool` | Decorator to define MCP tool with dict schema |
| `create_sdk_mcp_server()` | Bundle tools into in-process MCP server |

### Common Options

| Option | TypeScript | Python |
|--------|-----------|--------|
| Executable path | `pathToClaudeCodeExecutable` | `path_to_claude_code_executable` |
| Runtime | `executable: 'node' \| 'bun'` | `executable` |
| Allowed tools | `allowedTools: string[]` | `allowed_tools: list[str]` |
| Permission mode | `permissionMode` | `permission_mode` |
| MCP servers | `mcpServers: Record<string, Config>` | `mcp_servers: dict` |
| Working dir | `cwd: string` | `cwd: str` |
| System prompt | `systemPrompt: string` | `system_prompt: str` |
| Max turns | `maxTurns: number` | `max_turns: int` |
| Stderr | `stderr: (data: string) => void` | N/A |
| Hooks | `hooks: { PreToolUse: [...] }` | N/A |

### Permission Modes

- `"acceptEdits"` — auto-approve file edits
- `"default"` — prompt for permissions
- `"plan"` — plan-only mode

### Built-in Tools

`Read`, `Write`, `Bash`, `Glob`, `Grep`, `Edit`, `WebFetch`, `WebSearch`

---

## 8. Tested Environments

| Environment | Node | SDK | CLI | Electron | OS |
|-------------|------|-----|-----|----------|-----|
| MCP App (tsx) | v24.11.1 | ^0.2.72 | 2.1.71 | — | Windows 11 (10.0.26200) |
| Electron | v24.x | ^0.2.23 | latest | 40.0.0 | Windows 11 |
| Python (Blender) | — | latest | latest | — | Windows 11 / macOS |

---

## 9. Source Files

| File | Contains |
|------|----------|
| `ref/claude-electron-sdk-fix/CLAUDE-AGENT-SDK-ELECTRON.md` | Electron spawn EINVAL fix |
| `ref/claude-electron-sdk-fix/claude-electron-test/` | Complete Electron test app |
| `ref/claude-agent-sdk-windows-fixes/CLAUDE-AGENT-SDK-WINDOWS.md` | All three Windows Node.js fixes |
| `math-formalism-ideation/demo.ts` | Production demo with MCP + all fixes |
| `~/.claude/skills/cl-agent-sdk/SKILL.md` | SDK integration guide (skill) |
| `~/.claude/skills/cl-agent-sdk/references/examples.md` | Python examples |
| `~/.claude/skills/cl-agent-sdk/references/typescript-examples.md` | TypeScript examples |
| `~/.claude/skills/cl-agent-sdk/references/blender-example.md` | Blender integration |
