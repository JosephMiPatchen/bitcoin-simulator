import React, { useState } from 'react';
import { NodeState, Block } from '../../types/types';
import { calculateBlockHeaderHash } from '../../core/validation/blockValidator';
import { isHashBelowCeiling } from '../../utils/hashUtils';
import { SimulatorConfig } from '../../config/config';
import TransactionView from './TransactionView';
import './NodePanel.css';

interface NodePanelProps {
  nodeState: NodeState;
}

const NodePanel: React.FC<NodePanelProps> = ({ nodeState }) => {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  
  // Get the last 6 characters of a hash for display
  const shortenHash = (hash: string) => hash.substring(hash.length - 6);
  
  // Sort blocks by height to ensure correct order
  const sortedBlocks = [...nodeState.blockchain].sort((a, b) => a.header.height - b.header.height);
  
  // Calculate the hash and check if it's valid
  const validateBlockHash = (block: Block) => {
    const hash = calculateBlockHeaderHash(block.header);
    const isValid = isHashBelowCeiling(hash, SimulatorConfig.CEILING);
    const isGenesis = block.header.height === 0;
    return { hash, isValid, isGenesis };
  };
  
  // Arrange blocks in a grid layout, growing from left to right, then wrapping downwards
  const arrangeBlocksInGrid = () => {
    const maxBlocksPerRow = 4; // Maximum blocks per row before wrapping
    const blocks: Block[] = [];
    
    // Flatten all blocks and sort by height
    sortedBlocks.forEach(block => {
      blocks.push(block);
    });
    
    // Sort blocks by height
    blocks.sort((a, b) => a.header.height - b.header.height);
    
    // Arrange blocks in rows
    const rows: Block[][] = [];
    let currentRow: Block[] = [];
    
    blocks.forEach(block => {
      currentRow.push(block);
      
      // Start a new row when we reach the maximum blocks per row
      if (currentRow.length >= maxBlocksPerRow) {
        rows.push([...currentRow]);
        currentRow = [];
      }
    });
    
    // Add the last row if it has any blocks
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    return rows;
  };
  
  // This function has been moved to the TransactionView component
  
  const blockRows = arrangeBlocksInGrid();
  
  return (
    <div className="node-panel">
      <div className="node-header">
        <h2>{nodeState.nodeId}</h2>
        <div className={`node-status ${nodeState.isMining ? 'mining' : 'idle'}`}>
          {nodeState.isMining ? 'Mining' : 'Idle'}
        </div>
      </div>
      
      <div className="blockchain-container">
        {blockRows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="blockchain-row">
            {row.map((block) => {
              const { hash, isValid, isGenesis } = validateBlockHash(block);
              
              return (
                <div 
                  key={hash} 
                  className={`block-item ${selectedBlock === block ? 'selected' : ''} ${isGenesis ? 'genesis-block' : ''}`}
                  onClick={() => setSelectedBlock(block === selectedBlock ? null : block)}
                >
                  <div className="block-height">{block.header.height}</div>
                  <div className="block-hash">{shortenHash(hash)}</div>
                  <div className="block-validation">
                    {isGenesis ? 
                      <span className="genesis-text">GENESIS</span> :
                      isValid ? 
                        <span className="valid-block">✓</span> : 
                        <span className="invalid-block">✗</span>
                    }
                  </div>
                  <div className="block-tx-count">{block.transactions.length} tx</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {selectedBlock && (
        <div className="block-modal-overlay" onClick={() => setSelectedBlock(null)}>
          <div className="block-modal" onClick={(e) => e.stopPropagation()}>
            <div className="block-modal-header">
              <h3>
                {validateBlockHash(selectedBlock).isGenesis ? 'Genesis Block Details' : 'Block Details'}
              </h3>
              <button className="close-button" onClick={() => setSelectedBlock(null)}>×</button>
            </div>
            
            <div className="block-modal-content">
              <div className="block-info">
                <div className="info-row">
                  <span className="info-label">Height:</span>
                  <span className="info-value">{selectedBlock.header.height}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Hash:</span>
                  <span className="info-value hash-value">{calculateBlockHeaderHash(selectedBlock.header)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Previous Hash:</span>
                  <span className="info-value hash-value">{selectedBlock.header.previousHeaderHash}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Nonce:</span>
                  <span className="info-value">{selectedBlock.header.nonce}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Timestamp:</span>
                  <span className="info-value">{new Date(selectedBlock.header.timestamp).toLocaleString()}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Ceiling:</span>
                  <span className="info-value hash-value">{SimulatorConfig.CEILING}</span>
                </div>
                <div className="modal-row">
                  <div className="modal-label">Valid Hash:</div>
                  <div className="modal-value">
                    {validateBlockHash(selectedBlock).isGenesis ? (
                      <span className="genesis-hash">Genesis Block (Always Valid)</span>
                    ) : validateBlockHash(selectedBlock).isValid ? (
                      <span className="valid-hash">Yes ✓</span>
                    ) : (
                      <span className="invalid-hash">No ✗</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="transactions-container">
                <h3>Transactions ({selectedBlock.transactions.length})</h3>
                
                {selectedBlock.transactions.map((tx, index) => (
                  <TransactionView key={index} transaction={tx} utxoSet={nodeState.utxo} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodePanel;
