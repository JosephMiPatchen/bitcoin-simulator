import { Block, UTXOSet } from '../../types/types';
import { validateBlock } from './blockValidator';
import { updateUTXOSet } from '../blockchain/utxo';
import { SimulatorConfig } from '../../config/config';

/**
 * Validates a chain of blocks
 * Returns true if the chain is valid, false otherwise
 * 
 * Note: In this simulator, each node creates its own genesis block.
 * When validating a chain from another node, we don't require that
 * the first block matches our own genesis block. Instead, we validate
 * that the chain is internally consistent and follows all other rules.
 */
export const validateChain = async (chain: Block[]): Promise<boolean> => {
  // Check if the chain is empty
  if (chain.length === 0) {
    console.error('Chain is empty');
    return false;
  }
  
  // Verify the first block has height 0 (is a genesis block)
  if (chain[0].header.height !== 0) {
    console.error('First block is not a genesis block (height 0)');
    return false;
  }

  // Verify genesis block has correct previous hash
  if (chain[0].header.previousHeaderHash !== SimulatorConfig.GENESIS_PREV_HASH) {
    console.error('Genesis block has invalid previous hash');
    return false;
  }
  
  // Validate each block in the chain
  let tempUtxoSet: UTXOSet = {};
  
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];
    const previousBlock = i > 0 ? chain[i - 1] : null;
    
    // Verify block height sequence
    if (block.header.height !== i) {
      console.error(`Invalid block height sequence: expected ${i}, got ${block.header.height}`);
      return false;
    }

    // Skip validateBlock for genesis block (i=0) since we validate it differently
    if (previousBlock) {
      const previousHash = previousBlock.hash || '';
      const isValid = await validateBlock(block, tempUtxoSet, previousHash);
      if (!isValid) {
        console.error(`Block at height ${block.header.height} is invalid`);
        return false;
      }
    }
    
    // Check for chronological timestamps
    if (previousBlock && block.header.timestamp < previousBlock.header.timestamp) {
      console.error(`Block timestamp is not chronological: ${block.header.timestamp} < ${previousBlock.header.timestamp}`);
      return false;
    }
    
    // Incrementally update the UTXO set with this block's transactions
    for (const transaction of block.transactions) {
      tempUtxoSet = updateUTXOSet(tempUtxoSet, transaction);
    }
  }
  
  return true;
};
