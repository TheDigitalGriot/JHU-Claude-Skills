# TypeScript SDK Examples

Complete code examples for the Claude Agent SDK TypeScript implementation.

## Table of Contents
- [Minimal Integration](#minimal-integration)
- [Custom MCP Tools](#custom-mcp-tools)
- [Multi-Turn Conversations](#multi-turn-conversations)
- [Hooks and Permissions](#hooks-and-permissions)
- [Electron Integration](#electron-integration)
- [CLI Tool Example](#cli-tool-example)

---

## Minimal Integration

Basic query with message handling:

```typescript
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";

async function askClaude(prompt: string): Promise<string> {
  const result = query({
    prompt,
    options: {
      permissionMode: "acceptEdits"
    }
  });

  let response = "";
  
  for await (const message of result) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          response += block.text;
        }
      }
    }
  }
  
  return response;
}

// Usage
const answer = await askClaude("What is the capital of France?");
console.log(answer);
```

---

## Custom MCP Tools

### Basic Tools with Zod Schemas

```typescript
import { tool, createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Simple tool with no arguments
const getTime = tool(
  "get_time",
  "Get the current time",
  z.object({}),
  async () => ({
    content: [{
      type: "text",
      text: new Date().toISOString()
    }]
  })
);

// Tool with typed arguments
const calculate = tool(
  "calculate",
  "Perform a calculation",
  z.object({
    expression: z.string().describe("Math expression to evaluate"),
  }),
  async ({ expression }) => {
    try {
      // Warning: eval is unsafe, use a proper math library in production
      const result = eval(expression);
      return {
        content: [{ type: "text", text: `Result: ${result}` }]
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Error: ${e}` }],
        isError: true
      };
    }
  }
);

// Tool with optional arguments
const greet = tool(
  "greet",
  "Greet a user",
  z.object({
    name: z.string(),
    formal: z.boolean().optional().default(false)
  }),
  async ({ name, formal }) => ({
    content: [{
      type: "text",
      text: formal ? `Good day, ${name}.` : `Hey ${name}!`
    }]
  })
);

// Create server and use
const server = createSdkMcpServer({
  name: "utils",
  version: "1.0.0",
  tools: [getTime, calculate, greet]
});

const result = query({
  prompt: "What time is it? Then calculate 15 * 7.",
  options: {
    mcpServers: { utils: server },
    allowedTools: [
      "mcp__utils__get_time",
      "mcp__utils__calculate",
      "mcp__utils__greet"
    ],
    permissionMode: "acceptEdits"
  }
});
```

### Application-Specific Tools

```typescript
// Example: Task management tools
interface Task {
  id: string;
  title: string;
  done: boolean;
}

const tasks: Task[] = [];

const listTasks = tool(
  "list_tasks",
  "List all tasks",
  z.object({}),
  async () => ({
    content: [{
      type: "text",
      text: tasks.length === 0 
        ? "No tasks yet"
        : tasks.map(t => `[${t.done ? 'x' : ' '}] ${t.id}: ${t.title}`).join('\n')
    }]
  })
);

const addTask = tool(
  "add_task",
  "Add a new task",
  z.object({
    title: z.string().describe("Task title")
  }),
  async ({ title }) => {
    const task: Task = {
      id: `task_${Date.now()}`,
      title,
      done: false
    };
    tasks.push(task);
    return {
      content: [{ type: "text", text: `Created task: ${task.id}` }]
    };
  }
);

const completeTask = tool(
  "complete_task",
  "Mark a task as complete",
  z.object({
    taskId: z.string().describe("Task ID to complete")
  }),
  async ({ taskId }) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return {
        content: [{ type: "text", text: `Task not found: ${taskId}` }],
        isError: true
      };
    }
    task.done = true;
    return {
      content: [{ type: "text", text: `Completed: ${task.title}` }]
    };
  }
);
```

---

## Multi-Turn Conversations

Using streaming input mode for interactive sessions:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import * as readline from "readline";

async function interactiveSession() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, resolve));

  // Create a streaming prompt generator
  async function* createPrompt(): AsyncGenerator<{ type: "text"; text: string }> {
    while (true) {
      const input = await prompt("\nYou: ");
      if (input.toLowerCase() === "exit") break;
      yield { type: "text", text: input };
    }
  }

  const result = query({
    prompt: createPrompt(),
    options: {
      permissionMode: "acceptEdits",
      allowedTools: ["Read", "Write", "Bash"]
    }
  });

  console.log("Chat started. Type 'exit' to quit.\n");

  for await (const message of result) {
    if (message.type === "assistant") {
      process.stdout.write("\nClaude: ");
      for (const block of message.message.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
      console.log();
    }
  }

  rl.close();
}
```

---

## Hooks and Permissions

### PreToolUse Hook for Safety

