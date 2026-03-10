# Blender Integration Example

Complete working example of Claude Agent SDK integrated into Blender as an addon. This example uses the `query()` function approach which works reliably with Blender's threading model.

## Architecture

```
blender_claude_agent/
├── __init__.py      # Main addon (UI, operators, async handling)
└── blender_tools.py # Custom MCP tools for Blender (optional)
```

## Key Implementation Details

### Finding Blender's Python

**Critical**: `sys.executable` returns `blender.exe`, not Python! Use `sys.prefix`:

```python
import sys, os

def get_blender_python():
    """Get path to Blender's bundled Python executable."""
    if sys.platform == "win32":
        # Try bin/python.exe first (some versions)
        exe = os.path.join(sys.prefix, "bin", "python.exe")
        if not os.path.exists(exe):
            # Fall back to python.exe in prefix root
            exe = os.path.join(sys.prefix, "python.exe")
    else:
        exe = os.path.join(sys.prefix, "bin", "python3")
        if not os.path.exists(exe):
            exe = os.path.join(sys.prefix, "bin", "python")
    return exe if os.path.exists(exe) else None

def get_blender_site_packages():
    """Get Blender's site-packages directory."""
    if sys.platform == "win32":
        return os.path.join(sys.prefix, "lib", "site-packages")
    else:
        py_ver = f"python{sys.version_info.major}.{sys.version_info.minor}"
        return os.path.join(sys.prefix, "lib", py_ver, "site-packages")
```

### SDK Installation with Target Directory

Install directly to Blender's site-packages to avoid path issues:

```python
import subprocess
import threading

_install_state = {
    'installing': False,
    'installed': None,  # None, True, False, or 'restart'
    'log': []
}

def install_sdk_sync():
    """Install SDK to Blender's Python (run in thread)."""
    _install_state['installing'] = True
    _install_state['log'] = []
    
    def log(msg):
        _install_state['log'].append(msg)
        print(f"[SDK Install] {msg}")
    
    python = get_blender_python()
    site_packages = get_blender_site_packages()
    
    if not python:
        log(f"ERROR: Python not found")
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
    except:
        pass
    
    # Windows: Install pywin32 first (SDK dependency)
    if sys.platform == "win32":
        log("Installing pywin32...")
        subprocess.run(
            [python, "-m", "pip", "install", "pywin32",
             "--target", site_packages, "--upgrade", "--no-user"],
            capture_output=True
        )
    
    # Install SDK to Blender's site-packages
    log("Installing claude-agent-sdk...")
    result = subprocess.run(
        [python, "-m", "pip", "install", "claude-agent-sdk",
         "--target", site_packages, "--upgrade", "--no-user"],
        capture_output=True, text=True
    )
    
    if result.returncode == 0:
        log("Installation successful!")
        
        # Ensure site-packages is in path
        if site_packages not in sys.path:
            sys.path.insert(0, site_packages)
        
        import importlib
        importlib.invalidate_caches()
        
        try:
            import claude_agent_sdk
            _install_state['installed'] = True
            log("SDK verified!")
        except ImportError as e:
            _install_state['installed'] = 'restart'
            log(f"Restart Blender to use SDK")
    else:
        log(f"Failed: {result.stderr[-200:]}")
        _install_state['installed'] = False
    
    _install_state['installing'] = False

def start_install():
    threading.Thread(target=install_sdk_sync, daemon=True).start()
```

### Persistent Event Loop

Use a single persistent event loop for all async operations:

```python
import asyncio
import threading

_chat_state = {
    'loop': None,
    'response': None,
    'error': None,
    'is_connected': False
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
```

### Using query() Instead of ClaudeSDKClient

The `query()` function is more reliable with Blender's threading:

```python
async def send_message_async(prompt: str):
    """Send message using query() function."""
    try:
        from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, TextBlock
        
        options = ClaudeAgentOptions(
            permission_mode="acceptEdits"
        )
        
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
```

### Non-Blocking Operators with Timers

