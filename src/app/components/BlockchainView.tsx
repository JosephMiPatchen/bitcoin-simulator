import React, { useState, useEffect, useRef } from 'react';
import { Block } from '../../types/types';
import { calculateBlockHeaderHash } from '../../core/validation/blockValidator';
import { isHashBelowCeiling } from '../../utils/cryptoUtils';
import { SimulatorConfig } from '../../config/config';
import { BiFork } from 'react-icons/bi';
import { useSimulatorContext } from '../contexts/SimulatorContext';
import TransactionView from './TransactionView';
import './BlockchainView.css';

interface BlockchainViewProps {
  blocks: Block[];
}

const BlockchainView: React.FC<BlockchainViewProps> = ({ blocks }) => {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const { forkStartHeight } = useSimulatorContext();
  
  // Keep track of previously forked blocks to detect transitions
  const [resolvedBlocks, setResolvedBlocks] = useState<Set<string>>(new Set());
  const prevForkHeightRef = useRef<number | null>(forkStartHeight);
  
  // Determine if a block is part of a fork
  const isForkedBlock = (block: Block): boolean => {
    if (forkStartHeight === null) return false;
    return block.header.height >= forkStartHeight;
  };
  
  // Track blocks that have transitioned from forked to resolved
  useEffect(() => {
    // If fork height changed or was resolved
    if (prevForkHeightRef.current !== forkStartHeight) {
      const newResolvedBlocks = new Set<string>();
      
      // If previous fork existed but now resolved or changed
      if (prevForkHeightRef.current !== null) {
        blocks.forEach(block => {
          // If this block was previously forked but is no longer forked
          const blockHash = calculateBlockHeaderHash(block.header);
          const wasForked = block.header.height >= prevForkHeightRef.current!;
          const isNowForked = isForkedBlock(block);
          
          if (wasForked && !isNowForked) {
            newResolvedBlocks.add(blockHash);
          }
        });
      }
      
      // Merge with existing resolved blocks instead of replacing
      setResolvedBlocks(prevBlocks => {
        const mergedBlocks = new Set(prevBlocks);
        newResolvedBlocks.forEach(hash => mergedBlocks.add(hash));
        return mergedBlocks;
      });
      
      prevForkHeightRef.current = forkStartHeight;
      
      // Clear the resolved blocks after animation duration
      // Use a separate timeout for each block to ensure all animations complete
      if (newResolvedBlocks.size > 0) {
        const timer = setTimeout(() => {
          setResolvedBlocks(prevBlocks => {
            const updatedBlocks = new Set(prevBlocks);
            newResolvedBlocks.forEach(hash => updatedBlocks.delete(hash));
            return updatedBlocks;
          });
        }, 2000); // Slightly longer than animation duration to ensure completion
        
        return () => clearTimeout(timer);
      }
    }
  }, [forkStartHeight, blocks]);
  
  // Get the last 6 characters of a hash for display
  const shortenHash = (hash: string) => hash.substring(hash.length - 6);
  
  // Sort blocks by height
  const sortedBlocks = [...blocks].sort((a, b) => a.header.height - b.header.height);
  
  // Calculate the hash and check if it's valid
  const validateBlockHash = (block: Block) => {
    const hash = calculateBlockHeaderHash(block.header);
    const isValid = isHashBelowCeiling(hash, SimulatorConfig.CEILING);
    const isGenesis = block.header.height === 0;
    return { hash, isValid, isGenesis };
  };
  
  // Let all blocks display in a single container and let CSS handle the wrapping
  const getBlocksForDisplay = () => {
    // Sort blocks by height
    return [...sortedBlocks].sort((a, b) => a.header.height - b.header.height);
  };
  
  // Determine if a block is the last one in the chain (for arrow display)
  const isLastBlock = (index: number, totalBlocks: number) => {
    // Only the very last block should have no outgoing arrow
    return index === totalBlocks - 1;
  };
  
  const sortedBlocksForDisplay = getBlocksForDisplay();
  
  return (
    <div className="blockchain-container">
      <div className="blockchain-row">
        {sortedBlocksForDisplay.map((block, index) => {
            const { hash, isValid, isGenesis } = validateBlockHash(block);
            const isLast = isLastBlock(index, sortedBlocksForDisplay.length);
            
            return (
              <div className="block-wrapper" key={hash}>
                <div 
                  className={`block-item ${selectedBlock === block ? 'selected' : ''} ${isGenesis ? 'genesis-block' : ''} ${isLast ? 'last-in-row' : ''} ${isForkedBlock(block) ? 'forked-block' : ''} ${resolvedBlocks.has(hash) ? 'resolved-block' : ''}`}
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
                {isForkedBlock(block) && <div className="fork-icon"><BiFork /></div>}
              </div>
            );
          })}
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
                  <span className="info-value hash-value">0x{calculateBlockHeaderHash(selectedBlock.header)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Previous Hash:</span>
                  <span className="info-value hash-value">0x{selectedBlock.header.previousHeaderHash}</span>
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
                  <span className="info-value hash-value">0x{SimulatorConfig.CEILING}</span>
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
                  <TransactionView key={index} transaction={tx} utxoSet={{}} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainView;
