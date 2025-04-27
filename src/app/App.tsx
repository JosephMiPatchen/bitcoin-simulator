import React from 'react';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bitcoin Simulator</h1>
        <button className="mining-control">
          Start Mining
        </button>
      </header>
      <main className="nodes-container">
        <div className="node-placeholder">
          <h2>Node 1</h2>
          <p>Status: Idle</p>
          <div className="blockchain-placeholder">
            <p>Blockchain visualization will appear here</p>
          </div>
        </div>
        <div className="node-placeholder">
          <h2>Node 2</h2>
          <p>Status: Idle</p>
          <div className="blockchain-placeholder">
            <p>Blockchain visualization will appear here</p>
          </div>
        </div>
        <div className="node-placeholder">
          <h2>Node 3</h2>
          <p>Status: Idle</p>
          <div className="blockchain-placeholder">
            <p>Blockchain visualization will appear here</p>
          </div>
        </div>
        <div className="node-placeholder">
          <h2>Node 4</h2>
          <p>Status: Idle</p>
          <div className="blockchain-placeholder">
            <p>Blockchain visualization will appear here</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