```python
import bpy

class CLAUDE_OT_send_message(bpy.types.Operator):
    bl_idname = "claude.send_message"
    bl_label = "Send"
    
    def execute(self, context):
        props = context.scene.claude_agent
        
        if props.is_loading:
            return {'CANCELLED'}
        
        user_message = props.user_input
        props.user_input = ""
        props.is_loading = True
        props.status_message = "Thinking..."
        
        # Build prompt with scene context
        if props.include_context:
            ctx = get_scene_context()
            full_prompt = f"""You are a Blender assistant.

Current scene:
{ctx}

User request: {user_message}

Provide Python/bpy code in ```python blocks if needed."""
        else:
            full_prompt = user_message
        
        # Run async query
        run_async(send_message_async(full_prompt))
        
        # Start polling timer
        bpy.app.timers.register(self._check_response, first_interval=0.5)
        return {'FINISHED'}
    
    def _check_response(self):
        props = bpy.context.scene.claude_agent
        
        if _chat_state['error']:
            props.last_response = f"Error: {_chat_state['error']}"
            props.status_message = "Error"
            props.is_loading = False
            _chat_state['error'] = None
            return None  # Stop timer
        
        if _chat_state['response'] is not None:
            props.last_response = _chat_state['response']
            props.status_message = "Ready"
            props.is_loading = False
            _chat_state['response'] = None
            
            # Auto-execute code if enabled
            if props.auto_execute:
                code = extract_python_code(props.last_response)
                if code:
                    try:
                        exec(code[0], {"bpy": bpy})
                    except Exception as e:
                        props.last_response += f"\n\n⚠️ Execution error: {e}"
            
            # Force UI redraw
            for area in bpy.context.screen.areas:
                area.tag_redraw()
            return None
        
        return 0.5  # Continue polling
```

### Scene Context for Better Responses

```python
def get_scene_context():
    """Build context string from current Blender state."""
    lines = []
    scene = bpy.context.scene
    
    lines.append(f"Scene: {scene.name}")
    lines.append(f"Frame: {scene.frame_current} of {scene.frame_end}")
    lines.append(f"Total objects: {len(scene.objects)}")
    
    selected = bpy.context.selected_objects
    if selected:
        lines.append(f"\nSelected ({len(selected)}):")
        for obj in selected[:5]:
            info = f"  - {obj.name} ({obj.type})"
            if obj.type == 'MESH' and obj.data:
                info += f" [{len(obj.data.vertices)} verts]"
            lines.append(info)
        if len(selected) > 5:
            lines.append(f"  ... +{len(selected) - 5} more")
    
    active = bpy.context.active_object
    if active:
        lines.append(f"\nActive: {active.name}")
        lines.append(f"  Type: {active.type}")
        lines.append(f"  Location: {tuple(round(v, 2) for v in active.location)}")
    
    return "\n".join(lines)
```

### Panel UI with Install Flow

```python
class CLAUDE_PT_panel(bpy.types.Panel):
    bl_label = "Claude Agent"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Claude'
    
    def draw(self, context):
        layout = self.layout
        props = context.scene.claude_agent
        
        sdk_installed = check_sdk_installed()
        sdk_installing = _install_state['installing']
        
        # Header row
        row = layout.row()
        
        if sdk_installing:
            row.label(text="Installing SDK...", icon='TIME')
        elif _install_state['installed'] == 'restart':
            row.label(text="Restart Blender", icon='FILE_REFRESH')
        elif not sdk_installed:
            row.operator("claude.install_sdk", text="Install SDK", icon='IMPORT')
        elif props.is_connected:
            row.operator("claude.disconnect", icon='CANCEL')
            row.label(text="Connected", icon='CHECKMARK')
        else:
            row.operator("claude.connect", text="Connect", icon='LINKED')
        
        # Install log (collapsible)
        if _install_state['log']:
            box = layout.box()
            for line in _install_state['log'][-3:]:
                box.label(text=line[:50])
        
        # Chat interface (only when connected)
        if props.is_connected:
            layout.separator()
            
            # Settings
            row = layout.row()
            row.prop(props, "include_context", text="Scene Context")
            row.prop(props, "auto_execute", text="Auto Execute")
            
            # Response display
            if props.last_response:
                box = layout.box()
                box.label(text="Response:")
                # Wrap long text
                for line in props.last_response.split('\n')[:10]:
                    box.label(text=line[:60])
            
            # Input
            layout.prop(props, "user_input", text="")
            
            row = layout.row()
            row.operator("claude.send_message", text="Send")
            row.enabled = not props.is_loading
            
            # Status
            if props.is_loading:
                layout.label(text=props.status_message, icon='TIME')
```

### Code Extraction

```python
import re

def extract_python_code(text: str) -> list[str]:
    """Extract ```python code blocks from response."""
    pattern = r'```python\s*(.*?)```'
    matches = re.findall(pattern, text, re.DOTALL)
    return [m.strip() for m in matches]
```

## Complete Addon Structure

```python
bl_info = {
    "name": "Claude Agent Chat",
    "author": "Your Name",
    "version": (1, 0, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Claude",
    "description": "Chat with Claude using your Max subscription",
    "category": "Interface",
}

# ... all the code above ...

classes = [
    ClaudeAgentProperties,
    CLAUDE_OT_install_sdk,
    CLAUDE_OT_connect,
    CLAUDE_OT_disconnect,
    CLAUDE_OT_send_message,
    CLAUDE_PT_panel,
]

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.claude_agent = bpy.props.PointerProperty(type=ClaudeAgentProperties)

def unregister():
    # Stop event loop
    if _chat_state.get('loop') and _chat_state['loop'].is_running():
        _chat_state['loop'].call_soon_threadsafe(_chat_state['loop'].stop)
    
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except:
            pass
    
    try:
        del bpy.types.Scene.claude_agent
    except:
        pass
```

## Usage Notes

1. **First run**: Click "Install SDK" button
2. **After install**: May need to restart Blender (Windows especially)
3. **Connect**: Click "Connect" to verify SDK works
4. **Chat**: Type messages, optionally enable "Scene Context" and "Auto Execute"
5. **Claude can**: See your scene, provide bpy code, and optionally auto-run it

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No module named 'claude_agent_sdk'" | SDK installed to wrong location. Use `--target` flag |
| "pywintypes not found" (Windows) | Install pywin32 alongside SDK |
| Async errors | Use persistent event loop, not new loop per call |
| UI doesn't update | Call `area.tag_redraw()` after state changes |
| "Not authenticated" | Run `claude login` in terminal |
