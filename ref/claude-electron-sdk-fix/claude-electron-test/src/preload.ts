import { contextBridge, ipcRenderer } from 'electron';

// Expose Claude API to renderer
contextBridge.exposeInMainWorld('claude', {
  getDebugInfo: () => ipcRenderer.invoke('claude:debug-info'),
  setPath: (path: string) => ipcRenderer.invoke('claude:set-path', path),
  refreshPath: () => ipcRenderer.invoke('claude:refresh-path'),
  testQuery: () => ipcRenderer.invoke('claude:test-query'),
});

// Type augmentation
declare global {
  interface Window {
    claude: {
      getDebugInfo: () => Promise<{
        claudeCodePath: string | undefined;
        pathExists: boolean;
        platform: string;
        nodeVersion: string;
        cwd: string;
        env: Record<string, string | undefined>;
      }>;
      setPath: (path: string) => Promise<{ success: boolean; path: string }>;
      refreshPath: () => Promise<{ success: boolean; path: string | undefined }>;
      testQuery: () => Promise<{ success: boolean; response?: string; error?: string }>;
    };
  }
}
