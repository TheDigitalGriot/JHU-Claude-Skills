import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { execSync } from 'child_process';
import * as fs from 'fs';
import started from 'electron-squirrel-startup';
import { query } from '@anthropic-ai/claude-agent-sdk';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ============================================================
// Claude Agent SDK Integration
// ============================================================

let claudeCodePath: string | undefined;

function findClaudeCodeExecutable(): string | undefined {
  console.log('[Claude] Finding Claude Code executable...');
  console.log('[Claude] Platform:', process.platform);

  try {
    if (process.platform === 'win32') {
      // On Windows, try multiple approaches

      // Approach 1: where claude.cmd (preferred)
      try {
        const cmdResult = execSync('where claude.cmd', { encoding: 'utf-8' }).trim().split('\n')[0];
        console.log('[Claude] Found via "where claude.cmd":', cmdResult);
        if (fs.existsSync(cmdResult)) {
          return cmdResult;
        }
      } catch (e) {
        console.log('[Claude] "where claude.cmd" failed');
      }

      // Approach 2: where claude
      try {
        const whereResult = execSync('where claude', { encoding: 'utf-8' }).trim();
        console.log('[Claude] "where claude" raw output:', whereResult);

        const paths = whereResult.split('\n').map(p => p.trim()).filter(Boolean);
        for (const p of paths) {
          if (p.endsWith('.cmd') && fs.existsSync(p)) {
            console.log('[Claude] Using .cmd path:', p);
            return p;
          }
        }

        if (paths.length > 0 && fs.existsSync(paths[0])) {
          console.log('[Claude] Using first path:', paths[0]);
          return paths[0];
        }
      } catch (e) {
        console.log('[Claude] "where claude" failed');
      }

      // Approach 3: Check common npm global paths
      const npmGlobalPaths = [
        path.join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
        path.join(process.env.LOCALAPPDATA || '', 'npm', 'claude.cmd'),
      ];

      for (const p of npmGlobalPaths) {
        console.log('[Claude] Checking common path:', p);
        if (fs.existsSync(p)) {
          console.log('[Claude] Found at common path:', p);
          return p;
        }
      }
    } else {
      // Unix: use which claude
      const result = execSync('which claude', { encoding: 'utf-8' }).trim();
      console.log('[Claude] Found via "which claude":', result);
      if (fs.existsSync(result)) {
        return result;
      }
    }

    console.error('[Claude] Could not find claude executable');
    return undefined;
  } catch (error) {
    console.error('[Claude] Error finding executable:', error);
    return undefined;
  }
}

function registerClaudeHandlers() {
  // Initialize path
  claudeCodePath = findClaudeCodeExecutable();
  console.log('[Claude] Initial path:', claudeCodePath);

  // Get debug info
  ipcMain.handle('claude:debug-info', () => {
    // Calculate cli.js path if using .cmd
    let cliJsPath: string | undefined;
    if (claudeCodePath?.endsWith('.cmd')) {
      const npmDir = path.dirname(claudeCodePath);
      cliJsPath = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
    }

    return {
      claudeCodePath,
      pathExists: claudeCodePath ? fs.existsSync(claudeCodePath) : false,
      cliJsPath,
      cliJsExists: cliJsPath ? fs.existsSync(cliJsPath) : undefined,
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: {
        APPDATA: process.env.APPDATA,
        PATH: process.env.PATH?.substring(0, 200) + '...',
      },
    };
  });

  // Set custom path
  ipcMain.handle('claude:set-path', (_, newPath: string) => {
    console.log('[Claude] Setting path to:', newPath);
    claudeCodePath = newPath;
    return { success: true, path: newPath };
  });

  // Refresh path detection
  ipcMain.handle('claude:refresh-path', () => {
    claudeCodePath = findClaudeCodeExecutable();
    return { success: true, path: claudeCodePath };
  });

  // Test query
  ipcMain.handle('claude:test-query', async () => {
    console.log('[Claude] Test query starting...');
    console.log('[Claude] Using path:', claudeCodePath);

    if (!claudeCodePath) {
      return { success: false, error: 'Claude CLI not found' };
    }

    if (!fs.existsSync(claudeCodePath)) {
      return { success: false, error: `Path does not exist: ${claudeCodePath}` };
    }

    try {
      // On Windows, .cmd files can't be spawned directly.
      // Use executable: 'node' with the cli.js path instead.
      const isCmd = claudeCodePath.endsWith('.cmd');
      let cliJsPath = claudeCodePath;

      if (isCmd) {
        // Convert .cmd path to cli.js path
        // e.g., C:\Users\...\npm\claude.cmd -> C:\Users\...\npm\node_modules\@anthropic-ai\claude-code\cli.js
        const npmDir = path.dirname(claudeCodePath);
        cliJsPath = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
        console.log('[Claude] Converted to cli.js path:', cliJsPath);

        if (!fs.existsSync(cliJsPath)) {
          return { success: false, error: `cli.js not found at: ${cliJsPath}` };
        }
      }

      const queryOptions: Parameters<typeof query>[0] = {
        prompt: 'Say "Hello from Claude Agent SDK!" and nothing else.',
        options: {
          maxTurns: 1,
          pathToClaudeCodeExecutable: cliJsPath,
          ...(isCmd && { executable: 'node' as const }),
        },
      };

      console.log('[Claude] Query options:', JSON.stringify(queryOptions, null, 2));
      const result = query(queryOptions);

      let responseText = '';

      for await (const message of result) {
        console.log('[Claude] Message type:', message.type);
        if (message.type === 'assistant') {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              responseText += block.text;
            }
          }
        }
      }

      console.log('[Claude] Response:', responseText);
      return { success: true, response: responseText };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('[Claude] Error:', errorMessage);
      console.error('[Claude] Stack:', errorStack);
      return { success: false, error: errorMessage };
    }
  });
}

// ============================================================
// Window Management
// ============================================================

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();
};

app.on('ready', () => {
  registerClaudeHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
