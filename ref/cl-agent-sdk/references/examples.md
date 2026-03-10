# Python SDK Examples

Complete code examples for the Claude Agent SDK Python implementation.

## Table of Contents
- [Minimal Integration with query()](#minimal-integration-with-query)
- [ClaudeSDKClient for Multi-Turn](#claudesdkclient-for-multi-turn)
- [Custom MCP Tools](#custom-mcp-tools)
- [SDK Installation with Progress](#sdk-installation-with-progress)
- [Non-Blocking UI Integration](#non-blocking-ui-integration)
- [Context-Aware Queries](#context-aware-queries)
- [Code Extraction and Execution](#code-extraction-and-execution)

---

## Minimal Integration with query()

The `query()` function is the simplest approach—creates a fresh session for each call:

```python
"""Minimal Claude Agent SDK integration using query()."""
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock

async def ask_claude(prompt: str) -> str:
    """Send a one-off query to Claude."""
    options = ClaudeAgentOptions(
        permission_mode="acceptEdits"
    )
    
    response_text = ""
    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response_text += block.text
    
    return response_text

# Simple usage
if __name__ == "__main__":
    result = asyncio.run(ask_claude("What is 2 + 2?"))
    print(result)
```

### With Tools Enabled

```python
async def ask_with_tools(prompt: str) -> str:
    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write", "Bash", "Glob", "Grep"],
        permission_mode="acceptEdits",
        cwd="/path/to/project"
    )
    
    response_text = ""
    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response_text += block.text
    
    return response_text
```

---

## ClaudeSDKClient for Multi-Turn

Use `ClaudeSDKClient` when you need conversation continuity:

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, AssistantMessage, TextBlock

async def multi_turn_conversation():
    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write", "Bash"],
        permission_mode="acceptEdits"
    )
    
    async with ClaudeSDKClient(options=options) as client:
        # First message
        await client.query("Create a file called hello.py with a greeting function")
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
        
        # Follow-up - Claude remembers the file
        await client.query("Now add a main block to that file")
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")

asyncio.run(multi_turn_conversation())
```

---

## Custom MCP Tools

### Using the @tool Decorator

```python
from claude_agent_sdk import tool, create_sdk_mcp_server, query, ClaudeAgentOptions
from typing import Any

# Define tools
@tool("get_time", "Get the current time", {})
async def get_time(args: dict[str, Any]) -> dict[str, Any]:
    from datetime import datetime
    return {
        "content": [{
            "type": "text",
            "text": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }]
    }

@tool("calculate", "Evaluate a math expression", {"expression": str})
async def calculate(args: dict[str, Any]) -> dict[str, Any]:
    try:
        result = eval(args["expression"], {"__builtins__": {}})
        return {
            "content": [{"type": "text", "text": f"Result: {result}"}]
        }
    except Exception as e:
        return {
            "content": [{"type": "text", "text": f"Error: {e}"}],
            "is_error": True
        }

@tool(
    "create_item",
    "Create an item in the application",
    {"name": str, "color": str, "size": float}
)
async def create_item(args: dict[str, Any]) -> dict[str, Any]:
    name = args["name"]
    color = args.get("color", "red")
    size = args.get("size", 1.0)
    
    # Your application logic here
    # app.create(name, color, size)
    
    return {
        "content": [{
            "type": "text",
            "text": f"Created '{name}' (color={color}, size={size})"
        }]
    }

# Create server
server = create_sdk_mcp_server(
    name="mytools",
    version="1.0.0",
    tools=[get_time, calculate, create_item]
)

# Use with query
async def use_custom_tools():
    options = ClaudeAgentOptions(
        mcp_servers={"mytools": server},
        allowed_tools=[
            "mcp__mytools__get_time",
            "mcp__mytools__calculate",
            "mcp__mytools__create_item"
        ],
        permission_mode="acceptEdits"
    )
    
    async for message in query(
        prompt="What time is it? Then calculate 15 * 7.",
        options=options
    ):
        # Process response
        pass
```

---

## SDK Installation with Progress

For applications that need to install the SDK at runtime:

```python
import subprocess
import sys
import os
import threading

_install_state = {
    'installing': False,
    'installed': None,  # None=unchecked, True=ready, False=failed, 'restart'=needs restart
    'log': []
}

def get_embedded_python():
    """Find the embedded Python executable."""
    if sys.platform == "win32":
        exe = os.path.join(sys.prefix, "bin", "python.exe")
        if not os.path.exists(exe):
            exe = os.path.join(sys.prefix, "python.exe")
    else:
        exe = os.path.join(sys.prefix, "bin", "python3")
        if not os.path.exists(exe):
            exe = os.path.join(sys.prefix, "bin", "python")
    return exe if os.path.exists(exe) else None

def get_site_packages():
    """Get the site-packages directory."""
    if sys.platform == "win32":
        sp = os.path.join(sys.prefix, "lib", "site-packages")
    else:
        py_ver = f"python{sys.version_info.major}.{sys.version_info.minor}"
        sp = os.path.join(sys.prefix, "lib", py_ver, "site-packages")
    return sp if os.path.exists(sp) else None

def install_sdk_sync():
    """Install SDK with logging (run in thread)."""
    _install_state['installing'] = True
    _install_state['log'] = []
    
    def log(msg):
        _install_state['log'].append(msg)
        print(f"[SDK Install] {msg}")
    
    python = get_embedded_python()
    site_packages = get_site_packages()
    
    if not python:
        log(f"ERROR: Python not found (sys.prefix={sys.prefix})")
        _install_state['installing'] = False
        return False
    
    log(f"Python: {python}")
    log(f"Site-packages: {site_packages}")
    
    # Ensure pip
    try:
        subprocess.check_call(
            [python, "-m", "ensurepip", "--upgrade"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        log("pip ready")
    except Exception as e:
        log(f"pip check: {e}")
    
    # On Windows, install pywin32 first
    if sys.platform == "win32" and site_packages:
        log("Installing pywin32 (Windows requirement)...")
        subprocess.run(
            [python, "-m", "pip", "install", "pywin32",
             "--target", site_packages, "--upgrade", "--no-user"],
            capture_output=True
        )
    
    # Install SDK
    log("Installing claude-agent-sdk...")
    
    if site_packages:
        result = subprocess.run(
            [python, "-m", "pip", "install", "claude-agent-sdk",
             "--target", site_packages, "--upgrade", "--no-user"],
            capture_output=True, text=True
        )
    else:
        result = subprocess.run(
            [python, "-m", "pip", "install", "claude-agent-sdk"],
            capture_output=True, text=True
        )
    
    if result.returncode == 0:
        log("Installation successful!")
        
        # Verify import
        if site_packages and site_packages not in sys.path:
            sys.path.insert(0, site_packages)
        
        import importlib
        importlib.invalidate_caches()
        
        try:
            import claude_agent_sdk
            _install_state['installed'] = True
            log("SDK verified and ready!")
        except ImportError as e:
            _install_state['installed'] = 'restart'
            log(f"Import check: {e}")
            log("Please restart application")
    else:
        log(f"FAILED: {result.stderr[-200:]}")
        _install_state['installed'] = False
    
    _install_state['installing'] = False
    return _install_state['installed'] is True

def start_install():
    """Start installation in background thread."""
    threading.Thread(target=install_sdk_sync, daemon=True).start()

def get_install_status():
    """Get current installation status for UI polling."""
    if _install_state['installing']:
        return "installing", _install_state['log'][-1] if _install_state['log'] else ""
    elif _install_state['installed'] is True:
        return "ready", "SDK installed and verified"
    elif _install_state['installed'] == 'restart':
        return "restart", "Restart application to use SDK"
    elif _install_state['installed'] is False:
        return "failed", _install_state['log'][-1] if _install_state['log'] else "Unknown error"
    return "pending", ""
```

---

## Non-Blocking UI Integration

For GUI applications that can't block the main thread:

```python
import asyncio
import threading
from typing import Callable, Optional

_chat_state = {
    'loop': None,
    'response': None,
    'error': None,
    'is_loading': False
}

def get_or_create_event_loop():
    """Get or create a persistent event loop in background thread."""
    if _chat_state['loop'] is None or not _chat_state['loop'].is_running():
        def run_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            _chat_state['loop'] = loop
            loop.run_forever()
        
        thread = threading.Thread(target=run_loop, daemon=True)
        thread.start()
        
        # Wait for loop to start
        import time
        for _ in range(50):
            if _chat_state['loop'] and _chat_state['loop'].is_running():
                break
            time.sleep(0.1)
    
    return _chat_state['loop']

def run_async(coro):
    """Schedule coroutine in the persistent event loop."""
    loop = get_or_create_event_loop()
    if loop and loop.is_running():
        return asyncio.run_coroutine_threadsafe(coro, loop)
    return None

async def send_message_async(prompt: str):
    """Send message to Claude (runs in event loop)."""
    try:
        from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock
        
        options = ClaudeAgentOptions(permission_mode="acceptEdits")
        
        response_text = ""
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        response_text += block.text
        
        _chat_state['response'] = response_text
        _chat_state['error'] = None
    except Exception as e:
        _chat_state['error'] = str(e)
    finally:
        _chat_state['is_loading'] = False

def send_message(prompt: str):
    """Non-blocking send (call from UI thread)."""
    _chat_state['is_loading'] = True
    _chat_state['response'] = None
    _chat_state['error'] = None
    run_async(send_message_async(prompt))

def poll_response() -> Optional[str]:
    """Poll for response (call from UI timer/loop)."""
    if _chat_state['error']:
        error = _chat_state['error']
        _chat_state['error'] = None
        return f"Error: {error}"
    
    if _chat_state['response']:
        response = _chat_state['response']
        _chat_state['response'] = None
        return response
    
    return None

def is_loading() -> bool:
    """Check if a query is in progress."""
    return _chat_state['is_loading']

# Usage in UI application:
# 1. send_message("Hello Claude")  # Non-blocking, returns immediately
# 2. In UI timer/update loop:
#    if response := poll_response():
#        display_response(response)
```

---

## Context-Aware Queries

Include application state in queries:

```python
def build_context(app) -> str:
    """Build context string from application state."""
    lines = [
        f"Application: {app.name} v{app.version}",
        f"Document: {app.current_doc.name if app.current_doc else 'None'}",
    ]
    
    if selected := app.get_selected():
        lines.append(f"\nSelected ({len(selected)} items):")
        for item in selected[:10]:
            lines.append(f"  - {item.name}: {item.type} at {item.position}")
        if len(selected) > 10:
            lines.append(f"  ... +{len(selected) - 10} more")
    
    if active := app.get_active():
        lines.append(f"\nActive object:")
        lines.append(f"  Name: {active.name}")
        lines.append(f"  Type: {active.type}")
        lines.append(f"  Properties: {active.properties}")
    
    return "\n".join(lines)

async def query_with_context(user_message: str, app) -> str:
    """Send query with application context."""
    from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock
    
    context = build_context(app)
    full_prompt = f"""You are an assistant for {app.name}.

Current state:
{context}

User request: {user_message}

If code is needed, provide it in a ```python block."""
    
    options = ClaudeAgentOptions(permission_mode="acceptEdits")
    
    response = ""
    async for message in query(prompt=full_prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response += block.text
    
    return response
```

---

## Code Extraction and Execution

Extract and optionally execute code from responses:

```python
import re
from typing import Optional

def extract_python_blocks(text: str) -> list[str]:
    """Extract all ```python code blocks from text."""
    pattern = r'```python\s*(.*?)```'
    matches = re.findall(pattern, text, re.DOTALL)
    return [m.strip() for m in matches]

def extract_first_code(text: str) -> Optional[str]:
    """Extract first Python code block."""
    blocks = extract_python_blocks(text)
    return blocks[0] if blocks else None

def safe_execute(code: str, context: dict = None) -> tuple[bool, str]:
    """
    Execute code safely with given context.
    
    Returns:
        (success: bool, message: str)
    """
    exec_globals = {"__builtins__": __builtins__}
    if context:
        exec_globals.update(context)
    
    try:
        exec(code, exec_globals)
        return True, "Executed successfully"
    except SyntaxError as e:
        return False, f"Syntax error on line {e.lineno}: {e.msg}"
    except Exception as e:
        return False, f"Runtime error: {type(e).__name__}: {e}"

async def process_response(
    response_text: str,
    auto_execute: bool = False,
    exec_context: dict = None
) -> dict:
    """
    Process Claude response, optionally extracting and executing code.
    
    Returns dict with:
        - text: Full response text
        - code: Extracted code (if any)
        - executed: Whether code was run
        - exec_result: Execution result message
    """
    result = {
        "text": response_text,
        "code": None,
        "executed": False,
        "exec_result": None
    }
    
    code = extract_first_code(response_text)
    if code:
        result["code"] = code
        
        if auto_execute:
            success, msg = safe_execute(code, exec_context)
            result["executed"] = True
            result["exec_result"] = msg
            result["exec_success"] = success
    
    return result
```
