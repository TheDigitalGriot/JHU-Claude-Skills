# Prompt for `/skill-creator` — Create `cl-agent-sdk-util`

Copy the block below into a fresh Claude Code session.

---

```
/skill-creator

I want to create a skill called "cl-agent-sdk-util" that replaces and supersedes the existing "cl-agent-sdk" skill at ~/.claude/skills/cl-agent-sdk/.

## What the skill does

This is the definitive guide for integrating the Claude Agent SDK into any application — Electron, Python desktop apps (Blender, Maya), TypeScript CLI tools, web apps, and MCP Apps — using a Claude Code Max subscription (no API keys).

The key differentiator from the existing skill: it includes **battle-tested platform-specific fixes** for Windows 11 that are required to make the SDK work reliably, plus cross-platform patterns.

## Source material

Read these files THOROUGHLY before drafting. They contain ALL the cumulative knowledge:

1. **Cumulative knowledge base** (MOST IMPORTANT — read this first):
   `ref/claude-agent-sdk-windows-fixes/CUMULATIVE-KNOWLEDGE.md`

2. **Existing skill to supersede** (baseline to improve upon):
   `~/.claude/skills/cl-agent-sdk/SKILL.md`
   `~/.claude/skills/cl-agent-sdk/references/examples.md`
   `~/.claude/skills/cl-agent-sdk/references/typescript-examples.md`
   `~/.claude/skills/cl-agent-sdk/references/blender-example.md`

3. **Windows-specific fix documentation**:
   `ref/claude-agent-sdk-windows-fixes/CLAUDE-AGENT-SDK-WINDOWS.md`

4. **Electron-specific integration**:
   `ref/claude-electron-sdk-fix/CLAUDE-AGENT-SDK-ELECTRON.md`
   `ref/claude-electron-sdk-fix/claude-electron-test/src/main.ts`

5. **Production demo** (real working implementation with all fixes applied):
   `math-formalism-ideation/demo.ts`

## Skill structure

```
cl-agent-sdk-util/
├── SKILL.md                          # Main guide (<500 lines)
├── references/
│   ├── windows-fixes.md              # All Windows 11 fixes with code
│   ├── cross-platform-patterns.md    # Integration patterns A-E from cumulative doc
│   ├── python-examples.md            # Python SDK patterns (from existing skill)
│   ├── typescript-examples.md        # TypeScript SDK patterns (from existing skill)
│   ├── electron-integration.md       # Electron main/preload/renderer pattern
│   ├── mcp-app-integration.md        # MCP server connection + tool naming
│   └── debugging.md                  # Stderr capture, debug logs, error reference table
```

## Key requirements

1. **SKILL.md must include a "Platform Setup" section** that runs BEFORE any integration code. On Windows, this means the .cmd → cli.js resolution and forward-slash normalization. Include a ready-to-copy `resolveClaudePath()` utility function that handles both platforms.

2. **The description must trigger on**: any code importing `claude-agent-sdk` or `claude_agent_sdk`, any user asking about Claude Agent SDK, Max subscription integration, embedding Claude in apps, or connecting Claude to Electron/Blender/MCP apps.

3. **Do NOT trigger on**: general Anthropic API usage (`@anthropic-ai/sdk`), OpenAI SDK, or general ML tasks.

4. **Include the error reference table** from the cumulative doc in SKILL.md itself (not just in references) — it's the most-consulted section.

5. **The three Windows fixes (spawn EINVAL, backslash mangling, nested sessions) must be in the main SKILL.md** with code, not just linked to references. These are the #1 reason people fail to get the SDK working on Windows.

6. **Python and TypeScript should have equal coverage**. The existing skill is good at both; preserve that.

7. **Keep the MCP tool naming convention prominent**: `mcp__<servername>__<toolname>` — people forget this constantly.

8. **Include the non-blocking async pattern for UI apps** (Python threading + event loop) — this is critical for Blender/Maya/desktop apps.

## Test prompts to evaluate against

1. "I'm building an Electron app on Windows and want to add Claude to it using my Max subscription"
2. "Wire up Claude Agent SDK to call my MCP server's tools"
3. "I keep getting spawn EINVAL when using the Agent SDK on Windows"
4. "Create a Blender addon that uses Claude to modify scenes"
5. "How do I use query() vs ClaudeSDKClient in Python?"
6. "Set up custom MCP tools with Zod schemas in TypeScript"
```

---

**After creating the skill**, the skill-creator will walk you through testing with these prompts, comparing against the baseline (the existing `cl-agent-sdk` skill), and iterating until the new skill reliably outperforms it.
