# Claude Agent SDK in Electron - Windows Integration Guide

## Overview

This document covers integrating `@anthropic-ai/claude-agent-sdk` into an Electron app, specifically addressing Windows-specific issues.

## The Problem: `spawn EINVAL` on Windows

When using the Claude Agent SDK in an Electron app on Windows, you may encounter:

```
Error: spawn EINVAL
```

### Root Cause

On Windows, npm installs global packages with wrapper scripts:
- `claude.cmd` - Windows batch wrapper
- `claude.ps1` - PowerShell wrapper
- `claude` - Shell script (for Git Bash/WSL)

The Claude Agent SDK uses Node.js `child_process.spawn()` internally to launch the Claude CLI. However, `.cmd` files cannot be spawned directly without `shell: true` - they require the Windows command interpreter.

The SDK doesn't set `shell: true` because it expects a proper executable, not a batch wrapper.

## The Solution

The SDK accepts an `executable` option that lets you specify `'node'` or `'bun'` as the runtime. Combined with pointing to the actual `cli.js` file instead of the `.cmd` wrapper, this bypasses the spawn issue.

### 1. Locate the actual CLI entry point

The `.cmd` wrapper simply runs:
```batch
node "%dp0%\node_modules\@anthropic-ai\claude-code\cli.js" %*
```

So the actual entry point is:
```
C:\Users\{username}\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\cli.js
```

### 2. Use `executable: 'node'` option

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Detect if we have a .cmd path
const isCmd = claudeCodePath.endsWith('.cmd');

// Convert .cmd path to cli.js path
let cliJsPath = claudeCodePath;
if (isCmd) {
  const npmDir = path.dirname(claudeCodePath);
  cliJsPath = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
}

// Query with the correct options
const result = query({
  prompt: 'Your prompt here',
  options: {
    maxTurns: 1,
    pathToClaudeCodeExecutable: cliJsPath,
    // Key fix: use 'node' as the executable when on Windows with .cmd
    ...(isCmd && { executable: 'node' }),
  },
});
```

## Complete Working Example

See `claude-electron-test/src/main.ts` for a complete implementation.

### Key code sections:

#### Path Detection (handles Windows .cmd)

```typescript
function findClaudeCodeExecutable(): string | undefined {
  if (process.platform === 'win32') {
    // Try where claude.cmd first
    try {
      const cmdResult = execSync('where claude.cmd', { encoding: 'utf-8' })
        .trim()
        .split('\n')[0];
      if (fs.existsSync(cmdResult)) {
        return cmdResult;
      }
    } catch (e) {
      // Fall through to other methods
    }

    // Check common npm global paths
    const npmGlobalPaths = [
      path.join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
      path.join(process.env.LOCALAPPDATA || '', 'npm', 'claude.cmd'),
    ];

    for (const p of npmGlobalPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  } else {
    // Unix: use which claude
    const result = execSync('which claude', { encoding: 'utf-8' }).trim();
    if (fs.existsSync(result)) {
      return result;
    }
  }

  return undefined;
}
```

#### Query with Windows Fix

```typescript
async function testQuery(claudeCodePath: string) {
  const isCmd = claudeCodePath.endsWith('.cmd');
  let cliJsPath = claudeCodePath;

  if (isCmd) {
    // Convert: C:\...\npm\claude.cmd -> C:\...\npm\node_modules\@anthropic-ai\claude-code\cli.js
    const npmDir = path.dirname(claudeCodePath);
    cliJsPath = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

    if (!fs.existsSync(cliJsPath)) {
      throw new Error(`cli.js not found at: ${cliJsPath}`);
    }
  }

  const result = query({
    prompt: 'Say "Hello from Claude Agent SDK!"',
    options: {
      maxTurns: 1,
      pathToClaudeCodeExecutable: cliJsPath,
      ...(isCmd && { executable: 'node' as const }),
    },
  });

  let responseText = '';
  for await (const message of result) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          responseText += block.text;
        }
      }
    }
  }

  return responseText;
}
```

## SDK Options Reference

From `@anthropic-ai/claude-agent-sdk` type definitions:

```typescript
interface QueryOptions {
  pathToClaudeCodeExecutable?: string;  // Path to Claude CLI
  executable?: 'node' | 'bun';          // Runtime to use
  executableArgs?: string[];            // Args to pass to runtime
  env?: Record<string, string>;         // Environment variables
  maxTurns?: number;                    // Max agentic turns
  systemPrompt?: string;                // System prompt
  permissionMode?: PermissionMode;      // Permission handling
  // ... more options
}
```

## Prerequisites

1. **Claude Code CLI installed globally:**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Authenticated via CLI:**
   ```bash
   claude login
   ```
   This opens a browser for OAuth with your Claude Max subscription.

3. **SDK installed in your Electron project:**
   ```bash
   npm install @anthropic-ai/claude-agent-sdk
   ```

## Debugging Tips

### Add Debug Logging

```typescript
console.log('Platform:', process.platform);
console.log('Claude path:', claudeCodePath);
console.log('Path exists:', fs.existsSync(claudeCodePath));

if (claudeCodePath?.endsWith('.cmd')) {
  const cliJsPath = path.join(
    path.dirname(claudeCodePath),
    'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'
  );
  console.log('CLI.js path:', cliJsPath);
  console.log('CLI.js exists:', fs.existsSync(cliJsPath));
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `spawn EINVAL` | Trying to spawn `.cmd` directly | Use `executable: 'node'` with `cli.js` path |
| `Claude Code executable not found` | Path not set or invalid | Check `pathToClaudeCodeExecutable` |
| `Not authenticated` | User hasn't run `claude login` | Run `claude login` in terminal |

## File Structure

```
claude-electron-test/
├── src/
│   ├── main.ts      # Main process with Claude SDK integration
│   ├── preload.ts   # IPC bridge for renderer
│   ├── App.tsx      # React UI for testing
│   └── renderer.tsx # React entry point
├── package.json
└── ...
```

## Tested Environment

- Windows 11
- Node.js v24.11.1
- Electron 40.0.0
- @anthropic-ai/claude-agent-sdk ^0.2.23
- @anthropic-ai/claude-code (global) latest

## References

- [Claude Agent SDK npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)
- [Claude Code npm](https://www.npmjs.com/package/@anthropic-ai/claude-code)
- [Electron Documentation](https://www.electronjs.org/docs)
