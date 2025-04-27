import { Block, UTXOSet } from '../../types/types';
import { validateBlock } from './blockValidator';
import { rebuildUTXOSet } from '../blockchain/utxo';

/**
 * Validates a chain of blocks
 * Returns true if the chain is valid, false otherwise
 */
export const validateChain = (
  chain: Block[],
  genesisBlock: Block
): boolean => {
  // Check if the chain is empty
  if (chain.length === 0) {
    console.error('Chain is empty');
    return false;
  }
  
  // Check if the genesis block is valid
  if (JSON.stringify(chain[0]) !== JSON.stringify(genesisBlock)) {
    console.error('Genesis block is invalid');
    return false;
  }
  
  // Validate each block in the chain
  let tempUtxoSet: UTXOSet = {};
  
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];
    const previousBlock = i > 0 ? chain[i - 1] : null;
    
    // Validate the block
    if (!validateBlock(block, previousBlock, tempUtxoSet)) {
      console.error(`Block at height ${block.header.height} is invalid`);
      return false;
    }
    
    // Update the temporary UTXO set
    const allTransactions = chain.slice(0, i + 1).flatMap(b => b.transactions);
    tempUtxoSet = rebuildUTXOSet(allTransactions);
  }
  
  return true;
};
