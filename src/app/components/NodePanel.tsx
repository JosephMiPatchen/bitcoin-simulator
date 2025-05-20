import React from 'react';
import { NodeState } from '../../types/types';
import BlockchainView from './BlockchainView';
import './NodePanel.css';

interface NodePanelProps {
  nodeState: NodeState;
}

const NodePanel: React.FC<NodePanelProps> = ({ nodeState }) => {
  
  return (
    <div className="node-panel">
      <div className="node-header">
        <h2>{nodeState.nodeId}</h2>
        <div className={`node-status ${nodeState.isMining ? 'mining' : 'idle'}`}>
          {nodeState.isMining ? 'Mining' : 'Idle'}
        </div>
      </div>
      
      <BlockchainView blocks={nodeState.blockchain} />
    </div>
  );
};

export default NodePanel;
