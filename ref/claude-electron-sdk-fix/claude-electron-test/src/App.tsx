import { useState } from 'react';

export default function App() {
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customPath, setCustomPath] = useState('');

  const handleGetDebugInfo = async () => {
    const info = await window.claude.getDebugInfo();
    setDebugInfo(info);
    console.log('Debug info:', info);
  };

  const handleTestQuery = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const result = await window.claude.testQuery();
      if (result.success) {
        setTestResult(`Success: ${result.response}`);
      } else {
        setTestResult(`Error: ${result.error}`);
      }
    } catch (error) {
      setTestResult(`Exception: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPath = async () => {
    if (!customPath.trim()) return;
    await window.claude.setPath(customPath.trim());
    await handleGetDebugInfo();
  };

  const handleRefreshPath = async () => {
    await window.claude.refreshPath();
    await handleGetDebugInfo();
  };

  const handleUseDefaultPath = async () => {
    const defaultPath = 'C:\\Users\\digit\\AppData\\Roaming\\npm\\claude.cmd';
    setCustomPath(defaultPath);
    await window.claude.setPath(defaultPath);
    await handleGetDebugInfo();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Claude Agent SDK Test</h1>
      <p>Simple test for Claude Agent SDK in Electron</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
        {/* Debug Info Section */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGetDebugInfo}>Get Debug Info</button>
          <button onClick={handleRefreshPath}>Refresh Path</button>
        </div>

        {debugInfo && (
          <pre style={{
            background: '#f0f0f0',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}

        {/* Custom Path Section */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="Custom claude path..."
            style={{ flex: 1, padding: '8px' }}
          />
          <button onClick={handleSetPath} disabled={!customPath.trim()}>
            Set Path
          </button>
        </div>

        <button onClick={handleUseDefaultPath} style={{ background: '#ff9800', color: 'white' }}>
          Use Default Windows Path (AppData/npm/claude.cmd)
        </button>

        {/* Test Query Section */}
        <hr />
        <button
          onClick={handleTestQuery}
          disabled={isLoading}
          style={{
            background: '#4CAF50',
            color: 'white',
            padding: '12px',
            fontSize: '16px',
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {isLoading ? 'Testing...' : 'Test Query (Say Hello)'}
        </button>

        {testResult && (
          <div style={{
            padding: '10px',
            borderRadius: '4px',
            background: testResult.startsWith('Success') ? '#e8f5e9' : '#ffebee',
            color: testResult.startsWith('Success') ? '#2e7d32' : '#c62828',
          }}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
