'use client';

import { useEffect } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import dynamic from 'next/dynamic';
import ScenarioSidebar from '../components/ScenarioSidebar';
import ChatPanel from '../components/ChatPanel';

const WorldMap = dynamic(() => import('../components/WorldMap'), { ssr: false });

function AppContent() {
  const { backendStatus, initializeData } = useApp();

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  if (backendStatus === 'connecting') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Connecting to PyTorch Model...</div>
        <div className="loading-subtext">Training GNN+LSTM on startup (~30s)</div>
      </div>
    );
  }

  if (backendStatus === 'error') {
    return (
      <div className="loading-screen">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <div className="loading-text" style={{ color: '#f85149' }}>Backend Not Connected</div>
        <div className="loading-subtext">
          Start the Python server: <code style={{ background: '#161b22', padding: '4px 8px', borderRadius: '4px' }}>
            cd backend && pip install -r requirements.txt && python server.py
          </code>
        </div>
        <button
          onClick={() => initializeData()}
          style={{
            marginTop: 12, padding: '8px 20px', background: '#161b22',
            border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3',
            cursor: 'pointer', fontSize: 13
          }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ScenarioSidebar />
      <WorldMap />
      <ChatPanel />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
