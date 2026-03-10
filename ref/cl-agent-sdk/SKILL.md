---
name: cl-agent-sdk
description: Integration guide for embedding Claude into applications using the Claude Agent SDK with Max subscription authentication. Supports both Python and TypeScript/Node.js. Use when building Claude-powered features into desktop apps, creative software (Blender, Maya, Houdini), game engines, Electron apps, CLI tools, automation tools, or any application. Covers async patterns, custom MCP tools, embedded Python installation, UI threading, and context injection.
---

# Claude Agent SDK Integration

Embed Claude into any application using your Max subscription—no API fees.

## Language Support

| Language | Package | Best For |
|----------|---------|----------|
| **Python** | `pip install claude-agent-sdk` | Desktop apps, creative software (Blender, Maya), automation |
| **TypeScript** | `npm install @anthropic-ai/claude-agent-sdk` | Electron apps, Node.js services, CLI tools |

## Prerequisites

1. Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
2. Authenticate once: `claude login` (stored in `~/.claude/`)
3. Python 3.10+ or Node.js 18+

---

## Python SDK

### Quick Start

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock

async def main():
    options = ClaudeAgentOptions(
        permission_mode="acceptEdits"
    )
    
    async for message in query(prompt="Hello!", options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text)

asyncio.run(main())
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `query()` | One-off queries, new session each time |
| `ClaudeSDKClient` | Persistent sessions, multi-turn conversations |
| `tool()` | Define custom MCP tools |
| `create_sdk_mcp_server()` | Create in-process MCP server |

### Choosing query() vs ClaudeSDKClient

- **`query()`**: Simple one-off tasks, fresh session each time
- **`ClaudeSDKClient`**: Multi-turn conversations, interrupts, hooks, custom tools

### Embedded Python Detection

Applications like Blender bundle their own Python. Use `sys.prefix`:

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

### Non-Blocking Async for UI Apps

```python
import asyncio, threading

_state = {'response': None, 'loop': None}

def get_event_loop():
    if _state['loop'] is None:
        def run():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            _state['loop'] = loop
            loop.run_forever()
        threading.Thread(target=run, daemon=True).start()
    return _state['loop']

def run_async(coro):
    loop = get_event_loop()
    return asyncio.run_coroutine_threadsafe(coro, loop)
```

### Custom MCP Tools (Python)

```python
from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions
from typing import Any

@tool("get_state", "Get application state", {})
async def get_state(args: dict[str, Any]) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": f"Items: {len(app.items)}"}]}

@tool("create_item", "Create an item", {"name": str, "color": str})
async def create_item(args: dict[str, Any]) -> dict[str, Any]:
    app.create(args["name"], args.get("color", "red"))
    return {"content": [{"type": "text", "text": f"Created {args['name']}"}]}

server = create_sdk_mcp_server(name="myapp", tools=[get_state, create_item])

options = ClaudeAgentOptions(
    mcp_servers={"myapp": server},
    allowed_tools=["mcp__myapp__get_state", "mcp__myapp__create_item"],
    permission_mode="acceptEdits"
)
```

---

## TypeScript SDK

### Quick Start

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: "Hello!",
  options: {
    permissionMode: "acceptEdits"
  }
});

for await (const message of result) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") {
        console.log(block.text);
      }
    }
  }
}
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `query()` | Main function, returns async generator |
| `tool()` | Define custom MCP tools with Zod schemas |
| `createSdkMcpServer()` | Create in-process MCP server |

### Query Options

```typescript
const result = query({
  prompt: "Analyze this code",
  options: {
    allowedTools: ["Read", "Write", "Bash"],
    permissionMode: "acceptEdits",
    cwd: "/path/to/project",
    systemPrompt: "You are a code reviewer",
    maxTurns: 10,
    model: "claude-sonnet-4-20250514"
  }
});
```

### Custom MCP Tools (TypeScript)

```typescript
import { tool, createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const getState = tool(
  "get_state",
  "Get application state",
  z.object({}),
  async () => ({
    content: [{ type: "text", text: `Items: ${app.items.length}` }]
  })
);

const createItem = tool(
  "create_item",
  "Create an item",
  z.object({
    name: z.string(),
    color: z.string().optional().default("red")
  }),
  async ({ name, color }) => {
    app.create(name, color);
    return { content: [{ type: "text", text: `Created ${name}` }] };
  }
);

const server = createSdkMcpServer({
  name: "myapp",
  tools: [getState, createItem]
});

const result = query({
  prompt: "Create a blue item called 'test'",
  options: {
    mcpServers: { myapp: server },
    allowedTools: ["mcp__myapp__get_state", "mcp__myapp__create_item"],
    permissionMode: "acceptEdits"
  }
});
```

### Streaming Input Mode

```typescript
async function* messageStream() {
  yield { type: "text", text: "Analyze: " };
  await delay(100);
  yield { type: "text", text: "temperature=25C, humidity=60%" };
}

const result = query({
  prompt: messageStream(),
  options: { permissionMode: "acceptEdits" }
});

// Can interrupt with result.interrupt()
```

### Hooks

```typescript
const result = query({
  prompt: "Build my project",
  options: {
    hooks: {
      PreToolUse: [{
        matcher: "Bash",
        hooks: [async (input, toolUseId, { signal }) => {
          if (input.tool_input.command.includes("rm -rf")) {
            return {
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: "Dangerous command blocked"
              }
            };
          }
          return {};
        }]
      }]
    }
  }
});
```

---

## Common Options (Both Languages)

| Option | Python | TypeScript | Description |
|--------|--------|------------|-------------|
| Allowed tools | `allowed_tools` | `allowedTools` | List of enabled tools |
| Permission mode | `permission_mode` | `permissionMode` | `"acceptEdits"`, `"default"`, `"plan"` |
| MCP servers | `mcp_servers` | `mcpServers` | Custom tool servers |
| Working dir | `cwd` | `cwd` | Current working directory |
| System prompt | `system_prompt` | `systemPrompt` | Custom system prompt |
| Max turns | `max_turns` | `maxTurns` | Conversation turn limit |

**Built-in tools**: `Read`, `Write`, `Bash`, `Glob`, `Grep`, `Edit`, `WebFetch`, `WebSearch`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No module named 'claude_agent_sdk'" | Installed to wrong Python. Use `sys.prefix` path |
| "Not authenticated" | Run `claude login` in terminal |
| Async errors in UI | Never await on main thread. Use threading pattern |
| Tool not found | Use full name: `mcp__servername__toolname` |
| Windows: "pywintypes" error | Install `pywin32` alongside SDK |

## References

- Python examples: See [references/examples.md](references/examples.md)
- TypeScript examples: See [references/typescript-examples.md](references/typescript-examples.md)
- Blender integration: See [references/blender-example.md](references/blender-example.md)