```typescript
import { query, type HookCallback } from "@anthropic-ai/claude-agent-sdk";

const dangerousCommandBlocker: HookCallback = async (input, toolUseId, { signal }) => {
  if (input.hook_event_name !== "PreToolUse") return {};
  
  const dangerousPatterns = [
    /rm\s+-rf\s+\//,
    /mkfs\./,
    /dd\s+if=/,
    />\s*\/dev\/sd/
  ];
  
  const command = input.tool_input?.command || "";
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Blocked dangerous command: ${command}`
        }
      };
    }
  }
  
  return {};
};

const result = query({
  prompt: "Clean up temp files",
  options: {
    hooks: {
      PreToolUse: [{
        matcher: "Bash",
        hooks: [dangerousCommandBlocker]
      }]
    },
    allowedTools: ["Bash"],
    permissionMode: "acceptEdits"
  }
});
```

### Custom Permission Handler

```typescript
import { query, type CanUseTool } from "@anthropic-ai/claude-agent-sdk";

const customPermissions: CanUseTool = async (toolName, input, { signal, suggestions }) => {
  // Log all tool usage
  console.log(`Tool requested: ${toolName}`, input);
  
  // Block writes to certain directories
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = input.file_path as string;
    if (filePath.startsWith("/etc/") || filePath.startsWith("/system/")) {
      return {
        behavior: "deny",
        message: "Cannot modify system files",
        interrupt: false
      };
    }
  }
  
  // Allow everything else
  return {
    behavior: "allow",
    updatedInput: input
  };
};

const result = query({
  prompt: "Update the config file",
  options: {
    canUseTool: customPermissions,
    permissionMode: "default"
  }
});
```

---

## Electron Integration

Main process handler for Electron apps:

```typescript
// main.ts (Electron main process)
import { ipcMain } from "electron";
import { query } from "@anthropic-ai/claude-agent-sdk";

ipcMain.handle("claude-query", async (event, prompt: string) => {
  const result = query({
    prompt,
    options: {
      permissionMode: "acceptEdits",
      cwd: app.getPath("documents")
    }
  });
  
  const messages: string[] = [];
  
  for await (const message of result) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          messages.push(block.text);
          // Send incremental updates to renderer
          event.sender.send("claude-stream", block.text);
        }
      }
    }
  }
  
  return messages.join("");
});
```

```typescript
// renderer.ts (Electron renderer process)
const { ipcRenderer } = require("electron");

async function askClaude(prompt: string): Promise<string> {
  return await ipcRenderer.invoke("claude-query", prompt);
}

// Listen for streaming updates
ipcRenderer.on("claude-stream", (event, text) => {
  appendToChat(text);
});
```

---

## CLI Tool Example

Build a command-line tool with Claude:

```typescript
#!/usr/bin/env node
import { query } from "@anthropic-ai/claude-agent-sdk";
import { program } from "commander";

program
  .name("claude-cli")
  .description("CLI tool powered by Claude")
  .version("1.0.0");

program
  .command("ask <prompt>")
  .description("Ask Claude a question")
  .option("-t, --tools <tools>", "Comma-separated list of tools", "Read,Bash")
  .option("-d, --dir <directory>", "Working directory", process.cwd())
  .action(async (prompt, options) => {
    const result = query({
      prompt,
      options: {
        allowedTools: options.tools.split(","),
        cwd: options.dir,
        permissionMode: "acceptEdits"
      }
    });
    
    for await (const message of result) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
          }
        }
      }
      if (message.type === "result") {
        console.log(`\n\n[Cost: $${message.total_cost_usd?.toFixed(4)}]`);
      }
    }
  });

program.parse();
```

Usage:
```bash
npx claude-cli ask "List all TypeScript files" --tools Read,Glob,Bash
```

---

## Error Handling

```typescript
import { 
  query, 
  CLINotFoundError, 
  CLIConnectionError,
  AbortError 
} from "@anthropic-ai/claude-agent-sdk";

async function safeQuery(prompt: string) {
  try {
    const result = query({
      prompt,
      options: { permissionMode: "acceptEdits" }
    });
    
    for await (const message of result) {
      // Process messages
    }
  } catch (error) {
    if (error instanceof CLINotFoundError) {
      console.error("Claude Code CLI not found. Install with:");
      console.error("  npm install -g @anthropic-ai/claude-code");
    } else if (error instanceof CLIConnectionError) {
      console.error("Failed to connect. Check authentication:");
      console.error("  claude login");
    } else if (error instanceof AbortError) {
      console.log("Query was cancelled");
    } else {
      throw error;
    }
  }
}
```

---

## Message Type Reference

```typescript
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKResultMessage,
  SDKSystemMessage
} from "@anthropic-ai/claude-agent-sdk";

function processMessage(message: SDKMessage) {
  switch (message.type) {
    case "assistant":
      // message.message.content contains TextBlock, ToolUseBlock, etc.
      break;
    case "user":
      // User message (usually your prompt)
      break;
    case "result":
      // Final result with usage stats
      console.log(`Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);
      console.log(`Cost: $${message.total_cost_usd}`);
      break;
    case "system":
      // System initialization message
      console.log(`Session: ${message.session_id}`);
      console.log(`Tools: ${message.tools.join(", ")}`);
      break;
  }
}
```
