import React, { useState } from 'react';
import { NodeState } from '../../types/types';
import BlockchainView from './BlockchainView';
import UTXOView from './UTXOView';
import './NodePanel.css';

interface NodePanelProps {
  nodeState: NodeState;
}

const NodePanel: React.FC<NodePanelProps> = ({ nodeState }) => {
  const [showUtxoModal, setShowUtxoModal] = useState(false);
  
  return (
    <div className="node-panel">
      <div className="node-header">
        <h2>{nodeState.nodeId}</h2>
        <div className="node-controls">
          <button 
            className="utxo-button" 
            onClick={() => setShowUtxoModal(true)}
            title="View UTXO Set"
          >
            UTXO Set
          </button>
          <div className={`node-status ${nodeState.isMining ? 'mining' : 'idle'}`}>
            {nodeState.isMining ? 'Mining' : 'Idle'}
          </div>
        </div>
      </div>
      
      <BlockchainView blocks={nodeState.blockchain} />
      
      {/* UTXO Modal */}
      {showUtxoModal && (
        <div className="modal-overlay" onClick={() => setShowUtxoModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>UTXO Set - {nodeState.nodeId}</h3>
              <button className="close-button" onClick={() => setShowUtxoModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <UTXOView utxoSet={nodeState.utxo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodePanel;
